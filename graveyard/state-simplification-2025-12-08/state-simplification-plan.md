# State Simplification Plan

**Goal**: Simplify consciousness state system to two clean dimensions: **Mode** + **Phase**

---

## Current Problem

The system has **three overlapping state concepts**:

1. **Mode** (LIVE vs DREAMING) - operational mode
2. **Phase** (PERCEPTS, SPOOL, etc.) - universal 60s timeline
3. **Cognitive State** (IDLE, AGGREGATING, COGNIZING, VISUALIZING) - legacy async processing states

**Issues**:
- Cognitive states only apply to LIVE mode → asymmetric display
- Phases already encode all necessary state information
- Dashboard shows "DREAMING" (static) vs "AGGREGATING/COGNIZING" (dynamic) inconsistently
- Mixing of concerns: timeline state vs processing state

---

## Proposed Solution

**Radical simplification**: **Mode + Phase = Complete State**

### New State Model

```
┌────────────┬────────────┬──────────────┐
│ Mode       │ Phase      │ Next Phase   │
├────────────┼────────────┼──────────────┤
│ LIVE       │ PERCEPTS   │ SPOOL (12s)  │
│ DREAMING   │ SIGILHOLD  │ SIGILOUT (8s)│
└────────────┴────────────┴──────────────┘
```

### What Changes

**Remove**:
- ❌ `CognitiveState.IDLE`
- ❌ `CognitiveState.AGGREGATING`
- ❌ `CognitiveState.COGNIZING`
- ❌ `CognitiveState.VISUALIZING`
- ❌ `cognitiveState` socket event (or repurpose)

**Keep**:
- ✅ Mode: `LIVE` | `DREAM`
- ✅ Phase: `PERCEPTS` | `SPOOL` | `SIGILIN` | `SIGILHOLD` | `SIGILOUT` | `RESET`
- ✅ `phase` socket event (enhance it)

**Add**:
- ✨ `nextPhase` field to phase events
- ✨ `mode` field to phase events (derived from `isDream`)

---

## Implementation Phases

### Phase 1: Core State System Refactor

#### 1.1 Update `cognitive-states.js`

**File**: `src/cognitive-states.js`

**Changes**:
```javascript
// NEW: Clean mode constants
export const ConsciousnessMode = {
  LIVE: 'LIVE',
  DREAM: 'DREAM'
};

// NEW: Phase constants (extract from consciousness-loop.js)
export const Phase = {
  PERCEPTS: 'PERCEPTS',
  SPOOL: 'SPOOL',
  SIGILIN: 'SIGILIN',
  SIGILHOLD: 'SIGILHOLD',
  SIGILOUT: 'SIGILOUT',
  RESET: 'RESET'
};

// NEW: Phase timing constants
export const PhaseTiming = {
  PERCEPTS_MS: 35000,
  SPOOL_MS: 2000,
  SIGILIN_MS: 3000,
  SIGILHOLD_MS: 15000,
  SIGILOUT_MS: 3000,
  RESET_MS: 2000
};

// NEW: Phase sequence helper
export const PHASE_SEQUENCE = [
  'PERCEPTS',
  'SPOOL',
  'SIGILIN',
  'SIGILHOLD',
  'SIGILOUT',
  'RESET'
];

export function getNextPhase(currentPhase) {
  const index = PHASE_SEQUENCE.indexOf(currentPhase);
  return PHASE_SEQUENCE[(index + 1) % PHASE_SEQUENCE.length];
}

export function getPhaseTimeRemaining(phaseStartTime, phaseDuration) {
  const elapsed = Date.now() - phaseStartTime;
  return Math.max(0, phaseDuration - elapsed);
}

// DEPRECATED: Keep for backward compatibility, mark for removal
export const CognitiveState = {
  IDLE: 'IDLE',                    // DEPRECATED
  AGGREGATING: 'AGGREGATING',      // DEPRECATED
  COGNIZING: 'COGNIZING',          // DEPRECATED
  VISUALIZING: 'VISUALIZING',      // DEPRECATED
  DREAMING: 'DREAMING'             // DEPRECATED - use ConsciousnessMode.DREAM
};
```

