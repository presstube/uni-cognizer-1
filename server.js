import 'dotenv/config';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { addPercept, startCognitiveLoop, stopCognitiveLoop, getHistory } from './src/main.js';
import { SessionManager } from './src/session-manager.js';

const PORT = process.env.PORT || 3001;
const SESSION_TIMEOUT_MS = process.env.SESSION_TIMEOUT_MS || 60000;

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
});

const sessionManager = new SessionManager(SESSION_TIMEOUT_MS);
let activeSessions = new Set();

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on('startSession', ({ sessionId }) => {
    console.log(`▶️  Starting session: ${sessionId}`);
    
    const session = sessionManager.startSession(sessionId);
    activeSessions.add(sessionId);
    
    // Start cognitive loop if not already running
    if (activeSessions.size === 1) {
      startCognitiveLoop((cycle, mindMoment, visualPercepts, audioPercepts, priorMoments, sigilPhrase) => {
        // Broadcast mind moment to all clients
        io.emit('mindMoment', {
          cycle,
          mindMoment,
          sigilPhrase,
          timestamp: new Date().toISOString(),
          sessionId
        });
      });
    }
    
    socket.emit('sessionStarted', { sessionId, startTime: session.startTime });
  });

  socket.on('percept', (percept) => {
    const { sessionId, type, data } = percept;
    
    if (!sessionId || !sessionManager.getSession(sessionId)) {
      socket.emit('error', { message: 'Invalid or expired session' });
      return;
    }
    
    // Update session activity
    sessionManager.updateActivity(sessionId);
    
    // Add percept to queue
    addPercept({
      type,
      ...data,
      timestamp: percept.timestamp || new Date().toISOString()
    });
    
    const session = sessionManager.getSession(sessionId);
    session.perceptCount++;
  });

  socket.on('endSession', ({ sessionId }) => {
    console.log(`⏸️  Ending session: ${sessionId}`);
    
    const session = sessionManager.endSession(sessionId);
    activeSessions.delete(sessionId);
    
    // Stop cognitive loop if no active sessions
    if (activeSessions.size === 0) {
      stopCognitiveLoop();
    }
    
    socket.emit('sessionEnded', { 
      sessionId, 
      duration: session ? Date.now() - session.startTime : 0,
      perceptCount: session ? session.perceptCount : 0
    });
  });

  socket.on('getHistory', ({ sessionId }) => {
    const history = getHistory();
    socket.emit('history', { sessionId, history });
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  COGNIZER-1 WebSocket Server                             ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`🌐 Listening on port ${PORT}`);
  console.log(`⏱️  Session timeout: ${SESSION_TIMEOUT_MS}ms`);
  console.log(`🧵 Context depth: 3 prior mind moments`);
  console.log('');
  console.log('Ready for connections...\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  stopCognitiveLoop();
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});


