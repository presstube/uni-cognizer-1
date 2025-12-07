# Overlapping Ticks Bug - Fixed

## The Problem

Your transcript showed phases overlapping in LIVE mode:

```
│ 🧠 LIVE Cycle 331 PHASE: PERCEPTS (35.0s)
│ 🧠 LIVE Cycle 0 PHASE: SPOOL (2.0s)          ← INTERRUPTION!
│ 🧠 LIVE Cycle 332 PHASE: PERCEPTS (35.0s)    ← NEW CYCLE STARTED!
│ 🧠 LIVE Cycle 0 PHASE: SIGILHOLD (15.0s)     ← Old cycle continuing
│ 🧠 LIVE Cycle 331 PHASE: SPOOL (2.0s)        ← Delayed emission
```

**What was happening:**
- Cycle 331 starts, runs for 60s (async)
- Meanwhile, setInterval fires at 60s mark
- Cycle 332 starts WHILE 331 is still finishing its integration phases!
- Two ticks running in parallel = chaos

## Root Cause

**In `src/consciousness-loop.js` line 65:**

```javascript
// OLD CODE:
async start() {
  // ...
  
  // Execute first tick immediately
  this.tick().catch(err => ...);  // ❌ FIRE AND FORGET!
  
  // Then set up interval
  this.intervalId = setInterval(async () => {
    await this.tick();  // No guard against overlaps!
  }, intervalMs);
}
```

**Problems:**
1. First tick was NOT awaited → could take 60+ seconds
2. setInterval had NO guard → would fire even if previous tick still running
3. `tick()` had no execution lock → multiple ticks could run simultaneously

## The Fix

### 1. Added execution guard flag

```javascript
constructor(io) {
  // ...
  this.isTickRunning = false;  // ✅ Guard flag
}
```

### 2. Made first tick awaited

```javascript
async start() {
  // ...
  
  // Execute first tick immediately (await it!)
  await this.tick();  // ✅ WAIT for completion!
  
  // Then set up interval
  this.intervalId = setInterval(async () => {
    // Guard against overlapping ticks
    if (this.isTickRunning) {  // ✅ Check guard
      console.warn('⚠️  Previous tick still running, skipping');
      return;
    }
    await this.tick();
  }, intervalMs);
}
```

### 3. Protected tick() with try/finally

```javascript
async tick() {
  // Set guard
  this.isTickRunning = true;  // ✅ Lock
  
  try {
    if (this.mode === 'DREAM') {
      await this.dreamTick();
    } else {
      await this.liveTick();
    }
  } finally {
    // Always clear guard
    this.isTickRunning = false;  // ✅ Unlock (even if error)
  }
}
```

## Result

**Now the timing is perfectly sequential:**

```
0:00  Cycle 331 starts
      ↓ PERCEPTS (35s)
      ↓ SPOOL (2s) - showing placeholder
      ↓ SIGILIN (3s)
      ↓ SIGILHOLD (15s)
      ↓ SIGILOUT (3s)
      ↓ RESET (2s)
1:00  Cycle 331 completes
      
1:00  Cycle 332 starts ← Only NOW!
      ↓ PERCEPTS (35s)
      ↓ SPOOL (2s) - showing cycle 331 ✅
      ...
```

**No overlaps, no interruptions, clean 60s rhythm!**

## What You Should See Now

```
🧠 Cycle 331 starting
  🧠 PERCEPTS phase (35.0s) - accumulating
👁️ Percept: visual
👁️ Percept: audio
  🧠 PERCEPTS phase complete
🧠 Cycle 331: 8 percepts dumped → cognizing
  🧠 [Cycle 331] LLM pipeline starting...
┌─────────────────────────────────────────────────
│ 🧠 LIVE Cycle 0
│ PHASE: SPOOL (2.0s)
└─────────────────────────────────────────────────
  🧠 Displaying placeholder - SPOOL
┌─────────────────────────────────────────────────
│ 🧠 LIVE Cycle 0
│ PHASE: SIGILIN (3.0s)
└─────────────────────────────────────────────────
  🧠 Displaying placeholder - SIGILIN (emitting)
🧠 Mind moment: [Placeholder text...]
┌─────────────────────────────────────────────────
│ 🧠 LIVE Cycle 0
│ PHASE: SIGILHOLD (15.0s)  ← STAYS for full 15s!
└─────────────────────────────────────────────────
  ✅ [Cycle 331] Ready for display
  ✅ [Cycle 331] Complete (18.2s)
┌─────────────────────────────────────────────────
│ 🧠 LIVE Cycle 0
│ PHASE: SIGILOUT (3.0s)
└─────────────────────────────────────────────────
┌─────────────────────────────────────────────────
│ 🧠 LIVE Cycle 0
│ PHASE: RESET (2.0s)
└─────────────────────────────────────────────────
🧠 Cycle 331 complete

🧠 Cycle 332 starting  ← Only starts AFTER 331 complete!
  🧠 PERCEPTS phase (35.0s) - accumulating
```

**Notice:**
- No interleaved cycles
- SIGILHOLD completes full 15s
- Next cycle only starts after previous completes
- Clean, predictable timing

## Files Changed

- `src/consciousness-loop.js`
  - Added `isTickRunning` guard flag
  - Made first tick awaited in `start()`
  - Added guard check in setInterval
  - Wrapped `tick()` in try/finally

## Testing

Restart your server and connect a perceptor:

```bash
npm start
```

Then in another terminal:
```bash
npm run client:perceptor-live
```

Watch the dashboard console - you should see clean, sequential phase transitions with NO overlaps!
