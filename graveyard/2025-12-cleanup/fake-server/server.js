import 'dotenv/config';
import { createServer } from 'http';
import { Server } from 'socket.io';
import express from 'express';
import { addPercept, startCognitiveLoop, stopCognitiveLoop, getHistory, initializeCycleIndex } from './main-server.js';
import { SessionManager } from '../session-manager.js';
import { CognitiveState } from '../cognitive-states.js';
import { initDatabase, closeDatabase } from '../db/index.js';
import { runMigrations } from '../db/migrate.js';
import { createSession as dbCreateSession, endSession as dbEndSession } from '../db/sessions.js';
import { perceptToPNG } from '../percepts/percept-to-png.js';

const PORT = process.env.PORT || 3001;
const SESSION_TIMEOUT_MS = process.env.SESSION_TIMEOUT_MS || 60000;

// Initialize database at startup
try {
  initDatabase();
  if (process.env.DATABASE_ENABLED === 'true') {
    await runMigrations();
    await dbCreateSession('uni', { type: 'consciousness', note: "UNI's singular continuous mind (fake)" });
    await initializeCycleIndex();
  }
} catch (error) {
  console.error('Database initialization failed:', error.message);
  console.warn('⚠️  Continuing without database (in-memory only)');
}

// Create Express app for HTTP endpoints
const app = express();
app.use(express.json());

// Serve web clients (same as real server)
app.use('/perceptor-remote', express.static('web/perceptor-remote'));
app.use('/perceptor-circumplex', express.static('web/perceptor-circumplex'));
app.use('/dashboard', express.static('web/dashboard'));
app.use('/node_modules', express.static('node_modules'));
app.use('/shared', express.static('web/shared'));
app.use('/web/shared', express.static('web/shared'));

app.get('/', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'Cognizer-1 Fake WebSocket Server',
    version: '0.1.0',
    mode: 'fake',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
});

const sessionManager = new SessionManager(SESSION_TIMEOUT_MS, (sessionId) => {
  console.log(`⏰ Cleaning up timed out session: ${sessionId}`);
  activeSessions.delete(sessionId);
  socketToSession.forEach((sid, socketId) => {
    if (sid === sessionId) socketToSession.delete(socketId);
  });
  
  if (activeSessions.size === 0) {
    stopCognitiveLoop();
  }
  
  io.emit('sessionTimeout', { sessionId });
});
let activeSessions = new Set();
let socketToSession = new Map();

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on('startSession', async ({ sessionId }) => {
    console.log(`▶️  Starting session: ${sessionId} (socket: ${socket.id})`);
    
    const session = sessionManager.startSession(sessionId);
    activeSessions.add(sessionId);
    socketToSession.set(socket.id, sessionId);
    
    if (process.env.DATABASE_ENABLED === 'true') {
      try {
        await dbCreateSession(sessionId);
      } catch (error) {
        console.error('Failed to create session in database:', error.message);
      }
    }
    
    if (activeSessions.size === 1) {
      startCognitiveLoop(
        (cycle, mindMoment, visualPercepts, audioPercepts, priorMoments, sigilPhrase, kinetic, lighting) => {
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
          
          io.emit('cognitiveState', { state: CognitiveState.VISUALIZING });
        },
        (cycle, sigilCode, sigilPhrase, sigilSDF) => {
          const sigilData = {
            cycle,
            sigilCode,
            sigilPhrase,
            timestamp: new Date().toISOString()
          };
          
          // Include SDF if available (as base64 for transport)
          if (sigilSDF && sigilSDF.data) {
            sigilData.sdf = {
              width: sigilSDF.width,
              height: sigilSDF.height,
              data: Buffer.from(sigilSDF.data).toString('base64')
            };
          }
          
          io.emit('sigil', sigilData);
        },
        (eventType, data) => {
          if (eventType === 'cycleStarted') {
            io.emit('cognitiveState', { state: CognitiveState.COGNIZING });
            io.emit('cycleStarted', data);
          } else if (eventType === 'cycleCompleted') {
            io.emit('cognitiveState', { state: CognitiveState.AGGREGATING });
            io.emit('cycleCompleted', data);
          } else if (eventType === 'cycleFailed') {
            io.emit('cognitiveState', { state: CognitiveState.AGGREGATING });
            io.emit('cycleFailed', data);
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

  socket.on('percept', async (percept) => {
    const { sessionId, type, data } = percept;
    
    if (!sessionId || !sessionManager.getSession(sessionId)) {
      socket.emit('error', { message: 'Invalid or expired session' });
      return;
    }
    
    sessionManager.updateActivity(sessionId);
    
    // Generate PNG immediately if percept has canvas code
    const perceptWithPNG = { ...data };
    try {
      const canvasCode = data.drawCalls || data.sigilDrawCalls;
      if (canvasCode) {
        const png = await perceptToPNG({ ...data });
        perceptWithPNG.pngData = png.data.toString('base64');
        perceptWithPNG.pngWidth = png.width;
        perceptWithPNG.pngHeight = png.height;
        console.log(`🖼️  Generated percept PNG (${type})`);
      }
    } catch (error) {
      console.warn(`⚠️  Failed to generate percept PNG:`, error.message);
      // Continue without PNG - don't block percept
    }
    
    addPercept({
      type,
      ...perceptWithPNG,
      timestamp: percept.timestamp || new Date().toISOString()
    });
    
    const session = sessionManager.getSession(sessionId);
    session.perceptCount++;
    
    io.emit('perceptReceived', {
      sessionId,
      type,
      data: perceptWithPNG,
      timestamp: percept.timestamp || new Date().toISOString()
    });
  });

  socket.on('endSession', async ({ sessionId }) => {
    console.log(`⏸️  Ending session: ${sessionId}`);
    
    const session = sessionManager.endSession(sessionId);
    activeSessions.delete(sessionId);
    socketToSession.delete(socket.id);
    
    if (process.env.DATABASE_ENABLED === 'true') {
      try {
        await dbEndSession(sessionId);
      } catch (error) {
        console.error('Failed to end session in database:', error.message);
      }
    }
    
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

  socket.on('getHistory', () => {
    socket.emit('history', { 
      history: getHistory(),
      timestamp: new Date().toISOString()
    });
  });

  socket.on('disconnect', () => {
    const sessionId = socketToSession.get(socket.id);
    if (sessionId) {
      console.log(`🔌 Client disconnected (socket: ${socket.id}), ending session: ${sessionId}`);
      
      sessionManager.endSession(sessionId);
      activeSessions.delete(sessionId);
      socketToSession.delete(socket.id);
      
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
  console.log('║  COGNIZER-1 Fake WebSocket Server                        ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`🌐 Listening on port ${PORT}`);
  console.log(`⏱️  Session timeout: ${SESSION_TIMEOUT_MS}ms`);
  console.log(`🧵 Context depth: 3 prior mind moments`);
  console.log(`🎭 Mode: FAKE (mock LLM, no API costs)`);
  console.log('');
  console.log('Ready for connections...\n');
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  stopCognitiveLoop();
  await closeDatabase();
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});




