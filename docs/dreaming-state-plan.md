# DREAMING State Implementation Plan

**Date**: December 2, 2025  
**Status**: Ready for Implementation  

---

## Overview

Extend the cognitive system with a new **DREAMING** state that activates when no sessions are active. UNI will replay random historical mind moments, broadcasting their sigils to any connected observers.

---

## Design Philosophy

The DREAMING loop is **complementary** to the cognitive loop, forming a mutual exclusion pair:

- **Sessions active** → Cognitive loop (AGGREGATING → COGNIZING → VISUALIZING)
- **No sessions** → Dream loop (DREAMING)
- **Never both simultaneously**

This mirrors consciousness: when engaged, UNI processes new percepts. When alone, UNI dreams—replaying past experiences.

---

## State Machine Extension

### Current States
```
IDLE          → Cognitive loop not running (transitional)
AGGREGATING   → Waiting for next cycle, collecting percepts
COGNIZING     → LLM processing in flight
VISUALIZING   → Generating sigil visualization
```

### New State
```
DREAMING      → Replaying random historical mind moments
```

### State Transitions
```
Server start (no sessions):  → DREAMING
First session starts:        DREAMING → IDLE → AGGREGATING
Last session ends:           AGGREGATING → IDLE → DREAMING
```

---

## Technical Specification

### Dream Cycle Behavior

**Interval**: 20 seconds (configurable via `DREAM_CYCLE_MS`)

**Per cycle**:
1. Query database for random mind moment with sigil
2. Emit `'sigil'` event with same structure as cognitive loop
3. Include optional `isDream: true` flag for client differentiation

**No operations**:
- No LLM calls
- No sigil generation
- No database writes
- Just read and broadcast

---

## File Changes

### 1. NEW: `src/dream-loop.js` (~60 lines)

**Purpose**: Encapsulate dream loop logic

**Exports**:
- `startDreamLoop(callback)` - Start dream interval
- `stopDreamLoop()` - Stop dream interval  
- `isDreaming()` - Check if dreaming

**Key function**:
```javascript
async function getRandomMindMoment() {
  // Query: SELECT ... FROM mind_moments WHERE sigil_code IS NOT NULL ORDER BY RANDOM() LIMIT 1
  // Returns: { cycle, sigilCode, sigilPhrase, sdf }
}
```

**Logic**:
- Uses `setInterval` at `DREAM_CYCLE_MS` rate
- Queries random moment from DB
- Invokes callback with sigil data
- Graceful error handling (continues on DB errors)
- Null-safe (handles empty database)

---

### 2. UPDATE: `src/cognitive-states.js` (~2 lines)

Add new constant:
```javascript
export const CognitiveState = {
  IDLE: 'IDLE',
  AGGREGATING: 'AGGREGATING',
  COGNIZING: 'COGNIZING',
  VISUALIZING: 'VISUALIZING',
  DREAMING: 'DREAMING'  // NEW
};
```

---

### 3. UPDATE: `src/main.js` (~10 lines)

**Import dream loop**:
```javascript
import { startDreamLoop, stopDreamLoop, isDreaming } from './dream-loop.js';
```

**Update `getCycleStatus()`**:
- Check `isDreaming()` first
- Return `state: CognitiveState.DREAMING` if true

**Export dream controls**:
```javascript
export { startDreamLoop, stopDreamLoop, isDreaming };
```

---

### 4. UPDATE: `server.js` (~40 lines)

**Import dream loop**:
```javascript
import { startDreamLoop, stopDreamLoop } from './src/dream-loop.js';
```

**Modify session start handler** (line ~237):
```javascript
if (activeSessions.size === 1) {
  // Stop dream loop before starting cognitive loop
  stopDreamLoop();
  io.emit('cognitiveState', { state: CognitiveState.IDLE });
  
  console.log('🚀 FIRST SESSION - STARTING COGNITIVE LOOP');
  startCognitiveLoop(/* ... existing callbacks ... */);
}
```

**Modify session end handler** (line ~364):
```javascript
if (activeSessions.size === 0) {
  stopCognitiveLoop();
  
  // Start dream loop after small delay (allow in-flight operations to complete)
  setTimeout(() => {
    startDreamLoop((cycle, sigilCode, sigilPhrase, sigilSDF) => {
      const sigilData = {
        cycle,
        sigilCode,
        sigilPhrase,
        isDream: true,
        timestamp: new Date().toISOString()
      };
      
      // Include SDF if available
      if (sigilSDF && sigilSDF.data) {
        sigilData.sdf = {
          width: sigilSDF.width,
          height: sigilSDF.height,
          data: Buffer.from(sigilSDF.data).toString('base64')
        };
      }
      
      io.emit('sigil', sigilData);
    });
    
    io.emit('cognitiveState', { state: CognitiveState.DREAMING });
  }, 1000);
}
```

