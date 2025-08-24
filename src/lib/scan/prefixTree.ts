import { KeyMeta, PrefixAgg, ScanConfig } from '@/lib/types';
import { getTTLBucketLabel, getIdleBucketLabel } from '@/lib/utils';

export interface AggregationResult {
  prefixes: PrefixAgg[];
  topN: Record<string, KeyMeta[]>;
}

export function aggregateKeys(
  keys: KeyMeta[],
  config: ScanConfig,
  delimiter: string = ':'
): AggregationResult {
  const prefixMap = new Map<string, PrefixAgg>();
  const topNMap = new Map<string, KeyMeta[]>();

  for (const key of keys) {
    // Build prefix tree
    const prefixes = extractPrefixes(key.key, delimiter, 3); // Max 3 levels
    for (const prefix of prefixes) {
      if (!prefixMap.has(prefix)) {
        prefixMap.set(prefix, createEmptyPrefixAgg(prefix));
      }
      updatePrefixAgg(prefixMap.get(prefix)!, key, config);
    }

    // Collect top-N keys per type
    if (!topNMap.has(key.type)) {
      topNMap.set(key.type, []);
    }
    const topNList = topNMap.get(key.type)!;
    
    if (key.estBytes) {
      insertTopN(topNList, key, config.sizeTopN);
    }
  }

  return {
    prefixes: Array.from(prefixMap.values()).sort((a, b) => b.estBytes - a.estBytes),
    topN: Object.fromEntries(topNMap)
  };
}

function extractPrefixes(key: string, delimiter: string, maxLevels: number): string[] {
  const parts = key.split(delimiter);
  const prefixes: string[] = [];
  
  for (let i = 1; i <= Math.min(parts.length, maxLevels); i++) {
    prefixes.push(parts.slice(0, i).join(delimiter));
  }
  
  return prefixes;
}

function createEmptyPrefixAgg(prefix: string): PrefixAgg {
  return {
    prefix,
    count: 0,
    estBytes: 0,
    ttlHist: {},
    idleHist: {},
    byType: {}
  };
}

function updatePrefixAgg(agg: PrefixAgg, key: KeyMeta, config: ScanConfig): void {
  // Update basic counts
  agg.count++;
  if (key.estBytes) {
    agg.estBytes += key.estBytes;
  }

  // Update TTL histogram
  const ttlLabel = getTTLBucketLabel(key.ttlMs, config.ttlBuckets);
  agg.ttlHist[ttlLabel] = (agg.ttlHist[ttlLabel] || 0) + 1;

  // Update idle histogram
  if (key.idleSec !== undefined) {
    const idleLabel = getIdleBucketLabel(key.idleSec, config.idleBuckets);
    agg.idleHist[idleLabel] = (agg.idleHist[idleLabel] || 0) + 1;
  }

  // Update by-type breakdown
  if (!agg.byType[key.type]) {
    agg.byType[key.type] = { count: 0, estBytes: 0 };
  }
  agg.byType[key.type].count++;
  if (key.estBytes) {
    agg.byType[key.type].estBytes += key.estBytes;
  }
}

function insertTopN(list: KeyMeta[], key: KeyMeta, maxSize: number): void {
  // Find insertion point (maintain sorted by estBytes descending)
  let insertIndex = list.length;
  for (let i = 0; i < list.length; i++) {
    if ((list[i].estBytes || 0) < (key.estBytes || 0)) {
      insertIndex = i;
      break;
    }
  }

  if (insertIndex < maxSize) {
    list.splice(insertIndex, 0, key);
    // Keep only top N
    if (list.length > maxSize) {
      list.splice(maxSize);
    }
  }
}

export function mergeAggregations(results: AggregationResult[]): AggregationResult {
  const mergedPrefixes = new Map<string, PrefixAgg>();
  const mergedTopN = new Map<string, KeyMeta[]>();

  for (const result of results) {
    // Merge prefixes
    for (const prefix of result.prefixes) {
      if (!mergedPrefixes.has(prefix.prefix)) {
        mergedPrefixes.set(prefix.prefix, { ...prefix });
      } else {
        const existing = mergedPrefixes.get(prefix.prefix)!;
        existing.count += prefix.count;
        existing.estBytes += prefix.estBytes;
        
        // Merge TTL histograms
        for (const [label, count] of Object.entries(prefix.ttlHist)) {
          existing.ttlHist[label] = (existing.ttlHist[label] || 0) + count;
        }
        
        // Merge idle histograms
        for (const [label, count] of Object.entries(prefix.idleHist)) {
          existing.idleHist[label] = (existing.idleHist[label] || 0) + count;
        }
        
        // Merge by-type breakdown
        for (const [type, stats] of Object.entries(prefix.byType)) {
          if (!existing.byType[type]) {
            existing.byType[type] = { count: 0, estBytes: 0 };
          }
          existing.byType[type].count += stats.count;
          existing.byType[type].estBytes += stats.estBytes;
        }
      }
    }

    // Merge top-N keys
    for (const [type, keys] of Object.entries(result.topN)) {
      if (!mergedTopN.has(type)) {
        mergedTopN.set(type, [...keys]);
      } else {
        const existing = mergedTopN.get(type)!;
        for (const key of keys) {
          insertTopN(existing, key, 20); // Keep top 20 per type
        }
      }
    }
  }

  return {
    prefixes: Array.from(mergedPrefixes.values()).sort((a, b) => b.estBytes - a.estBytes),
    topN: Object.fromEntries(mergedTopN)
  };
}
