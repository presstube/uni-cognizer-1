# Dashboard & Cognizer Integration - Implementation Notes

**Started**: 2025-11-26
**Status**: ✅ COMPLETE - Ready for Testing

---

## Progress Log

### Phase 1: Housekeeping
- [x] Move `/test-client/` to `/graveyard/test-client/`

### Phase 2: Dashboard
- [x] Create `/web/dashboard/` directory
- [x] Create `index.html` (100 lines - ultra minimal)
- [x] Create `app.js` (140 lines)

### Phase 3: Perceptor-Remote Integration
- [x] Add Socket.io CDN to `index.html`
- [x] Add cognizer state to `app.js` (3 new state vars)
- [x] Add `connectToCognizer()` function
- [x] Add `forwardPercept()` function
- [x] Call `connectToCognizer()` in `init()`
- [x] Call `forwardPercept()` in `handleAudioResponse()`
- [x] Call `forwardPercept()` in `handleVisualResponse()`

### Phase 4: Server
- [x] Add `/dashboard` route to `server.js`

---

## Implementation Notes

### 2025-11-26 - Implementation Complete

**Files Changed:**
1. `/graveyard/test-client/` - Moved from `/test-client/`
2. `/web/dashboard/index.html` - Created (ultra-minimal UI)
3. `/web/dashboard/app.js` - Created (Socket.io listener)
4. `/web/perceptor-remote/index.html` - Added Socket.io CDN
5. `/web/perceptor-remote/app.js` - Added Cognizer integration (Section 6.5)
6. `/server.js` - Added `/dashboard` route

**Key Additions to perceptor-remote/app.js:**
- State: `cognizerSocket`, `cognizerConnected`, `sessionId`
- Function: `connectToCognizer()` - Connects to Cognizer via Socket.io
- Function: `forwardPercept(percept, type)` - Forwards percepts to Cognizer
- Integration: Both audio and visual percepts forwarded after toast creation

---

## Testing Instructions

### Test 1: Dashboard Standalone
1. Start server: `npm start` (or your dev script)
2. Open browser: `http://localhost:3001/dashboard`
3. Verify:
   - ✅ Connection shows "Connected"
   - ✅ State shows "AGGREGATING"
   - ✅ Countdown timer works

### Test 2: Full Pipeline (Perceptor → Cognizer → Dashboard)
1. Start server
2. Open Tab 1: `http://localhost:3001/perceptor-remote`
3. Open Tab 2: `http://localhost:3001/dashboard`
4. In perceptor-remote:
   - Enter API key
   - Click START
   - Speak / wave at camera
5. Verify in dashboard:
   - ✅ Percepts appear in left pane (as toasts)
   - ✅ Mind moments appear in right pane
   - ✅ Sigil phrase updates
   - ✅ Sigil renders on canvas
   - ✅ Countdown resets on each cycle

---

## Notes

- **Dashboard is 100% READ-ONLY** - connects but does NOT start a session
- Dashboard only listens to broadcast events (`io.emit()` from server)
- Countdown starts when first `cycleStarted` event is received
- Perceptor-remote maintains TWO connections:
  1. Dual WebSockets to Gemini Live (audio + visual)
  2. Socket.io to Cognizer (percept forwarding + session)
- Only perceptor-remote (or other write clients) trigger the cognitive loop

### Fix 1 (2025-11-26) - Dashboard read-only
- Removed `startSession` emit from dashboard
- Dashboard now purely passive - waits for broadcasts
- Countdown syncs on `cycleStarted` event

### Fix 2 (2025-11-26) - Perceptor session timing
- Moved `startSession` from page load → START button click
- Added `startCognizerSession()` function (called in `start()`)
- Added `endSession` emit in `stop()` function
- Session lifecycle now tied to START/STOP buttons

---

## Design Question: Should Cognitive Cycle Reset on Session Start?

### Current Behavior
- `setInterval()` fires AFTER the interval elapses
- First session starts → waits full 20s → first cycle fires
- If you connect mid-cycle, countdown is unknown until next `cycleStarted`

### Options

**Option A: Keep Current Behavior (Recommended)**
```
Session starts → Wait for next scheduled cycle
```
- ✅ UNI's consciousness is continuous - cycles shouldn't reset for individual sessions
- ✅ Multiple clients can connect/disconnect without disrupting the rhythm
- ✅ Simpler state management
- ❌ Dashboard shows "—" until first cycle fires

**Option B: Reset Cycle on First Session**
```
First session starts → Immediately fire cycle → Reset interval
```
- ✅ More responsive for new sessions
- ❌ Breaks UNI's continuous consciousness concept
- ❌ If session disconnects/reconnects, creates chaotic cycle timing
- ❌ Complicates multi-client scenarios

**Option C: Immediate First Cycle + Continue Rhythm**
```
First session starts → Fire cycle immediately → Schedule next at regular interval
```
- ✅ Responsive start
- ❌ Same problems as Option B

### Recommendation: Keep Option A

The cognitive loop represents UNI's continuous consciousness. It should:
- Run on its own rhythm regardless of who's watching
- Not be disrupted by client connections/disconnections
- Be observable, not controllable

**Fix for Dashboard UX:**
Instead of resetting the cycle, improve dashboard to show:
1. "Waiting for cycle..." when connected but no `cycleStarted` yet
2. Server could emit `nextCycleIn: X` on session start (requires server tracking)

### Implementation (If Wanted)
Add to `sessionStarted` response:
```javascript
socket.emit('sessionStarted', { 
  sessionId, 
  cognitiveCycleMs: CYCLE_MS,
  nextCycleIn: msUntilNextCycle  // NEW: calculated from interval timing
});
```

But this adds complexity for marginal UX gain. The current "wait for cycleStarted" approach is fine.


