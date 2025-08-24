import { NextRequest, NextResponse } from 'next/server';

export function basicAuth(request: NextRequest): NextResponse | null {
  // Skip auth in development if not configured
  if (process.env.NODE_ENV === 'development' && !process.env.DASH_USER) {
    return null;
  }

  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return new NextResponse('Unauthorized', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Redis Heatmap"',
      },
    });
  }

  const credentials = Buffer.from(authHeader.slice(6), 'base64').toString();
  const [username, password] = credentials.split(':');

  const expectedUser = process.env.DASH_USER;
  const expectedPass = process.env.DASH_PASS;

  if (!expectedUser || !expectedPass) {
    console.warn('DASH_USER and DASH_PASS environment variables not set');
    return new NextResponse('Server configuration error', { status: 500 });
  }

  if (username !== expectedUser || password !== expectedPass) {
    return new NextResponse('Unauthorized', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Redis Heatmap"',
      },
    });
  }

  return null; // Auth successful
}

export function withAuth(handler: (request: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    const authResult = basicAuth(request);
    if (authResult) {
      return authResult;
    }
    return handler(request);
  };
}
