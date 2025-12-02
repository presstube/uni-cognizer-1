# Consciousness Unification & Simplification Plan

**Date**: December 2, 2025  
**Status**: Planning  
**Goal**: Unify dream and cognitive loops into a single, clean consciousness architecture

---

## Motivation

### Current Complexity

**Problem 1: Callback Pyramid**
- 3 layers of indirection: `real-cog.js` → `main.js` → `server.js`
- Inline lambda functions duplicated in 4 places
- Hard to trace event flow

**Problem 2: Duplicate Event Construction**
- `mindMoment` event built identically in dream and cognitive callbacks
- `sigil` event built identically twice
- Violation of DRY principle

**Problem 3: Manual Loop Orchestration**
- Explicit start/stop calls in 4 handler locations
- Mutual exclusion enforced manually
- Easy to miss edge cases

**Problem 4: Asymmetric Data Flow**
- Dreams query DB directly, return partial data
- Cognition uses listeners/dispatchers, returns full data
- No shared "mind moment" abstraction
- Dreams missing original percepts

**Problem 5: Conceptual Split**
- Two separate loop files (`main.js` + `dream-loop.js`)
- Treated as different systems architecturally
- Reality: ONE loop with TWO sources (live generation vs. memory retrieval)

---

## Core Insight

**The system is ONE consciousness loop with TWO modes:**
- **LIVE MODE**: Generate mind moments from new percepts (LLM)
- **DREAM MODE**: Replay mind moments from memory (DB query)

Both modes produce identical output structure and broadcast identically. The mode should be a **parameter**, not separate architecture.

---

## Phased Approach

### Phase 1: Quick Wins (Low Effort, High Impact)
**Estimated Time**: 4-6 hours  
**Goal**: Reduce duplication, simplify event emission

### Phase 2: Data Structure Unification
**Estimated Time**: 2-3 hours  
**Goal**: Make dream and cognitive outputs identical

### Phase 3: Unified Consciousness Loop
**Estimated Time**: 1 day  
**Goal**: Merge into single loop with mode switching

---

## Phase 1: Quick Wins

### Step 1.1: Extract Broadcast Helpers (~30 min)

**File**: `server.js`

**Create helper functions**:
```javascript
/**
 * Broadcast mind moment to all clients
 */
function broadcastMindMoment(io, {
  cycle,
  mindMoment,
  sigilPhrase,
  kinetic,
  lighting,
  visualPercepts = [],
  audioPercepts = [],
  priorMoments = [],
  isDream = false
}) {
  io.emit('mindMoment', {
    cycle,
    mindMoment,
    sigilPhrase,
    kinetic,
    lighting,
    visualPercepts,
    audioPercepts,
    priorMoments,
    isDream,
    timestamp: new Date().toISOString()
  });
}

/**
 * Broadcast sigil to all clients
 */
function broadcastSigil(io, {
  cycle,
  sigilCode,
  sigilPhrase,
  sdf = null,
  isDream = false
}) {
  const sigilData = {
    cycle,
    sigilCode,
    sigilPhrase,
    isDream,
    timestamp: new Date().toISOString()
  };
  
  if (sdf && sdf.data) {
    sigilData.sdf = {
      width: sdf.width,
      height: sdf.height,
      data: Buffer.from(sdf.data).toString('base64')
    };
  }
  
  io.emit('sigil', sigilData);
}
```

**Replace duplicate constructions**:
- Line ~298: cognitive mindMoment callback
- Line ~209: dream mindMoment callback
- Line ~314: cognitive sigil callback
- Line ~223: dream sigil callback

**Benefit**: Single source of truth for event structure, easier to modify

**✋ CHECKPOINT 1.1: Verify Broadcast Helpers**

**Validation Criteria**:
- [ ] Linter passes (no errors)
- [ ] Events still emit with identical structure
- [ ] No console errors on server start
- [ ] Dashboard receives events correctly

**Smoke Test**:
```bash
# Terminal 1: Start server
npm run client:fake

# Terminal 2: Watch console output
# Verify dreams emit every 20s
# Verify mindMoment and sigil events appear

# Browser: Open dashboard (http://localhost:8081/dashboard)
# Verify moment card populates
# Verify sigil renders
```

**Expected Output**:
```
💭 Dreaming of cycle 42: "essence phrase"
🧠 Mind moment: "observation text..."
🎨 Sigil received
```

**Go/No-Go Decision**:
- ✅ **GO**: All events emit correctly, dashboard works
- 🛑 **NO-GO**: Missing events, structure changed, dashboard broken
  - **Action**: Rollback Step 1.1, investigate

**Git Checkpoint**:
```bash
git add -A
git commit -m "refactor: extract broadcast helpers (checkpoint 1.1)"
git tag checkpoint-1.1
```

---

### Step 1.2: Pass `io` to Loop Functions (~1 hour)

**Before**:
```javascript
startCognitiveLoop(
  (cycle, mindMoment, ...) => { io.emit(...) },
  (cycle, sigilCode, ...) => { io.emit(...) },
  (eventType, data) => { io.emit(...) }
);
```

**After**:
```javascript
startCognitiveLoop(io);
```

**Changes Required**:

