import { ConnectionProfile, KeyMeta, SampleStats, ScanConfig } from '@/lib/types';
import Redis, { Cluster } from 'ioredis';
import { estimateKeySize } from './sizeEstimate';

export interface ScanResult {
  keys: KeyMeta[];
  stats: SampleStats;
}

export async function scanKeys(
  client: Redis,
  config: ScanConfig,
  profile: ConnectionProfile
): Promise<ScanResult> {
  try {
    if (profile.kind === 'cluster') {
      return await scanCluster(client, config, profile);
    } else {
      return await scanStandalone(client, config, profile);
    }
  } catch (error) {
    const durationMs = Date.now() - Date.now(); // 0 since we're in catch
    return {
      keys: [],
      stats: {
        durationMs,
        sampled: 0,
        approxTotalKeys: 0,
        coverage: 0,
        memoryUsageCalls: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    };
  }
}

async function scanStandalone(
  client: Redis,
  config: ScanConfig,
  profile: ConnectionProfile
): Promise<ScanResult> {
  const keys: KeyMeta[] = [];
  const errors: string[] = [];
  let memoryUsageCalls = 0;
  let approxTotalKeys = 0;

  // Get total keys count from INFO
  try {
    const info = await client.info('keyspace');
    const lines = info.split('\r\n');
    for (const line of lines) {
      if (line.startsWith('db0:')) {
        const keysMatch = line.match(/keys=(\d+)/);
        if (keysMatch) {
          approxTotalKeys = parseInt(keysMatch[1]);
          break;
        }
      }
    }
  } catch (error) {
    console.warn('Failed to get total keys count:', error);
  }

  // Scan each configured database
  for (const db of config.dbs) {
    if (keys.length >= config.sampleLimit) break;

    try {
      await client.select(db);
      let cursor = '0';

      do {
        const [newCursor, batchKeys] = await client.scan(cursor, 'COUNT', config.scanCount);
        cursor = newCursor;

        if (batchKeys.length > 0) {
          const batchMetadata = await collectKeyMetadata(client, batchKeys, db, config);
          keys.push(...batchMetadata.keys);
          memoryUsageCalls += batchMetadata.memoryUsageCalls;
        }

        if (keys.length >= config.sampleLimit) break;
      } while (cursor !== '0');

    } catch (error) {
      errors.push(`DB ${db}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return {
    keys: keys.slice(0, config.sampleLimit),
    stats: {
      durationMs: 0, // Will be set by caller
      sampled: Math.min(keys.length, config.sampleLimit),
      approxTotalKeys,
      coverage: approxTotalKeys > 0 ? Math.min(keys.length, config.sampleLimit) / approxTotalKeys : 0,
      memoryUsageCalls,
      errors
    }
  };
}

async function scanCluster(
  client: Redis,
  config: ScanConfig,
  profile: ConnectionProfile
): Promise<ScanResult> {
  const keys: KeyMeta[] = [];
  const errors: string[] = [];
  let memoryUsageCalls = 0;
  let approxTotalKeys = 0;

  // Get cluster nodes - cast to cluster client
  const clusterClient = client as unknown as Cluster;
  const nodes = clusterClient.nodes('master');

  // Get total keys count from all nodes
  try {
    for (const node of nodes) {
      const info = await node.info('keyspace');
      const lines = info.split('\r\n');
      for (const line of lines) {
        if (line.startsWith('db0:')) {
          const keysMatch = line.match(/keys=(\d+)/);
          if (keysMatch) {
            approxTotalKeys += parseInt(keysMatch[1]);
            break;
          }
        }
      }
    }
  } catch (error) {
    console.warn('Failed to get total keys count from cluster:', error);
  }

  // Scan each master node in parallel
  const scanPromises = nodes.map(async (node: Redis) => {
    const nodeKeys: KeyMeta[] = [];
    let nodeMemoryUsageCalls = 0;

    try {
      let cursor = '0';
      do {
        const [newCursor, batchKeys] = await node.scan(cursor, 'COUNT', config.scanCount);
        cursor = newCursor;

        if (batchKeys.length > 0) {
          const batchMetadata = await collectKeyMetadata(node, batchKeys, 0, config);
          nodeKeys.push(...batchMetadata.keys);
          nodeMemoryUsageCalls += batchMetadata.memoryUsageCalls;
        }

        if (nodeKeys.length >= config.sampleLimit) break;
      } while (cursor !== '0');

    } catch (error) {
      errors.push(`Node ${node.options.host}:${node.options.port}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { keys: nodeKeys, memoryUsageCalls: nodeMemoryUsageCalls };
  });

  const nodeResults = await Promise.all(scanPromises);

  // Combine results
  for (const result of nodeResults) {
    keys.push(...result.keys);
    memoryUsageCalls += result.memoryUsageCalls;
  }

  return {
    keys: keys.slice(0, config.sampleLimit),
    stats: {
      durationMs: 0, // Will be set by caller
      sampled: Math.min(keys.length, config.sampleLimit),
      approxTotalKeys,
      coverage: approxTotalKeys > 0 ? Math.min(keys.length, config.sampleLimit) / approxTotalKeys : 0,
      memoryUsageCalls,
      errors
    }
  };
}

async function collectKeyMetadata(
  client: Redis,
  keys: string[],
  db: number,
  config: ScanConfig
): Promise<{ keys: KeyMeta[]; memoryUsageCalls: number }> {
  const metadata: KeyMeta[] = [];
  let memoryUsageCalls = 0;

  // Pipeline commands for efficiency
  const pipeline = client.pipeline();

  // Add commands to pipeline
  keys.forEach(key => {
    pipeline.type(key);
    pipeline.pttl(key);
    pipeline.object('IDLETIME', key);
  });

  const results = await pipeline.exec();
  if (!results) return { keys: metadata, memoryUsageCalls };

  // Process results
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const typeResult = results[i * 3];
    const ttlResult = results[i * 3 + 1];
    const idleResult = results[i * 3 + 2];

    if (typeResult[0]) {
      console.warn(`Failed to get type for key ${key}:`, typeResult[0]);
      continue;
    }

    const type = typeResult[1] as string;
    const ttlMs = ttlResult[0] ? null : (ttlResult[1] as number);
    const idleSec = idleResult[0] ? undefined : (idleResult[1] as number);

    // Estimate size (sample 1 in N keys to limit MEMORY USAGE calls)
    let estBytes: number | undefined;
    if (i % 10 === 0) { // Sample 1 in 10 keys
      try {
        estBytes = await estimateKeySize(client, key, type);
        memoryUsageCalls++;
      } catch (error) {
        console.warn(`Failed to estimate size for key ${key}:`, error);
      }
    }

    metadata.push({
      key,
      type: type as KeyMeta['type'],
      ttlMs: ttlMs === -1 ? null : ttlMs,
      idleSec,
      estBytes,
      db
    });
  }

  return { keys: metadata, memoryUsageCalls };
}
