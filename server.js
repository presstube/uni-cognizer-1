import 'dotenv/config';
import { createServer } from 'http';
import { Server } from 'socket.io';
import express from 'express';
import { ConsciousnessLoop } from './src/consciousness-loop.js';
import { SessionManager } from './src/session-manager.js';
import { loadReferenceImage } from './src/sigil/image.js';
import { CognitiveState, ConsciousnessMode } from './src/cognitive-states.js';
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
import mindMomentsAPI from './src/api/mind-moments-api.js';
import { registerSigilAPI } from './src/api/sigils-api.js';

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

// Serve Perceptor Remote (user-facing sensing station)
app.use('/perceptor-remote', express.static('web/perceptor-remote'));

// Serve Perceptor Circumplex (multimodal circumplex emotion analysis)
app.use('/perceptor-circumplex', express.static('web/perceptor-circumplex'));

// Serve Dashboard (read-only cognizer monitor)
app.use('/dashboard', express.static('web/dashboard'));

// Serve node_modules for client-side imports
app.use('/node_modules', express.static('node_modules'));

// Serve shared assets (now under /web)
// Note: Need both /shared and /web/shared for different relative import contexts
app.use('/shared', express.static('web/shared'));          // For JS imports (../shared/ resolves to /shared/)
app.use('/web/shared', express.static('web/shared'));      // For absolute refs in HTML/CSS

// DEPRECATED: /see app moved to graveyard
// app.use('/see', express.static('web/see'));
// app.get('/door/see', (req, res) => {
//   res.redirect(301, '/see');
// });

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

// Mount Mind Moments API (read-only, no auth needed)
app.use('/api', mindMomentsAPI);

// Mount Sigil API (SVG/SDF endpoints, no auth needed - public read-only)
registerSigilAPI(app);

// Mount Sigil Prompts API (with editor auth in production)
app.get('/api/sigil-prompts', editorAuth, sigilPrompts.listSigilPrompts);
app.get('/api/sigil-prompts/active', editorAuth, sigilPrompts.getActiveSigilPromptAPI);
app.get('/api/sigil-prompts/:id', editorAuth, sigilPrompts.getSigilPromptAPI);
app.post('/api/sigil-prompts', editorAuth, sigilPrompts.saveSigilPrompt);
app.post('/api/sigil-prompts/upload-reference-image', editorAuth, sigilPrompts.uploadReferenceImage);
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
app.get('/api/audio-prompts/by-slug/:slug', editorAuth, audioPrompts.getAudioPromptBySlugAPI);
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

/**
 * Loop Manager - Centralized mode switching
 * Now uses unified ConsciousnessLoop
 */
class LoopManager {
  constructor(io) {
    this.io = io;
    this.activeSessions = new Set();
    this.consciousness = new ConsciousnessLoop(io);
  }
  
  async initialize() {
    // Start in dream mode
    this.consciousness.start();
    console.log('💭 Starting in dream state (no active sessions)');
  }
  
  sessionStarted(sessionId) {
    this.activeSessions.add(sessionId);
    if (this.activeSessions.size === 1) {
      this.transitionToLive();
    }
  }
  
  sessionEnded(sessionId) {
    this.activeSessions.delete(sessionId);
    if (this.activeSessions.size === 0) {
      setTimeout(() => this.transitionToDream(), 1000);
    }
  }
  
  transitionToLive() {
    console.log('🚀 FIRST SESSION - STARTING COGNITIVE LOOP');
    process.stdout.write('🚀 COGNITIVE LOOP STARTING NOW\n');
    this.consciousness.switchMode(ConsciousnessMode.LIVE);
  }
  
  transitionToDream() {
    console.log('💭 Returning to dream state (no active sessions)');
    this.consciousness.switchMode(ConsciousnessMode.DREAM);
  }
  
  addPercept(percept) {
    this.consciousness.addPercept(percept);
  }
  
  getSessionCount() {
    return this.activeSessions.size;
  }
}

