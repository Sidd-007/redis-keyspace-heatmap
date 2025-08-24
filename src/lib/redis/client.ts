import { ConnectionProfile } from '@/lib/types';
import Redis, { Cluster } from 'ioredis';

export function createRedisClient(connection: ConnectionProfile): Redis | Cluster {
    let client: Redis | Cluster;

    switch (connection.kind) {
        case 'standalone':
            client = new Redis({
                host: connection.host || '127.0.0.1',
                port: connection.port || 6379,
                password: connection.password,
                db: connection.db || 0,
                tls: connection.tls ? {} : undefined,
                maxRetriesPerRequest: 3,
                lazyConnect: true,
            });
            break;

        case 'cluster':
            if (!connection.clusterHosts || connection.clusterHosts.length === 0) {
                throw new Error('Cluster hosts required for cluster connection');
            }
            client = new Redis.Cluster(connection.clusterHosts, {
                redisOptions: {
                    password: connection.password,
                    tls: connection.tls ? {} : undefined,
                    maxRetriesPerRequest: 3,
                    lazyConnect: true,
                }
            });
            break;

        case 'sentinel':
            if (!connection.sentinel) {
                throw new Error('Sentinel configuration required for sentinel connection');
            }
            client = new Redis({
                sentinels: connection.sentinel.hosts,
                name: connection.sentinel.name,
                password: connection.password,
                sentinelPassword: connection.sentinel.password,
                db: connection.db || 0,
                maxRetriesPerRequest: 3,
                lazyConnect: true,
            });
            break;

        default:
            throw new Error(`Unsupported Redis connection kind: ${connection.kind}`);
    }

    // Set up error handling
    client.on('error', (error) => {
        console.error('Redis client error:', error);
    });

    client.on('connect', () => {
        console.log('Redis client connected');
    });

    client.on('close', () => {
        console.log('Redis client disconnected');
    });

    return client;
}
