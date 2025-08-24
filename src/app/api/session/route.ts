import { sessionManager } from '@/lib/auth/session';
import { redisManager } from '@/lib/redis/manager';
import { ConnectionValidator } from '@/lib/validation/connection';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = sessionManager.getSessionFromRequest(request);

    if (!session) {
      return NextResponse.json({
        ok: false,
        code: 'NO_SESSION',
        message: 'No active session found'
      }, { status: 401 });
    }

    return NextResponse.json({
      ok: true,
      data: {
        sessionId: session.id,
        connections: session.connections,
        createdAt: session.createdAt,
        lastActive: session.lastActive
      }
    });
  } catch (error) {
    console.error('Session GET error:', error);
    return NextResponse.json({
      ok: false,
      code: 'SERVER_ERROR',
      message: 'Failed to get session'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, connection } = body;

    let session = sessionManager.getSessionFromRequest(request);

    // Create new session if none exists
    if (!session) {
      session = sessionManager.createSession();
    }

    switch (action) {
      case 'add_connection': {
        if (!connection) {
          return NextResponse.json({
            ok: false,
            code: 'MISSING_CONNECTION',
            message: 'Connection details are required'
          }, { status: 400 });
        }

        // Validate connection
        const validation = ConnectionValidator.validateConnection(connection);
        if (!validation.valid) {
          return NextResponse.json({
            ok: false,
            code: 'VALIDATION_ERROR',
            message: 'Connection validation failed',
            errors: validation.errors
          }, { status: 400 });
        }

        // Test connection before saving
        try {
          const sanitizedConnection = ConnectionValidator.sanitizeConnection(connection);
          const isConnected = await redisManager.ping(sanitizedConnection);

          if (!isConnected) {
            return NextResponse.json({
              ok: false,
              code: 'CONNECTION_FAILED',
              message: 'Failed to connect to Redis instance'
            }, { status: 400 });
          }

          // Add connection to session
          const success = sessionManager.addConnection(session.id, sanitizedConnection);
          if (!success) {
            return NextResponse.json({
              ok: false,
              code: 'SESSION_ERROR',
              message: 'Failed to save connection to session'
            }, { status: 500 });
          }

          const response = NextResponse.json({
            ok: true,
            data: {
              connection: sanitizedConnection,
              message: 'Connection added successfully'
            }
          });

          response.cookies.set('redis-heatmap-session', session.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 // 24 hours
          });

          return response;
        } catch (error) {
          console.error('Connection test failed:', error);
          return NextResponse.json({
            ok: false,
            code: 'CONNECTION_ERROR',
            message: 'Failed to test Redis connection',
            hint: error instanceof Error ? error.message : 'Unknown error'
          }, { status: 400 });
        }
      }

      case 'remove_connection': {
        const { connectionId } = body;
        if (!connectionId) {
          return NextResponse.json({
            ok: false,
            code: 'MISSING_CONNECTION_ID',
            message: 'Connection ID is required'
          }, { status: 400 });
        }

        const success = sessionManager.removeConnection(session.id, connectionId);
        if (!success) {
          return NextResponse.json({
            ok: false,
            code: 'CONNECTION_NOT_FOUND',
            message: 'Connection not found in session'
          }, { status: 404 });
        }

        return NextResponse.json({
          ok: true,
          data: {
            message: 'Connection removed successfully'
          }
        });
      }

      case 'test_connection': {
        if (!connection) {
          return NextResponse.json({
            ok: false,
            code: 'MISSING_CONNECTION',
            message: 'Connection details are required'
          }, { status: 400 });
        }

        // Validate connection
        const validation = ConnectionValidator.validateConnection(connection);
        if (!validation.valid) {
          return NextResponse.json({
            ok: false,
            code: 'VALIDATION_ERROR',
            message: 'Connection validation failed',
            errors: validation.errors
          }, { status: 400 });
        }

        // Test connection
        try {
          const sanitizedConnection = ConnectionValidator.sanitizeConnection(connection);
          const isConnected = await redisManager.ping(sanitizedConnection);

          if (!isConnected) {
            return NextResponse.json({
              ok: false,
              code: 'CONNECTION_FAILED',
              message: 'Failed to connect to Redis instance'
            }, { status: 400 });
          }

          const response = NextResponse.json({
            ok: true,
            data: {
              message: 'Connection test successful'
            }
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
        } catch (error) {
          console.error('Connection test failed:', error);
          return NextResponse.json({
            ok: false,
            code: 'CONNECTION_ERROR',
            message: 'Failed to test Redis connection',
            hint: error instanceof Error ? error.message : 'Unknown error'
          }, { status: 400 });
        }
      }

      default:
        return NextResponse.json({
          ok: false,
          code: 'INVALID_ACTION',
          message: 'Invalid action specified'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Session POST error:', error);
    return NextResponse.json({
      ok: false,
      code: 'SERVER_ERROR',
      message: 'Failed to process session request'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = sessionManager.getSessionFromRequest(request);

    if (!session) {
      return NextResponse.json({
        ok: false,
        code: 'NO_SESSION',
        message: 'No active session found'
      }, { status: 401 });
    }

    // Clear session
    sessionManager.updateSession(session.id, { connections: [] });

    const response = NextResponse.json({
      ok: true,
      data: {
        message: 'Session cleared successfully'
      }
    });

    response.cookies.set('redis-heatmap-session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0
    });

    return response;
  } catch (error) {
    console.error('Session DELETE error:', error);
    return NextResponse.json({
      ok: false,
      code: 'SERVER_ERROR',
      message: 'Failed to clear session'
    }, { status: 500 });
  }
}
