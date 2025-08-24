import Redis from 'ioredis';

export async function estimateKeySize(
  client: Redis,
  key: string,
  type: string
): Promise<number> {
  try {
    // Try MEMORY USAGE first (Redis 4.0+)
    const memoryUsage = await client.memory('USAGE', key, 'SAMPLES', '5');
    if (memoryUsage && memoryUsage > 0) {
      return memoryUsage;
    }
  } catch (error) {
    // MEMORY USAGE not available, fall back to heuristics
    console.debug(`MEMORY USAGE not available for key ${key}, using heuristics`);
  }

  // Fallback to heuristics
  return estimateKeySizeHeuristic(client, key, type);
}

async function estimateKeySizeHeuristic(
  client: Redis,
  key: string,
  type: string
): Promise<number> {
  const baseOverhead = 50; // Redis key overhead

  switch (type) {
    case 'string':
      return await estimateStringSize(client, key) + baseOverhead;

    case 'hash':
      return await estimateHashSize(client, key) + baseOverhead;

    case 'list':
      return await estimateListSize(client, key) + baseOverhead;

    case 'set':
      return await estimateSetSize(client, key) + baseOverhead;

    case 'zset':
      return await estimateZSetSize(client, key) + baseOverhead;

    case 'stream':
      return await estimateStreamSize(client, key) + baseOverhead;

    default:
      return baseOverhead; // Unknown type
  }
}

async function estimateStringSize(client: Redis, key: string): Promise<number> {
  try {
    const value = await client.get(key);
    return value ? Buffer.byteLength(value, 'utf8') : 0;
  } catch (error) {
    console.warn(`Failed to estimate string size for key ${key}:`, error);
    return 0;
  }
}

async function estimateHashSize(client: Redis, key: string): Promise<number> {
  try {
    const hlen = await client.hlen(key);
    if (hlen === 0) return 0;

    // Sample first 10 fields to estimate average field size
    const sampleSize = Math.min(10, hlen);
    const fields = await client.hscan(key, 0, 'COUNT', sampleSize);
    const fieldEntries = fields[1];

    let totalSize = 0;
    for (let i = 0; i < fieldEntries.length; i += 2) {
      const field = fieldEntries[i];
      const value = fieldEntries[i + 1];
      totalSize += Buffer.byteLength(field, 'utf8') + Buffer.byteLength(value, 'utf8');
    }

    const avgFieldSize = totalSize / (sampleSize * 2);
    return Math.floor(avgFieldSize * hlen);
  } catch (error) {
    console.warn(`Failed to estimate hash size for key ${key}:`, error);
    return 0;
  }
}

async function estimateListSize(client: Redis, key: string): Promise<number> {
  try {
    const llen = await client.llen(key);
    if (llen === 0) return 0;

    // Sample first 10 elements
    const sampleSize = Math.min(10, llen);
    const elements = await client.lrange(key, 0, sampleSize - 1);

    let totalSize = 0;
    for (const element of elements) {
      totalSize += Buffer.byteLength(element, 'utf8');
    }

    const avgElementSize = totalSize / sampleSize;
    return Math.floor(avgElementSize * llen);
  } catch (error) {
    console.warn(`Failed to estimate list size for key ${key}:`, error);
    return 0;
  }
}

async function estimateSetSize(client: Redis, key: string): Promise<number> {
  try {
    const scard = await client.scard(key);
    if (scard === 0) return 0;

    // Sample first 20 elements
    const sampleSize = Math.min(20, scard);
    const elements = await client.sscan(key, 0, 'COUNT', sampleSize);
    const sampleElements = elements[1];

    let totalSize = 0;
    for (const element of sampleElements) {
      totalSize += Buffer.byteLength(element, 'utf8');
    }

    const avgElementSize = totalSize / sampleSize;
    return Math.floor(avgElementSize * scard);
  } catch (error) {
    console.warn(`Failed to estimate set size for key ${key}:`, error);
    return 0;
  }
}

async function estimateZSetSize(client: Redis, key: string): Promise<number> {
  try {
    const zcard = await client.zcard(key);
    if (zcard === 0) return 0;

    // Sample first 10 elements with scores
    const sampleSize = Math.min(10, zcard);
    const elements = await client.zrevrange(key, 0, sampleSize - 1, 'WITHSCORES');

    let totalSize = 0;
    for (let i = 0; i < elements.length; i += 2) {
      const member = elements[i];
      const score = elements[i + 1];
      totalSize += Buffer.byteLength(member, 'utf8') + Buffer.byteLength(score.toString(), 'utf8');
    }

    const avgElementSize = totalSize / sampleSize;
    return Math.floor(avgElementSize * zcard);
  } catch (error) {
    console.warn(`Failed to estimate zset size for key ${key}:`, error);
    return 0;
  }
}

async function estimateStreamSize(client: Redis, key: string): Promise<number> {
  try {
    // Get stream info
    const info = await client.xinfo('STREAM', key) as (string | number)[];
    const length = info[1] as number; // Number of entries

    if (length === 0) return 0;

    // Estimate based on number of entries (rough approximation)
    // Each entry typically has ID + field-value pairs
    return length * 100; // Rough estimate: 100 bytes per entry
  } catch (error) {
    console.warn(`Failed to estimate stream size for key ${key}:`, error);
    return 0;
  }
}
