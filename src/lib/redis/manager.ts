import Redis from 'ioredis';
import { ConnectionProfile } from '@/lib/types';

class RedisManager {
  private clients = new Map<string, Redis>();

  async createClient(profile: ConnectionProfile): Promise<Redis> {
    const clientId = profile.id;
    
    // Return existing client if available
    if (this.clients.has(clientId)) {
      const existing = this.clients.get(clientId)!;
      if (existing.status === 'ready') {
        return existing;
      }
      // Clean up disconnected client
      existing.disconnect();
      this.clients.delete(clientId);
    }

    let client: Redis;

    switch (profile.kind) {
      case 'standalone':
        client = new Redis({
          host: profile.host || '127.0.0.1',
          port: profile.port || 6379,
          password: profile.password,
          db: profile.db || 0,
          tls: profile.tls ? {} : undefined,
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
        });
        break;

      case 'cluster':
        if (!profile.clusterHosts || profile.clusterHosts.length === 0) {
          throw new Error('Cluster hosts required for cluster connection');
        }
        client = new Redis.Cluster(profile.clusterHosts, {
          password: profile.password,
          tls: profile.tls ? {} : undefined,
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
        });
        break;

      case 'sentinel':
        if (!profile.sentinel) {
          throw new Error('Sentinel configuration required for sentinel connection');
        }
        client = new Redis({
          sentinels: profile.sentinel.hosts,
          name: profile.sentinel.name,
          password: profile.password,
          sentinelPassword: profile.sentinel.password,
          db: profile.db || 0,
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
        });
        break;

      default:
        throw new Error(`Unsupported Redis connection kind: ${profile.kind}`);
    }

    // Set up error handling
    client.on('error', (error) => {
      console.error(`Redis client error for ${clientId}:`, error);
    });

    client.on('connect', () => {
      console.log(`Redis client connected: ${clientId}`);
    });

    client.on('close', () => {
      console.log(`Redis client disconnected: ${clientId}`);
      this.clients.delete(clientId);
    });

    // Connect and store
    await client.connect();
    this.clients.set(clientId, client);
    
    return client;
  }

  async getClient(profile: ConnectionProfile): Promise<Redis> {
    return this.createClient(profile);
  }

  async disconnect(profileId: string): Promise<void> {
    const client = this.clients.get(profileId);
    if (client) {
      await client.disconnect();
      this.clients.delete(profileId);
    }
  }

  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.clients.values()).map(client =>
      client.disconnect()
    );
    await Promise.all(disconnectPromises);
    this.clients.clear();
  }

  async ping(profile: ConnectionProfile): Promise<boolean> {
    try {
      const client = await this.getClient(profile);
      await client.ping();
      return true;
    } catch (error) {
      console.error('Redis ping failed:', error);
      return false;
    }
  }

  async getInfo(profile: ConnectionProfile): Promise<any> {
    const client = await this.getClient(profile);
    const info = await client.info();
    
    // Parse INFO response
    const lines = info.split('\r\n');
    const result: any = {};
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        result[key] = value;
      }
    }
    
    return result;
  }
}

export const redisManager = new RedisManager();
