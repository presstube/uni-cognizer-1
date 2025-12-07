# LIVE Mode Investigation - Expected vs Actual

## Your Expected Flow ✅

```
1. Perceptor connects, session begins
2. Enters PERCEPTS mode, percepts flow in
3. Immediately fetches placeholder (historical mind moment)
4. After 35s: percepts dumped → cognize()
5. SPOOL event (2s) with PLACEHOLDER
6. SIGILIN event (3s) with PLACEHOLDER
7. SIGILHOLD event (15s) with PLACEHOLDER
8. SIGILOUT event (3s)
9. RESET event (2s)
10. PERCEPTS event (35s) - new percepts
11. After 35s: dump → cognize()
12. SPOOL event (2s) with FIRST REAL MIND MOMENT
13. Continue...
```

**Total Cycle: 60s (35s PERCEPTS + 25s INTEGRATION)**

---

## What's Actually Implemented ✅

```javascript
async liveTick() {
  const cycleNumber = this.cycleBuffer.current.number;
  
  // PHASE 1: PERCEPTS (35s)
  await this.livePerceptsPhase(cycleNumber);
  
  // Dump and start background cognition
  const percepts = this.dumpPercepts();
  this.startBackgroundCognition(cycleNumber, percepts);
  
  // PHASES 2-6: INTEGRATION (25s)
  const toDisplay = this.cycleBuffer.ready || this.cycleBuffer.placeholder;
  await this.liveIntegrationPhases(toDisplay);
  
  // Advance cycle counter
  this.cycleBuffer.current.number++;
}
```

### Step-by-Step Actual Flow

**Session Start:**
```
1. Perceptor connects
2. transitionToLive() → switchMode('LIVE')
3. loadPlaceholder() - fetches random mind moment ✅
4. start() - begins loop
5. tick() fires immediately
```

**Cycle 0 (First Cycle):**
```
0:00  liveTick() starts
      ↓
0:00  livePerceptsPhase(0) begins
      - Emits: phase('PERCEPTS', 35s, cycle=0)
      - Percepts flow in from perceptor
      ↓
0:35  livePerceptsPhase(0) ends
      ↓
0:35  dumpPercepts() - get collected percepts
      startBackgroundCognition(0, percepts) - starts LLM
      ↓
0:35  liveIntegrationPhases(placeholder) begins
      - toDisplay = cycleBuffer.ready (NULL) || placeholder ✅
      ↓
0:35  SPOOL phase (2s) - emits with cycle=0
      - Emits: phase('SPOOL', 2s, cycle=0)
      - console: "Displaying placeholder - SPOOL"
      ↓
0:37  SIGILIN phase (3s) - emits placeholder
      - Emits: phase('SIGILIN', 3s, cycle=0)
      - broadcastMoment(placeholder) ✅
      - console: "Displaying placeholder - SIGILIN (emitting)"
      ↓
0:40  SIGILHOLD phase (15s)
      - Emits: phase('SIGILHOLD', 15s, cycle=0)
      ↓
0:55  SIGILOUT phase (3s)
      - Emits: phase('SIGILOUT', 3s, cycle=0)
      ↓
0:58  RESET phase (2s)
      - Emits: phase('RESET', 2s, cycle=0)
      ↓
1:00  liveTick() ends
      cycleBuffer.current.number++ (now 1)
```

**Background During Cycle 0:**
```
0:35  cognize() starts
~0:38 Mind moment returns (3s)
~0:54 Sigil completes (16s)
      → cycleBuffer.ready populated ✅
```

**Cycle 1 (Second Cycle):**
```
1:00  liveTick() starts (cycle 1)
      ↓
1:00  livePerceptsPhase(1) begins
      - Emits: phase('PERCEPTS', 35s, cycle=1)
      ↓
1:35  livePerceptsPhase(1) ends
      ↓
1:35  dumpPercepts() - get new percepts
      startBackgroundCognition(1, percepts)
      ↓
1:35  liveIntegrationPhases(cycleBuffer.ready) begins
      - toDisplay = cycleBuffer.ready (HAS CYCLE 0 RESULTS!) ✅
      ↓
1:35  SPOOL phase (2s) - cycle 0 results
      - Emits: phase('SPOOL', 2s, cycle=0) ⚠️
      - console: "Displaying cycle 0 - SPOOL"
      ↓
1:37  SIGILIN phase (3s) - cycle 0 results
      - Emits: phase('SIGILIN', 3s, cycle=0) ⚠️
      - broadcastMoment(cycle 0 results) ✅
      ↓
[... continues normally ...]
```