1. **`src/main.js`**:
   - Import broadcast helpers
   - Replace callbacks with direct `io.emit()` calls inside loop
   - Remove callback parameter passing

2. **`src/real-cog.js`**:
   - Replace listener pattern with direct emission
   - Pass `io` through `cognize()` function
   - Remove `dispatchMindMoment()`, `dispatchSigil()`, listener arrays

3. **`src/dream-loop.js`**:
   - Accept `io` parameter instead of callbacks
   - Use broadcast helpers directly

**Benefit**: Eliminates 3-layer indirection, clearer data flow

**✋ CHECKPOINT 1.2: Verify Direct Emission**

**Validation Criteria**:
- [ ] Linter passes
- [ ] Server starts without errors
- [ ] Dreams emit in DREAM mode
- [ ] Cognition works in LIVE mode
- [ ] Events maintain same structure

**Smoke Test**:
```bash
# Start server
npm run client:fake

# Test DREAM mode (default)
# Wait 20s, verify dream emission in console
# Open dashboard, verify dream displays

# Test LIVE mode
# Open perceptor (http://localhost:8081/perceptor-remote)
# Start session
# Send percepts
# Verify cognition happens
# Verify mind moment broadcasts
```

**Expected Output**:
```
💭 Dream loop started (20000ms interval)
💭 Dreaming of cycle 42: "essence phrase"
[After session starts]
🔄 CYCLE 143 STARTED (2 visual, 1 audio)
✅ CYCLE 143 COMPLETE - Mind: "I notice visitor approaches..."
```

**Go/No-Go Decision**:
- ✅ **GO**: Both modes work, events broadcast correctly
- 🛑 **NO-GO**: Mode not switching, events not emitting
  - **Action**: Rollback Step 1.2, check `io` passing

**Git Checkpoint**:
```bash
git add -A
git commit -m "refactor: pass io directly to loops (checkpoint 1.2)"
git tag checkpoint-1.2
```

---

### Step 1.3: Centralize Loop Transitions (~1 hour)

**Create transition manager**:
```javascript
// server.js
class LoopManager {
  constructor(io) {
    this.io = io;
    this.activeSessions = new Set();
  }
  
  sessionStarted(sessionId) {
    this.activeSessions.add(sessionId);
    if (this.activeSessions.size === 1) {
      this.transitionToLive();
    }
  }
  
  sessionEnded(sessionId) {
    this.activeSessions.delete(sessionId);
    if (this.activeSessions.size === 0) {
      setTimeout(() => this.transitionToDream(), 1000);
    }
  }
  
  transitionToLive() {
    stopDreamLoop();
    this.io.emit('cognitiveState', { state: CognitiveState.IDLE });
    startCognitiveLoop(this.io);
  }
  
  transitionToDream() {
    stopCognitiveLoop();
    startDreamLoop(this.io);
    this.io.emit('cognitiveState', { state: CognitiveState.DREAMING });
  }
}

const loopManager = new LoopManager(io);
```

**Replace 4 transition points**:
- Session start handler
- Session end handler
- Session timeout handler
- Disconnect handler

**Benefit**: Single location for mode switching logic

**✋ CHECKPOINT 1.3: Verify Centralized Transitions**

**Validation Criteria**:
- [ ] Linter passes
- [ ] Server starts in DREAM mode
- [ ] Session start triggers LIVE mode
- [ ] Session end returns to DREAM mode
- [ ] Timeout triggers DREAM mode
- [ ] Disconnect triggers DREAM mode
- [ ] No duplicate transitions

**Smoke Test**:
```bash
# Start server
npm run client:fake

# Watch console for: "💭 Starting in dream state"

# Start session via perceptor
# Watch console for: "🚀 FIRST SESSION - STARTING COGNITIVE LOOP"

# End session
# Wait 1 second
# Watch console for: "💭 Dream loop started"

# Test rapid start/stop
# Start session, immediately end session
# Verify clean transition (no stuck state)
```

**Expected Output**:
```
💭 Starting in dream state (no active sessions)
💭 Dream loop started (20000ms interval)
[Session starts]
🛑 Dream loop stopped
🚀 FIRST SESSION - STARTING COGNITIVE LOOP
[Session ends]
🛑 Cognitive loop stopped
[1 second later]
💭 Dream loop started (20000ms interval)
```

**Go/No-Go Decision**:
- ✅ **GO**: All 4 transition points work correctly
- 🛑 **NO-GO**: Stuck in mode, missing transition, duplicate loops
  - **Action**: Rollback Step 1.3, check LoopManager logic

**Git Checkpoint**:
```bash
git add -A
git commit -m "refactor: centralize loop transitions (checkpoint 1.3)"
git tag checkpoint-1.3
```

---

### Step 1.4: State Machine Hook (~30 min)

**Add reactive state watcher**:
```javascript
// server.js (after LoopManager)
function watchSessionCount() {
  let lastCount = activeSessions.size;
  
  setInterval(() => {
    const currentCount = activeSessions.size;
    if (currentCount !== lastCount) {
      console.log(`📊 Session count changed: ${lastCount} → ${currentCount}`);
      lastCount = currentCount;
    }
  }, 1000);
}
```

**Benefit**: Visibility into state transitions, debugging aid

