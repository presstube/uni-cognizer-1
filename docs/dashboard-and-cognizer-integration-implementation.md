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

---

## Post-Launch Refinements

### Fix 3 (2025-11-27) - Cycle Status on Connect
**Problem**: Dashboard didn't immediately show cycle time/countdown on connect.

**Solution**: Implemented `getCycleStatus` mechanism
- Added `getCycleStatus()` function to `src/main.js` (returns current state, interval, nextCycleAt)
- Added `socket.on('getCycleStatus')` handler in `server.js`
- Dashboard emits `getCycleStatus` on connect and receives `cycleStatus` response
- Dashboard now syncs immediately with cycle timing

**Files Changed**:
- `src/main.js` - Added `lastCycleStartTime`, `currentCognitiveState`, `getCycleStatus()`
- `src/cognitive-states.js` - Added `IDLE` state
- `server.js` - Added `getCycleStatus` handler
- `web/dashboard/app.js` - Added `getCycleStatus` emit + `cycleStatus` handler

### Fix 4 (2025-11-27) - Sigil Prompt Database Integration
**Problem**: Live cognizer wasn't using active sigil prompt from database. Hardcoded prompt, no LLM settings, no reference image support.

**Solution**: Full DB integration for sigil generation
- Added `include_image` and `reference_image_path` columns to `sigil_prompts` table
- Created migration `011_add_image_settings_to_sigil_prompts.sql`
- Modified `generateSigil()` to fetch active prompt + all LLM settings from DB
- Added image upload endpoint `/api/sigil-prompts/upload-reference-image`
- Updated prompt editor UI to support image upload and preview
- Removed "restart server" alert (now uses DB settings on-the-fly)

**Files Changed**:
- `src/db/migrations/011_add_image_settings_to_sigil_prompts.sql` - New migration
- `src/db/migrate.js` - Added migration to hard-coded list
- `src/sigil/generator.js` - Fetches active prompt from DB with full config
- `src/sigil/image.js` - Supports custom reference image paths
- `src/db/sigil-prompts.js` - Updated CRUD for new columns
- `src/api/sigil-prompts.js` - Added image upload endpoint
- `web/prompt-editor/sigil/editor.js` - Added image upload UI + removed alert

**LLM Settings Now Used**:
- Provider (OpenAI/Anthropic/Gemini)
- Model (gpt-4o, claude-3-5-sonnet-20241022, etc.)
- Temperature
- Top P, Top K (Gemini)
- Max Tokens
- Reference Image (optional custom upload)

### Fix 5 (2025-11-27) - State Synchronization After Loop Stops
**Problem**: If session ended during VISUALIZING state, dashboard never received IDLE state because listeners were cleared immediately.

**Solution**: Restructured listener lifecycle to allow in-flight operations to complete
- Moved `clearListeners()` from `stopCognitiveLoop()` → `startCognitiveLoop()`
- Added checks in callback wrappers: if loop stopped after operation completes, emit `transitionToIdle`
- Server now broadcasts IDLE state even after loop stops
- Dashboard correctly shows IDLE after session ends, regardless of when it happens

**Files Changed**:
- `src/main.js` - Restructured listener management + IDLE transition logic
- `server.js` - Added `transitionToIdle` event handler

**Flow**:
```
Perceptor ends session during VISUALIZING
  ↓
stopCognitiveLoop() → stops interval, sets IDLE internally
  ↓
Sigil LLM call still in flight (listeners still active)
  ↓
Sigil completes → callback fires
  ↓
Detects loop stopped → emits 'transitionToIdle'
  ↓
Server broadcasts 'cognitiveState: IDLE' to ALL clients
  ↓
Dashboard updates to IDLE ✅
```

**Benefits**:
- ✅ Dashboard stays in sync even when session ends mid-cycle
- ✅ In-flight operations complete gracefully
- ✅ No listener accumulation (cleaned up on next session start)
- ✅ Works for both sigil completion and cycle failure paths