---

#### 1.2 Update `consciousness-loop.js`

**File**: `src/consciousness-loop.js`

**Changes**:

**A. Import new constants**:
```javascript
import { ConsciousnessMode, Phase, PhaseTiming, getNextPhase } from './cognitive-states.js';
```

**B. Remove old cognitive state tracking**:
```javascript
// REMOVE:
this.currentState = CognitiveState.IDLE;

// REMOVE all state transitions:
// this.currentState = CognitiveState.VISUALIZING;
// this.currentState = CognitiveState.COGNIZING;
// etc.
```

**C. Track current phase instead**:
```javascript
constructor(io) {
  this.io = io;
  this.mode = 'DREAM';  // Start in dream mode
  this.currentPhase = null;  // NEW: track current phase
  this.phaseStartTime = null; // NEW: track when phase started
  // ... rest of constructor
}
```

**D. Enhance `emitPhase()` method**:
```javascript
emitPhase(phase, duration, cycleNumber, isDream) {
  const now = new Date().toISOString();
  const mode = isDream ? ConsciousnessMode.DREAM : ConsciousnessMode.LIVE;
  const nextPhase = getNextPhase(phase);
  
  this.currentPhase = phase;
  this.phaseStartTime = Date.now();
  
  this.io.emit('phase', {
    phase,
    mode,              // NEW
    nextPhase,         // NEW
    startTime: now,
    duration,
    cycleNumber,
    isDream            // Keep for backward compatibility
  });
}
```

**E. Remove `cognitiveState` emissions**:
```javascript
// REMOVE all instances of:
this.io.emit('cognitiveState', { state: ... });
```

**F. Remove `emitState()` method**:
```javascript
// REMOVE entire method:
emitState() {
  const state = this.mode === 'DREAM' 
    ? CognitiveState.DREAMING 
    : this.currentState;
  
  this.io.emit('cognitiveState', { state });
}
```

**G. Update `getCycleStatus()`**:
```javascript
getCycleStatus() {
  const isRunning = this.intervalId !== null;
  const intervalMs = this.mode === 'DREAM' ? DREAM_CYCLE_MS : LIVE_CYCLE_MS;
  
  return {
    isRunning,
    mode: this.mode,
    phase: this.currentPhase,
    phaseStartTime: this.phaseStartTime,
    intervalMs,
    nextCycleAt: null,
    msUntilNextCycle: null
  };
}
```

**H. Remove state event listeners in `setupLiveListeners()`**:
```javascript
// REMOVE state transitions tied to LLM events
// Keep onMindMoment, onSigil, onSoundBrief for data handling
// But remove all this.currentState = ... assignments
```

---

#### 1.3 Update `server.js` (if needed)

**File**: `server.js` (main server file)

**Changes**:
- Update `getCycleStatus` handler to return new structure
- Remove any `cognitiveState` event emissions
- Ensure backward compatibility during transition

---

### Phase 2: Dashboard Refactor

#### 2.1 Update Dashboard HTML

**File**: `web/dashboard/index.html`