**✋ CHECKPOINT 1.4: Verify State Watching**

**Validation Criteria**:
- [ ] Linter passes
- [ ] Session count changes logged
- [ ] No performance impact
- [ ] Logs appear every 1 second when count changes

**Smoke Test**:
```bash
# Start server
# Watch for session count logs

# Start session
# Watch console for: "📊 Session count changed: 0 → 1"

# End session  
# Watch console for: "📊 Session count changed: 1 → 0"
```

**Expected Output**:
```
📊 Session count changed: 0 → 1
[After session ends]
📊 Session count changed: 1 → 0
```

**Go/No-Go Decision**:
- ✅ **GO**: Logs appear, no performance issues
- 🛑 **NO-GO**: Missing logs, performance degradation
  - **Action**: Rollback Step 1.4, adjust interval

**Git Checkpoint**:
```bash
git add -A
git commit -m "feat: add state machine watcher (checkpoint 1.4)"
git tag checkpoint-1.4
```

**🎉 PHASE 1 COMPLETE**

**Phase 1 Validation**:
- [ ] All 4 checkpoints passed
- [ ] System stable for 10 minutes
- [ ] Dashboard works in both modes
- [ ] No memory leaks visible
- [ ] Console output clean

**Phase 1 Sign-off**:
```bash
git tag phase-1-complete
git push origin phase-1-complete
```

---

## Phase 2: Data Structure Unification

### Step 2.1: Fetch Percepts in Dreams (~30 min)

**Update `src/dream-loop.js`**:

**Query change** (line 19):
```javascript
SELECT 
  cycle, mind_moment, sigil_phrase, sigil_code,
  kinetic, lighting,
  visual_percepts, audio_percepts, prior_moment_ids,  // ADD
  sigil_sdf_data, sigil_sdf_width, sigil_sdf_height,
  created_at
FROM mind_moments
WHERE sigil_code IS NOT NULL
ORDER BY RANDOM()
LIMIT 1
```

**Parse percepts** (line 45):
```javascript
const visualPercepts = row.visual_percepts || [];
const audioPercepts = row.audio_percepts || [];
const priorMomentIds = row.prior_moment_ids || [];
```

**Return in structure** (line 48):
```javascript
return {
  cycle: row.cycle,
  mindMoment: row.mind_moment,
  sigilCode: row.sigil_code,
  sigilPhrase: row.sigil_phrase,
  kinetic,
  lighting,
  visualPercepts,      // ADD
  audioPercepts,       // ADD
  priorMomentIds,      // ADD
  sdf
};
```

**Benefit**: Dreams show original sensory data in dashboard

**✋ CHECKPOINT 2.1: Verify Dream Percepts**

**Validation Criteria**:
- [ ] Linter passes
- [ ] Dreams query includes percepts
- [ ] Dashboard shows percepts in dream mode
- [ ] Percepts section populated (not empty)
- [ ] Visual and audio percepts both display

**Smoke Test**:
```bash
# Start server (should be in DREAM mode)
npm run client:fake

# Open dashboard
# Wait for dream emission (20s)
# Check center pane "Percepts" section
# Verify percepts are displayed (not "No percepts")

# Look for visual percepts like:
# 👁️ VISITOR_APPROACHES
# 🎨 VISITOR_GESTURES

# Look for audio percepts like:
# 🎤 "Hello there"
# 🔊 Visitor speaking clearly
```

**Expected Output**:
- Dashboard percepts section shows historical percepts
- Not empty arrays
- Toasts display with emoji + action/transcript

**Go/No-Go Decision**:
- ✅ **GO**: Percepts show in dashboard during dreams
- 🛑 **NO-GO**: Still seeing "No percepts" or empty arrays
  - **Action**: Rollback Step 2.1, check query and parsing

**Git Checkpoint**:
```bash
git add -A
git commit -m "feat: fetch percepts in dreams (checkpoint 2.1)"
git tag checkpoint-2.1
```

---

### Step 2.2: Unified Mind Moment Interface (~1 hour)

**Create shared type** (`src/types/mind-moment.js`):
```javascript
/**
 * Standard mind moment structure
 * Used by both live cognition and dream replay
 */
export const MindMoment = {
  // Core fields
  cycle: Number,
  mindMoment: String,
  sigilPhrase: String,
  sigilCode: String,
  
  // Embodiment
  kinetic: Object,
  lighting: Object,
  
  // Sensory context
  visualPercepts: Array,
  audioPercepts: Array,
  priorMoments: Array,
  
  // Visualization
  sdf: Object,
  
  // Metadata
  isDream: Boolean,
  timestamp: String
};

/**
 * Validate mind moment structure
 */
export function validateMindMoment(moment) {
  const required = ['cycle', 'mindMoment', 'sigilPhrase', 'kinetic', 'lighting'];
  return required.every(field => moment[field] !== undefined);
}
```

**Benefit**: Type safety, clear contract, easier testing

**✋ CHECKPOINT 2.2: Verify Mind Moment Interface**

**Validation Criteria**:
- [ ] Linter passes
- [ ] New type file created (`src/types/mind-moment.js`)
- [ ] Validation function works
- [ ] No runtime errors when validating moments

