# Cycle Number Explained - Two Different Meanings!

## The Confusion ⚠️

There are **TWO different "cycle" concepts** in the codebase that are getting mixed up!

---

## Concept 1: Global UNI Cycle Counter (from real-cog.js)

**This is UNI's LIFETIME consciousness cycle number.**

```javascript
// src/real-cog.js
let cycleIndex = 0;  // ← GLOBAL across all sessions

// On server boot, loads from database:
cycleIndex = MAX(cycle) FROM mind_moments  // e.g., 284

// Each time cognize() is called:
const thisCycle = ++cycleIndex;  // 285, 286, 287...
```

**Key Facts:**
- ✅ Persists across server restarts (loads from DB)
- ✅ Increments forever (UNI's continuous consciousness)
- ✅ Used in `mindMoment` events and database records
- ✅ Represents UNI's actual cognitive history

**Example:**
```
Server boots → loads cycle 284 from DB
First cognize() → cycle 285
Second cognize() → cycle 286
Server restarts → loads cycle 286
Next cognize() → cycle 287
```

---

## Concept 2: Session-Local Cycle Counter (from consciousness-loop.js)

**This is a counter WITHIN the current LIVE session loop.**

```javascript
// src/consciousness-loop.js
this.cycleBuffer = {
  current: {
    number: 0,  // ← RESETS when switching to LIVE mode
    percepts: { visual: [], audio: [] }
  }
}

// Each tick:
this.cycleBuffer.current.number++;  // 0, 1, 2, 3...
```

**Key Facts:**
- ❌ Does NOT persist
- ❌ Resets to 0 when LIVE mode starts
- ✅ Only used for phase events
- ✅ Tracks position within 60s loop sequence

**Example:**
```
Session starts → cycleBuffer.current.number = 0
First tick → 0 (PERCEPTS → INTEGRATION)
Second tick → 1 (PERCEPTS → INTEGRATION)
Session ends, new session starts → RESETS to 0
```

---

## The Problem in Current Code

### Phase Events Use Session-Local Counter:
```javascript
// consciousness-loop.js line 371
this.emitPhase('PERCEPTS', PERCEPTS_PHASE_MS, cycleNumber, false);
//                                             ^^^^^^^^^^^
//                                             cycleBuffer.current.number (0, 1, 2...)
```

### But Mind Moments Use Global Counter:
```javascript
// real-cog.js line 202
const thisCycle = ++cycleIndex;  // 285, 286, 287...

// Later emits:
onMindMoment((cycle, mindMoment, ...) => {
  // cycle = 285, 286, 287... (global)
});
```

### The Disconnect:

**Cycle 0 (session-local):**
- Phase events say: `cycleNumber: 0`
- Mind moment says: `cycle: 285` (global)
- **Mismatch!**

**Cycle 1 (session-local):**
- Phase events say: `cycleNumber: 1`
- Mind moment says: `cycle: 286` (global)
- **Still mismatched!**

---

## What SHOULD Happen

### Option A: Phase Events Use Global Cycle (Recommended)

**Change**: Don't use `cycleBuffer.current.number` for phase events. Instead, use the actual mind moment's global cycle number.

**Result**:
```
Phase: PERCEPTS, cycle: 285 (global)
Phase: SPOOL, cycle: 285 (global)
mindMoment: cycle: 285 (global)
✅ Everything matches!
```

### Option B: Keep Session-Local, Add Clarity

**Change**: Rename phase event field from `cycleNumber` to `sessionTick` or `loopIteration`.

**Result**:
```
Phase: PERCEPTS, loopIteration: 0
Phase: SPOOL, loopIteration: 0
mindMoment: cycle: 285 (global)
✅ Clear they're different concepts
```

---

## My Analysis of "Jumbled" Feeling

When you said LIVE mode feels jumbled, it's because:

1. **Phase events say cycle 0** (session-local)
2. **But then you see cycle 285** in the mind moment (global)
3. **Console shows both numbers** interleaved
4. **Hard to track** which cycle is which

**Example Console Output (Current):**
```
🧠 Cycle 0 starting                    ← session-local
  🧠 PERCEPTS phase (35.0s)
Phase: PERCEPTS, cycle: 0              ← session-local
  🧠 [Cycle 0] LLM pipeline starting   ← session-local
Phase: SPOOL, cycle: 0                 ← session-local
mindMoment: cycle: 285                 ← GLOBAL! 😵‍💫
```

---

## Recommended Fix

**Use the GLOBAL cycle number everywhere:**

```javascript
// When cognize() is called, store the returned cycle:
async startBackgroundCognition(sessionCycle, percepts) {
  (async () => {
    const result = await cognize(...);
    const globalCycle = result.cycle;  // ← Get global cycle from result
    
    this.cycleBuffer.ready = {
      cycle: globalCycle,  // ← Use global cycle
      ...result
    };
  })();
}

// Then use it in phase events:
async liveIntegrationPhases(moment) {
  const cycleNumber = moment.cycle;  // ← Use global cycle from moment
  this.emitPhase('SPOOL', SPOOL_PHASE_MS, cycleNumber, false);
}
```

**BUT**: This has a timing issue - you don't know the global cycle until cognize() returns!

---

## Better Solution: Track Global Cycle in Loop

```javascript
// consciousness-loop.js
this.cycleBuffer = {
  current: {
    sessionIteration: 0,  // ← Renamed for clarity
    globalCycle: null,     // ← NEW: Track global cycle
    percepts: { visual: [], audio: [] }
  }
}

// When cognize completes, store global cycle:
onMindMoment((cycle, mindMoment, ...) => {
  // Store the global cycle for phase events
  processingResult.globalCycle = cycle;
});

// Use it in phase events:
async livePerceptsPhase(globalCycle) {
  this.emitPhase('PERCEPTS', PERCEPTS_PHASE_MS, globalCycle, false);
}
```

---

## My Answer to Your Question

> "when you say cycle, are you talking about the general cycle number?? in terms of the larger system? or cycle since the session started?"

**Both! And that's the problem!**

- **Phase events** currently use "cycle since session started" (0, 1, 2...)
- **Mind moments** use "general cycle number" (285, 286, 287...)
- They're mixed together, causing confusion

**The fix**: Make phase events use the global cycle number too, so everything matches UNI's actual consciousness timeline.

---

## Shall I Implement the Fix?

I can update the code so that:
- Phase events use the **global cycle number** (285, 286, etc.)
- Remove the session-local counter (or keep it internal only)
- Everything aligns with UNI's continuous consciousness

This would make the timing much clearer to track!