**Changes**:
```html
<!-- Top Status Strip -->
<div class="top-status-strip">
  <div id="uni-brand"></div>
  
  <div class="status-group">
    <div class="label">Connection</div>
    <div class="value connection disconnected" id="connection">Disconnected</div>
  </div>
  
  <div class="status-group">
    <div class="label">Active Sessions</div>
    <div class="value" id="sessions">none</div>
  </div>
  
  <!-- NEW: Simplified state display -->
  <div class="status-group">
    <div class="label">Mode</div>
    <div class="value mode" id="mode">—</div>
  </div>
  
  <div class="status-group">
    <div class="label">Phase</div>
    <div class="value phase" id="phase">—</div>
  </div>
  
  <div class="status-group">
    <div class="label">Next Phase</div>
    <div class="value next-phase" id="next-phase">—</div>
  </div>
  
  <!-- REMOVE: Old state display -->
  <!-- <div class="status-group">
    <div class="label">State</div>
    <div class="value state aggregating" id="state">AGGREGATING</div>
  </div> -->
  
  <!-- REMOVE: Next Cycle countdown (redundant with Next Phase) -->
  <!-- <div class="status-group">
    <div class="label">Next Cycle</div>
    <div class="countdown" id="countdown">—</div>
  </div> -->
  
  <div class="status-group">
    <div class="label">Cycle</div>
    <div class="value" id="cycle">—</div>
  </div>
</div>
```

---

#### 2.2 Update Dashboard JavaScript

**File**: `web/dashboard/app.js`

**Changes**:

**A. Update DOM element references**:
```javascript
// REMOVE:
const $state = document.getElementById('state');
const $countdown = document.getElementById('countdown');

// ADD:
const $mode = document.getElementById('mode');
const $phase = document.getElementById('phase');
const $nextPhase = document.getElementById('next-phase');
```

**B. Update state variables**:
```javascript
// REMOVE:
let currentState = 'IDLE';

// ADD:
let currentMode = 'LIVE';
let currentPhase = null;
let phaseStartTime = null;
let phaseDuration = null;
let nextPhaseCountdownInterval = null;
```

**C. Replace `updateStateDisplay()` with new functions**:
```javascript
/**
 * Update mode display
 */
function updateModeDisplay(mode) {
  currentMode = mode;
  $mode.textContent = mode;
  $mode.className = `value mode ${mode.toLowerCase()}`;
  
  // Update collecting message based on mode
  if ($collectingMessage) {
    if (mode === 'DREAM') {
      $collectingMessage.textContent = 'Collecting Dream Percepts...';
    } else {
      $collectingMessage.textContent = 'Collecting Percepts...';
    }
  }
}

/**
 * Update phase display
 */
function updatePhaseDisplay(phase) {
  currentPhase = phase;
  $phase.textContent = phase;
  $phase.className = `value phase ${phase.toLowerCase()}`;
}

/**
 * Update next phase countdown display
 */
function updateNextPhaseDisplay(nextPhase, timeRemaining) {
  if (!nextPhase) {
    $nextPhase.textContent = '—';
    return;
  }
  
  const seconds = Math.ceil(timeRemaining / 1000);
  $nextPhase.textContent = `${nextPhase} (${seconds}s)`;
  $nextPhase.className = `value next-phase ${nextPhase.toLowerCase()}`;
}

/**
 * Start next phase countdown
 */
function startNextPhaseCountdown(nextPhase, duration) {
  if (nextPhaseCountdownInterval) {
    clearInterval(nextPhaseCountdownInterval);
  }
  
  phaseStartTime = Date.now();
  phaseDuration = duration;
  
  nextPhaseCountdownInterval = setInterval(() => {
    const elapsed = Date.now() - phaseStartTime;
    const remaining = Math.max(0, phaseDuration - elapsed);
    
    updateNextPhaseDisplay(nextPhase, remaining);
    
    if (remaining <= 0) {
      clearInterval(nextPhaseCountdownInterval);
      nextPhaseCountdownInterval = null;
    }
  }, 100);
}
```

**D. Remove old state handlers**:
```javascript
// REMOVE entire function:
function updateStateDisplay(state) { ... }

// REMOVE:
socket.on('cognitiveState', ({ state }) => { ... });
```