**Smoke Test**:
```bash
# Add validation to consciousness loops
# Start server
# Watch for validation errors in console
# None should appear if structure is correct
```

**Expected Output**:
- No validation errors
- Type structure documented
- Clear contract for all consumers

**Go/No-Go Decision**:
- ✅ **GO**: Validation passes, structure clear
- 🛑 **NO-GO**: Validation errors, missing fields
  - **Action**: Rollback Step 2.2, fix structure

**Git Checkpoint**:
```bash
git add -A
git commit -m "feat: unified mind moment interface (checkpoint 2.2)"
git tag checkpoint-2.2
```

---

### Step 2.3: Normalize DB Save/Load (~1 hour)

**Ensure symmetry**: What goes into DB comes out the same way

**Update `src/db/mind-moments.js`**:
```javascript
/**
 * Get full mind moment (identical to what was saved)
 */
export async function getFullMindMoment(momentId) {
  const pool = getPool();
  
  const result = await pool.query(`
    SELECT 
      cycle, mind_moment, sigil_phrase, sigil_code,
      kinetic, lighting,
      visual_percepts, audio_percepts, prior_moment_ids,
      sigil_sdf_data, sigil_sdf_width, sigil_sdf_height,
      created_at
    FROM mind_moments 
    WHERE id = $1
  `, [momentId]);
  
  return normalizeMindMoment(result.rows[0]);
}

function normalizeMindMoment(row) {
  // Parse JSONB, convert SDF buffer, etc.
  // Returns MindMoment structure
}
```

**Benefit**: Consistent shape everywhere, easier debugging

**✋ CHECKPOINT 2.3: Verify DB Symmetry**

**Validation Criteria**:
- [ ] Linter passes
- [ ] Normalization function works
- [ ] Dream moments match live moments structure
- [ ] No data loss on save/load

**Smoke Test**:
```bash
# Start server in LIVE mode
npm run client:local  # Real LLM

# Send percepts, generate moment
# Check database for saved moment
# Verify all fields present

# Restart server (should enter DREAM mode)
# Wait for dream emission
# Verify dream has same fields as live moment
# Compare structure in dashboard
```

**Expected Output**:
- Dream and live moments have identical structure
- All fields preserved through DB round-trip
- No missing or extra fields

**Go/No-Go Decision**:
- ✅ **GO**: Perfect symmetry between save and load
- 🛑 **NO-GO**: Fields missing, structure mismatch
  - **Action**: Rollback Step 2.3, fix normalization

**Git Checkpoint**:
```bash
git add -A
git commit -m "feat: normalize DB save/load (checkpoint 2.3)"
git tag checkpoint-2.3
```

**🎉 PHASE 2 COMPLETE**

**Phase 2 Validation**:
- [ ] All 3 checkpoints passed
- [ ] Dreams show full data (percepts + everything)
- [ ] Structure validated and consistent
- [ ] DB symmetry confirmed
- [ ] Dashboard displays identical for both modes

**Phase 2 Sign-off**:
```bash
git tag phase-2-complete
git push origin phase-2-complete
```

---

## Phase 3: Unified Consciousness Loop

### Step 3.1: Create Consciousness Loop Module (~3 hours)

**New file**: `src/consciousness-loop.js`

```javascript
import { CognitiveState } from './cognitive-states.js';
import { callLLM, providerName } from './providers/index.js';
import { ROBOT_PERSONALITY } from './personality-uni-v2.js';
import { generateSigil } from './sigil/generator.js';
import { saveMindMoment, getPriorMindMoments } from './db/mind-moments.js';
import { getPool } from './db/index.js';

const CYCLE_MS = parseInt(process.env.COGNITIVE_CYCLE_MS, 10) || 5000;
const DREAM_CYCLE_MS = parseInt(process.env.DREAM_CYCLE_MS, 10) || 20000;

export class ConsciousnessLoop {
  constructor(io) {
    this.io = io;
    this.mode = 'DREAM';
    this.intervalId = null;
    this.cycleIndex = 0;
    this.perceptQueue = { visualPercepts: [], audioPercepts: [] };
  }
  
  async initialize() {
    // Load cycle index from DB
    await this.loadCycleIndex();
    console.log(`🧠 Consciousness initialized at cycle ${this.cycleIndex}`);
  }
  
  start() {
    if (this.intervalId) return;
    
    const intervalMs = this.mode === 'DREAM' ? DREAM_CYCLE_MS : CYCLE_MS;
    
    this.intervalId = setInterval(async () => {
      await this.tick();
    }, intervalMs);
    
    this.emitState();
    console.log(`🧠 Consciousness loop started (${this.mode} mode, ${intervalMs}ms)`);
  }
  
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🛑 Consciousness loop stopped');
    }
  }
  
  switchMode(mode) {
    const wasRunning = this.intervalId !== null;
    
    if (wasRunning) {
      this.stop();
    }
    
    this.mode = mode;
    console.log(`🔄 Switched to ${mode} mode`);
    
    if (wasRunning) {
      this.start();
    } else {
      this.emitState();
    }
  }
  
  async tick() {
    const moment = this.mode === 'DREAM'
      ? await this.recallMoment()
      : await this.cognizeMoment();
    
    if (moment) {
      this.broadcastMoment(moment);
    }
  }
  
  async recallMoment() {
    // Query random moment from DB
    // Return normalized MindMoment
  }
  
  async cognizeMoment() {
    // Dump percept queue
    // Call LLM
    // Generate sigil
    // Save to DB
    // Return normalized MindMoment
  }
  
  broadcastMoment(moment) {
    // Emit mindMoment event
    this.io.emit('mindMoment', {
      ...moment,
      timestamp: new Date().toISOString()
    });
    
    // Emit sigil event (if available)
    if (moment.sigilCode) {
      this.io.emit('sigil', {
        cycle: moment.cycle,
        sigilCode: moment.sigilCode,
        sigilPhrase: moment.sigilPhrase,
        sdf: moment.sdf,
        isDream: moment.isDream,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  emitState() {
    const state = this.mode === 'DREAM' 
      ? CognitiveState.DREAMING 
      : CognitiveState.AGGREGATING;
    
    this.io.emit('cognitiveState', { state });
  }
  
  addPercept(percept) {
    if (this.mode !== 'LIVE') return;
    
    if (percept.type === 'visual') {
      this.perceptQueue.visualPercepts.push(percept);
    } else if (percept.type === 'audio') {
      this.perceptQueue.audioPercepts.push(percept);
    }
  }
}
```

