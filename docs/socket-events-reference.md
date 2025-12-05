# Socket Events Reference

Comprehensive reference for all WebSocket events in Cognizer-1.

---

## Client → Server Events

### `startSession`
**When**: Client wants to start a cognitive session  
**Payload**:
```javascript
{ sessionId: string }
```
**Response**: `sessionStarted` event

---

### `percept`
**When**: Client submits a percept (visual or audio)  
**Payload**:
```javascript
{
  sessionId: string,
  type: 'visual' | 'audio',
  data: {
    // Visual percept fields:
    emoji: string,
    action: string,
    description: string,
    sigilPhrase: string,
    drawCalls: string,              // Canvas drawing code
    timestamp: string,
    
    // Audio percept fields:
    emoji: string,
    transcript: string,
    analysis: string,
    tone: string,
    sentiment: string,
    confidence: number,
    sigilPhrase: string,
    sigilDrawCalls: string,         // Canvas drawing code
    timestamp: string
  }
}
```
**Server Processing**: 
- Generates 256×256px PNG from drawCalls/sigilDrawCalls
- Embeds PNG as base64 in percept object
- Broadcasts `perceptReceived` event with PNG included

---

### `endSession`
**When**: Client ends their session  
**Payload**:
```javascript
{ sessionId: string }
```
**Response**: `sessionEnded` event

---

### `ping`
**When**: Client keepalive  
**Payload**:
```javascript
{ sessionId: string }
```
**Response**: `pong` event

---

### `getHistory`
**When**: Client requests mind moment history  
**Payload**: None  
**Response**: `history` event with array of mind moments

---

### `getCycleStatus`
**When**: Client requests current cognitive cycle status  
**Payload**: None  
**Response**: `cycleStatus` event

---

### `getSessionStatus`
**When**: Client requests active session info  
**Payload**: None  
**Response**: `sessionsUpdate` event

---

## Server → Client Events (Broadcasts)

### `perceptReceived`
**When**: Server receives and processes a percept  
**Broadcast**: All clients  
**Payload**:
```javascript
{
  sessionId: string,            // 'dream' in DREAMING mode
  type: 'visual' | 'audio',
  data: {
    // All original percept fields, PLUS:
    pngData: string,            // Base64 PNG (256×256px, white-on-transparent)
    pngWidth: number,           // 256
    pngHeight: number           // 256
  },
  timestamp: string,
  originalTimestamp: string,    // Only in dream replay
  isDream: boolean              // true in DREAMING mode
}
```

---

### `mindMoment`
**When**: Cognitive cycle generates a mind moment  
**Broadcast**: All clients  
**Payload**:
```javascript
{
  cycle: number,
  sessionId: string,
  mindMoment: string,           // LLM-generated observation
  sigilPhrase: string,
  kinetic: object,              // Movement parameters
  lighting: object,             // Color/brightness
  visualPercepts: array,        // Array with PNG data embedded
  audioPercepts: array,         // Array with PNG data embedded
  priorMoments: array,          // Context from previous cycles
  timestamp: string,
  personalityName: string,
  sigilPromptName: string,
  llmProvider: string,
  processingDuration: number,
  isDream: boolean              // true in DREAMING mode
}
```

---

### `sigil`
**When**: Sigil visualization is generated  
**Broadcast**: All clients  
**Payload**:
```javascript
{
  cycle: number,
  sessionId: string,
  sigilCode: string,            // Canvas drawing code
  sigilPhrase: string,
  svg: {
    data: string,               // SVG XML
    width: number,              // 512
    height: number              // 512
  },
  sdf: {
    data: array,                // Float32Array SDF field
    width: number,              // 256
    height: number              // 256
  },
  png: {
    data: string,               // Base64 PNG (512×512px)
    width: number,              // 512
    height: number              // 512
  },
  timestamp: string,
  isDream: boolean              // true in DREAMING mode
}
```

---

### `cognitiveState`
**When**: Cognitive state changes  
**Broadcast**: All clients  
**Payload**:
```javascript
{
  state: 'IDLE' | 'AGGREGATING' | 'COGNIZING' | 'VISUALIZING' | 'DREAMING'
}
```

**State Meanings**:
- `IDLE` - No active sessions, not dreaming
- `AGGREGATING` - Waiting for cognitive cycle, collecting percepts
- `COGNIZING` - LLM processing in progress
- `VISUALIZING` - Generating sigil visualization
- `DREAMING` - Replaying historical mind moments (no active sessions)

---

### `cycleStarted`
**When**: New cognitive cycle begins  
**Broadcast**: All clients  
**Payload**:
```javascript
{
  cycle: number,
  visualPerceptCount: number,
  audioPerceptCount: number,
  timestamp: string
}
```

---

### `cycleCompleted`
**When**: Cognitive cycle finishes successfully  
**Broadcast**: All clients  
**Payload**:
```javascript
{
  cycle: number,
  duration: number,             // milliseconds
  mindMomentLength: number,     // characters
  sigilPhraseLength: number,
  timestamp: string
}
```

---