**E. Update phase event handler**:
```javascript
// Phase transitions (enhanced)
socket.on('phase', ({ phase, mode, nextPhase, duration, cycleNumber, isDream }) => {
  // Guard: ignore in EXPLORING mode
  if (exploringMode) {
    console.log('🔒 EXPLORING mode - ignoring phase transition');
    return;
  }
  
  const durationSec = (duration / 1000).toFixed(1);
  const modeLabel = isDream ? '💭 DREAM' : '🧠 LIVE';
  const cycleLabel = `Cycle ${cycleNumber}`;
  
  console.log(`┌─────────────────────────────────────────────────`);
  console.log(`│ ${modeLabel} ${cycleLabel}`);
  console.log(`│ PHASE: ${phase} (${durationSec}s) → ${nextPhase}`);
  console.log(`└─────────────────────────────────────────────────`);
  
  // Update displays
  updateModeDisplay(mode || (isDream ? 'DREAM' : 'LIVE'));
  updatePhaseDisplay(phase);
  startNextPhaseCountdown(nextPhase, duration);
  
  // Handle phase-specific UI transitions (keep existing logic)
  switch (phase) {
    case 'PERCEPTS':
      showCollectingState();
      break;
    case 'SPOOL':
      break;
    case 'SIGILIN':
      $percepts.innerHTML = '';
      console.log('  🧹 Cleared percept toast pane');
      break;
    case 'SIGILHOLD':
      break;
    case 'SIGILOUT':
      if (currentMomentCard && currentMomentCard.sigil) {
        currentMomentCard.sigil.clear();
        console.log('  🧹 Cleared sigil from moment card');
      }
      break;
    case 'RESET':
      // Clear entire mind moment pane
      $momentCardContainer.innerHTML = '';
      $perceptsList.innerHTML = '';
      $priorMomentsList.innerHTML = '';
      $lighting.innerHTML = '<span class="lighting-text">—</span>';
      $timestamp.textContent = '—';
      $personalityName.textContent = '—';
      $sigilPromptName.textContent = '—';
      
      if ($pngDisplay) {
        $pngDisplay.innerHTML = '';
        $pngDisplay.classList.add('empty');
      }
      $pngStatus.textContent = '—';
      
      if ($perceptPngsSection) {
        $perceptPngsSection.style.display = 'none';
      }
      
      currentMomentCard = null;
      currentSigilCode = null;
      
      console.log('  🧹 Cleared mind moment pane');
      break;
  }
});
```

**F. Update `cycleStatus` handler**:
```javascript
socket.on('cycleStatus', ({ isRunning, intervalMs, mode, phase }) => {
  console.log('📊 Cycle status:', { isRunning, intervalMs, mode, phase });
  cycleMs = intervalMs;
  
  // Update displays
  if (mode) updateModeDisplay(mode);
  if (phase) updatePhaseDisplay(phase);
});
```

**G. Update `clearPercepts()` to use mode**:
```javascript
function clearPercepts() {
  $percepts.innerHTML = '';
  
  if (currentPerceptExpanded) {
    currentPerceptExpanded.remove();
    currentPerceptExpanded = null;
  }
  
  const waitingMessage = document.createElement('div');
  waitingMessage.className = 'percept-expanded-waiting';
  if (currentMode === 'DREAM') {
    waitingMessage.textContent = 'Collecting Dream Percepts...';
  } else {
    waitingMessage.textContent = 'Waiting for percepts...';
  }
  
  $perceptExpandedContainer.innerHTML = '';
  $perceptExpandedContainer.appendChild(waitingMessage);
}
```

**H. Update sigil handler to use mode**:
```javascript
socket.on('sigil', async (data) => {
  if (exploringMode) {
    console.log('🔒 EXPLORING mode - ignoring live sigil');
    return;
  }
  
  console.log('🎨 Sigil received');
  
  // In DREAM mode, clear Latest Percept when sigil arrives
  if (currentMode === 'DREAM' && currentPerceptExpanded) {
    console.log('💭 Dream sigil: clearing Latest Percept');
    currentPerceptExpanded.remove();
    currentPerceptExpanded = null;
    $perceptExpandedContainer.innerHTML = '';
  }
  
  // ... rest of handler
});
```

