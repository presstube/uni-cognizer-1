# Dashboard & Cognizer Integration Plan

**Purpose**: Create ultra-minimal read-only dashboard + integrate perceptor-remote with Cognizer via Socket.io

**Date**: 2025-11-26

---

## Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  [Perceptor-Remote]                         [Dashboard]                 │
│        │                                         │                      │
│        ├──▶ Dual Gemini WebSockets               │                      │
│        │    (audio + visual)                     │                      │
│        │                                         │                      │
│        └──────────────▶ Socket.io ◀──────────────┘                      │
│                             │                                           │
│                             ▼                                           │
│                      ┌─────────────┐                                    │
│                      │  Cognizer   │                                    │
│                      │   Server    │                                    │
│                      └──────┬──────┘                                    │
│                             │                                           │
│                             ▼                                           │
│                      Mind Moments                                       │
│                      Sigils                                             │
│                      Cognitive State                                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Housekeeping

### 1.1 Move test-client to graveyard
- Move `/test-client/` → `/graveyard/test-client/`
- Rationale: Replacing with cleaner dashboard

---

## Phase 2: Create Dashboard

### 2.2 File Structure
```
/web/dashboard/
  index.html   (~80 lines)
  app.js       (~120 lines)
```

### 2.2 Design Principles

**ULTRA MINIMAL**
- Pure `#000` background
- `monospace` font only
- `rgba(255, 255, 255, 0.X)` for all text/borders
- No decorations, no shadows, no gradients
- Single 1px divider between panes

**Layout**
```
┌────────────────────┬───────────────────────────────────┐
│                    │                                   │
│  PERCEPTS          │  Connection: Connected            │
│  (left pane)       │  State: AGGREGATING               │
│                    │  Next Cycle: 4s                   │
│  [toast]           │                                   │
│  [toast]           │  Mind Moment:                     │
│  [toast]           │  "The visitor waves with..."      │
│  [toast]           │                                   │
│  ...               │  Sigil Phrase:                    │
│                    │  "wave greeting joy"              │
│                    │                                   │
│                    │  Sigil: [canvas]                  │
│                    │                                   │
└────────────────────┴───────────────────────────────────┘
     400px                    flex: 1
```

### 2.3 index.html

**Structure:**
- Left pane: `#percepts` container for toast notifications
- Right pane: Cognizer state display
  - Connection status
  - Cognitive state (AGGREGATING / COGNIZING / VISUALIZING)
  - Countdown timer (big, 48px)
  - Mind moment text
  - Sigil phrase
  - Sigil canvas (120x120)

**Styling (inline):**
```css
body { background: #000; font-family: monospace; }
.label { font-size: 8px; color: rgba(255,255,255,0.4); }
.value { font-size: 12px; color: rgba(255,255,255,0.9); }
.countdown { font-size: 48px; color: rgba(255,255,255,0.6); }
```

### 2.4 app.js

**Imports:**
- `../shared/percept-toast.js` - Reuse existing toast component
- `../shared/sigil.standalone.js` - Reuse existing sigil renderer

**Socket.io Events (receive only):**
| Event | Action |
|-------|--------|
| `connect` | Update connection status, emit `startSession` |
| `disconnect` | Update connection status |
| `sessionStarted` | Store cycleMs, start countdown |
| `cognitiveState` | Update state display |
| `cycleStarted` | Reset countdown, clear percepts |
| `perceptReceived` | Create toast, prepend to left pane |
| `mindMoment` | Update mind moment text + sigil phrase |
| `sigil` | Render sigil on canvas |

**Key Functions:**
```javascript
connect()        // Initialize Socket.io connection
startCountdown() // Update countdown every 100ms
clearPercepts()  // Clear left pane on new cycle
addPercept()     // Create PerceptToast, prepend to container
```

---

## Phase 3: Perceptor-Remote Integration

### 3.1 State Additions
```javascript
// Add to existing state object:
cognizerSocket: null,
cognizerConnected: false,
sessionId: null,
```

### 3.2 New Functions

**connectToCognizer()**
```javascript
async function connectToCognizer() {
  state.cognizerSocket = io(window.location.origin, {
    transports: ['websocket', 'polling'],
    reconnection: true
  });
  
  state.cognizerSocket.on('connect', () => {
    state.sessionId = `perceptor-${Date.now()}`;
    state.cognizerSocket.emit('startSession', { sessionId: state.sessionId });
  });
  
  state.cognizerSocket.on('sessionStarted', () => {
    state.cognizerConnected = true;
  });
}
```