**Benefit**: Single mental model, mode = parameter, clear API

**✋ CHECKPOINT 3.1: Verify Consciousness Loop**

**Validation Criteria**:
- [ ] Linter passes
- [ ] New file created (`src/consciousness-loop.js`)
- [ ] Class instantiates without errors
- [ ] Loop starts in DREAM mode
- [ ] Loop switches to LIVE mode
- [ ] `tick()` executes without errors in both modes
- [ ] Events broadcast correctly

**Smoke Test**:
```bash
# This is a BIG step - thorough testing required

# Test 1: Instantiation
node -e "import('./src/consciousness-loop.js').then(m => console.log('✅ Module loads'))"

# Test 2: Basic functionality
npm run client:fake

# Verify startup logs:
# "🧠 Consciousness initialized at cycle X"
# "🧠 Consciousness loop started (DREAM mode, 20000ms)"

# Test 3: Mode switching
# Start session via perceptor
# Watch console for: "🔄 Switched to LIVE mode"
# Verify cognition happens

# Test 4: Percepts
# Send percepts, verify processing
# Check dashboard for new moments

# Test 5: Return to dream
# End session
# Wait 1 second
# Watch for: "🔄 Switched to DREAM mode"
# Wait 20s for dream
# Verify dream emission

# Test 6: Rapid switching
# Start/stop session 5 times quickly
# Verify no crashes, no stuck states
```

**Expected Output**:
```
🧠 Consciousness initialized at cycle 142
🧠 Consciousness loop started (DREAM mode, 20000ms)
💭 Dreaming of cycle 42: "essence phrase"
[Session starts]
🔄 Switched to LIVE mode
🔄 CYCLE 143 STARTED (2 visual, 1 audio)
✅ CYCLE 143 COMPLETE - Mind: "observation..."
[Session ends]
🔄 Switched to DREAM mode
💭 Dreaming of cycle 50: "another essence"
```

**Go/No-Go Decision**:
- ✅ **GO**: All tests pass, both modes work flawlessly
- 🛑 **NO-GO**: Crashes, mode stuck, events missing
  - **Action**: Rollback Step 3.1, debug consciousness loop
  - **Note**: This is the highest risk step - take time to get it right

**Git Checkpoint**:
```bash
git add -A
git commit -m "feat: unified consciousness loop (checkpoint 3.1)"
git tag checkpoint-3.1
```

---

### Step 3.2: Update State Machine (~30 min)

**Update `src/cognitive-states.js`**:
```javascript
export const CognitiveState = {
  IDLE: 'IDLE',                    // Transitional
  AGGREGATING: 'AGGREGATING',      // Live: collecting percepts
  COGNIZING: 'COGNIZING',          // Live: LLM processing
  VISUALIZING: 'VISUALIZING',      // Live: sigil generation
  DREAMING: 'DREAMING'             // Dream: replaying memories
};

export const ConsciousnessMode = {
  LIVE: 'LIVE',      // Generate from percepts
  DREAM: 'DREAM'     // Replay from memory
};
```

**Benefit**: Clearer separation of mode vs. state

**✋ CHECKPOINT 3.2: Verify State Machine Update**

**Validation Criteria**:
- [ ] Linter passes
- [ ] New exports available (`ConsciousnessMode`)
- [ ] State constants unchanged (backward compatible)
- [ ] No import errors

**Smoke Test**:
```bash
# Verify imports work
node -e "import('./src/cognitive-states.js').then(m => { 
  console.log('States:', Object.keys(m.CognitiveState));
  console.log('Modes:', Object.keys(m.ConsciousnessMode));
})"

# Expected output:
# States: [ 'IDLE', 'AGGREGATING', 'COGNIZING', 'VISUALIZING', 'DREAMING' ]
# Modes: [ 'LIVE', 'DREAM' ]
```

