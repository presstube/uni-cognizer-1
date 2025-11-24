import 'dotenv/config';
import { createServer } from 'http';
import { Server } from 'socket.io';
import express from 'express';
import { addPercept, startCognitiveLoop, stopCognitiveLoop, getHistory } from './src/main.js';
import { SessionManager } from './src/session-manager.js';
import { loadReferenceImage } from './src/sigil/image.js';
import { CognitiveState } from './src/cognitive-states.js';
import { initDatabase, closeDatabase } from './src/db/index.js';
import { runMigrations } from './src/db/migrate.js';
import { createSession as dbCreateSession, endSession as dbEndSession } from './src/db/sessions.js';
import { initializeCycleIndex, initializePersonality } from './src/real-cog.js';
import personalitiesAPI from './src/api/personalities.js';
import { editorAuth } from './src/api/editor-auth.js';
import * as sigilPrompts from './src/api/sigil-prompts.js';
import * as visualPrompts from './src/api/visual-prompts.js';
import * as audioPrompts from './src/api/audio-prompts.js';
import geminiTokenAPI from './src/api/gemini-token.js';

const PORT = process.env.PORT || 3001;
const SESSION_TIMEOUT_MS = process.env.SESSION_TIMEOUT_MS || 60000;

// Initialize database at startup
try {
  initDatabase();
  if (process.env.DATABASE_ENABLED === 'true') {
    await runMigrations();
    // Create UNI's session (singular continuous mind)
    await dbCreateSession('uni', { type: 'consciousness', note: "UNI's singular continuous mind" });
    // Initialize cycle counter from database to resume UNI's consciousness
    await initializeCycleIndex();
    // Initialize personality from database
    await initializePersonality();
  }
} catch (error) {
  console.error('Database initialization failed:', error.message);
  console.warn('⚠️  Continuing without database (in-memory only)');
}

// Create Express app for HTTP endpoints
const app = express();
app.use(express.json({ limit: '10mb' })); // Increased for base64 image uploads

// Unified auth for all prompt editors (production only)
app.use('/prompt-editor', editorAuth);

// Serve Personality Prompt Editor
app.use('/prompt-editor/personality', express.static('web/prompt-editor/personality'));

// Serve Sigil Prompt Editor
app.use('/prompt-editor/sigil', express.static('web/prompt-editor/sigil'));

// Serve Visual Percept Prompt Editor
app.use('/prompt-editor/visual-percept', express.static('web/prompt-editor/visual-percept'));

// Serve Audio Percept Prompt Editor
app.use('/prompt-editor/audio-percept', express.static('web/prompt-editor/audio-percept'));

// Serve shared assets (now under /web)
// Note: Need both /shared and /web/shared for different relative import contexts
app.use('/shared', express.static('web/shared'));          // For /see app (../shared/ resolves to /shared/)
app.use('/web/shared', express.static('web/shared'));      // For absolute refs in HTML/CSS

// User-facing apps (serve /see from web/see)
app.use('/see', express.static('web/see'));

// Legacy redirects (permanent 301)
app.get('/door/see', (req, res) => {
  res.redirect(301, '/see');
});

app.get('/forge', (req, res) => {
  res.redirect(301, '/prompt-editor/personality');
});

app.get('/personality-prompt-editor', (req, res) => {
  res.redirect(301, '/prompt-editor/personality');
});

app.get('/sigil-prompt-editor', (req, res) => {
  res.redirect(301, '/prompt-editor/sigil');
});

app.get('/visual-percept-prompt-editor', (req, res) => {
  res.redirect(301, '/prompt-editor/visual-percept');
});

// Serve assets (for reference image)
app.use('/assets', express.static('assets'));

// Mount Personalities API (with editor auth in production)
app.use('/api', editorAuth, personalitiesAPI);

// Mount Gemini Token API
app.use('/api', geminiTokenAPI);

// Mount Sigil Prompts API (with editor auth in production)
app.get('/api/sigil-prompts', editorAuth, sigilPrompts.listSigilPrompts);
app.get('/api/sigil-prompts/active', editorAuth, sigilPrompts.getActiveSigilPromptAPI);
app.get('/api/sigil-prompts/:id', editorAuth, sigilPrompts.getSigilPromptAPI);
app.post('/api/sigil-prompts', editorAuth, sigilPrompts.saveSigilPrompt);
app.post('/api/sigil-prompts/test-current', editorAuth, sigilPrompts.testCurrentPrompt);
app.post('/api/sigil-prompts/:id/activate', editorAuth, sigilPrompts.activateSigilPromptAPI);
app.post('/api/sigil-prompts/:id/test', editorAuth, sigilPrompts.testSigilPrompt);
app.delete('/api/sigil-prompts/:id', editorAuth, sigilPrompts.deleteSigilPromptAPI);

