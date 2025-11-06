# Aggregator-1 → Cognizer-1 Integration Guide

Complete guide for integrating the Aggregator-1 percept system with the Cognizer-1 cognitive loop.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Integration Steps](#integration-steps)
5. [Testing the Integration](#testing-the-integration)
6. [Production Deployment](#production-deployment)
7. [Troubleshooting](#troubleshooting)
8. [API Reference](#api-reference)

---

## Overview

**Aggregator-1** collects percepts from camera (CamTick) and microphone (MicAudioToText) modules.  
**Cognizer-1** is a WebSocket server that processes percepts through a cognitive loop and emits mind moments.

This guide shows how to connect them so that:
- Aggregator-1 captures visual and audio percepts
- Percepts are sent to Cognizer-1 via WebSocket
- Cognizer-1 processes them through its cognitive loop
- Mind moments are broadcast back to Aggregator-1

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         AGGREGATOR-1                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  CamTick     │  │ MicAudioTo   │  │ WebSocket Client     │  │
│  │  Module      │  │ Text Module  │  │ (Socket.io-client)   │  │
│  │              │  │              │  │                      │  │
│  │ Visual       │  │ Audio        │  │  • Connect/Session  │  │
│  │ Percepts ────┼──┼─ Percepts ───┼──┼─→ • Send Percepts   │  │
│  │              │  │              │  │  • Receive Moments  │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │ WebSocket (Socket.io)
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                         COGNIZER-1                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                 WebSocket Server (Socket.io)              │   │
│  │  • Session Management                                     │   │
│  │  • Percept Reception                                      │   │
│  │  • Mind Moment Broadcasting                               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                 │                                │
│                                 ▼                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Cognitive Loop (real-cog.js)                 │   │
│  │  • Percept Buffer (visual + audio)                        │   │
│  │  • LLM Processing (Claude/OpenAI/Gemini)                  │   │
│  │  • History Management                                     │   │
│  │  • Mind Moment Generation                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### Cognizer-1 Setup

1. **Environment Variables**

Create `.env` in the Cognizer-1 root:

```bash
# Required: Choose ONE LLM provider
ANTHROPIC_API_KEY=sk-ant-...          # For Claude (recommended)
# OR
OPENAI_API_KEY=sk-...                 # For OpenAI
# OR
GEMINI_API_KEY=AIzaSy...              # For Google Gemini

# Optional: Server configuration
PORT=3001                              # Backend port (default: 3001)
SESSION_TIMEOUT_MS=60000               # Session timeout (default: 60s)
```

2. **Install Dependencies**

```bash
cd cognizer-1
npm install
```

3. **Start Server**

```bash
# Production
npm start

# Development (with logging)
npm run dev
```

Server runs on `http://localhost:3001` (or `PORT` from `.env`)

### Aggregator-1 Setup

1. **Environment Variables**

Create `.env.local` in the Aggregator-1 root (for local development):

```bash
GEMINI_API_KEY=AIzaSy...              # For CamTick and MicAudioToText modules
SITE_PASSWORD=your-password-here      # For token authentication
```

2. **Install Dependencies**

```bash
cd aggregator-1
npm install
```

3. **Start Server**

```bash
# Option 1: Local with production token endpoint
npm run live

# Option 2: Full local development
vercel dev
```

Opens on `http://localhost:8765` (Option 1) or `http://localhost:3000` (Option 2)

---

## Integration Steps

### Step 1: Add Socket.io Client to Aggregator-1

Install the Socket.io client library:

```bash
cd aggregator-1
npm install socket.io-client
```

### Step 2: Create Cognizer Client Module

Create `src/cognizer-client.js` in Aggregator-1:

```javascript
import { io } from 'socket.io-client';

export class CognizerClient {
  constructor(url = 'http://localhost:3001') {
    this.url = url;
    this.socket = null;
    this.sessionId = null;
    this.isConnected = false;
    this.eventTarget = new EventTarget();
  }

  addEventListener(type, listener) {
    this.eventTarget.addEventListener(type, listener);
  }

  removeEventListener(type, listener) {
    this.eventTarget.removeEventListener(type, listener);
  }

  dispatch(type, detail) {
    this.eventTarget.dispatchEvent(new CustomEvent(type, { detail }));
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.socket = io(this.url, {
        transports: ['websocket', 'polling']
      });

      this.socket.on('connect', () => {
        console.log('✅ [Cognizer] Connected to Cognizer-1');
        this.isConnected = true;
        this.dispatch('connected', {});
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ [Cognizer] Connection error:', error);
        this.dispatch('error', { message: 'Connection failed', error });
        reject(error);
      });

      this.socket.on('disconnect', () => {
        console.log('🔌 [Cognizer] Disconnected');
        this.isConnected = false;
        this.dispatch('disconnected', {});
      });

      // Listen for mind moments
      this.socket.on('mindMoment', (data) => {
        console.log('🧠 [Cognizer] Mind moment received:', data);
        this.dispatch('mindMoment', data);
      });

      // Listen for session timeout
      this.socket.on('sessionTimeout', (data) => {
        console.warn('⏰ [Cognizer] Session timed out:', data);
        this.dispatch('sessionTimeout', data);
      });

      // Timeout after 10 seconds if can't connect
      setTimeout(() => {
        if (!this.isConnected) {
          reject(new Error('Connection timeout'));
        }
      }, 10000);
    });
  }

  async startSession() {
    if (!this.socket || !this.isConnected) {
      throw new Error('Not connected to Cognizer-1');
    }

    this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.socket.emit('startSession', { sessionId: this.sessionId });
    console.log('📝 [Cognizer] Session started:', this.sessionId);
    
    this.dispatch('sessionStarted', { sessionId: this.sessionId });
    return this.sessionId;
  }

  sendPercept(type, content) {
    if (!this.socket || !this.isConnected || !this.sessionId) {
      console.error('❌ [Cognizer] Cannot send percept: not connected or no session');
      return false;
    }

    const percept = {
      sessionId: this.sessionId,
      type: type, // 'visual' or 'audio'
      content: content,
      timestamp: new Date().toISOString()
    };

    this.socket.emit('percept', percept);
    console.log('📤 [Cognizer] Percept sent:', { type, preview: JSON.stringify(content).substring(0, 50) + '...' });
    
    this.dispatch('perceptSent', percept);
    return true;
  }

  endSession() {
    if (!this.socket || !this.sessionId) {
      console.warn('⚠️ [Cognizer] No active session to end');
      return;
    }

    this.socket.emit('endSession', { sessionId: this.sessionId });
    console.log('🛑 [Cognizer] Session ended:', this.sessionId);
    
    this.dispatch('sessionEnded', { sessionId: this.sessionId });
    this.sessionId = null;
  }

  disconnect() {
    if (this.sessionId) {
      this.endSession();
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.isConnected = false;
    console.log('🔌 [Cognizer] Disconnected from Cognizer-1');
  }
}
```

### Step 3: Update Aggregator-1 App

Modify `src/app.js` to integrate the Cognizer client:

```javascript
import { CamTick } from './external/cam-tick.js';
import { MicAudioToText } from './external/mic-audio-to-text.js';
import { CognizerClient } from './cognizer-client.js';

// ... existing DOM element references ...

// Cognizer configuration
const COGNIZER_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3001'  // Local Cognizer-1
  : 'https://uni-cognizer-1-production.up.railway.app'; // Production Cognizer-1

// Create Cognizer client
const cognizer = new CognizerClient(COGNIZER_URL);

// Add UI for mind moments (optional)
const mindMomentsContainer = document.getElementById('mind-moments-output'); // Add this to your HTML

// Listen for mind moments
cognizer.addEventListener('mindMoment', (event) => {
  const { cycle, mindMoment, sigilPhrase, timestamp } = event.detail;
  console.log('🧠 [App] Mind moment:', { cycle, sigilPhrase });
  
  // Display in UI (if you have a container)
  if (mindMomentsContainer) {
    const entry = document.createElement('div');
    entry.className = 'json-entry';
    entry.textContent = JSON.stringify({ cycle, sigilPhrase, mindMoment }, null, 2);
    mindMomentsContainer.insertBefore(entry, mindMomentsContainer.firstChild);
  }
});

// Modified initModule to also send to Cognizer
const initModule = async (module, outputContainer, token, perceptType) => {
  module.addEventListener('percept', (event) => {
    console.log(`📥 [Aggregator] ${perceptType} percept received:`, event.detail);
    addPerceptEntry(outputContainer, event.detail);
    
    // Send to Cognizer-1
    if (cognizer.isConnected && cognizer.sessionId) {
      cognizer.sendPercept(perceptType, event.detail);
    }
  });
  
  // ... rest of event listeners ...
  
  await module.init({ apiKey: token });
};

// Modified startApp
const startApp = async (password) => {
  try {
    // 1. Connect to Cognizer-1
    await cognizer.connect();
    await cognizer.startSession();
    
    // 2. Get tokens and start modules
    const { camToken, micToken } = await getTokens(password);
    passwordPrompt.style.display = 'none';
    document.querySelector('.container').style.display = 'flex';
    
    // 3. Initialize modules with percept type
    const cam = new CamTick();
    await initModule(cam, camOutput, camToken, 'visual');
    
    const mic = new MicAudioToText();
    await initModule(mic, micOutput, micToken, 'audio');
    
  } catch (error) {
    console.error('❌ [App] Startup error:', error);
    passwordError.textContent = 'Failed to start. Please try again.';
    passwordError.style.display = 'block';
  }
};

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  cognizer.disconnect();
});
```

### Step 4: Update Aggregator-1 HTML (Optional)

Add a section to display mind moments in `index.html`:

```html
<div class="container">
  <div class="pane" id="cam-pane">
    <h2>Cam Percepts</h2>
    <div id="cam-output"></div>
  </div>
  <div class="pane" id="mic-pane">
    <h2>Mic Percepts</h2>
    <div id="mic-output"></div>
  </div>
  <!-- New: Mind Moments Section -->
  <div class="pane" id="mind-pane">
    <h2>Mind Moments</h2>
    <div id="mind-moments-output"></div>
  </div>
</div>
```

Update CSS to accommodate three panes:

```css
.container { 
  display: none; 
  height: 100vh; 
  flex-direction: column; /* Stack vertically, or use flex: 1 for horizontal */
}
.pane { 
  flex: 1; 
  border: 1px solid #ccc; 
  overflow-y: auto; 
  padding: 10px; 
}
```

---

## Testing the Integration

### Local Testing

1. **Start Cognizer-1**

```bash
cd cognizer-1
npm run dev
```

Console output:
```
🚀 Cognizer-1 WebSocket server running on port 3001
```

2. **Start Aggregator-1**

```bash
cd aggregator-1
npm run live
```

Opens browser at `http://localhost:8765`

3. **Test Flow**

- Enter password in Aggregator-1
- Grant camera/microphone permissions
- Watch console for:
  - `✅ [Cognizer] Connected to Cognizer-1`
  - `📝 [Cognizer] Session started`
  - `📤 [Cognizer] Percept sent: visual`
  - `📤 [Cognizer] Percept sent: audio`
  - `🧠 [Cognizer] Mind moment received`

4. **Expected Behavior**

- CamTick captures frames every 3 seconds
- MicAudioToText captures audio continuously
- Percepts are sent to Cognizer-1
- Cognizer-1 processes them through cognitive loop (every 8 seconds)
- Mind moments broadcast back to Aggregator-1

### Test with Cognizer-1 Test Client

The Cognizer-1 `/host` test client can be used alongside Aggregator-1:

```bash
cd cognizer-1
npm run host
```

Opens `http://localhost:8080/host/`

This shows:
- Manual percept sending (for comparison)
- History of all mind moments
- Detailed view of each mind moment

Both Aggregator-1 and the test client can connect to Cognizer-1 simultaneously, each with their own session.

---

## Production Deployment

### Cognizer-1 (Railway)

**Already deployed!** ✅

**URL:** `https://uni-cognizer-1-production.up.railway.app`

**Environment Variables Set:**
- `ANTHROPIC_API_KEY`
- `PORT` (auto-set by Railway)
- `SESSION_TIMEOUT_MS`

**To update:**
```bash
cd cognizer-1
git add .
git commit -m "Update cognizer"
git push
# Railway auto-deploys
```

### Aggregator-1 (Vercel)

**Update Cognizer URL:**

In `src/app.js`, update the production URL:

```javascript
const COGNIZER_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3001'
  : 'https://uni-cognizer-1-production.up.railway.app'; // Railway URL
```

**Deploy:**

```bash
cd aggregator-1
vercel --prod
```

**Environment Variables in Vercel:**
- `GEMINI_API_KEY` - For modules
- `SITE_PASSWORD` - For authentication

### CORS Configuration

Cognizer-1 already has CORS enabled for all origins (`*`). If you need to restrict:

In `cognizer-1/server.js`:

```javascript
const io = new Server(server, {
  cors: {
    origin: [
      'https://aggregator-1.vercel.app', // Your Aggregator-1 URL
      'http://localhost:8765',           // Local dev
      'http://localhost:3000'            // Local dev (vercel dev)
    ],
    methods: ['GET', 'POST']
  }
});
```

---

## Troubleshooting

### Connection Issues

**Problem:** `Connection timeout` or `Connection failed`

**Solutions:**
1. Check Cognizer-1 is running: `curl http://localhost:3001`
2. Check firewall/network: Allow port 3001
3. Check console for CORS errors
4. Verify URL in `CognizerClient` constructor

**Problem:** `ERR_CONNECTION_REFUSED`

**Solutions:**
1. Cognizer-1 not running: Start with `npm start`
2. Wrong port: Check `.env` PORT setting
3. Railway app sleeping: First request wakes it (may take ~30s)

### Session Issues

**Problem:** `Session timed out` messages

**Solutions:**
1. Increase `SESSION_TIMEOUT_MS` in Cognizer-1 `.env`
2. Check for network interruptions
3. Implement session reconnection logic (see below)

**Problem:** `No active session to end`

**Solutions:**
1. Session already ended/timed out
2. Call `startSession()` after connecting
3. Check session state before sending percepts

### Percept Issues

**Problem:** Percepts not reaching Cognizer-1

**Solutions:**
1. Check `cognizer.isConnected` and `cognizer.sessionId`
2. Verify percept format: `{ type: 'visual'|'audio', content: object }`
3. Check Cognizer-1 console for received percepts
4. Check network tab for WebSocket messages

**Problem:** Mind moments not received

**Solutions:**
1. Cognitive loop takes ~8 seconds minimum
2. Check Cognizer-1 console for processing logs
3. Verify LLM API key is valid
4. Check for LLM API errors in Cognizer-1 logs

### Module Issues

**Problem:** CamTick or MicAudioToText not working

**Solutions:**
1. Check browser console for errors
2. Verify Gemini API key is valid
3. Grant camera/microphone permissions
4. Check MODULE_REQUIREMENTS.md for details
5. Test modules independently first

---

## API Reference

### CognizerClient

#### Constructor

```javascript
new CognizerClient(url?: string)
```

**Parameters:**
- `url` - Cognizer-1 WebSocket server URL (default: `http://localhost:3001`)

**Example:**
```javascript
const cognizer = new CognizerClient('https://uni-cognizer-1-production.up.railway.app');
```

#### Methods

##### `connect()`

Connect to Cognizer-1 WebSocket server.

```javascript
await cognizer.connect();
```

**Returns:** `Promise<void>` - Resolves when connected, rejects on error

**Events:** Dispatches `connected` event on success

##### `startSession()`

Start a new cognitive session.

```javascript
const sessionId = await cognizer.startSession();
```

**Returns:** `Promise<string>` - Session ID

**Events:** Dispatches `sessionStarted` event with `{ sessionId }`

##### `sendPercept(type, content)`

Send a percept to the cognitive loop.

```javascript
cognizer.sendPercept('visual', { action: 'waving', emoji: '👋' });
cognizer.sendPercept('audio', { text: 'Hello there', language: 'en' });
```

**Parameters:**
- `type` - Percept type: `'visual'` or `'audio'`
- `content` - Percept data object

**Returns:** `boolean` - `true` if sent, `false` if not connected/no session

**Events:** Dispatches `perceptSent` event with full percept object

##### `endSession()`

End the current session.

```javascript
cognizer.endSession();
```

**Events:** Dispatches `sessionEnded` event with `{ sessionId }`

##### `disconnect()`

Disconnect from Cognizer-1 (ends session first if active).

```javascript
cognizer.disconnect();
```

**Events:** Dispatches `disconnected` event

#### Events

Listen for events using `addEventListener()`:

##### `connected`

Fired when WebSocket connection established.

```javascript
cognizer.addEventListener('connected', () => {
  console.log('Connected to Cognizer-1');
});
```

##### `disconnected`

Fired when WebSocket disconnected.

```javascript
cognizer.addEventListener('disconnected', () => {
  console.log('Disconnected from Cognizer-1');
});
```

##### `sessionStarted`

Fired when session successfully started.

```javascript
cognizer.addEventListener('sessionStarted', (event) => {
  console.log('Session started:', event.detail.sessionId);
});
```

##### `sessionEnded`

Fired when session ended.

```javascript
cognizer.addEventListener('sessionEnded', (event) => {
  console.log('Session ended:', event.detail.sessionId);
});
```

##### `sessionTimeout`

Fired when session times out due to inactivity.

```javascript
cognizer.addEventListener('sessionTimeout', (event) => {
  console.log('Session timed out:', event.detail.sessionId);
});
```

##### `perceptSent`

Fired when percept successfully sent.

```javascript
cognizer.addEventListener('perceptSent', (event) => {
  const { type, content, timestamp } = event.detail;
  console.log('Percept sent:', { type, content });
});
```

##### `mindMoment`

Fired when mind moment received from Cognizer-1.

```javascript
cognizer.addEventListener('mindMoment', (event) => {
  const { cycle, mindMoment, sigilPhrase, visualPercepts, audioPercepts, priorMoments, timestamp, sessionId } = event.detail;
  console.log('Mind moment:', { cycle, sigilPhrase, mindMoment });
});
```

**Event Detail:**
```javascript
{
  cycle: 42,                              // Cognitive cycle number
  mindMoment: "The user is greeting...",  // Full mind moment text
  sigilPhrase: "greeting-wave-friendly",  // Distilled essence
  visualPercepts: [...],                  // Visual percepts used
  audioPercepts: [...],                   // Audio percepts used
  priorMoments: [...],                    // Previous mind moments
  timestamp: "2024-01-15T10:30:00.000Z",  // ISO timestamp
  sessionId: "session-..."                // Session ID
}
```

##### `error`

Fired on connection or other errors.

```javascript
cognizer.addEventListener('error', (event) => {
  console.error('Error:', event.detail.message, event.detail.error);
});
```

---

## Advanced: Session Reconnection

For production robustness, implement automatic reconnection:

```javascript
class RobustCognizerClient extends CognizerClient {
  constructor(url, options = {}) {
    super(url);
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
    this.reconnectDelay = options.reconnectDelay || 2000;
  }

  async connect() {
    try {
      await super.connect();
      this.reconnectAttempts = 0; // Reset on successful connection
    } catch (error) {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`🔄 [Cognizer] Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
        return this.connect(); // Recursive retry
      } else {
        throw new Error(`Failed to connect after ${this.maxReconnectAttempts} attempts`);
      }
    }
  }

  addEventListener(type, listener) {
    super.addEventListener(type, listener);
    
    // Auto-reconnect on disconnect
    if (type === 'disconnected') {
      super.addEventListener('disconnected', () => {
        setTimeout(() => {
          console.log('🔄 [Cognizer] Attempting reconnection...');
          this.connect().then(() => this.startSession());
        }, this.reconnectDelay);
      });
    }
  }
}
```

---

## Summary

✅ **Cognizer-1** is deployed at `https://uni-cognizer-1-production.up.railway.app`  
✅ **Aggregator-1** captures visual and audio percepts  
✅ **Integration** via Socket.io WebSocket client  
✅ **Flow**: Percepts → Cognitive Loop → Mind Moments → Broadcast

**Next steps:**
1. Add `socket.io-client` to Aggregator-1
2. Create `cognizer-client.js` module
3. Update `app.js` to connect and send percepts
4. Test locally with both servers running
5. Deploy Aggregator-1 to Vercel with production URL

The integration is straightforward and robust, with automatic session management and comprehensive error handling.

Happy integrating! 🚀🧠

