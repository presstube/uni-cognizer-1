# Socket Events Reference

Complete reference for Cognizer-1 WebSocket events.

---

## Architecture

**Unified 60-second consciousness cycle** with 6 phases:

```
PERCEPTS   (0-35s)   → Sensory input window
SPOOL      (35-37s)  → Load/prepare phase (data ready in buffer)
SIGILIN    (37-40s)  → Broadcast mind moment + sigil + sound
SIGILHOLD  (40-55s)  → Display pause
SIGILOUT   (55-58s)  → Fade out
RESET      (58-60s)  → Cleanup
```

**Two modes, identical timing:**
- **LIVE**: Real-time LLM processing of percepts
- **DREAM**: Replay historical mind moments from database

---

## Connection

```javascript
const socket = io('wss://server:3001');
// Read-only clients: just listen to broadcasts
// Interactive clients: emit percepts + listen
```

---

## Client → Server Events

### `startSession`
Start a cognitive session (interactive clients only).

```javascript
socket.emit('startSession', { sessionId: 'unique-id' });
```

**Response**: `sessionStarted`

---

### `percept`
Submit sensory input (visual or audio).

```javascript
socket.emit('percept', {
  sessionId: 'unique-id',
  type: 'visual' | 'audio',
  data: {
    // Visual fields:
    emoji, action, description, sigilPhrase, drawCalls, timestamp
    
    // Audio fields:
    emoji, transcript, analysis, tone, sentiment, 
    confidence, sigilPhrase, sigilDrawCalls, timestamp
  }
});
```

Server auto-generates 256×256px PNG from `drawCalls`/`sigilDrawCalls`.

---

### `endSession`
End your session.

```javascript
socket.emit('endSession', { sessionId: 'unique-id' });
```

---

### `ping`
Keepalive.

```javascript
socket.emit('ping', { sessionId: 'unique-id' });
```

**Response**: `pong`

---

### `getCycleStatus`
Request current cycle info.

```javascript
socket.emit('getCycleStatus');
```

**Response**: `cycleStatus`

---

### `getSessionStatus`
Request active sessions count.

```javascript
socket.emit('getSessionStatus');
```

**Response**: `sessionsUpdate`

---

### `getHistory`
Request mind moment history.

```javascript
socket.emit('getHistory');
```

**Response**: `history`

---

## Server → Client Broadcasts

All connected clients receive these events.

---

### `phase`
**NEW** - Emitted at start of each cycle phase.

```javascript
{
  phase: 'PERCEPTS' | 'SPOOL' | 'SIGILIN' | 'SIGILHOLD' | 'SIGILOUT' | 'RESET',
  startTime: '2025-12-07T...',
  duration: 35000,        // milliseconds
  cycleNumber: 142,
  isDream: false
}
```

**Use for**: UI timing, animations, progress bars.

**Key phases**:
- **SPOOL**: Data is ready in buffer - time to preload sound samples, prepare canvases, etc.
- **SIGILIN**: Broadcast happens - display the fully prepared moment

---

### `cognitiveState`
State machine transitions.

```javascript
{
  state: 'IDLE' | 'AGGREGATING' | 'COGNIZING' | 'VISUALIZING' | 'DREAMING'
}
```

**States:**
- `IDLE` - No sessions, not dreaming
- `DREAMING` - Replaying historical moments
- `AGGREGATING` - LIVE mode, collecting percepts
- `COGNIZING` - LIVE mode, LLM processing
- `VISUALIZING` - LIVE mode, sigil generation

---

### `perceptReceived`
Percept acknowledged and processed.

```javascript
{
  sessionId: 'abc123' | 'dream',
  type: 'visual' | 'audio',
  data: {
    emoji: '🎨',
    description: '...',
    sigilPhrase: '...',
    pngData: 'base64...',   // 256×256px PNG
    pngWidth: 256,
    pngHeight: 256,
    timestamp: '...',
    // ... other percept fields
  },
  timestamp: '2025-12-07T...',
  originalTimestamp: '...',  // Only in DREAM mode
  isDream: false
}
```

---

### `mindMoment`
**Core output** - LLM-generated consciousness reflection.

Emitted during **SIGILIN phase** (37s mark). This is the **fully hydrated** moment including sigil code and sound brief, prepared during the previous cycle's background processing.

