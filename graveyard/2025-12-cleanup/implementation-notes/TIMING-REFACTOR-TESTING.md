# Testing Guide: 60-Second Timing Refactor

**Date**: December 7, 2025  
**Branch**: `feature/60s-timing-refactor`  
**Status**: Ready for Testing

---

## Quick Test Commands

```bash
# Start fake server (no API costs - recommended for initial testing)
npm run client:fake

# Start real server (uses API - for final validation)
npm run client:local

# Connect to production server
npm run client:render
```

---

## Test Checklist

### 1. DREAM Mode Testing

#### Basic Operation
- [ ] Start system in DREAM mode
- [ ] Verify 60-second cycle timing
- [ ] Verify all 6 phases fire correctly:
  - [ ] PERCEPTS (35s) - percepts disperse over time
  - [ ] SPOOL (2s) - brief transition
  - [ ] SIGILIN (3s) - sigil fades in, mind moment appears
  - [ ] SIGILHOLD (15s) - sigil displays
  - [ ] SIGILOUT (3s) - sigil fades out
  - [ ] RESET (2s) - breathing room
- [ ] Watch for duplicate dreams (should NOT happen)
- [ ] Check console for clean output (no errors)

#### Buffer Rotation
- [ ] Let system run for 3-4 cycles
- [ ] Verify each cycle shows a different dream
- [ ] Check console logs for buffer loading messages
- [ ] Verify no "No dream available in buffer!" warnings

#### Performance
- [ ] Note startup time (should be fast)
- [ ] Verify dreams load in background (non-blocking)
- [ ] Check memory usage stays stable over time

---

### 2. LIVE Mode Testing

#### Basic Operation
- [ ] Switch to LIVE mode
- [ ] Send some visual percepts
- [ ] Send some audio percepts
- [ ] Verify 60-second cycle timing
- [ ] Verify placeholder shows on first cycle
- [ ] Verify interleaved A/B buffering works:
  - Cycle N: Shows placeholder (or previous result)
  - Cycle N+1: Shows result from cycle N
  - Cycle N+2: Shows result from cycle N+1

#### Percept Collection
- [ ] Send percepts during PERCEPTS phase (0-35s)
- [ ] Verify they queue correctly
- [ ] At 35s, verify percepts dump and cognition starts
- [ ] Verify next cycle displays the mind moment

#### Placeholder Loading
- [ ] On first start, verify placeholder loads quickly
- [ ] Check console for "Loaded placeholder from cycle X"
- [ ] Verify placeholder displays during first cycle

---

### 3. Mode Switching

#### DREAM → LIVE
- [ ] Start in DREAM mode
- [ ] Let it run for 1-2 cycles
- [ ] Switch to LIVE mode
- [ ] Verify clean transition (no errors)
- [ ] Verify dream loader stops
- [ ] Verify placeholder loads

#### LIVE → DREAM
- [ ] Start in LIVE mode
- [ ] Send some percepts
- [ ] Switch to DREAM mode
- [ ] Verify clean transition (no errors)
- [ ] Verify live listeners clear
- [ ] Verify dream loader starts

#### Multiple Switches
- [ ] Switch modes 5-6 times rapidly
- [ ] Check for memory leaks (intervals should clean up)
- [ ] Verify no duplicate intervals running
- [ ] Check console for clean output

---

### 4. Error Handling

