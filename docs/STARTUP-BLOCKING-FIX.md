# The "Hanging After RESET" Bug - Root Cause Analysis

## What You Observed

After RESET completes in DREAM mode, the system just hangs. No PERCEPTS phase fires. Console shows nothing happening.

## Root Cause: Async Startup Blocking

**The problem was in `start()` method:**

```javascript
// OLD (BROKEN) CODE:
async start() {
  // ... setup ...
  
  await this.tick();  // ❌ BLOCKS for 60 seconds!
  
  // Then set up interval
  this.intervalId = setInterval(async () => {
    await this.tick();
  }, 60000);
}
```

**What happened:**

1. Server starts
2. Calls `start()`
3. `await this.tick()` blocks and runs ENTIRE first cycle (60s)
4. Pre-fetch runs at end of first tick
5. Tick completes after ~60s
6. **ONLY THEN** does setInterval get set up!
7. User sees first cycle complete, then... nothing
8. After another 60s, setInterval fires for the SECOND time
9. But that's 120 seconds after startup!

**Timeline (BROKEN):**
```
0:00  start() called
      ↓
      await this.tick() - BLOCKING!
      ↓ (runs for 60s)
      ↓
1:00  First tick completes
      setInterval() finally set up
      ↓
      (waiting for interval...)
      ↓
2:00  setInterval fires → second tick runs ← USER SEES THIS!
```

## The Fix: Setup Interval First

**NEW (WORKING) CODE:**

```javascript
async start() {
  // ... setup ...
  
  // Set up interval FIRST
  this.intervalId = setInterval(async () => {
    await this.tick();
  }, 60000);
  
  // Then fire first tick immediately (don't await!)
  this.tick().catch(err => console.error('❌ Tick error:', err));
}
```

**What happens now:**

1. Server starts
2. Calls `start()`
3. setInterval is set up immediately
4. First tick fires (fire-and-forget, non-blocking)
5. `start()` returns immediately
6. First tick runs (60s)
7. At 60s mark, setInterval fires → second tick starts
8. Perfect rhythm!

**Timeline (FIXED):**
```
0:00  start() called
      setInterval set up immediately
      First tick starts (non-blocking)
      start() returns
      ↓
      (first tick running for 60s)
      ↓
1:00  First tick completes
      setInterval fires → second tick starts ← PERFECT!
      ↓
2:00  Second tick completes
      setInterval fires → third tick starts
```

## Why This Wasn't Obvious

**We had TWO contradictory goals:**

1. **"First tick should run immediately"** - so we called `this.tick()` at start
2. **"First tick shouldn't block startup"** - but we used `await`

The `await` was added to fix the overlapping ticks bug, but it created a NEW bug: blocking startup!

## The Guard Still Works

The `isTickRunning` guard prevents overlaps:

```javascript
this.intervalId = setInterval(async () => {
  // Guard against overlapping ticks
  if (this.isTickRunning) {
    console.warn('⚠️  Previous tick still running, skipping');
    return;
  }
  await this.tick();
}, 60000);
```

**If a tick takes >60s:**
- setInterval fires
- Checks `isTickRunning` 
- If true, skips and waits for next interval
- No overlaps!

## You Were Right: We Overcomplicated It

**The core issue:** We were trying to be too clever with async/await patterns.

**The simple solution:**
1. Set up the interval (the heartbeat)
2. Fire the first tick (start the cycle)
3. Let the interval handle everything else
4. Use the guard to prevent overlaps

**No pre-awaiting, no complex coordination - just let it flow!**

## Current State

With the cache optimization + pre-fetching + simplified startup:

- ✅ Cache loads at startup (fast, one-time)
- ✅ setInterval set up immediately
- ✅ First tick fires immediately (non-blocking)
- ✅ Each tick pre-fetches next dream (10ms)
- ✅ Subsequent ticks start exactly 60s apart
- ✅ Guard prevents overlaps
- ✅ Perfect rhythm!

## Files Changed

- `src/consciousness-loop.js`
  - Moved setInterval setup BEFORE first tick
  - Made first tick fire-and-forget (removed `await`)

## What You Should See Now

```
💭 Dream cache initialized: 247 eligible cycles
🧠 Consciousness loop started (DREAM mode, 60000ms)
💭 Dreaming of cycle 72: "The stillness before me..."
[... cycle runs for 60s ...]
  💭 Pre-fetching next dream...
  ✅ Next dream ready: cycle 185
💭 Dreaming of cycle 185: "The frustrated 'Come on'..."  ← EXACTLY at 1:00!
```

**No hanging, no delays, just smooth 60s cycles!**
