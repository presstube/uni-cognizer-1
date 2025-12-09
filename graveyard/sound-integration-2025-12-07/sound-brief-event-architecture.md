# Sound Brief Event Architecture

## Event Flow Timeline (LIVE Mode)

### Phase 1: Mind Moment Generation (~2-3s)
**Location**: `real-cog.js:314-375`

1. **LLM Call** → Generates mind moment, sigil phrase, kinetic, lighting
2. **Database Save** → Saves initial mind moment (no sigil/sound yet)
3. **Event**: `dispatchMindMoment()` 
   - **Listeners**: `consciousness-loop.js:769`
   - **Payload**: cycle, mindMoment, sigilPhrase, kinetic, lighting, percepts
   - **Action**: Stores in `processingResult` buffer
   - ⚠️ **No sound brief yet!**

### Phase 2: Sigil Generation (~2-3s)
**Location**: `real-cog.js:378-517`

1. **Sigil Generation** → Canvas code + PNG
2. **Database Update** → Updates `sigil_code`, `sigil_png_data`
3. **Event**: `dispatchSigil()`
   - **Listeners**: `consciousness-loop.js:792`
   - **Payload**: cycle, sigilCode, sigilPhrase, sigilPNG
   - **Action**: Completes `processingResult`, stores in `cycleBuffer.ready`
   - ⚠️ **Still no sound brief!**

### Phase 3: Sound Brief Generation (~1-2s) 🆕
**Location**: `real-cog.js:464-510`

1. **Sound Generation** → Gemini Flash Exp call
2. **Database Update** → Updates `sound_brief`
3. **Event**: `dispatchSoundBrief()` 🆕
   - **Listeners**: `consciousness-loop.js:822` 🆕
   - **Payload**: cycle, soundBrief
   - **Action**: Adds to `processingResult` and `cycleBuffer.ready`
   - ✅ **Now available for next cycle!**

---

## Consciousness Loop Broadcast (60s Cycle)

### SPOOL Phase (35s mark) 🎯
**Location**: `consciousness-loop.js:493-496`

```javascript
this.emitPhase('SPOOL', SPOOL_PHASE_MS, moment.cycle, false);
```

**What's ready**:
- Uses `cycleBuffer.ready` from PREVIOUS cycle's background processing
- ✅ **Everything is in the buffer!**
  - Mind moment text
  - Sigil phrase & code & PNG
  - Sound brief (music + texture)
  - Kinetic & lighting
  - Percepts & prior context

**Purpose**: Signal to systems "data is ready, load what you need"
- Preload sound samples
- Prepare canvas contexts
- Load any resources before display

**Socket Event**: `phase`
```javascript
{
  phase: 'SPOOL',
  duration: 2000,  // 2 seconds to prepare
  cycleNumber: moment.cycle,
  isDream: false
}
```

---

### SIGILIN Phase (37s mark)
**Location**: `consciousness-loop.js:499-503`

```javascript
this.broadcastMoment(moment);
```

**What gets broadcast**:
- Uses the same `moment` from `cycleBuffer.ready`
- All data is already loaded/prepared from SPOOL

**Socket Event**: `mindMoment`
```javascript
{
  cycle,
  mindMoment,
  sigilPhrase,
  kinetic,
  lighting,
  visualPercepts,
  audioPercepts,
  priorMoments,
  soundBrief,  // 🆕 Added!
  isDream,
  timestamp
}
```

**Purpose**: Broadcast the fully hydrated moment to all clients for display

---

## Dashboard Event Handling

### Live Mode
**Location**: `web/dashboard/app.js:616-670`

```javascript
socket.on('mindMoment', (data) => {
  // ... display mind moment, percepts, lighting ...
  displaySoundBrief(data.soundBrief); // ✅ Now works!
})
```

### Historical Mode (Exploring)
**Location**: `web/dashboard/app.js:103-171`

```javascript
onHistoryMomentClick(moment) {
  // ... display from database ...
  displaySoundBrief(moment.sound_brief); // ✅ Already working
}
```

---

## Key Files Modified

### Backend
1. **`src/real-cog.js`**
   - Added `soundBriefListeners` array
   - Added `onSoundBrief()` export
   - Added `dispatchSoundBrief()` function
   - Added `dispatchSoundBrief(cycle, soundBrief)` call after generation
   - Updated `clearListeners()` to include soundBriefListeners

2. **`src/consciousness-loop.js`**
   - Imported `onSoundBrief`
   - Added sound brief listener in `setupLiveListeners()`
   - Updated `broadcastMoment()` to include `soundBrief` in payload

### Frontend
3. **`web/dashboard/app.js`**
   - Already has `displaySoundBrief()` function
   - Already calls it for live and historical moments
   - ✅ No changes needed!

---

## Timing Diagram

```
Cycle N-1: End of PERCEPTS (@ 35s)
  └─> Dump percepts, start background cognition for Cycle N
      ├─> Mind Moment LLM (~2s) → dispatchMindMoment()
      ├─> Sigil Generation (~2s) → dispatchSigil()
      └─> Sound Brief (~2s) → dispatchSoundBrief() 🆕
          Total: ~6-8s background processing
          Result: Stored in cycleBuffer.ready

[... 25 seconds pass while Cycle N-1 displays ...]

Cycle N: SPOOL phase (@ 35s = 60s later)
  └─> 🎯 Cycle N is READY in cycleBuffer.ready!
      All data prepared during Cycle N-1's background
      Systems load/prepare for display (2s window)

Cycle N: SIGILIN phase (@ 37s)
  └─> broadcastMoment(moment) broadcasts Cycle N
      mindMoment event fires with complete data
      Includes: mindMoment, sigil, soundBrief ✅

Cycle N: SIGILHOLD → SIGILOUT → RESET (@ 40-60s)
  └─> Display continues while Cycle N+1 prepares in background
```

---

## Interleaved A/B Buffer Pattern

The system uses a clever **interleaved buffer**:
- While displaying Cycle N, background processing generates Cycle N+1
- By the time **SPOOL** fires (35s into Cycle N), Cycle N data is ready
- By the time **SPOOL** fires (35s into Cycle N+1), Cycle N+1 data is ready
- The 2-second SPOOL window (35-37s) gives systems time to load/prepare
- SIGILIN (37s) broadcasts the fully prepared moment

**Result**: Dashboard gets complete data including sound brief at SPOOL, displays at SIGILIN! ✅

---

## Summary

✅ **Fixed**: Sound brief now included in live `mindMoment` event
✅ **Event**: New `dispatchSoundBrief()` event fires after generation
✅ **Listener**: Consciousness loop listens and adds to buffer
✅ **SPOOL (35s)**: Everything ready in `cycleBuffer.ready` - load/prepare phase
✅ **SIGILIN (37s)**: `broadcastMoment()` sends complete data to clients
✅ **Display**: Dashboard receives and displays sound brief live!

**Restart server to see sound briefs in live mode!** 🎵

**Key Insight**: SPOOL means "everything is ready, load what you need". By the time SIGILIN fires 2 seconds later, systems are prepared and the broadcast happens.