#### Graceful Degradation
- [ ] Test with malformed percept timestamps
- [ ] Verify system continues (doesn't crash)
- [ ] Check for graceful warning (not error)
- [ ] Verify percepts still display

#### Empty States
- [ ] Start LIVE mode with no percepts
- [ ] Verify system handles empty queues
- [ ] Start DREAM mode with empty database
- [ ] Verify fallback placeholder works

---

### 5. Performance Validation

#### Timing Precision
- [ ] Use stopwatch to verify 60-second cycles
- [ ] Verify phases fire at exact times:
  - 0s: PERCEPTS starts
  - 35s: SPOOL starts (percepts dump)
  - 37s: SIGILIN starts (moment displays)
  - 40s: SIGILHOLD starts
  - 55s: SIGILOUT starts
  - 58s: RESET starts
  - 60s: Next cycle starts

#### Memory and Resources
- [ ] Run for 10+ cycles
- [ ] Check memory usage (should be stable)
- [ ] Check for any interval leaks
- [ ] Verify no orphaned timeouts

---

### 6. Console Output Validation

#### Expected Log Pattern (DREAM mode):
```
💭 Dream cache initialized: X eligible cycles
📦 Buffer: loaded current dream (cycle X)
📦 Buffer: loaded next dream (cycle Y)
💭 Cycle starting: X "phrase"
  💭 PERCEPTS (35s)
     Dispersing N percepts over 35s
  💭 SPOOL (2s)
  💭 SIGILIN (3s) - emitting
  💭 SIGILHOLD (15s)
  💭 SIGILOUT (3s)
  💭 RESET (2s)
  ✅ Cycle X complete
```

#### Expected Log Pattern (LIVE mode):
```
🌅 Loaded placeholder from cycle X: "phrase"
🧠 Cycle Y starting
  🧠 PERCEPTS (35s) - accumulating
  🧠 N percepts dumped → cognizing
  🧠 [Cycle Y] LLM pipeline starting...
  🧠 SPOOL (2s)
  🧠 SIGILIN (3s) - emitting
  ✅ [Cycle Y] Ready for display
  🧠 SIGILHOLD (15s)
  🧠 SIGILOUT (3s)
  🧠 RESET (2s)
  ✅ Cycle Y complete
```

#### Red Flags (Should NOT see):
- ❌ "No dream available in buffer!" (more than once)
- ❌ "Failed to sort percepts" with return/crash
- ❌ Multiple dream loader intervals running
- ❌ Same dream playing twice in a row
- ❌ Any unhandled exceptions

---

### 7. Code Quality Checks

#### Verify Fixes Applied
- [ ] No `livePerceptsPhase()` method exists
- [ ] No `sleep()` helper method exists
- [ ] Constructor has `dreamCycleCache`, `dreamCacheInitialized`, `dreamLoaderInterval`
- [ ] Phase offset constants defined and used
- [ ] Dream buffer rotation has null check
- [ ] Dream loader interval cleans up in `stop()`

#### Check Git Diff
```bash
git diff src/consciousness-loop.js | head -50
```
- [ ] Verify changes look correct
- [ ] No accidental deletions
- [ ] No debug code left in

---

## Success Criteria

✅ **All tests pass if:**
1. Both modes run for 10+ cycles without errors
2. Timing is precise (60s ±100ms)
3. No duplicate dreams in DREAM mode
4. Interleaved buffering works in LIVE mode
5. Mode switching is clean (no leaks)
6. Console output is clean (no errors)
7. Memory usage stays stable
8. Graceful degradation works

---

## If Issues Found

### Common Issues and Solutions:

**Issue**: Dreams repeating  
**Check**: Buffer rotation logic, dream loader interval  
**Log**: Look for "No dream available in buffer!"

**Issue**: Timing drift  
**Check**: Phase offset constants, setTimeout calls  
**Log**: Compare console timestamps to expected times

**Issue**: Memory leak  
**Check**: Interval cleanup in `stop()`, timeout arrays  
**Tool**: Use Chrome DevTools memory profiler

**Issue**: Percepts not displaying  
**Check**: Queue dumping logic, event listeners  
**Log**: Look for "percepts dumped → cognizing"

---

## Reporting Results

After testing, document:
1. Which tests passed/failed
2. Any unexpected behavior
3. Console errors or warnings
4. Memory/performance observations
5. Suggested improvements

---

**Ready to merge after**: All critical tests pass (modes work, timing correct, no errors)
