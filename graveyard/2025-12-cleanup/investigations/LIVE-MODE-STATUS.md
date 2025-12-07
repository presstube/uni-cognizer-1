# LIVE Mode: Expected Behavior & Timeline

## Current Implementation Status

**LIVE mode is partially implemented** - the timing structure is in place, but there's a critical limitation:

### The Issue

The `setupLiveListeners()` system stores results in `cycleBuffer.ready`, BUT those results come via **event callbacks**, which means:

1. Background cognition starts during PERCEPTS phase
2. Results come back **asynchronously** via listeners
3. Results are stored in `cycleBuffer.ready` when `onSigil()` fires
4. Next INTEGRATION phase displays whatever is in `cycleBuffer.ready`

**Problem**: The event-based system means results might not be ready in time, and the cycle doesn't "wait" for them.

---

## What You Should See (Cycle by Cycle)

### Cycle 0 (Bootstrap)

**PERCEPTS (0:00-0:35):**
- ✅ Phase event fires
- ✅ Percepts from perceptor flow in as you send them
- ✅ They accumulate in `cycleBuffer.current.percepts`
- At 0:35: Percepts dumped → cognize() starts (background LLM processing)

**INTEGRATION (0:35-1:00):**
- ✅ SPOOL (2s) - phase event fires
- ✅ SIGILIN (3s) - **PLACEHOLDER** mind moment emitted
  - Text: "Consciousness initializing, patterns emerging..."
  - Sigil: Simple blue circle
- ✅ SIGILHOLD (15s) - placeholder displays
- ✅ SIGILOUT (3s) - placeholder clears
- ✅ RESET (2s) - pane clears

**Background**: Cycle 0 LLM processing happening (may take 20-30s)

---

### Cycle 1 (First Real Results)

**PERCEPTS (1:00-1:35):**
- ✅ Phase event fires
- ✅ New percepts flow in
- At 1:35: Percepts dumped → cognize() starts

**INTEGRATION (1:35-2:00):**
- ✅ SPOOL (2s)
- ✅ SIGILIN (3s) - **Cycle 0 REAL results** should display!
  - IF `cycleBuffer.ready` was populated by listeners
  - IF NOT: Falls back to placeholder again ⚠️

**Background**: Cycle 1 LLM processing happening

---

### Cycle 2+ (Steady State)

Should show interleaved pattern:
- Collect percepts for Cycle N
- Display results from Cycle N-1

---

## What's Actually Happening (Likely Issues)

### Issue 1: Listener Timing

The listeners store results when `onSigil()` fires:

```javascript
onSigil((cycle, sigilCode, sigilPhrase, sigilPNG) => {
  // ... builds processingResult ...
  this.cycleBuffer.ready = { ...processingResult };
  console.log(`  ✅ [Cycle ${cycle}] Ready for display`);
});
```

**BUT**: If sigil generation takes >60s, the result won't be ready before the next INTEGRATION phase!

### Issue 2: Cycle Number Mismatch

The `processingResult` uses the cycle number from the LLM response, but `liveIntegrationPhases()` uses `moment.cycle`. These might be out of sync.

### Issue 3: No Fallback Logging

If `cycleBuffer.ready` is null, it falls back to placeholder but doesn't log why.

---

## What You're Probably Seeing

**Cycle 0:**
- ✅ Percepts flow in correctly
- ✅ Placeholder displays

**Cycle 1:**
- ✅ Percepts flow in
- ⚠️ **Placeholder displays again** (because Cycle 0 results not ready yet)

**Cycle 2:**
- ✅ Percepts flow in
- 🤔 **Maybe Cycle 0 results?** (if they finally finished)
- OR still placeholder

---

## How to Debug

Check your server console for these patterns:

**Good Signs:**
```
🧠 Cycle 0 starting
  🧠 PERCEPTS phase (35.0s) - accumulating
  🧠 PERCEPTS phase complete
🧠 Cycle 0: 5 percepts dumped → cognizing
  🧠 [Cycle 0] LLM pipeline starting...
  🧠 Displaying placeholder - SPOOL
  🧠 Displaying placeholder - SIGILIN (emitting)
```

**Look For:**
```
  ✅ [Cycle 0] Ready for display    <-- Does this appear?
  ✅ [Cycle 0] Complete (19.2s)     <-- How long did it take?
```

**If you see:**
```
  ✅ [Cycle 0] Complete (65.3s)     <-- TOO SLOW!
```

Then the LLM pipeline is taking longer than 60s, and results arrive too late.

---

## Recommended Fixes (For Later)

1. **Add promise-based cognition** (cognizeForBuffer) instead of event-based
2. **Add explicit timeout handling** (60s max)
3. **Add better logging** when falling back to placeholder
4. **Consider extending LIVE_CYCLE_MS to 90s** to give more LLM headroom

---

## Quick Test Commands

**Check timing in server console:**
```bash
# Watch for these patterns:
grep "Ready for display" 
grep "Complete ("
```

**Expected timing:**
- Mind moment: 2-5s
- Sigil generation: 14-18s
- **Total: ~20s** (should fit in 60s cycle with 40s buffer)

If you're seeing >60s total, the LLMs are too slow and we need to adjust.
