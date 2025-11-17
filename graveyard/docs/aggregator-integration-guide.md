# Aggregator-1 Integration Guide

**Purpose**: Connect aggregator-1 (frontend) to cognizer-1 (backend) via WebSocket

---

## Prerequisites

- Cognizer-1 deployed and running (see `finalize-plan-1.md`)
- Cognizer-1 URL (e.g., `https://cognizer-1.railway.app` or `http://localhost:3001`)
- Aggregator-1 running (Next.js app with cam + mic modules)

---

## Installation

```bash
npm install socket.io-client
```

---

## Implementation

### Step 1: Create WebSocket Client Module

**File**: `lib/cognizer-client.js`

```javascript
import { io } from 'socket.io-client';

class CognizerClient {
  constructor(url) {
    this.socket = io(url, {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });
    
    this.sessionId = null;
    this.connected = false;
    this.listeners = new Map();
    
    this._setupListeners();
  }

  _setupListeners() {
    this.socket.on('connect', () => {
      console.log('🔌 Connected to cognizer');
      this.connected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Disconnected from cognizer');
      this.connected = false;
    });

    this.socket.on('mindMoment', (data) => {
      const listeners = this.listeners.get('mindMoment') || [];
      listeners.forEach(fn => fn(data));
    });

    this.socket.on('sessionStarted', (data) => {
      console.log('▶️  Session started:', data.sessionId);
    });

    this.socket.on('sessionEnded', (data) => {
      console.log('⏸️  Session ended:', data);
      this.sessionId = null;
    });

    this.socket.on('error', (error) => {
      console.error('❌ Cognizer error:', error);
    });
  }

  connect() {
    this.socket.connect();
  }

  disconnect() {
    if (this.sessionId) {
      this.endSession();
    }
    this.socket.disconnect();
  }

  startSession(sessionId) {
    this.sessionId = sessionId || `session-${Date.now()}`;
    this.socket.emit('startSession', { sessionId: this.sessionId });
    return this.sessionId;
  }

  endSession() {
    if (!this.sessionId) return;
    this.socket.emit('endSession', { sessionId: this.sessionId });
    this.sessionId = null;
  }

  sendPercept(type, data) {
    if (!this.sessionId) {
      console.warn('No active session, cannot send percept');
      return;
    }

    this.socket.emit('percept', {
      sessionId: this.sessionId,
      type, // 'visual' or 'audio'
      data,
      timestamp: new Date().toISOString()
    });
  }

  onMindMoment(callback) {
    if (!this.listeners.has('mindMoment')) {
      this.listeners.set('mindMoment', []);
    }
    this.listeners.get('mindMoment').push(callback);
  }

  getHistory() {
    if (!this.sessionId) return;
    this.socket.emit('getHistory', { sessionId: this.sessionId });
  }
}

export default CognizerClient;
```

---

### Step 2: Initialize in Aggregator

**File**: `pages/index.js` or `app/page.js`

```javascript
import { useEffect, useRef, useState } from 'react';
import CognizerClient from '@/lib/cognizer-client';

export default function Home() {
  const cognizerRef = useRef(null);
  const [mindMoment, setMindMoment] = useState(null);
  const [sigilPhrase, setSigilPhrase] = useState(null);
  
  useEffect(() => {
    // Initialize cognizer client
    const cognizer = new CognizerClient(
      process.env.NEXT_PUBLIC_COGNIZER_URL || 'http://localhost:3001'
    );
    
    cognizerRef.current = cognizer;
    
    // Connect and start session
    cognizer.connect();
    
    const sessionId = cognizer.startSession();
    console.log('Session started:', sessionId);
    
    // Listen for mind moments
    cognizer.onMindMoment((data) => {
      console.log('Mind moment received:', data);
      setMindMoment(data.mindMoment);
      setSigilPhrase(data.sigilPhrase);
    });
    
    // Cleanup
    return () => {
      cognizer.disconnect();
    };
  }, []);
  
  return (
    <div>
      <h1>Aggregator-1</h1>
      
      {mindMoment && (
        <div className="mind-moment">
          <p>{mindMoment}</p>
          {sigilPhrase && <span className="sigil">{sigilPhrase}</span>}
        </div>
      )}
      
      {/* Cam and Mic components */}
    </div>
  );
}
```

---

### Step 3: Connect Cam Module

**Cam module sends visual percepts**

```javascript
// In your cam module or component
import { useEffect } from 'react';

export default function CamModule({ cognizer }) {
  useEffect(() => {
    // When cam module detects a percept
    cam.addEventListener('percept', (event) => {
      const { action, emoji } = event.detail;
      
      cognizer.sendPercept('visual', {
        action,
        emoji,
        confidence: event.detail.confidence || 1.0
      });
    });
    
    return () => {
      cam.removeEventListener('percept', ...);
    };
  }, [cognizer]);
  
  return <div>Camera feed...</div>;
}
```

---

### Step 4: Connect Mic Module

**Mic module sends audio percepts**