// Mount Visual Prompts API (with editor auth in production)
app.get('/api/visual-prompts', editorAuth, visualPrompts.listVisualPrompts);
app.get('/api/visual-prompts/active', editorAuth, visualPrompts.getActiveVisualPromptAPI);
app.get('/api/visual-prompts/:id', editorAuth, visualPrompts.getVisualPromptAPI);
app.post('/api/visual-prompts', editorAuth, visualPrompts.saveVisualPrompt);
app.post('/api/visual-prompts/:id/activate', editorAuth, visualPrompts.activateVisualPromptAPI);
app.delete('/api/visual-prompts/:id', editorAuth, visualPrompts.deleteVisualPromptAPI);

// Mount Audio Prompts API (with editor auth in production)
app.get('/api/audio-prompts', editorAuth, audioPrompts.listAudioPrompts);
app.get('/api/audio-prompts/active', editorAuth, audioPrompts.getActiveAudioPromptAPI);
app.get('/api/audio-prompts/:id', editorAuth, audioPrompts.getAudioPromptAPI);
app.post('/api/audio-prompts', editorAuth, audioPrompts.saveAudioPrompt);
app.post('/api/audio-prompts/:id/activate', editorAuth, audioPrompts.activateAudioPromptAPI);
app.delete('/api/audio-prompts/:id', editorAuth, audioPrompts.deleteAudioPromptAPI);

// Favicon (prevent 404)
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// Health check endpoint (required for Render)
app.get('/', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'Cognizer-1 WebSocket Server',
    version: '0.1.0',
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

// Create HTTP server with Express app
const httpServer = createServer(app);

// Attach Socket.io to the HTTP server
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

  socket.on('startSession', async ({ sessionId }) => {
    console.log(`▶️  Starting session: ${sessionId} (socket: ${socket.id})`);
    process.stdout.write(`▶️  CLIENT SESSION STARTED: ${sessionId}\n`);
    
    const session = sessionManager.startSession(sessionId);
    activeSessions.add(sessionId);
    socketToSession.set(socket.id, sessionId);
    
    // Create session in database
    if (process.env.DATABASE_ENABLED === 'true') {
      try {
        await dbCreateSession(sessionId);
      } catch (error) {
        console.error('Failed to create session in database:', error.message);
      }
    }
    
    // Start cognitive loop if not already running
    if (activeSessions.size === 1) {
      console.log('🚀 FIRST SESSION - STARTING COGNITIVE LOOP');
      process.stdout.write('🚀 COGNITIVE LOOP STARTING NOW\n');
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
          io.emit('cognitiveState', { state: CognitiveState.VISUALIZING });
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
            io.emit('cognitiveState', { state: CognitiveState.COGNIZING });
            // Detailed cycle event
            io.emit('cycleStarted', data);
          } else if (eventType === 'cycleCompleted') {
            // High-level state change
            io.emit('cognitiveState', { state: CognitiveState.AGGREGATING });
            // Detailed cycle event
            io.emit('cycleCompleted', data);
          } else if (eventType === 'cycleFailed') {
            // High-level state change
            io.emit('cognitiveState', { state: CognitiveState.AGGREGATING });
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
    
    // Broadcast percept to all clients (for read-only monitoring)
    io.emit('perceptReceived', {
      sessionId,
      type,
      data,
      timestamp: percept.timestamp || new Date().toISOString()
    });
  });

  socket.on('endSession', async ({ sessionId }) => {
    console.log(`⏸️  Ending session: ${sessionId}`);
    
    const session = sessionManager.endSession(sessionId);
    activeSessions.delete(sessionId);
    socketToSession.delete(socket.id);
    
    // End session in database
    if (process.env.DATABASE_ENABLED === 'true') {
      try {
        await dbEndSession(sessionId);
      } catch (error) {
        console.error('Failed to end session in database:', error.message);
      }
    }
    
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

  socket.on('getHistory', () => {
    // No session required - read-only operation
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
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  stopCognitiveLoop();
  
  // Close database connection
  await closeDatabase();
  
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});


