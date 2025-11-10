import 'dotenv/config';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { addPercept, startCognitiveLoop, stopCognitiveLoop, getHistory } from './src/main.js';
import { SessionManager } from './src/session-manager.js';
import { loadReferenceImage } from './src/sigil/image.js';

const PORT = process.env.PORT || 3001;
const SESSION_TIMEOUT_MS = process.env.SESSION_TIMEOUT_MS || 60000;

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
});

const sessionManager = new SessionManager(SESSION_TIMEOUT_MS, (sessionId) => {
  // Session timed out - clean up server state
  console.log(`⏰ Cleaning up timed out session: ${sessionId}`);
  activeSessions.delete(sessionId);
  socketToSession.forEach((sid, socketId) => {
    if (sid === sessionId) socketToSession.delete(socketId);
  });
  
  // Stop cognitive loop if no active sessions
  if (activeSessions.size === 0) {
    stopCognitiveLoop();
  }
  
  // Notify all clients about timeout
  io.emit('sessionTimeout', { sessionId });
});
let activeSessions = new Set();
let socketToSession = new Map(); // Track socket.id -> sessionId mapping

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on('startSession', ({ sessionId }) => {
    console.log(`▶️  Starting session: ${sessionId} (socket: ${socket.id})`);
    
    const session = sessionManager.startSession(sessionId);
    activeSessions.add(sessionId);
    socketToSession.set(socket.id, sessionId);
    
    // Start cognitive loop if not already running
    if (activeSessions.size === 1) {
      startCognitiveLoop(
        // Mind moment callback
        (cycle, mindMoment, visualPercepts, audioPercepts, priorMoments, sigilPhrase, kinetic, lighting) => {
          // Broadcast mind moment once to all connected clients
          io.emit('mindMoment', {
            cycle,
            mindMoment,
            sigilPhrase,
            kinetic,
            lighting,
            visualPercepts,
            audioPercepts,
            priorMoments,
            timestamp: new Date().toISOString()
          });
          
          // Transition to VISUALIZING state after mind moment
          io.emit('cognitiveState', { state: 'VISUALIZING' });
        },
        // Sigil callback
        (cycle, sigilCode, sigilPhrase) => {
          // Broadcast sigil once to all connected clients
          io.emit('sigil', {
            cycle,
            sigilCode,
            sigilPhrase,
            timestamp: new Date().toISOString()
          });
        },
        // State event callback
        (eventType, data) => {
          // Broadcast state events to all connected clients
          if (eventType === 'cycleStarted') {
            // High-level state change
            io.emit('cognitiveState', { state: 'COGNIZING' });
            // Detailed cycle event
            io.emit('cycleStarted', data);
          } else if (eventType === 'cycleCompleted') {
            // High-level state change
            io.emit('cognitiveState', { state: 'READY' });
            // Detailed cycle event
            io.emit('cycleCompleted', data);
          } else if (eventType === 'cycleFailed') {
            // High-level state change
            io.emit('cognitiveState', { state: 'READY' });
            // Detailed cycle event
            io.emit('cycleFailed', data);
          } else if (eventType === 'sigilFailed') {
            // Sigil generation failed (optional notification)
            io.emit('sigilFailed', data);
          }
        }
      );
    }
    
    socket.emit('sessionStarted', { 
      sessionId, 
      startTime: session.startTime,
      cognitiveCycleMs: process.env.COGNITIVE_CYCLE_MS || 5000
    });
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
    socketToSession.delete(socket.id);
    
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

  socket.on('ping', ({ sessionId }) => {
    const session = sessionManager.getSession(sessionId);
    socket.emit('pong', { 
      sessionId, 
      valid: !!session 
    });
  });

  socket.on('getHistory', ({ sessionId }) => {
    if (!sessionId || !sessionManager.getSession(sessionId)) {
      socket.emit('error', { message: 'Invalid or expired session' });
      return;
    }
    
    socket.emit('history', { 
      history: getHistory(),
      timestamp: new Date().toISOString()
    });
  });

  socket.on('disconnect', () => {
    const sessionId = socketToSession.get(socket.id);
    if (sessionId) {
      console.log(`🔌 Client disconnected (socket: ${socket.id}), ending session: ${sessionId}`);
      
      // Clean up session
      sessionManager.endSession(sessionId);
      activeSessions.delete(sessionId);
      socketToSession.delete(socket.id);
      
      // Stop cognitive loop if no active sessions
      if (activeSessions.size === 0) {
        stopCognitiveLoop();
      }
    } else {
      console.log(`🔌 Client disconnected: ${socket.id} (no active session)`);
    }
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
  
  // Load sigil reference image
  const sigilImage = loadReferenceImage();
  console.log(`🎨 Sigil reference image: ${sigilImage ? '✓ loaded' : '✗ not found'}`);
  
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