```javascript
// In your mic module or component
import { useEffect } from 'react';

export default function MicModule({ cognizer }) {
  useEffect(() => {
    // When mic module detects speech
    mic.addEventListener('percept', (event) => {
      const { transcript, analysis, tone, emoji, sentiment, confidence } = event.detail;
      
      cognizer.sendPercept('audio', {
        transcript,
        analysis,
        tone,
        emoji,
        sentiment,
        confidence
      });
    });
    
    return () => {
      mic.removeEventListener('percept', ...);
    };
  }, [cognizer]);
  
  return <div>Microphone active...</div>;
}
```

---

### Step 5: Environment Variables

**File**: `.env.local`

```bash
NEXT_PUBLIC_COGNIZER_URL=https://cognizer-1.railway.app
# or for local dev:
# NEXT_PUBLIC_COGNIZER_URL=http://localhost:3001
```

---

## Message Flow

```
[CAM MODULE]
    ↓
  percept event
    ↓
cognizer.sendPercept('visual', { action, emoji })
    ↓
  WebSocket → COGNIZER-1
    ↓
  Cognitive processing (5s cycle)
    ↓
  WebSocket ← COGNIZER-1
    ↓
  'mindMoment' event
    ↓
  Update UI (display mind moment + sigil phrase)
```

---

## Percept Format

**Visual Percept:**
```javascript
{
  sessionId: "session-123",
  type: "visual",
  data: {
    action: "Waving at robot",
    emoji: "👋",
    confidence: 0.95
  },
  timestamp: "2025-11-05T10:30:00.000Z"
}
```

**Audio Percept:**
```javascript
{
  sessionId: "session-123",
  type: "audio",
  data: {
    transcript: "What's it like at night?",
    analysis: "Visitor asking philosophical question",
    tone: "Curious, thoughtful",
    emoji: "🤔",
    sentiment: "curious",
    confidence: 0.90
  },
  timestamp: "2025-11-05T10:30:05.000Z"
}
```

---

## Mind Moment Response

```javascript
{
  cycle: 5,
  mindMoment: "Your wave catches my attention while my occupancy sensors register warmth in zone 3—connection acknowledged, human presence logged.",
  sigilPhrase: "Wave meets sensor grid",
  timestamp: "2025-11-05T10:30:08.000Z",
  sessionId: "session-123"
}
```

---

## Session Management

### Start Session (Automatic)
```javascript
cognizer.startSession(); // Auto-generates ID
// or
cognizer.startSession('custom-session-id');
```

### End Session (Manual)
```javascript
cognizer.endSession();
```

### Automatic Timeout
- Cognizer auto-ends session after 60s of no percepts
- Aggregator receives `sessionEnded` event
- Should restart session when visitor returns

---

## Error Handling

```javascript
cognizer.socket.on('error', (error) => {
  console.error('Cognizer error:', error);
  
  if (error.message.includes('session')) {
    // Session expired, restart
    cognizer.startSession();
  }
});

cognizer.socket.on('disconnect', () => {
  // Handle disconnect
  // Socket.io will auto-reconnect
  console.log('Reconnecting...');
});
```

---

## Testing Locally

**Terminal 1: Start Cognizer**
```bash
cd cognizer-1
npm start
# Listening on port 3001
```

**Terminal 2: Start Aggregator**
```bash
cd aggregator-1
npm run dev
# Next.js on port 3000
```

**Browser:**
1. Open `http://localhost:3000`
2. Check console: "Connected to cognizer"
3. Cam/mic percepts should flow
4. Mind moments should appear every 5s

---

## Production Checklist

- [ ] Cognizer URL in `.env.local`
- [ ] WebSocket client installed (`socket.io-client`)
- [ ] `CognizerClient` module created
- [ ] Cam module connected (sends visual percepts)
- [ ] Mic module connected (sends audio percepts)
- [ ] Mind moment display implemented
- [ ] Sigil phrase display implemented
- [ ] Session management working
- [ ] Error handling implemented
- [ ] Reconnection logic tested
- [ ] CORS configured on cognizer side

---

## Troubleshooting

**"Cannot connect to cognizer"**
- Check COGNIZER_URL is correct
- Check CORS settings on cognizer (`CORS_ORIGIN=*` for testing)
- Check firewall allows port 3001

**"No mind moments received"**
- Check session is active (`cognizer.sessionId` not null)
- Check percepts are being sent (console logs)
- Check cognizer logs for errors
- Verify LLM API keys are set on cognizer

**"Session expires too quickly"**
- Increase `SESSION_TIMEOUT_MS` on cognizer
- Ensure percepts are flowing continuously
- Check for network interruptions

---

## Cost Monitoring

**Track in Aggregator:**
```javascript
let perceptCount = 0;

cognizer.onMindMoment((data) => {
  perceptCount++;
  console.log(`Mind moments received: ${perceptCount}`);
  console.log(`Estimated cost: $${(perceptCount * 0.02).toFixed(2)}`);
});
```

**Estimated costs:**
- ~12 mind moments/minute (5s cycles)
- ~$0.02/mind moment
- ~$1.20/hour of active session

---

## Next Steps

1. Deploy aggregator-1 to Vercel
2. Update `NEXT_PUBLIC_COGNIZER_URL` to production cognizer URL
3. Test end-to-end with real visitors
4. Monitor costs and session metrics
5. Implement art system adapters (use sigil phrases)

---

**Integration complete!** 🎉

