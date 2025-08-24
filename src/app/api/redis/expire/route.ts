import { sessionManager } from '@/lib/auth/session';
import { redisManager } from '@/lib/redis/manager';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        let session = sessionManager.getSessionFromRequest(request);

        // Create a new session if none exists
        if (!session) {
            session = sessionManager.createSession();
        }

        const { key, ttl, connectionId, db } = await request.json();

        if (!key) {
            return NextResponse.json({ ok: false, message: 'Key is required' }, { status: 400 });
        }

        if (ttl === undefined || ttl === null) {
            return NextResponse.json({ ok: false, message: 'TTL is required' }, { status: 400 });
        }

        if (!connectionId) {
            return NextResponse.json({ ok: false, message: 'Connection ID is required' }, { status: 400 });
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
                message: 'Connection not found in session'
            }, { status: 404 });
        }

        const redis = await redisManager.getClient(connection);

        // Check if key exists
        const exists = await redis.exists(key);
        if (!exists) {
            return NextResponse.json({ ok: false, message: 'Key does not exist' }, { status: 404 });
        }

        let result: number;

        if (ttl === 0) {
            // Remove TTL (make persistent)
            result = await redis.persist(key);
        } else {
            // Set TTL
            result = await redis.expire(key, ttl);
        }

        if (result === 1) {
            const action = ttl === 0 ? 'removed' : 'set';
            const response = NextResponse.json({
                ok: true,
                message: `TTL ${action} successfully for key '${key}'`
            });

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
        } else {
            return NextResponse.json({
                ok: false,
                message: 'Failed to set TTL'
            }, { status: 500 });
        }

    } catch (error) {
        console.error('Error setting TTL:', error);
        return NextResponse.json(
            { ok: false, message: 'Failed to set TTL' },
            { status: 500 }
        );
    }
}