**Go/No-Go Decision**:
- ✅ **GO**: New exports work, no breaking changes
- 🛑 **NO-GO**: Import errors, missing exports
  - **Action**: Rollback Step 3.2, fix exports

**Git Checkpoint**:
```bash
git add -A
git commit -m "feat: update state machine exports (checkpoint 3.2)"
git tag checkpoint-3.2
```

---

### Step 3.3: Simplify Server Integration (~2 hours)

**Update `server.js`**:

**Before** (current):
```javascript
import { startCognitiveLoop, stopCognitiveLoop } from './src/main.js';
import { startDreamLoop, stopDreamLoop } from './src/dream-loop.js';

// ... 4 places with start/stop logic
```

**After** (unified):
```javascript
import { ConsciousnessLoop } from './src/consciousness-loop.js';

const consciousness = new ConsciousnessLoop(io);
await consciousness.initialize();
consciousness.start();

io.on('connection', (socket) => {
  socket.on('startSession', ({ sessionId }) => {
    activeSessions.add(sessionId);
    
    if (activeSessions.size === 1) {
      consciousness.switchMode('LIVE');
    }
  });
  
  socket.on('endSession', ({ sessionId }) => {
    activeSessions.delete(sessionId);
    
    if (activeSessions.size === 0) {
      setTimeout(() => consciousness.switchMode('DREAM'), 1000);
    }
  });
  
  socket.on('percept', (percept) => {
    consciousness.addPercept(percept);
  });
});
```

**Benefit**: 
- 100+ lines removed
- Single API surface
- Easier to test
- Clearer intent

**✋ CHECKPOINT 3.3: Verify Server Integration**

**Validation Criteria**:
- [ ] Linter passes
- [ ] Server starts without errors
- [ ] Reduced line count (check `server.js`)
- [ ] All socket handlers work
- [ ] Percepts forwarded correctly
- [ ] Mode switching responsive

**Smoke Test**:
```bash
# Full integration test - this validates EVERYTHING

# Test 1: Server startup
npm run client:fake
# Verify: "🧠 Consciousness loop started (DREAM mode)"

# Test 2: Dashboard connection
# Open http://localhost:8081/dashboard
# Verify: Connection status "Connected"
# Verify: State shows "DREAMING"
# Wait 20s, verify dream appears

# Test 3: Perceptor connection
# Open http://localhost:8081/perceptor-remote
# Start session
# Verify: State changes to "AGGREGATING"
# Send visual percept
# Send audio percept
# Wait for cycle
# Verify: Mind moment appears in dashboard

# Test 4: Return to dream
# Stop session in perceptor
# Wait 1 second
# Verify: State returns to "DREAMING"
# Wait 20s
# Verify: Dream appears

# Test 5: Multiple clients
# Open 2 dashboards, 1 perceptor
# All should see same events
# Verify broadcast works

# Test 6: Rapid session cycling
# Start/stop 10 sessions in 30 seconds
# Verify: No crashes, no stuck states
# Verify: Logs are clean, no errors

# Test 7: Long-running stability
# Leave running for 10 minutes
# Verify: No memory leaks
# Verify: Dreams continue every 20s
# Start/stop session mid-way
# Verify: Transitions still work
```

**Expected Output**:
- All tests pass
- Cleaner console output
- Faster mode transitions
- No duplicate events
- Stable operation

**Go/No-Go Decision**:
- ✅ **GO**: All integration tests pass, system stable
- 🛑 **NO-GO**: Crashes, missing events, stuck states
  - **Action**: Rollback Step 3.3, debug integration
  - **Note**: This validates the entire refactor - be thorough

**Git Checkpoint**:
```bash
git add -A
git commit -m "refactor: simplify server integration (checkpoint 3.3)"
git tag checkpoint-3.3
```

---

### Step 3.4: Deprecate Old Files (~30 min)

**Move to graveyard**:
- `src/main.js` → functionality absorbed into `consciousness-loop.js`
- `src/dream-loop.js` → functionality absorbed into `consciousness-loop.js`

**Keep**:
- `src/real-cog.js` → becomes utility functions called by consciousness loop
- `src/cognitive-states.js` → updated with new exports

**Benefit**: Simplified file structure, clear migration path

**✋ CHECKPOINT 3.4: Verify File Cleanup**

**Validation Criteria**:
- [ ] Old files moved to graveyard
- [ ] No broken imports in codebase
- [ ] Server still starts
- [ ] All functionality preserved
- [ ] Git history preserved

**Smoke Test**:
```bash
# Verify file moves
ls graveyard/consciousness-unification/
# Should see: main.js, dream-loop.js

# Verify no broken imports
npm run client:fake
# Should start without import errors

# Quick smoke test
# Open dashboard
# Verify dreams work
# Start session
# Verify cognition works
```

**Expected Output**:
- Old files in graveyard
- System works identically
- No import errors

**Go/No-Go Decision**:
- ✅ **GO**: Files cleaned up, system works
- 🛑 **NO-GO**: Import errors, system broken
  - **Action**: Restore files from graveyard, fix imports

**Git Checkpoint**:
```bash
git add -A
git commit -m "chore: deprecate old loop files (checkpoint 3.4)"
git tag checkpoint-3.4
```

