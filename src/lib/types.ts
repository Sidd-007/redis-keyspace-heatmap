export type RedisConnKind = 'standalone' | 'cluster' | 'sentinel';

export interface ConnectionProfile {
  id: string;
  name: string;
  kind: RedisConnKind;
  host?: string;
  port?: number;
  password?: string;
  tls?: boolean;
  clusterHosts?: { host: string; port: number }[];
  sentinel?: {
    name: string;
    hosts: { host: string; port: number }[];
    password?: string;
  };
  db?: number; // default 0 for standalone
  keyDelimiter?: string; // default ':'
}

export interface ScanConfig {
  dbs: number[]; // which DB indexes to sample (standalone only)
  sampleLimit: number; // max keys to examine across DBs/nodes
  scanCount: number; // COUNT per SCAN iteration (e.g., 1000)
  ttlBuckets: number[]; // [0, 60, 300, 1800, 3600, 21600, 86400, ...]
  idleBuckets: number[]; // [0, 60, 300, 3600, 21600, 86400, ...]
  sizeTopN: number; // top-N largest keys per type
}

export interface KeyMeta {
  key: string;
  type: 'string' | 'hash' | 'list' | 'set' | 'zset' | 'stream' | 'bitmap' | 'other';
  ttlMs: number | null; // null = persistent
  idleSec?: number; // from OBJECT IDLETIME (approx seconds)
  estBytes?: number; // from MEMORY USAGE or heuristic
  db?: number; // db index (standalone)
}

export interface PrefixAgg {
  prefix: string; // e.g., 'app:user'
  count: number;
  estBytes: number;
  ttlHist: Record<string, number>; // bucket label -> count
  idleHist: Record<string, number>; // bucket label -> count
  byType: Record<string, { count: number; estBytes: number }>;
}

export interface SampleStats {
  durationMs: number;
  sampled: number;
  approxTotalKeys: number;
  coverage: number;
  memoryUsageCalls: number;
  errors: string[];
}

export interface ScanResult {
  sampleStats: SampleStats;
  aggregates: {
    prefixes: PrefixAgg[];
  };
  topN: Record<string, KeyMeta[]>; // type -> top keys
}

export interface RedisInfo {
  redis_version: string;
  used_memory_human: string;
  keyspace: Record<string, { keys: number; expires: number }>;
  notify_keyspace_events: string;
}
