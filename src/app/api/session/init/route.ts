import { sessionManager } from '@/lib/auth/session';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    let session = sessionManager.getSessionFromRequest(request);
    
    // Create a new session if none exists
    if (!session) {
      session = sessionManager.createSession();
    }

    const response = NextResponse.json({
      ok: true,
      data: {
        sessionId: session.id,
        connections: session.connections,
        createdAt: session.createdAt,
        lastActive: session.lastActive
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
    console.error('Session init error:', error);
    return NextResponse.json({
      ok: false,
      code: 'SERVER_ERROR',
      message: 'Failed to initialize session'
    }, { status: 500 });
  }
}