**🎉 PHASE 3 COMPLETE**

**Phase 3 Validation**:
- [ ] All 4 checkpoints passed
- [ ] New consciousness loop working
- [ ] Server simplified significantly
- [ ] Both modes operational
- [ ] System stable under load
- [ ] No regressions detected

**Phase 3 Sign-off**:
```bash
# Take a snapshot for easy rollback
git tag phase-3-complete
git push origin phase-3-complete

# Create backup branch
git branch backup-before-phase-4
```

---

## Phase 4: Testing & Validation

### Step 4.1: Unit Tests (~2 hours)

**Test file**: `test/consciousness-loop.test.js`

```javascript
describe('ConsciousnessLoop', () => {
  test('starts in DREAM mode', () => {
    const loop = new ConsciousnessLoop(mockIo);
    expect(loop.mode).toBe('DREAM');
  });
  
  test('switches to LIVE mode', () => {
    const loop = new ConsciousnessLoop(mockIo);
    loop.switchMode('LIVE');
    expect(loop.mode).toBe('LIVE');
  });
  
  test('emits mindMoment on tick', async () => {
    const loop = new ConsciousnessLoop(mockIo);
    await loop.tick();
    expect(mockIo.emit).toHaveBeenCalledWith('mindMoment', expect.any(Object));
  });
  
  test('dream mode recalls from DB', async () => {
    const loop = new ConsciousnessLoop(mockIo);
    loop.mode = 'DREAM';
    await loop.tick();
    // Assert DB query was called
  });
  
  test('live mode calls LLM', async () => {
    const loop = new ConsciousnessLoop(mockIo);
    loop.mode = 'LIVE';
    loop.addPercept({ type: 'visual', data: {} });
    await loop.tick();
    // Assert LLM was called
  });
});
```

**✋ CHECKPOINT 4.1: Verify Unit Tests**

**Validation Criteria**:
- [ ] All tests pass
- [ ] Test coverage > 80%
- [ ] No flaky tests
- [ ] Tests run in < 5 seconds

**Smoke Test**:
```bash
npm test test/consciousness-loop.test.js
```

**Expected Output**:
```
✓ starts in DREAM mode
✓ switches to LIVE mode
✓ emits mindMoment on tick
✓ dream mode recalls from DB
✓ live mode calls LLM

5 passing (234ms)
```

**Go/No-Go Decision**:
- ✅ **GO**: All tests pass consistently
- 🛑 **NO-GO**: Failing tests, flaky behavior
  - **Action**: Fix tests or code until all pass

**Git Checkpoint**:
```bash
git add -A
git commit -m "test: add consciousness loop unit tests (checkpoint 4.1)"
git tag checkpoint-4.1
```

---

### Step 4.2: Integration Tests (~2 hours)

**Test scenarios**:
1. Server starts → consciousness in DREAM mode
2. Session starts → switches to LIVE mode
3. Percepts added → processed in next cycle
4. Session ends → switches back to DREAM mode after 1s
5. Multiple rapid session changes → mode stable

**✋ CHECKPOINT 4.2: Verify Integration Tests**

**Validation Criteria**:
- [ ] All integration tests pass
- [ ] Tests cover all 5 scenarios
- [ ] No race conditions
- [ ] Tests run in < 30 seconds

**Smoke Test**:
```bash
npm test test/integration/
```

**Expected Output**:
```
✓ Server starts in DREAM mode
✓ Session starts switches to LIVE mode
✓ Percepts processed in next cycle
✓ Session ends returns to DREAM mode
✓ Multiple rapid session changes stable

5 passing (12s)
```

**Go/No-Go Decision**:
- ✅ **GO**: All integration tests pass
- 🛑 **NO-GO**: Failing tests, timing issues
  - **Action**: Fix race conditions, adjust timeouts

**Git Checkpoint**:
```bash
git add -A
git commit -m "test: add integration tests (checkpoint 4.2)"
git tag checkpoint-4.2
```

---

### Step 4.3: Manual Testing (~1 hour)

**Checklist**:
- [ ] Server starts in DREAM mode (console + dashboard)
- [ ] Dreams emit every 20s with full data (percepts, lighting, sigil)
- [ ] Starting session switches to LIVE mode
- [ ] Percepts processed normally in LIVE mode
- [ ] Ending session returns to DREAM mode
- [ ] Dashboard shows both modes correctly
- [ ] State indicators accurate
- [ ] No memory leaks (watch for hours)

**✋ CHECKPOINT 4.3: Verify Manual Testing**

**Validation Criteria**:
- [ ] All checklist items pass
- [ ] No console errors during testing
- [ ] UI responsive in both modes
- [ ] Memory stable over 1 hour
- [ ] No zombie processes

**Smoke Test**:
```bash
# Run full manual test suite (see checklist above)
# Document any issues found
# Verify all issues resolved before proceeding
```

**Expected Results**:
- ✅ All checklist items checked
- ✅ No issues found or all issues resolved
- ✅ System ready for production

**Go/No-Go Decision**:
- ✅ **GO**: All manual tests pass, ready for deployment
- 🛑 **NO-GO**: Issues found, UI problems, memory leaks
  - **Action**: Fix all issues, retest until clean

