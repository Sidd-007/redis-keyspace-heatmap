import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function getTTLBucketLabel(ttlMs: number | null, buckets: number[]): string {
  if (ttlMs === null) return 'persistent';
  if (ttlMs === 0) return '0-60s';

  const ttlSec = Math.floor(ttlMs / 1000);

  for (let i = 0; i < buckets.length - 1; i++) {
    if (ttlSec >= buckets[i] && ttlSec < buckets[i + 1]) {
      const start = formatTime(buckets[i]);
      const end = formatTime(buckets[i + 1]);
      return `${start}-${end}`;
    }
  }

  return `>${formatTime(buckets[buckets.length - 1])}`;
}

export function getIdleBucketLabel(idleSec: number, buckets: number[]): string {
  if (idleSec === 0) return '0-1m';

  for (let i = 0; i < buckets.length - 1; i++) {
    if (idleSec >= buckets[i] && idleSec < buckets[i + 1]) {
      const start = formatTime(buckets[i]);
      const end = formatTime(buckets[i + 1]);
      return `${start}-${end}`;
    }
  }

  return `>${formatTime(buckets[buckets.length - 1])}`;
}

export function generateColorScale(min: number, max: number): (value: number) => string {
  return (value: number) => {
    const normalized = (value - min) / (max - min);
    const intensity = Math.floor(normalized * 255);
    return `rgb(255, ${255 - intensity}, ${255 - intensity})`;
  };
}
