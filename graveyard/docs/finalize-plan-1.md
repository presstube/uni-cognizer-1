# Cognizer-1 Server Deployment Plan

**Goal**: Deploy cognizer-1 as a WebSocket server ready for aggregator-1 integration

---

## Current State

```
cognizer-1/
├── src/
│   ├── main.js              # Runs fake-percepts + cognitive loop
│   ├── fake-percepts.js     # Mock percept generator
│   ├── real-cog.js          # Core cognitive engine
│   ├── personality-uni-v2.js
│   └── providers/           # LLM abstraction (OpenAI/Anthropic/Gemini)
```

**Limitation**: Uses mock percepts, no network interface

---

## Target State

```
cognizer-1/
├── server.js                # NEW: WebSocket server + orchestration
├── src/
│   ├── session-manager.js   # NEW: Session lifecycle management
│   ├── main.js              # REFACTOR: Export API for server.js
│   ├── real-cog.js          # UNCHANGED: Pure cognition
│   ├── personality-uni-v2.js
│   └── providers/
```

**Capability**: WebSocket server accepting live percepts, managing sessions, emitting mind moments

---

## Implementation Steps

### Phase 1: Refactor Core (30 min)

**1.1 Create `src/session-manager.js`**

Purpose: Manage session lifecycle, timeout logic

```javascript
export class SessionManager {
  constructor(timeoutMs = 60000) {
    this.sessions = new Map();
    this.timeoutMs = timeoutMs;
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
      this.endSession(sessionId);
    }, this.timeoutMs);
  }

  endSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    if (session.timeoutId) clearTimeout(session.timeoutId);
    
    // Save session history to disk/DB (optional)
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
```

**1.2 Refactor `src/main.js`**

Changes:
- Remove `fake-percepts.js` import and usage
- Export `addPercept(percept)` function
- Export `startCognitiveLoop()` and `stopCognitiveLoop()`
- Keep cognitive cycle logic

```javascript
import 'dotenv/config';
import { cognize, onMindMoment, getHistory } from './real-cog.js';

const DEPTH = 3;
let cognitiveIntervalId = null;
let perceptQueue = {
  visualPercepts: [],
  audioPercepts: []
};

export function addPercept(percept) {
  if (percept.type === 'visual') {
    perceptQueue.visualPercepts.push(percept);
  } else if (percept.type === 'audio') {
    perceptQueue.audioPercepts.push(percept);
  }
}

function dumpPercepts() {
  const snapshot = {
    visualPercepts: [...perceptQueue.visualPercepts],
    audioPercepts: [...perceptQueue.audioPercepts]
  };
  
  perceptQueue.visualPercepts.length = 0;
  perceptQueue.audioPercepts.length = 0;
  
  return snapshot;
}

export function startCognitiveLoop(callback) {
  if (cognitiveIntervalId) return; // Already running
  
  cognitiveIntervalId = setInterval(() => {
    const { visualPercepts, audioPercepts } = dumpPercepts();
    cognize(visualPercepts, audioPercepts, DEPTH);
  }, 5000);
  
  // Register callback for mind moments
  if (callback) {
    onMindMoment(callback);
  }
  
  console.log('🧠 Cognitive loop started');
}

export function stopCognitiveLoop() {
  if (cognitiveIntervalId) {
    clearInterval(cognitiveIntervalId);
    cognitiveIntervalId = null;
    console.log('🛑 Cognitive loop stopped');
  }
}

export { getHistory };
```

---

### Phase 2: Create WebSocket Server (45 min)

**2.1 Install Dependencies**

```bash
npm install socket.io
npm install cors  # For cross-origin requests
```

**2.2 Create `server.js`**

```javascript
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
```

---

### Phase 3: Environment & Config (10 min)

**3.1 Update `.env`**

```bash
# LLM Provider
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here

# Server Config
PORT=3001
SESSION_TIMEOUT_MS=60000
CORS_ORIGIN=http://localhost:3000

# Optional: Node environment
NODE_ENV=development
```

**3.2 Update `package.json`**

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "NODE_ENV=development node server.js",
    "test-fake": "node src/main-fake.js"
  }
}
```

**3.3 Keep `src/main-fake.js` for testing**

Rename current `main.js` to `main-fake.js` (uses fake-percepts, runs standalone)

---

### Phase 4: Deployment (30-60 min)

**Option A: Railway (Recommended - Easiest)**

1. Create account at railway.app
2. Create new project
3. Connect GitHub repo
4. Add environment variables in Railway dashboard
5. Deploy (automatic from main branch)
6. Get URL: `https://cognizer-1-production.up.railway.app`

**Cost**: $5/month (500 hours included)

---

**Option B: Render**

1. Create account at render.com
2. New Web Service → Connect repo
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Add environment variables
6. Deploy

**Cost**: Free tier available (spins down after 15min idle)

---

**Option C: DigitalOcean Droplet**

1. Create $6/month droplet (Ubuntu)
2. SSH in, install Node.js 20+
3. Clone repo, `npm install`
4. Set up PM2 for process management:
   ```bash
   npm install -g pm2
   pm2 start server.js --name cognizer-1
   pm2 startup
   pm2 save
   ```
5. Configure firewall (allow port 3001)
6. Optional: Set up nginx reverse proxy + SSL

**Cost**: $6/month

---

### Phase 5: Testing (15 min)

**5.1 Local Testing**

```bash
npm start
# Server starts on localhost:3001
```

Test with simple client:
```javascript
const io = require('socket.io-client');
const socket = io('http://localhost:3001');

socket.emit('startSession', { sessionId: 'test-123' });

socket.emit('percept', {
  sessionId: 'test-123',
  type: 'visual',
  data: { action: 'Waving', emoji: '👋' }
});

socket.on('mindMoment', (data) => {
  console.log('Received:', data);
});
```

**5.2 Production Testing**

Replace `localhost:3001` with deployed URL

---

## Final Checklist

- [ ] `session-manager.js` created
- [ ] `main.js` refactored (exports API)
- [ ] `server.js` created (WebSocket server)
- [ ] `package.json` updated (scripts + dependencies)
- [ ] `.env` configured
- [ ] Local testing passed
- [ ] Deployed to Railway/Render/DO
- [ ] Production URL tested
- [ ] CORS configured for aggregator-1 origin
- [ ] Session timeout verified
- [ ] Cost monitoring set up

---

## Expected Behavior

**Idle State:**
- Server running, WebSocket listening
- No cognitive cycles
- No LLM calls
- Cost: $0/hour

**Active Session:**
- Client connects, sends `startSession`
- Cognitive loop starts (5s cycles)
- Percepts flow in → Mind moments flow out
- Cost: ~$0.02/min

**Session End:**
- No percepts for 60s → Auto-end
- OR client sends `endSession`
- Cognitive loop stops
- Return to idle

---

## Monitoring

**Logs to Watch:**
- Session start/end events
- Percept counts per session
- LLM call frequency
- Error rates

**Metrics to Track:**
- Active sessions count
- Total LLM cost per day
- Average session duration
- Percepts per session

---

**Total Implementation Time**: 2-3 hours  
**Total Cost**: $0-6/month + LLM usage