const loopManager = new LoopManager(io);
let socketToSession = new Map(); // Track socket.id -> sessionId mapping

const sessionManager = new SessionManager(SESSION_TIMEOUT_MS, (sessionId) => {
  // Session timed out - clean up server state
  console.log(`⏰ Cleaning up timed out session: ${sessionId}`);
  socketToSession.forEach((sid, socketId) => {
    if (sid === sessionId) socketToSession.delete(socketId);
  });
  
  // Use loop manager to handle transition
  loopManager.sessionEnded(sessionId);
  
  // Notify all clients about timeout
  io.emit('sessionTimeout', { sessionId });
});

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // Cycle status - available to any client, no session required
  socket.on('getCycleStatus', () => {
    const status = loopManager.consciousness.getCycleStatus();
    socket.emit('cycleStatus', status);
  });
  
  // Session status - available to any client, no session required
  socket.on('getSessionStatus', () => {
    socket.emit('sessionsUpdate', {
      count: loopManager.getSessionCount(),
      sessions: Array.from(loopManager.activeSessions).map(id => ({ id, status: 'active' }))
    });
  });

  socket.on('startSession', async ({ sessionId }) => {
    console.log(`▶️  Starting session: ${sessionId} (socket: ${socket.id})`);
    process.stdout.write(`▶️  CLIENT SESSION STARTED: ${sessionId}\n`);
    
    const session = sessionManager.startSession(sessionId);
    socketToSession.set(socket.id, sessionId);
    
    // Create session in database
    if (process.env.DATABASE_ENABLED === 'true') {
      try {
        await dbCreateSession(sessionId);
      } catch (error) {
        console.error('Failed to create session in database:', error.message);
      }
    }
    
    // Use loop manager to handle session start
    loopManager.sessionStarted(sessionId);
    
    // Broadcast updated session count to all clients
    io.emit('sessionsUpdate', {
      count: loopManager.getSessionCount(),
      sessions: Array.from(loopManager.activeSessions).map(id => ({ id, status: 'active' }))
    });
    
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
    
    // Add percept to consciousness loop
    loopManager.addPercept({
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
    socketToSession.delete(socket.id);
    
    // End session in database
    if (process.env.DATABASE_ENABLED === 'true') {
      try {
        await dbEndSession(sessionId);
      } catch (error) {
        console.error('Failed to end session in database:', error.message);
      }
    }
    
    // Use loop manager to handle session end
    loopManager.sessionEnded(sessionId);
    
    // Broadcast updated session count to all clients
    io.emit('sessionsUpdate', {
      count: loopManager.getSessionCount(),
      sessions: Array.from(loopManager.activeSessions).map(id => ({ id, status: 'active' }))
    });
    
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
    // Note: History is now maintained in real-cog.js (legacy)
    socket.emit('history', { 
      history: {},
      timestamp: new Date().toISOString()
    });
  });

  socket.on('disconnect', () => {
    const sessionId = socketToSession.get(socket.id);
    if (sessionId) {
      console.log(`🔌 Client disconnected (socket: ${socket.id}), ending session: ${sessionId}`);
      
      // Clean up session
      sessionManager.endSession(sessionId);
      socketToSession.delete(socket.id);
      
      // Use loop manager to handle session end
      loopManager.sessionEnded(sessionId);
      
      // Broadcast updated session count to all clients
      io.emit('sessionsUpdate', {
        count: loopManager.getSessionCount(),
        sessions: Array.from(loopManager.activeSessions).map(id => ({ id, status: 'active' }))
      });
    } else {
      console.log(`🔌 Client disconnected: ${socket.id} (no active session)`);
    }
  });
});

httpServer.listen(PORT, async () => {
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
  
  // Initialize consciousness loop (starts in dream mode)
  await loopManager.initialize();
  
  console.log('Ready for connections...\n');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  loopManager.consciousness.stop();
  
  // Close database connection
  await closeDatabase();
  
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});