---

#### 2.3 Update Dashboard CSS

**File**: `web/dashboard/dashboard.css`

**Changes**:
```css
/* NEW: Mode-specific styling */
.value.mode {
  font-weight: 600;
  text-transform: uppercase;
}

.value.mode.live {
  color: #4CAF50;
}

.value.mode.dream {
  color: #9C27B0;
}

/* NEW: Phase-specific styling */
.value.phase {
  font-weight: 600;
  text-transform: uppercase;
}

.value.phase.percepts {
  color: #2196F3;
}

.value.phase.spool {
  color: #FF9800;
}

.value.phase.sigilin {
  color: #4CAF50;
}

.value.phase.sigilhold {
  color: #8BC34A;
}

.value.phase.sigilout {
  color: #FFC107;
}

.value.phase.reset {
  color: #9E9E9E;
}

/* NEW: Next phase styling */
.value.next-phase {
  font-size: 0.9rem;
  color: #666;
}

/* REMOVE: Old state-specific classes */
.value.state.aggregating { /* REMOVE */ }
.value.state.cognizing { /* REMOVE */ }
.value.state.visualizing { /* REMOVE */ }
.value.state.dreaming { /* REMOVE */ }
.value.state.idle { /* REMOVE */ }
```

---

### Phase 3: Documentation Updates

#### 3.1 Update Socket Events Reference

**File**: `docs/socket-events-reference.md`

**Changes**:

**A. Update architecture section**:
```markdown
## Architecture

**Unified 60-second consciousness cycle** with 6 phases:

```
PERCEPTS   (0-35s)   → Sensory input window
SPOOL      (35-37s)  → Load/prepare phase (data ready in buffer)
SIGILIN    (37-40s)  → Broadcast mind moment + sigil + sound
SIGILHOLD  (40-55s)  → Display pause
SIGILOUT   (55-58s)  → Fade out
RESET      (58-60s)  → Cleanup
```

**Two modes, identical timing:**
- **LIVE**: Real-time LLM processing of percepts
- **DREAM**: Replay historical mind moments from database

**State Model**: Mode + Phase = Complete State
- Dashboard displays: `Mode: LIVE | Phase: PERCEPTS | Next: SPOOL (12s)`
```

**B. Replace `cognitiveState` event with updated `phase` event**:
```markdown
### `phase`
Emitted at start of each cycle phase. **Primary state event.**

```javascript
{
  phase: 'PERCEPTS' | 'SPOOL' | 'SIGILIN' | 'SIGILHOLD' | 'SIGILOUT' | 'RESET',
  mode: 'LIVE' | 'DREAM',     // NEW
  nextPhase: 'SPOOL',          // NEW
  startTime: '2025-12-08T...',
  duration: 35000,             // milliseconds
  cycleNumber: 142,
  isDream: false               // Deprecated: use 'mode' instead
}
```

**Use for**: 
- UI state display (Mode + Phase)
- Timeline tracking
- Phase-specific animations
- Progress indicators

**State Display**:
- Current: `mode` + `phase`
- Next: `nextPhase` with countdown from `duration`
```

**C. Add deprecation notice**:
```markdown
### `cognitiveState` (DEPRECATED)
Legacy event. Use `phase` event's `mode` and `phase` fields instead.

**Migration**:
- `state: 'DREAMING'` → `mode: 'DREAM'` + `phase: <current phase>`
- `state: 'AGGREGATING'` → `mode: 'LIVE'` + `phase: 'PERCEPTS'`
- `state: 'COGNIZING'` → `mode: 'LIVE'` + (phase varies)
- `state: 'VISUALIZING'` → `mode: 'LIVE'` + (phase varies)
- `state: 'IDLE'` → loop not running
```

---

#### 3.2 Update Client Events Guide

**File**: `docs/client-events-guide.md`

