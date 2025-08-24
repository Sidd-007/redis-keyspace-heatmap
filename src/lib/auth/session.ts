import { ConnectionProfile } from '@/lib/types';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

export interface UserSession {
  id: string;
  connections: ConnectionProfile[];
  createdAt: number;
  lastActive: number;
}

class SessionManager {
  private sessions = new Map<string, UserSession>();
  private readonly SESSION_COOKIE = 'redis-heatmap-session';
  private readonly SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours

  generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  createSession(): UserSession {
    const sessionId = this.generateSessionId();
    const session: UserSession = {
      id: sessionId,
      connections: [],
      createdAt: Date.now(),
      lastActive: Date.now()
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  getSession(sessionId: string): UserSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    // Check if session is expired
    if (Date.now() - session.lastActive > this.SESSION_TTL) {
      this.sessions.delete(sessionId);
      return null;
    }

    // Update last active time
    session.lastActive = Date.now();
    return session;
  }

  updateSession(sessionId: string, updates: Partial<UserSession>): boolean {
    const session = this.getSession(sessionId);
    if (!session) return false;

    Object.assign(session, updates);
    session.lastActive = Date.now();
    return true;
  }

  addConnection(sessionId: string, connection: ConnectionProfile): boolean {
    const session = this.getSession(sessionId);
    if (!session) return false;

    // Generate unique ID for connection
    connection.id = crypto.randomBytes(16).toString('hex');

    // Remove existing connection with same name if exists
    session.connections = session.connections.filter(c => c.name !== connection.name);

    session.connections.push(connection);
    session.lastActive = Date.now();
    return true;
  }

  removeConnection(sessionId: string, connectionId: string): boolean {
    const session = this.getSession(sessionId);
    if (!session) return false;

    session.connections = session.connections.filter(c => c.id !== connectionId);
    session.lastActive = Date.now();
    return true;
  }

  getConnection(sessionId: string, connectionId: string): ConnectionProfile | null {
    const session = this.getSession(sessionId);
    if (!session) return null;

    return session.connections.find(c => c.id === connectionId) || null;
  }

  getConnectionByName(sessionId: string, connectionName: string): ConnectionProfile | null {
    const session = this.getSession(sessionId);
    if (!session) return null;

    return session.connections.find(c => c.name === connectionName) || null;
  }

  // Sync a connection to the current session if it exists in any session
  syncConnectionToSession(sessionId: string, connectionName: string): boolean {
    const session = this.getSession(sessionId);
    if (!session) return false;

    // Check if connection already exists in this session
    if (session.connections.find(c => c.name === connectionName)) {
      return true;
    }

    // Find the connection in any other session
    for (const [otherSessionId, otherSession] of this.sessions.entries()) {
      if (otherSessionId === sessionId) continue;

      const connection = otherSession.connections.find(c => c.name === connectionName);
      if (connection) {
        // Copy the connection to the current session
        const newConnection = { ...connection };
        newConnection.id = crypto.randomBytes(16).toString('hex'); // Generate new ID
        session.connections.push(newConnection);
        session.lastActive = Date.now();
        return true;
      }
    }

    return false;
  }

  cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActive > this.SESSION_TTL) {
        this.sessions.delete(sessionId);
      }
    }
  }

  // Cookie helpers
  getSessionFromRequest(request: NextRequest): UserSession | null {
    const sessionId = request.cookies.get(this.SESSION_COOKIE)?.value;
    if (!sessionId) return null;
    return this.getSession(sessionId);
  }

  setSessionCookie(sessionId: string): string {
    return `${this.SESSION_COOKIE}=${sessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${this.SESSION_TTL / 1000}`;
  }

  clearSessionCookie(): string {
    return `${this.SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
  }
}

export const sessionManager = new SessionManager();

// Clean up expired sessions every hour
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    sessionManager.cleanupExpiredSessions();
  }, 60 * 60 * 1000); // 1 hour
}