---

## The Issue I Found ⚠️

### Problem: Cycle Number in Phase Events

In `liveIntegrationPhases()`:

```javascript
async liveIntegrationPhases(moment) {
  const cycleNumber = moment.cycle;  // ⬅️ Uses cycle from MOMENT
  
  this.emitPhase('SPOOL', SPOOL_PHASE_MS, cycleNumber, false);
  //                                       ^^^^^^^^^^^ 
  //                                       Uses moment.cycle (0)
  //                                       NOT current cycle (1)
}
```

**What happens:**
- Cycle 1 is running (collecting percepts for cycle 1)
- But displays cycle 0 results
- Phase events say `cycleNumber: 0` (from the moment)
- This is confusing!

**Expected:**
- Phase events should show **current cycle** (1)
- Moment being displayed is from previous cycle (0)
- These are different concepts!

---

## Comparison: Expected vs Actual

| Aspect | Your Expected | Actually Implemented | Status |
|--------|---------------|---------------------|--------|
| Placeholder fetch | At session start | At session start ✅ | **CORRECT** |
| First phase | PERCEPTS | PERCEPTS ✅ | **CORRECT** |
| Percepts flow in | During PERCEPTS | During PERCEPTS ✅ | **CORRECT** |
| Dump timing | After 35s | After 35s ✅ | **CORRECT** |
| SPOOL with placeholder | Cycle 0 | Cycle 0 ✅ | **CORRECT** |
| SIGILIN with placeholder | Cycle 0 | Cycle 0 ✅ | **CORRECT** |
| SIGILHOLD | 15s | 15s ✅ | **CORRECT** |
| SIGILOUT | 3s | 3s ✅ | **CORRECT** |
| RESET | 2s | 2s ✅ | **CORRECT** |
| Next PERCEPTS | Cycle 1 | Cycle 1 ✅ | **CORRECT** |
| SPOOL with real moment | Cycle 1 | Cycle 1 ✅ | **CORRECT** |
| **Phase cycle numbers** | Current cycle | Displayed moment's cycle | **CONFUSING** ⚠️ |

---

## The Core Logic Is CORRECT ✅

The flow you described **IS** what's implemented:

1. ✅ Placeholder fetched on session start
2. ✅ PERCEPTS phase runs for 35s
3. ✅ Percepts dumped, cognize starts
4. ✅ INTEGRATION phases run with placeholder (Cycle 0)
5. ✅ Next PERCEPTS phase runs (Cycle 1)
6. ✅ INTEGRATION phases run with real results (Cycle 1)

**The only issue:** Phase events use `moment.cycle` instead of current cycle number, which could be confusing for tracking.

---

## Potential Fixes

### Option 1: Use Current Cycle in Phase Events (Clearer)

```javascript
async liveTick() {
  const cycleNumber = this.cycleBuffer.current.number;
  
  // ... percepts phase ...
  
  // Pass CURRENT cycle to integration phases
  await this.liveIntegrationPhases(toDisplay, cycleNumber);
}

async liveIntegrationPhases(moment, currentCycle) {
  this.emitPhase('SPOOL', SPOOL_PHASE_MS, currentCycle, false);
  //                                       ^^^^^^^^^^^^ current cycle
  // But still broadcast the moment (which is from previous cycle)
  this.broadcastMoment(moment);
}
```

**Result**: Phase events show cycle 1, but display cycle 0 results (clear separation)

### Option 2: Keep As Is (Also Valid)

Phase events show which cycle's results are being displayed. This is semantically correct, just potentially confusing.

---

## What Might Feel "Jumbled"

If you're seeing jumbled behavior, it's likely:

1. **Timing perception**: 60s feels long, hard to track where you are
2. **Cycle number confusion**: Phase events show old cycle number
3. **First cycle weirdness**: Placeholder + background processing overlap
4. **Console logs**: Mixing current cycle logs with previous cycle displays

---

## Recommendation

**The implementation is functionally correct!** 

If it feels jumbled, I suggest:
1. Add clearer console logs distinguishing "current cycle" vs "displaying cycle"
2. Consider Option 1 (use current cycle in phase events)
3. Add a visual indicator in dashboard showing both numbers

**Would you like me to implement Option 1 to make cycle tracking clearer?**
