# Simplified Timing System Proposal

## Current Problem

We're using complex async/await chains with guards, pre-fetching, and timing dependencies. This creates race conditions and intermittent hangs.

## Root Cause

**Mixing timing with data loading:**
- Tick waits for data to load
- Phases wait for each other
- Pre-fetch extends tick duration
- Guard blocks when timing overlaps
- Complex async chains are hard to reason about

## The Simple Solution

**Separate timing from data:**

### 1. Pure Timing Loop (No Data Dependencies)

```javascript
// Every 60s, schedule the 6 phases with setTimeout
function startCycle() {
  const cycleStartTime = Date.now();
  
  // PERCEPTS at 0s
  setTimeout(() => emitPhase('PERCEPTS'), 0);
  
  // SPOOL at 35s
  setTimeout(() => emitPhase('SPOOL'), 35000);
  
  // SIGILIN at 37s
  setTimeout(() => emitPhase('SIGILIN'), 37000);
  
  // SIGILHOLD at 40s
  setTimeout(() => emitPhase('SIGILHOLD'), 40000);
  
  // SIGILOUT at 55s
  setTimeout(() => emitPhase('SIGILOUT'), 55000);
  
  // RESET at 58s
  setTimeout(() => emitPhase('RESET'), 58000);
}

// Run every 60s, no matter what
setInterval(startCycle, 60000);
startCycle(); // First cycle immediately
```

**Benefits:**
- ✅ No async/await chains
- ✅ No guards needed
- ✅ Timing is completely predictable
- ✅ Easy to reason about
- ✅ No race conditions

### 2. Separate Data Loading (Background)

```javascript
// Completely separate: keep 2 dreams in buffer
let currentDream = null;
let nextDream = null;

async function ensureDreamsLoaded() {
  if (!nextDream) {
    nextDream = await loadRandomDream();
  }
}

// Call this independently, not tied to timing
setInterval(ensureDreamsLoaded, 5000);
```

### 3. Emit Data When Phase Fires

```javascript
function emitPhase(phase) {
  io.emit('phase', { phase, ... });
  
  // If SIGILIN, also emit the current dream data
  if (phase === 'SIGILIN') {
    if (!currentDream) {
      currentDream = nextDream; // Grab from buffer
      nextDream = null; // Mark for reload
    }
    
    if (currentDream) {
      io.emit('mindMoment', currentDream);
      io.emit('sigil', currentDream.sigil);
    }
  }
  
  // If RESET, rotate dreams
  if (phase === 'RESET') {
    currentDream = null; // Done with this one
  }
}
```

## Key Principles

1. **Timing is king** - Always fire phases on schedule, no matter what
2. **Data is separate** - Load in background, use when available
3. **No blocking** - Never await anything in the timing loop
4. **Fallback gracefully** - If no data, emit placeholder or skip
5. **Simple > Complex** - Readable code beats clever code

## Implementation Plan

### Phase 1: Simplify DREAM mode
- Remove all async/await from dreamTick()
- Use setTimeout for all 6 phases (scheduled at cycle start)
- Load dreams in separate background task
- Test until rock solid

### Phase 2: Apply to LIVE mode
- Same timing approach
- LLM calls run in background
- Results used when available
- Placeholder if not ready

## Expected Behavior

**Console output:**
```
0:00  💭 DREAM Cycle 302 - PERCEPTS
0:35  💭 DREAM Cycle 302 - SPOOL
0:37  💭 DREAM Cycle 302 - SIGILIN (emitting)
0:40  💭 DREAM Cycle 302 - SIGILHOLD
0:55  💭 DREAM Cycle 302 - SIGILOUT
0:58  💭 DREAM Cycle 302 - RESET
1:00  💭 DREAM Cycle 178 - PERCEPTS  ← EXACTLY 60s later!
1:35  💭 DREAM Cycle 178 - SPOOL
...
```

**No hangs, no delays, perfect 60s rhythm!**

## Trade-offs

**What we gain:**
- ✅ Predictable, reliable timing
- ✅ Simple, readable code
- ✅ Easy to debug
- ✅ No race conditions

**What we might lose:**
- Slight risk of no data ready (mitigated by buffer + background loading)
- Can't "wait" for slow operations (but we shouldn't anyway!)

## Recommendation

**Start fresh with simplified DREAM mode:**
1. Strip out all the complexity
2. Pure setTimeout-based timing
3. Background data loading
4. Test thoroughly
5. Then apply same pattern to LIVE mode

**The current code has too many layers. Sometimes you need to throw it away and start simple.**

Would you like me to implement this simplified version?