### `cycleFailed`
**When**: Cognitive cycle encounters error  
**Broadcast**: All clients  
**Payload**:
```javascript
{
  cycle: number,
  error: string,
  timestamp: string
}
```

---

### `sigilFailed`
**When**: Sigil generation fails  
**Broadcast**: All clients  
**Payload**:
```javascript
{
  cycle: number,
  error: string,
  timestamp: string
}
```

---

### `clearDisplay`
**When**: Dream lifecycle clears UI (DREAMING mode only)  
**Broadcast**: All clients  
**Payload**:
```javascript
{
  clearPercepts: boolean,       // Clear percept displays
  clearMindMoment: boolean,     // Clear mind moment display
  clearSigil: boolean           // Clear sigil display
}
```

---

### `sessionsUpdate`
**When**: Active session count changes  
**Broadcast**: All clients  
**Payload**:
```javascript
{
  activeSessions: number,
  sessions: {
    [sessionId]: {
      startTime: string,
      lastActivity: string,
      perceptCount: number
    }
  }
}
```

---

### `sessionTimeout`
**When**: Session expires due to inactivity  
**Broadcast**: All clients  
**Payload**:
```javascript
{
  sessionId: string
}
```

---

## Client-Specific Responses

### `sessionStarted`
**When**: Response to `startSession`  
**To**: Requesting client only  
**Payload**:
```javascript
{
  sessionId: string,
  startTime: string
}
```

---

### `sessionEnded`
**When**: Response to `endSession`  
**To**: Requesting client only  
**Payload**:
```javascript
{
  sessionId: string,
  endTime: string,
  perceptCount: number
}
```

---

### `pong`
**When**: Response to `ping`  
**To**: Requesting client only  
**Payload**:
```javascript
{
  sessionId: string,
  timestamp: string
}
```

---

### `history`
**When**: Response to `getHistory`  
**To**: Requesting client only  
**Payload**:
```javascript
{
  sessionId: string,
  history: [
    {
      cycle: number,
      mindMoment: string,
      sigilPhrase: string,
      timestamp: string,
      // ... other mind moment fields
    }
  ]
}
```

---

### `cycleStatus`
**When**: Response to `getCycleStatus`  
**To**: Requesting client only  
**Payload**:
```javascript
{
  isRunning: boolean,
  intervalMs: number,
  nextCycleAt: string | null,
  msUntilNextCycle: number | null,
  state: string,
  mode: 'LIVE' | 'DREAM'
}
```

---

### `error`
**When**: Client request fails  
**To**: Requesting client only  
**Payload**:
```javascript
{
  message: string
}
```

---

## Event Flow Examples

### LIVE Mode Cognitive Cycle
```
Client → startSession
Server → sessionStarted
Server → cognitiveState { state: 'AGGREGATING' }

Client → percept (visual)
Server → perceptReceived (with PNG)

Client → percept (audio)
Server → perceptReceived (with PNG)

[5 seconds pass]

Server → cognitiveState { state: 'COGNIZING' }
Server → cycleStarted
Server → mindMoment (with percepts including PNGs)
Server → cognitiveState { state: 'VISUALIZING' }
Server → sigil (with PNG)
Server → cognitiveState { state: 'AGGREGATING' }
Server → cycleCompleted
```

---

### DREAM Mode Lifecycle
```
Server → cognitiveState { state: 'DREAMING' }

[Dream starts, 20s cycle]

Server → clearDisplay { clearPercepts: true, clearMindMoment: true, clearSigil: true }
Server → perceptReceived { isDream: true } (multiple, 0-18s)
Server → mindMoment { isDream: true } (at 20s)
Server → sigil { isDream: true } (at 20s)

[Dream ends, next cycle starts]
```

---

## Key Concepts

### Broadcast vs Point-to-Point
- **Broadcast** (`io.emit()`): All connected clients receive
- **Point-to-point** (`socket.emit()`): Only requesting client receives

### PNG Generation
- **Percept PNGs**: Generated on arrival (256×256px)
- **Sigil PNGs**: Generated after LLM (512×512px)
- **Format**: Base64-encoded, white-on-transparent
- **Embedded**: PNGs included in event payloads

### Dream Mode
- Replays historical mind moments when no sessions active
- Uses `isDream: true` flag in events
- SessionId is `'dream'` for dream percepts
- Follows 20-second lifecycle with timed percept replay

### State Machine
```
IDLE ←→ DREAMING (no sessions)
  ↓
AGGREGATING (session starts)
  ↓
COGNIZING (LLM processing)
  ↓
VISUALIZING (sigil generation)
  ↓
AGGREGATING (cycle complete)
```

---

## Implementation Notes

- All timestamps are ISO 8601 strings
- PNG data is base64-encoded string
- Canvas code is JavaScript string (executable with `new Function()`)
- SDF data is Float32Array serialized to JSON array
- Session IDs are client-generated unique strings
- Cycle numbers increment sequentially from database
- Dream mode uses same event types with `isDream` flag

---

**Last Updated**: December 5, 2025  
**Version**: Cognizer-1 (includes percept PNG feature)