**forwardPercept()**
```javascript
function forwardPercept(percept, type) {
  if (!state.cognizerConnected) return;
  
  state.cognizerSocket.emit('percept', {
    sessionId: state.sessionId,
    type,
    data: percept,
    timestamp: new Date().toISOString()
  });
}
```

### 3.3 Integration Points

**In `init()`:**
```javascript
// Add after other initialization
await connectToCognizer();
```

**In `handleAudioResponse()`:**
```javascript
// After createPerceptToast(json, 'audio')
forwardPercept(json, 'audio');
```

**In `handleVisualResponse()`:**
```javascript
// After createPerceptToast(json, 'visual')
forwardPercept(json, 'visual');
```

### 3.4 HTML Update
Add Socket.io CDN to `index.html`:
```html
<script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
```

---

## Phase 4: Server Integration

### 4.1 Add Route
In `server.js`:
```javascript
// Serve Dashboard (read-only cognizer view)
app.use('/dashboard', express.static('web/dashboard'));
```

---

## Implementation Checklist

### Phase 1: Housekeeping
- [ ] Move `/test-client/` to `/graveyard/test-client/`

### Phase 2: Dashboard
- [ ] Create `/web/dashboard/` directory
- [ ] Create `index.html` with ultra-minimal styling
- [ ] Create `app.js` with Socket.io listener
- [ ] Import and use `percept-toast.js`
- [ ] Import and use `sigil.standalone.js`
- [ ] Test connection to Cognizer
- [ ] Test percept display
- [ ] Test mind moment display
- [ ] Test sigil rendering
- [ ] Test countdown timer

### Phase 3: Perceptor-Remote Integration
- [ ] Add Socket.io CDN to `index.html`
- [ ] Add cognizer state to `app.js`
- [ ] Implement `connectToCognizer()`
- [ ] Implement `forwardPercept()`
- [ ] Call `connectToCognizer()` in `init()`
- [ ] Forward audio percepts in `handleAudioResponse()`
- [ ] Forward visual percepts in `handleVisualResponse()`
- [ ] Test full pipeline: Gemini → Perceptor → Cognizer

### Phase 4: Server
- [ ] Add `/dashboard` route to `server.js`
- [ ] Test dashboard access

---

## Testing Flow

### Manual Test 1: Dashboard Only
1. Start server
2. Open `/dashboard` in browser
3. Verify "Disconnected" → "Connected"
4. Use test-client (before removal) to send percepts
5. Verify percepts appear in dashboard
6. Verify mind moments + sigils appear

### Manual Test 2: Perceptor + Dashboard
1. Start server
2. Open `/perceptor-remote` in tab 1
3. Open `/dashboard` in tab 2
4. Click START in perceptor-remote
5. Speak / wave at camera
6. Verify:
   - Percepts appear in perceptor-remote toasts
   - Same percepts appear in dashboard left pane
   - Mind moments appear in dashboard right pane
   - Sigils render in dashboard
   - Countdown works correctly

---

## Cannibalized from test-client

**Logic reused:**
- Socket.io connection pattern
- Event handlers: `sessionStarted`, `cognitiveState`, `perceptReceived`, `cycleStarted`, `mindMoment`, `sigil`
- Countdown timer logic

**Styling NOT reused:**
- test-client has more complex 3-panel layout
- test-client has input controls (not needed for read-only)
- test-client has different color scheme

---

## Style Reference (from perceptor-remote)

```css
/* Colors */
background: #000;
color: rgba(255, 255, 255, 0.8);
border: 1px solid rgba(255, 255, 255, 0.1);

/* Typography */
font-family: monospace;
font-size: 8px;   /* labels */
font-size: 10px;  /* body */
font-size: 12px;  /* values */
font-size: 48px;  /* countdown */

/* State colors */
.aggregating { color: rgba(255, 255, 255, 0.4); }
.cognizing { color: rgba(0, 128, 255, 0.9); }
.visualizing { color: rgba(0, 255, 136, 0.9); }
.connected { color: rgba(0, 255, 136, 0.9); }
.disconnected { color: rgba(255, 68, 68, 0.9); }
```

---

## Success Criteria

1. **Dashboard displays percepts** from Cognizer in real-time
2. **Dashboard displays mind moments** with sigil phrase and rendered sigil
3. **Dashboard countdown** accurately reflects cognitive cycle timing
4. **Perceptor-remote forwards percepts** to Cognizer via Socket.io
5. **Full pipeline works**: Webcam/Mic → Gemini → Perceptor → Cognizer → Dashboard
6. **Style is ultra-minimal** - pure black, monospace, no decorations

---

**Ready for implementation!** 🚀

