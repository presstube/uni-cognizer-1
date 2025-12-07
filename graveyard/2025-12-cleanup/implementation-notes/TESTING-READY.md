# 60s Timing Refactor - READY FOR TESTING

## Status: Code Complete ✅

Implementation is complete and ready for your testing.

---

## What Was Changed

### Core Timing
- **DREAMING cycle**: 30s → 60s
- **LIVE cycle**: 5s → 60s
- **Percept phase**: 35s (was 18s dispersal)
- **Integration phases**: 25s total (SPOOL 2s → SIGILIN 3s → SIGILHOLD 15s → SIGILOUT 3s → RESET 2s)

### DREAMING Mode
- Complete rewrite with 6-phase structure
- Percepts disperse over 35s
- Mind moment + sigil emit at SIGILIN start
- All phases emit `phase` event for client choreography
- No more clearDisplay - phases handle transitions

### LIVE Mode
- Interleaved A/B buffering (show cycle N-1 during cycle N)
- Bootstrap placeholder for cycle 0
- Background cognition runs during INTEGRATION phase
- Results stored in buffer for next cycle display
- Same 6-phase structure as DREAM

### New Event System
- `phase` event emitted at start of each phase
- Structure: `{ phase: 'PERCEPTS'|'SPOOL'|'SIGILIN'|'SIGILHOLD'|'SIGILOUT'|'RESET', startTime, duration, cycleNumber, isDream }`
- Existing events (mindMoment, sigil, perceptReceived) unchanged

---

## Files Modified

- `src/consciousness-loop.js` - Complete refactor (~600 lines)
- `src/consciousness-loop.old.js` - Backup of original (NEW)
- `web/dashboard/app.js` - Added phase event logging (NEW)

---

## Testing Commands

Just run:
```bash
npm start
```

Then open the dashboard at `http://localhost:3001/dashboard/`

**You'll see clear console logs like:**
```
┌─────────────────────────────────────────────────
│ 💭 DREAM Cycle 84
│ PHASE: PERCEPTS (35.0s)
└─────────────────────────────────────────────────
```

This makes it easy to track which phase you're in and how long it lasts!

---

## What to Test

### DREAMING Mode (Priority 1)
1. Start server in DREAM mode
2. Watch for 3 full 60s cycles
3. Verify timing:
   - Percepts appear over 35s
   - Mind moment appears ~37s into cycle
   - Full cycle takes 60s ±1s
4. Check console for phase events
5. Look for any errors

### LIVE Mode (Priority 2)
1. Switch to LIVE mode
2. Cycle 0 should show "First awakening" placeholder
3. Send some percepts via test client
4. Watch cycle 1 - should show cycle 0 results
5. Verify interleaved pattern continues
6. Check console for timing info

---

## Known Issues / Limitations

**None** - Implementation went smoothly.

**Deferred for Future:**
- Promise-based cognizeForBuffer() (using event listeners for now)
- JSON/DB placeholder loading (using hardcoded for now)
- Explicit timeout handling (existing error handling should cover it)

---

## Branch Info

```bash
# You're on: feature/60s-timing-refactor
# To revert: git checkout main
# To compare: git diff main src/consciousness-loop.js
```

---

## Next Steps

**Your turn!** 

1. Test DREAMING mode first (safest)
2. If that works, test LIVE mode
3. Report back with:
   - Does timing feel right?
   - Any errors in console?
   - Do phase events show up?
   - Any unexpected behavior?

If testing looks good, we can:
- Merge to main
- Deploy to staging
- Add enhancements (JSON placeholders, promise-based cognition, etc.)
