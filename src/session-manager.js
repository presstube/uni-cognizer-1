export class SessionManager {
  constructor(timeoutMs = 60000, onTimeout = null) {
    this.sessions = new Map();
    this.timeoutMs = timeoutMs;
    this.onTimeout = onTimeout;
  }

  startSession(sessionId) {
    if (this.sessions.has(sessionId)) {
      this.resetTimeout(sessionId);
      return this.sessions.get(sessionId);
    }

    const session = {
      id: sessionId,
      startTime: Date.now(),
      lastActivity: Date.now(),
      perceptCount: 0,
      cognitiveHistory: {},
      timeoutId: null
    };

    this.sessions.set(sessionId, session);
    this.resetTimeout(sessionId);
    return session;
  }

  resetTimeout(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    if (session.timeoutId) clearTimeout(session.timeoutId);

    session.timeoutId = setTimeout(() => {
      console.log(`⏰ Session ${sessionId} timed out due to inactivity`);
      if (this.onTimeout) {
        this.onTimeout(sessionId);
      }
      this.endSession(sessionId);
    }, this.timeoutMs);
  }

  endSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    if (session.timeoutId) clearTimeout(session.timeoutId);
    
    console.log(`🛑 Session ${sessionId} ended after ${Date.now() - session.startTime}ms`);
    
    this.sessions.delete(sessionId);
    return session;
  }

  updateActivity(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = Date.now();
      this.resetTimeout(sessionId);
    }
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  getAllSessions() {
    return Array.from(this.sessions.values());
  }
}


