import { sessionManager } from '@/lib/auth/session';
import { redisManager } from '@/lib/redis/manager';
import { RedisInfo } from '@/lib/types';
import { NextRequest, NextResponse } from 'next/server';

async function handler(request: NextRequest) {
  try {
    let session = sessionManager.getSessionFromRequest(request);

    // Create a new session if none exists
    if (!session) {
      session = sessionManager.createSession();
    }

    // Get connection ID from query params
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');

    if (!connectionId) {
      return NextResponse.json({
        ok: false,
        code: 'MISSING_CONNECTION_ID',
        message: 'connectionId is required'
      }, { status: 400 });
    }

    // Get connection from session
    let connection = sessionManager.getConnection(session.id, connectionId);

    // If connection not found by ID, try to find it by name from query params
    if (!connection) {
      const connectionName = searchParams.get('connectionName');
      if (connectionName) {
        connection = sessionManager.getConnectionByName(session.id, connectionName);

        // If still not found, try to sync it from another session
        if (!connection) {
          const synced = sessionManager.syncConnectionToSession(session.id, connectionName);
          if (synced) {
            connection = sessionManager.getConnectionByName(session.id, connectionName);
          }
        }
      }
    }

    if (!connection) {
      return NextResponse.json({
        ok: false,
        code: 'CONNECTION_NOT_FOUND',
        message: 'Connection not found in session'
      }, { status: 404 });
    }

    const info = await redisManager.getInfo(connection);

    // Extract relevant info
    const redisInfo: RedisInfo = {
      redis_version: info.redis_version || 'unknown',
      used_memory_human: info.used_memory_human || '0B',
      keyspace: {},
      notify_keyspace_events: info.notify_keyspace_events || ''
    };

    // Parse keyspace info
    Object.keys(info).forEach(key => {
      if (key.startsWith('db')) {
        const dbInfo = info[key];
        const keysMatch = dbInfo.match(/keys=(\d+)/);
        const expiresMatch = dbInfo.match(/expires=(\d+)/);

        if (keysMatch && expiresMatch) {
          redisInfo.keyspace[key] = {
            keys: parseInt(keysMatch[1]),
            expires: parseInt(expiresMatch[1])
          };
        }
      }
    });

    const response = NextResponse.json({ ok: true, data: redisInfo });

    // Set session cookie if this is a new session
    if (!request.cookies.get('redis-heatmap-session')) {
      response.cookies.set('redis-heatmap-session', session.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 // 24 hours
      });
    }

    return response;
  } catch (error) {
    console.error('Redis info error:', error);
    return NextResponse.json(
      {
        ok: false,
        code: 'REDIS_ERROR',
        message: 'Failed to get Redis info',
        hint: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export const GET = handler;