**Changes**:
```markdown
## State Tracking

Track consciousness state using the `phase` event:

```javascript
let currentMode = 'LIVE';
let currentPhase = 'PERCEPTS';
let nextPhase = 'SPOOL';
let phaseTimeRemaining = 35000;

socket.on('phase', ({ phase, mode, nextPhase, duration }) => {
  currentMode = mode;
  currentPhase = phase;
  nextPhase = nextPhase;
  phaseTimeRemaining = duration;
  
  // Update UI
  displayState(mode, phase, nextPhase, duration);
});
```

**Mode** (data source):
- `LIVE` - Real-time processing
- `DREAM` - Historical replay

**Phase** (timeline position):
- `PERCEPTS` (0-35s) - Input collection
- `SPOOL` (35-37s) - Preparation
- `SIGILIN` (37-40s) - Broadcast
- `SIGILHOLD` (40-55s) - Display
- `SIGILOUT` (55-58s) - Fade
- `RESET` (58-60s) - Cleanup
```

---

### Phase 4: Testing & Validation

#### 4.1 Unit Tests

**Create**: `tests/state-system.test.js`

**Test**:
- Phase sequence (`getNextPhase()`)
- Mode transitions (LIVE ↔ DREAM)
- Event payload structure
- Backward compatibility

#### 4.2 Integration Tests

**Test scenarios**:
1. **LIVE mode cycle**: Verify all 6 phases emit with correct mode
2. **DREAM mode cycle**: Verify all 6 phases emit with correct mode
3. **Mode switch**: Verify clean transition between modes
4. **Dashboard display**: Verify all three fields update correctly
5. **Next phase countdown**: Verify countdown accuracy

#### 4.3 Manual Testing Checklist

**Dashboard display**:
- [ ] Mode shows LIVE or DREAM correctly
- [ ] Phase shows current phase correctly
- [ ] Next phase shows upcoming phase + countdown
- [ ] Phase transitions happen at correct times (0s, 35s, 37s, 40s, 55s, 58s)
- [ ] Mode switches cleanly (no visual glitches)
- [ ] Countdown is accurate (±100ms)

**Console logs**:
- [ ] Phase transitions log clearly
- [ ] No "cognitiveState" events emitted
- [ ] Cycle numbers increment correctly

**Backward compatibility**:
- [ ] Old clients still receive `isDream` flag
- [ ] `cognitiveState` event removed (or deprecated gracefully)

---

## Migration Path

### Step 1: Core Implementation (Non-Breaking)
- Add new fields to `phase` event (`mode`, `nextPhase`)
- Keep emitting `cognitiveState` for now
- Add deprecation warnings in logs

### Step 2: Dashboard Update
- Update dashboard to use new fields
- Test thoroughly in both modes
- Deploy dashboard first (backward compatible)

### Step 3: Deprecation
- Remove `cognitiveState` event emissions from core
- Remove old state tracking code
- Clean up unused constants

### Step 4: Cleanup
- Remove `CognitiveState` enum (except for reference)
- Update all documentation
- Remove deprecated event handlers

---

## Benefits

✅ **Symmetry**: Both modes show identical state structure  
✅ **Clarity**: Mode + Phase = complete picture  
✅ **Actionability**: Phases tell UI exactly what to do  
✅ **Simplicity**: Two concepts instead of three  
✅ **Predictability**: Deterministic timeline (60s cycle)  
✅ **Future-proof**: New processing stages don't affect display  

---

## Timeline Estimate

**Total**: ~8-12 hours

- Phase 1 (Core): 3-4 hours
- Phase 2 (Dashboard): 3-4 hours  
- Phase 3 (Docs): 1-2 hours
- Phase 4 (Testing): 1-2 hours

---

## Next Steps

1. Review this plan
2. Create feature branch: `feature/state-simplification`
3. Implement Phase 1 (core refactor)
4. Test in isolation
5. Implement Phase 2 (dashboard)
6. Test end-to-end
7. Update documentation
8. Merge to main
