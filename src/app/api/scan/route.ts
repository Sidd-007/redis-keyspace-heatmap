import { sessionManager } from '@/lib/auth/session';
import { redisManager } from '@/lib/redis/manager';
import { aggregateKeys } from '@/lib/scan/prefixTree';
import { scanKeys } from '@/lib/scan/scanEngine';
import { ScanConfig, ScanResult } from '@/lib/types';
import { NextRequest, NextResponse } from 'next/server';

async function handler(request: NextRequest) {
  if (request.method !== 'POST') {
    return NextResponse.json(
      { ok: false, code: 'METHOD_NOT_ALLOWED', message: 'Only POST method allowed' },
      { status: 405 }
    );
  }

  try {
    let session = sessionManager.getSessionFromRequest(request);

    // Create a new session if none exists
    if (!session) {
      session = sessionManager.createSession();
    }

    const body = await request.json();
    const { connectionId, config } = body;

    if (!connectionId) {
      return NextResponse.json(
        { ok: false, code: 'MISSING_CONNECTION_ID', message: 'connectionId is required' },
        { status: 400 }
      );
    }

    if (!config) {
      return NextResponse.json(
        { ok: false, code: 'MISSING_CONFIG', message: 'config is required' },
        { status: 400 }
      );
    }

    // Get connection from session
    let connection = sessionManager.getConnection(session.id, connectionId);

    // If connection not found by ID, try to find it by name from the request body
    if (!connection && body.connectionName) {
      connection = sessionManager.getConnectionByName(session.id, body.connectionName);

      // If still not found, try to sync it from another session
      if (!connection) {
        const synced = sessionManager.syncConnectionToSession(session.id, body.connectionName);
        if (synced) {
          connection = sessionManager.getConnectionByName(session.id, body.connectionName);
        }
      }
    }

    if (!connection) {
      return NextResponse.json({
        ok: false,
        code: 'CONNECTION_NOT_FOUND',
        message: 'Connection not found in session. Please add a connection first.'
      }, { status: 404 });
    }

    // Validate and set defaults for config
    const scanConfig: ScanConfig = {
      dbs: config.dbs || [0],
      sampleLimit: config.sampleLimit || 50000,
      scanCount: config.scanCount || 1000,
      ttlBuckets: config.ttlBuckets || [0, 60, 300, 1800, 3600, 21600, 86400],
      idleBuckets: config.idleBuckets || [0, 60, 300, 3600, 21600, 86400],
      sizeTopN: config.sizeTopN || 20
    };

    // Get Redis client
    const client = await redisManager.getClient(connection);

    // Perform scan
    const scanResult = await scanKeys(client, scanConfig, connection);

    // Aggregate results
    const aggregationResult = aggregateKeys(
      scanResult.keys,
      scanConfig,
      connection.keyDelimiter || ':'
    );

    // Build final result
    const result: ScanResult = {
      sampleStats: scanResult.stats,
      aggregates: {
        prefixes: aggregationResult.prefixes
      },
      topN: aggregationResult.topN
    };

    const response = NextResponse.json({ ok: true, data: result });

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
    console.error('Scan error:', error);
    return NextResponse.json(
      {
        ok: false,
        code: 'SCAN_ERROR',
        message: 'Failed to perform scan',
        hint: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export const POST = handler;