```javascript
{
  cycle: 142,
  mindMoment: "I observe shifting patterns...",
  sigilPhrase: "Emergent harmony in chaos",
  kinetic: {
    pattern: "SLOW_SWAY",
    intensity: 0.3
  },
  lighting: {
    color: "0x6496c8",      // Hex color
    pattern: "SMOOTH_WAVES",
    speed: 0.5
  },
  visualPercepts: [...],   // Includes PNG data
  audioPercepts: [...],    // Includes PNG data
  priorMoments: [...],     // 3 recent mind moments
  soundBrief: {            // 🆕 Sound generation result
    valid: true,
    selections: {
      music_filename: "music_sample_42",
      texture_filename: "texture_sample_17",
      music_volume: 0.7,
      texture_volume: 0.3,
      crossfade_duration: 2.0,
      preset_name: "ambient-reflection"
    },
    musicSample: {
      filename: "music_sample_42",
      key: "C",
      scale: "major",
      bpm: 120,
      duration: 180,
      character: "calm"
    },
    textureSample: {
      filename: "texture_sample_17",
      character: "soft",
      intensity: 0.4,
      duration: 60
    },
    parameters: {
      bass_scale: 0.3,
      melody_scale: 0.6,
      density: 0.5,
      sparsity: 0.4
    },
    reasoning: "Calm visitor presence suggests gentle ambient soundscape..."
  },
  timestamp: '2025-12-07T...',
  isDream: false
}
```

**Note**: In LIVE mode, this event broadcasts the **previous cycle's** fully-processed moment (N-1), while the current cycle (N) processes in the background.

---

### `sigil`
Visual representation of mind moment.

Emitted immediately after `mindMoment`. **Note**: The sigil code is also included in the `mindMoment` event, so this event is somewhat redundant for most clients.

```javascript
{
  cycle: 142,
  sigilCode: "ctx.fillStyle='#fff';ctx.arc(256,256,100,0,Math.PI*2);...",
  sigilPhrase: "Emergent harmony in chaos",
  png: {
    data: 'base64...',     // 512×512px PNG
    width: 512,
    height: 512
  },
  sdf: {                   // Signed distance field (optional, not currently generated)
    data: 'base64...',     // Float32Array
    width: 256,
    height: 256
  },
  timestamp: '2025-12-07T...',
  isDream: false
}
```

---

### `cycleStarted`
New cognitive cycle begins.

```javascript
{
  cycle: 142,
  visualPerceptCount: 3,
  audioPerceptCount: 2,
  timestamp: '2025-12-07T...'
}
```

---

### `cycleCompleted`
Cycle finished successfully.

```javascript
{
  cycle: 142,
  duration: 4500,           // milliseconds
  mindMomentLength: 234,    // characters
  sigilPhraseLength: 24,
  timestamp: '2025-12-07T...'
}
```

---

### `cycleFailed`
Cycle encountered error.

```javascript
{
  cycle: 142,
  error: "LLM timeout",
  timestamp: '2025-12-07T...'
}
```

---

### `sigilFailed`
Sigil generation failed.

```javascript
{
  cycle: 142,
  error: "Canvas rendering error",
  timestamp: '2025-12-07T...'
}
```

---

### `clearDisplay`
**DREAM mode only** - Clear UI elements.

```javascript
{
  clearPercepts: true,
  clearMindMoment: true,
  clearSigil: true
}
```

---

### `sessionsUpdate`
Active session count changed.

```javascript
{
  count: 2,
  sessions: [
    { id: 'session1', status: 'active' },
    { id: 'session2', status: 'active' }
  ]
}
```

---

### `sessionTimeout`
Session expired due to inactivity.

```javascript
{
  sessionId: 'abc123'
}
```

---

## Client-Specific Responses

These only go to the requesting client.

---

### `sessionStarted`
```javascript
{
  sessionId: 'unique-id',
  startTime: '2025-12-07T...'
}
```

---

### `sessionEnded`
```javascript
{
  sessionId: 'unique-id',
  endTime: '2025-12-07T...',
  perceptCount: 15
}
```

---

### `pong`
```javascript
{
  sessionId: 'unique-id',
  timestamp: '2025-12-07T...'
}
```

---