**Add startup dream loop** (after DB initialization, line ~40):
```javascript
// Start dream loop if no sessions at startup
if (activeSessions.size === 0) {
  startDreamLoop(/* ... callback ... */);
  io.emit('cognitiveState', { state: CognitiveState.DREAMING });
  console.log('💭 Starting in dream state (no active sessions)');
}
```

---

### 5. UPDATE: `.env` (documentation only)

Add optional config:
```bash
# Dream Loop
DREAM_CYCLE_MS=20000  # Default: 20 seconds
```

---

## Implementation Steps

1. **Create `src/dream-loop.js`**
   - Implement `getRandomMindMoment()` query
   - Implement `startDreamLoop()` / `stopDreamLoop()` / `isDreaming()`
   - Add logging with 💭 emoji

2. **Update `src/cognitive-states.js`**
   - Add `DREAMING` constant

3. **Update `src/main.js`**
   - Import dream loop functions
   - Update `getCycleStatus()` to handle dreaming state
   - Re-export dream controls

4. **Update `server.js`**
   - Import dream loop
   - Wire to session start (stop dream loop)
   - Wire to session end (start dream loop)
   - Wire to server startup (start dream loop if no sessions)

5. **Test manually**
   - Start server (should enter DREAMING)
   - Verify dreams emit every 20s
   - Start session (should stop dreaming, enter AGGREGATING)
   - End session (should return to DREAMING after delay)

---

## Robustness Considerations

### Empty Database
- `getRandomMindMoment()` returns `null` if no moments exist
- Loop continues silently (no crash)

### Database Errors
- Wrapped in try/catch
- Logged but non-fatal
- Loop continues

### Race Conditions
- 1-second delay before starting dream loop prevents mid-cycle race
- Dream callback cleared on stop (no listener leaks)

### Mutual Exclusion
- Enforced by explicit `stopDreamLoop()` before `startCognitiveLoop()`
- Enforced by explicit `stopCognitiveLoop()` before `startDreamLoop()`

### Client Compatibility
- Uses existing `'sigil'` event structure
- Backward compatible (clients ignore `isDream` flag if not handled)
- Optional differentiation via `isDream: true` flag

---

## Testing Approach

### Manual Testing
1. Start server with no sessions → verify DREAMING state
2. Observe console logs for dream emissions (💭 emoji)
3. Start session → verify transition to AGGREGATING
4. Send percepts → verify normal cognition
5. End session → verify transition to DREAMING
6. Connect read-only client → verify dreams visible

### Edge Cases
- Empty database (no moments to dream)
- Database disabled (`DATABASE_ENABLED=false`)
- Multiple rapid session start/stop cycles
- Server restart mid-dream

---

## Client Integration

Clients can observe dreams without modification:

```javascript
socket.on('sigil', ({ cycle, sigilCode, sigilPhrase, isDream }) => {
  if (isDream) {
    console.log(`💭 UNI is dreaming... (cycle ${cycle})`);
  }
  renderSigil(sigilCode);
});

socket.on('cognitiveState', ({ state }) => {
  if (state === 'DREAMING') {
    showDreamModeIndicator();
  }
});
```

---

## Success Criteria

- ✅ Dream loop starts when no sessions active
- ✅ Dream loop stops when first session starts
- ✅ Dreams emit every 20 seconds (configurable)
- ✅ Sigil events include valid sigil data
- ✅ No crashes on empty database
- ✅ No race conditions between loops
- ✅ State machine remains consistent
- ✅ Logging clearly indicates dream vs cognitive states

---

## Future Enhancements (Out of Scope)

- Dream "themes" (query by emotional valence, time period, etc.)
- Dream sequences (replay chronological series)
- Dream fading (visual effects for dream state)
- Dream analytics (track which moments resurface)

---

## Adherence to Prime Directive

- ✅ **Functional**: Pure functions, minimal side effects
- ✅ **Immutable**: No state mutation
- ✅ **Unidirectional flow**: Database → dream loop → broadcast
- ✅ **File size**: New file ~60 lines, updates minimal
- ✅ **Minimal libraries**: No new dependencies
- ✅ **Dumb clients**: All logic server-side, clients just render

---

**Status**: Plan complete. Ready for implementation.

