import { NextRequest, NextResponse } from 'next/server';
import { createRedisClient } from '../../../../lib/redis/client';

export async function POST(request: NextRequest) {
  try {
    const { key, connection } = await request.json();

    console.log('GET API called with:', { key, connectionId: connection?.id });

    if (!key) {
      return NextResponse.json({ ok: false, message: 'Key is required' }, { status: 400 });
    }

    if (!connection) {
      return NextResponse.json({ ok: false, message: 'Connection is required' }, { status: 400 });
    }

    const redis = createRedisClient(connection);

    // Get key type first
    const type = await redis.type(key);

    let value: string | Record<string, string> | string[] | [string, string][] | null;

    switch (type) {
      case 'string':
        value = await redis.get(key);
        break;
      case 'hash':
        value = await redis.hgetall(key);
        break;
      case 'list':
        value = await redis.lrange(key, 0, -1);
        break;
      case 'set':
        value = await redis.smembers(key);
        break;
      case 'zset':
        value = await redis.zrange(key, 0, -1, 'WITHSCORES');
        break;
      default:
        value = 'Unsupported data type';
    }

    await redis.disconnect();

    return NextResponse.json({
      ok: true,
      data: {
        key,
        type,
        value: value || null
      }
    });

  } catch (error) {
    console.error('Error getting Redis key:', error);
    return NextResponse.json(
      { ok: false, message: `Failed to get key value: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