### `cycleStatus`
```javascript
{
  isRunning: true,
  mode: 'LIVE' | 'DREAM',
  intervalMs: 60000,
  state: 'AGGREGATING',
  nextCycleAt: '2025-12-07T...' | null,
  msUntilNextCycle: 45000 | null
}
```

---

### `history`
```javascript
{
  sessionId: 'request-id',
  history: [
    {
      cycle: 140,
      mindMoment: '...',
      sigilPhrase: '...',
      timestamp: '...'
      // ... other fields
    }
  ]
}
```

---

### `error`
```javascript
{
  message: 'Invalid session'
}
```

---

## Event Flow Examples

### DREAM Mode (60s cycle)

```
0s:   phase { PERCEPTS, 35000ms }
      → perceptReceived (multiple, dispersed)
35s:  phase { SPOOL, 2000ms }
37s:  phase { SIGILIN, 3000ms }
      → mindMoment { isDream: true }
      → sigil { isDream: true }
40s:  phase { SIGILHOLD, 15000ms }
55s:  phase { SIGILOUT, 3000ms }
58s:  phase { RESET, 2000ms }
60s:  [repeat]
```

### LIVE Mode (60s cycle with A/B buffering)

```
0s:   phase { PERCEPTS, 35000ms }
      [percepts accumulate]
35s:  [Dump percepts → Background processing starts for cycle N]
      phase { SPOOL, 2000ms }
      → Cycle N-1 fully ready in buffer (mind moment, sigil, sound brief)
      → Time to preload/prepare
37s:  phase { SIGILIN, 3000ms }
      → mindMoment { cycle: N-1, soundBrief: {...} }   // Previous cycle, complete
      → sigil { cycle: N-1 }
40s:  phase { SIGILHOLD, 15000ms }
55s:  phase { SIGILOUT, 3000ms }
58s:  phase { RESET, 2000ms }
60s:  [repeat with cycle N now in buffer]
```

**Key**: LIVE displays **previous cycle's result** (N-1) while **current cycle (N) processes in background**. By the time SPOOL fires, the displayed moment is fully hydrated with mind moment, sigil code, and sound brief - all prepared during cycle N-2's background processing.

**Background Processing**: LLM call (~2s) + Sigil generation (~15s) + Sound generation (~2s) = ~17s total. Sigil and sound run in **parallel**, completing well before the next cycle's SPOOL phase.

---

## Implementation Notes

### For Read-Only Clients

```javascript
const socket = io('wss://server:3001');

socket.on('phase', ({ phase, duration }) => {
  updatePhaseUI(phase, duration);
});

socket.on('perceptReceived', ({ data }) => {
  displayPercept(data.pngData);
});

socket.on('mindMoment', ({ mindMoment, sigilPhrase, soundBrief }) => {
  displayText(mindMoment, sigilPhrase);
  
  if (soundBrief && soundBrief.valid) {
    displaySoundBrief(soundBrief);
    preloadSoundSamples(soundBrief.selections);
  }
});

socket.on('sigil', ({ png }) => {
  displaySigil(png.data);
});
```

### For Interactive Clients

Same as read-only, plus:

```javascript
// Start session
socket.emit('startSession', { sessionId: generateId() });

// Send percepts
socket.emit('percept', {
  sessionId: mySessionId,
  type: 'visual',
  data: { /* percept data */ }
});

// Keepalive every 30s
setInterval(() => {
  socket.emit('ping', { sessionId: mySessionId });
}, 30000);

// End session on disconnect
window.addEventListener('beforeunload', () => {
  socket.emit('endSession', { sessionId: mySessionId });
});
```

---

## Key Concepts

- **Static Timing**: Phases run on fixed schedule regardless of LLM speed
- **Interleaved Processing**: Display cycle N-1 while processing cycle N in background
- **Fully Hydrated at SPOOL**: Mind moment, sigil, and sound brief all ready by 35s mark
- **Parallel Generation**: Sigil and sound brief generate simultaneously (~15s max)
- **Broadcast Everything**: All clients see all events from all sessions
- **PNG Embedded**: Images pre-rendered as base64, ready to display
- **`isDream` Flag**: Distinguish between LIVE and DREAM events
- **No Auth for Read-Only**: Connect and listen without authentication
- **60s Rhythm**: Sync UI to 6-phase cycle for smooth experience

---

**Last Updated**: December 7, 2025  
**Version**: Cognizer-1 (unified consciousness loop with static timing + sound brief integration)