**Git Checkpoint**:
```bash
git add -A
git commit -m "test: manual testing complete (checkpoint 4.3)"
git tag checkpoint-4.3
```

**🎉 PHASE 4 COMPLETE - REFACTOR DONE**

**Final Validation**:
- [ ] All 13 checkpoints passed (1.1-1.4, 2.1-2.3, 3.1-3.4, 4.1-4.3)
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual tests pass
- [ ] No regressions
- [ ] Documentation updated
- [ ] System stable for 24 hours

**Production Ready Sign-off**:
```bash
git tag v2.0-consciousness-unified
git push origin v2.0-consciousness-unified
git push --tags
```

---

## Success Criteria

### Code Metrics
- ✅ **Lines of code**: Reduce by ~200 lines
- ✅ **Cyclomatic complexity**: Reduce callback nesting from 3 to 1
- ✅ **DRY violations**: Eliminate 4 duplicate event constructions
- ✅ **File count**: Remove 1 file (`dream-loop.js` merged)

### Architectural Metrics
- ✅ **Mental models**: 2 loops → 1 loop with 2 modes
- ✅ **Data symmetry**: Dream and live output identical structure
- ✅ **Event flow**: Direct emission (no callback pyramid)
- ✅ **State transitions**: Centralized in 1 location

### Functional Metrics
- ✅ **Feature parity**: All existing behavior preserved
- ✅ **No regressions**: Dashboard, perceptor, APIs work identically
- ✅ **Performance**: No degradation in cycle times
- ✅ **Memory**: No leaks in 24hr test

---

## Migration Strategy

### Backward Compatibility
- Keep old exports during Phase 1-2
- Deprecation warnings in console
- Full cutover in Phase 3

### Rollback Plan
- Git branch for each phase
- Tag releases: `v1.0-pre-unification`, `v1.1-phase1`, etc.
- Keep old files in graveyard with restore instructions

### Documentation Updates
- Update `README.md` with new architecture
- Update `docs/DEVELOPER_GUIDE.md`
- Add `docs/consciousness-loop-api.md`

---

## Timeline

### Fast Track (Quick Wins Only)
- **Phase 1**: 4-6 hours
- **Testing**: 2 hours
- **Total**: 1 working day

### Full Unification
- **Phase 1**: 4-6 hours
- **Phase 2**: 2-3 hours
- **Phase 3**: 1 day
- **Phase 4**: 5 hours
- **Total**: 2-3 working days

---

## Risk Assessment

### Low Risk (Phase 1-2)
- Refactoring only
- No architectural changes
- Easy to test incrementally
- Fast rollback if issues

### Medium Risk (Phase 3)
- Architectural change
- Requires thorough testing
- More complex rollback
- Mitigation: Comprehensive test suite

### High Risk Areas
- **Timing**: Loop interval changes could break assumptions
- **State transitions**: Edge cases in rapid session changes
- **Memory**: New class could introduce leaks
- **Database**: Query changes must preserve data integrity

---

## Post-Implementation Benefits

### Developer Experience
- **Onboarding**: Simpler mental model for new contributors
- **Debugging**: Clearer data flow, easier to trace
- **Extending**: Adding new modes (IMAGINE, REFLECT) straightforward
- **Testing**: Easier to mock and test in isolation

### System Qualities
- **Maintainability**: Less code, clearer intent
- **Reliability**: Fewer edge cases, centralized logic
- **Performance**: Potential for optimization (single loop tick)
- **Observability**: Better logging, state tracking

### Future Features Enabled
- **Multiple modes**: IMAGINE (generative), REFLECT (summarize), MEDITATE (quiet)
- **Mode transitions**: Gradual fade between modes
- **Hybrid mode**: Mix live and dreams (augmented reality)
- **Mode scheduling**: Time-based mode switching

---

## Implementation Order Recommendation

### Option A: Incremental (Safer) ⭐ RECOMMENDED
1. Phase 1 → **13 checkpoints** → Test → Deploy
2. Phase 2 → **13 checkpoints** → Test → Deploy
3. Phase 3 → **13 checkpoints** → Test → Deploy

**Timeline**: 3 releases over 2 weeks  
**Checkpoints**: 13 validation stops with Go/No-Go decisions  
**Risk**: Low - can rollback to any checkpoint  
**Benefit**: Confidence at every step, maintain stability

### Option B: Big Bang (Faster)
1. All phases in dev branch
2. Comprehensive test suite
3. Single release

**Timeline**: 1 release after 1 week  
**Checkpoints**: Only at phase boundaries (3 stops)  
**Risk**: High - large changeset, harder to debug  
**Benefit**: Faster completion if no issues

**Recommendation**: **Option A** (Incremental)
- 13 checkpoints ensure consistency maintained throughout
- Can stop at any checkpoint and deploy partial improvements
- Easier to debug when issues arise
- Team stays aligned on progress
- Lower stress, higher confidence

---

## Next Steps

1. **Review this plan** with team/stakeholders
2. **Create branch**: `feat/consciousness-unification`
3. **Start Phase 1.1**: Extract broadcast helpers
4. **Test incrementally** after each step
5. **Document learnings** in implementation notes

---

**Status**: Plan complete. Ready for implementation approval.

