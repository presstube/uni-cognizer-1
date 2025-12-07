# 60-Second Timing Refactor - Implementation Plan

**Status**: Planning  
**Branch**: `feature/60s-timing-refactor`  
**Created**: Dec 7, 2025  
**Scope**: Timing and events only - NO sound integration

---

## Overview

### What This Plan Covers
✅ New 60s cycle timing (35s PERCEPTS + 25s INTEGRATION)  
✅ Six-phase event system (PERCEPTS → SPOOL → SIGILIN → SIGILHOLD → SIGILOUT → RESET)  
✅ DREAMING mode refactor  
✅ LIVE mode refactor with interleaved A/B buffering  
✅ Bootstrap placeholder system (for LIVE mode cycle 0)  

### What This Plan Excludes
❌ Sound generation integration (separate future work)  
❌ Legacy compatibility (working on branch, can revert)  
❌ Gradual rollout (all-in refactor)  

---

## The New Timing Model

### 60-Second Cycle Structure

```
┌─ PERCEPTS (35s) ──────────────────────────────────┐
│ • Percepts flow/display                            │
│ • Queue accumulating (LIVE) or replaying (DREAM)  │
│ • Ends: Dump queue → cognize() (LIVE only)        │
└────────────────────────────────────────────────────┘
         ↓
┌─ INTEGRATION (25s) ───────────────────────────────┐
│ 0:00  SPOOL (2s)      → Prepare                   │
│ 0:02  SIGILIN (3s)    → Fade in                   │
│ 0:05  SIGILHOLD (15s) → Display                   │
│ 0:20  SIGILOUT (3s)   → Fade out                  │
│ 0:23  RESET (2s)      → Breathing room            │
└────────────────────────────────────────────────────┘
         ↓ Loop
```

### Phase Timing Constants

```javascript
const CYCLE_MS = 60000;           // Total cycle
const PERCEPTS_MS = 35000;        // Percept phase
const SPOOL_MS = 2000;            // Spool phase
const SIGILIN_MS = 3000;          // Sigil in transition
const SIGILHOLD_MS = 15000;       // Sigil hold
const SIGILOUT_MS = 3000;         // Sigil out transition
const RESET_MS = 2000;            // Reset phase
// INTEGRATION_MS = 25000 (sum of above)
```

---

## DREAMING Mode Refactor

### Current State
- 30s cycle
- 3 phases: percept dispersal (18s) → mind moment (20s) → clear (28s)
- Simple replay of historical mind moments

### Target State
- 60s cycle
- 6 phases with explicit events
- Percepts disperse over 35s
- Mind moment + sigil emit at SIGILIN start
- No clear event (transitions handle it)

### Implementation

#### 1. Update Constants

```javascript
// src/consciousness-loop.js

const DREAM_CYCLE_MS = 60000; // Was 30000
const PERCEPTS_PHASE_MS = 35000; // Was 18000 dispersal
const SPOOL_PHASE_MS = 2000;
const SIGILIN_PHASE_MS = 3000;
const SIGILHOLD_PHASE_MS = 15000;
const SIGILOUT_PHASE_MS = 3000;
const RESET_PHASE_MS = 2000;
```

#### 2. Refactor `dreamTick()`

**Replace entire method**:

```javascript
/**
 * DREAM mode: Recall and replay a moment with 6-phase choreography
 */
async dreamTick() {
  const dream = await this.recallMoment();
  if (!dream) return;
  
  console.log(`💭 Dreaming of cycle ${dream.cycle}: "${dream.sigilPhrase}"`);
  
  // Clear any pending timeouts from previous dream
  this.dreamTimeouts.forEach(t => clearTimeout(t));
  this.dreamTimeouts = [];
  
  // PHASE 1: PERCEPTS (35s) - disperse percepts
  await this.dreamPerceptsPhase(dream);
  
  // PHASES 2-6: INTEGRATION (25s) - display mind moment
  await this.dreamIntegrationPhases(dream);
}
```

#### 3. Implement `dreamPerceptsPhase()`

```javascript
/**
 * PERCEPTS phase for DREAM mode: Disperse percepts chronologically
 */
async dreamPerceptsPhase(dream) {
  // Emit phase event
  this.emitPhase('PERCEPTS', PERCEPTS_PHASE_MS, dream.cycle, true);
  
  // Collect all percepts with type markers
  const allPercepts = [
    ...dream.visualPercepts.map(p => ({ ...p, type: 'visual' })),
    ...dream.audioPercepts.map(p => ({ ...p, type: 'audio' }))
  ].filter(p => p.timestamp);
  
  if (allPercepts.length === 0) {
    console.log('  💭 No percepts in dream, skipping dispersal');
    await this.sleep(PERCEPTS_PHASE_MS);
    return;
  }
  
  // Sort chronologically
  allPercepts.sort((a, b) => 
    new Date(a.timestamp) - new Date(b.timestamp)
  );
  
  // Calculate timing scale to fit 35s window
  const firstTime = new Date(allPercepts[0].timestamp).getTime();
  const lastTime = new Date(allPercepts[allPercepts.length - 1].timestamp).getTime();
  const originalDuration = lastTime - firstTime;
  const scaleFactor = originalDuration > 0 ? PERCEPTS_PHASE_MS / originalDuration : 1;
  
  console.log(`  💭 Dispersing ${allPercepts.length} percepts over ${PERCEPTS_PHASE_MS/1000}s`);
  console.log(`     Original: ${(originalDuration/1000).toFixed(1)}s, scale: ${scaleFactor.toFixed(2)}x`);
  
  // Schedule percept emissions with scaled timing
  allPercepts.forEach(percept => {
    const perceptTime = new Date(percept.timestamp).getTime();
    const relativeTime = perceptTime - firstTime;
    const scaledTime = relativeTime * scaleFactor;
    
    const timeoutId = setTimeout(() => {
      const { type, timestamp, ...data } = percept;
      
      this.io.emit('perceptReceived', {
        sessionId: 'dream',
        type,
        data,
        timestamp: new Date().toISOString(),
        originalTimestamp: timestamp,
        isDream: true
      });
      
      // Log
      if (type === 'visual') {
        console.log(`  💭 [${(scaledTime/1000).toFixed(1)}s] 👁️  ${data.emoji || ''} ${data.action || ''}`);
      } else {
        const preview = data.transcript?.slice(0, 40) || data.analysis || '';
        console.log(`  💭 [${(scaledTime/1000).toFixed(1)}s] 🎤 ${data.emoji || ''} ${preview}...`);
      }
    }, scaledTime);
    
    this.dreamTimeouts.push(timeoutId);
  });
  
  // Wait for phase to complete
  await this.sleep(PERCEPTS_PHASE_MS);
}
```

#### 4. Implement `dreamIntegrationPhases()`

```javascript
/**
 * INTEGRATION phases for DREAM mode: SPOOL → SIGILIN → SIGILHOLD → SIGILOUT → RESET
 */
async dreamIntegrationPhases(dream) {
  // SPOOL (2s)
  this.emitPhase('SPOOL', SPOOL_PHASE_MS, dream.cycle, true);
  await this.sleep(SPOOL_PHASE_MS);
  
  // SIGILIN (3s) - emit mind moment + sigil at start
  this.emitPhase('SIGILIN', SIGILIN_PHASE_MS, dream.cycle, true);
  console.log(`  💭 Emitting mind moment + sigil`);
  this.broadcastMoment(dream);
  await this.sleep(SIGILIN_PHASE_MS);
  
  // SIGILHOLD (15s)
  this.emitPhase('SIGILHOLD', SIGILHOLD_PHASE_MS, dream.cycle, true);
  await this.sleep(SIGILHOLD_PHASE_MS);
  
  // SIGILOUT (3s)
  this.emitPhase('SIGILOUT', SIGILOUT_PHASE_MS, dream.cycle, true);
  await this.sleep(SIGILOUT_PHASE_MS);
  
  // RESET (2s) - no explicit clear, let phases handle transitions
  this.emitPhase('RESET', RESET_PHASE_MS, dream.cycle, true);
  await this.sleep(RESET_PHASE_MS);
  
  console.log(`  💭 Cycle ${dream.cycle} complete`);
}
```

#### 5. Helper Methods

```javascript
/**
 * Emit phase event
 */
emitPhase(phase, duration, cycleNumber, isDream) {
  this.io.emit('phase', {
    phase,
    startTime: new Date().toISOString(),
    duration,
    cycleNumber,
    isDream
  });
}

/**
 * Sleep helper (returns promise)
 */
sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

#### 6. Update `start()` Method

```javascript
start() {
  if (this.intervalId) return;
  
  const intervalMs = this.mode === 'DREAM' ? DREAM_CYCLE_MS : LIVE_CYCLE_MS;
  
  if (this.mode === 'LIVE') {
    this.setupLiveListeners(); // Keep for now
  }
  
  this.intervalId = setInterval(async () => {
    await this.tick();
  }, intervalMs);
  
  this.emitState();
  console.log(`🧠 Consciousness loop started (${this.mode} mode, ${intervalMs}ms)`);
}
```

### What to Remove

**Delete these methods** (no longer needed):
- Old multi-timeout dream logic in current `dreamTick()`
- `clearDisplay()` calls (phases handle transitions now)

**Keep these methods** (still used):
- `recallMoment()` - unchanged
- `broadcastMoment()` - unchanged

---

## LIVE Mode Refactor

### Current State
- 5s cycle
- Immediate cognition and display (no buffering)
- States: IDLE → AGGREGATING → COGNIZING → VISUALIZING

### Target State
- 60s cycle
- Interleaved A/B buffering (show N-1 while processing N)
- 6-phase event system
- Bootstrap placeholder for cycle 0

### Key Insight: The Interleaved Pattern

```
Cycle 0 (Bootstrap):
0:00-0:35   PERCEPTS₀ → dump → cognize()
0:35-1:00   INTEGRATION₀ (show PLACEHOLDER)
            Background: Processing Cycle 0

Cycle 1:
1:00-1:35   PERCEPTS₁ → dump → cognize()
1:35-2:00   INTEGRATION₁ (show Cycle 0 results)
            Background: Processing Cycle 1

[Steady state: Always show N-1 during N]
```

### Implementation

#### 1. Update Constants

```javascript
// src/consciousness-loop.js

const LIVE_CYCLE_MS = 60000; // Was 5000
const PERCEPTS_PHASE_MS = 35000;
const SPOOL_PHASE_MS = 2000;
const SIGILIN_PHASE_MS = 3000;
const SIGILHOLD_PHASE_MS = 15000;
const SIGILOUT_PHASE_MS = 3000;
const RESET_PHASE_MS = 2000;
```

#### 2. Add Buffer System to Constructor

```javascript
constructor(io) {
  this.io = io;
  this.mode = 'DREAM';  // Start in dream mode
  this.intervalId = null;
  this.currentState = CognitiveState.IDLE;
  this.dreamTimeouts = [];
  
  // Replace perceptQueue with cycleBuffer system
  this.cycleBuffer = {
    current: {
      number: 0,
      percepts: { visual: [], audio: [] }
    },
    ready: null,      // Completed mind moment ready to display
    placeholder: null // Bootstrap moment (loaded on start)
  };
}
```

#### 3. Load Bootstrap Placeholder

```javascript
/**
 * Load bootstrap placeholder (simple version - from hardcoded data)
 */
loadPlaceholder() {
  // Simple hardcoded placeholder for now
  // Later: load from JSON file or DB query
  this.cycleBuffer.placeholder = {
    cycle: 0,
    mindMoment: "Consciousness initializing, patterns emerging...",
    sigilPhrase: "First awakening",
    sigilCode: "ctx.fillStyle='#6496C8';ctx.arc(256,256,200,0,Math.PI*2);ctx.fill();",
    kinetic: "SLOW_SWAY",
    lighting: {
      color: [100, 150, 200],
      pattern: "SMOOTH_WAVES",
      speed: 0.5
    },
    visualPercepts: [],
    audioPercepts: [],
    priorMoments: [],
    isDream: false,
    isPlaceholder: true,
    timestamp: new Date().toISOString()
  };
  
  console.log(`🌅 Loaded bootstrap placeholder: "${this.cycleBuffer.placeholder.sigilPhrase}"`);
}
```

#### 4. Refactor `liveTick()`

**Replace entire method**:

```javascript
/**
 * LIVE mode: 60s cycle with interleaved A/B buffering
 */
async liveTick() {
  const cycleNumber = this.cycleBuffer.current.number;
  console.log(`🧠 Cycle ${cycleNumber} starting`);
  
  // PHASE 1: PERCEPTS (35s)
  await this.livePerceptsPhase(cycleNumber);
  
  // Dump percepts and start background processing
  const percepts = this.dumpPercepts();
  const count = percepts.visualPercepts.length + percepts.audioPercepts.length;
  console.log(`🧠 Cycle ${cycleNumber}: ${count} percepts dumped → cognizing`);
  
  this.startBackgroundCognition(cycleNumber, percepts);
  
  // PHASES 2-6: INTEGRATION (25s) - display PREVIOUS cycle
  const toDisplay = this.cycleBuffer.ready || this.cycleBuffer.placeholder;
  
  if (!toDisplay) {
    console.warn('⚠️  No mind moment ready! Falling back to placeholder');
    toDisplay = this.cycleBuffer.placeholder;
  }
  
  await this.liveIntegrationPhases(toDisplay);
  
  // Advance cycle counter
  this.cycleBuffer.current.number++;
  
  console.log(`🧠 Cycle ${cycleNumber} complete`);
}
```

#### 5. Implement `livePerceptsPhase()`

```javascript
/**
 * PERCEPTS phase for LIVE mode: Display incoming percepts in real-time
 */
async livePerceptsPhase(cycleNumber) {
  this.emitPhase('PERCEPTS', PERCEPTS_PHASE_MS, cycleNumber, false);
  
  console.log(`  🧠 PERCEPTS phase (${PERCEPTS_PHASE_MS/1000}s) - accumulating`);
  
  // Percepts arrive via WebSocket and queue automatically
  // Just wait for the phase duration
  await this.sleep(PERCEPTS_PHASE_MS);
  
  console.log(`  🧠 PERCEPTS phase complete`);
}
```

#### 6. Implement `startBackgroundCognition()`

```javascript
/**
 * Start background LLM processing (fire and forget)
 */
startBackgroundCognition(cycleNumber, percepts) {
  const startTime = Date.now();
  
  // Fire and forget - stores result when done
  (async () => {
    try {
      console.log(`  🧠 [Cycle ${cycleNumber}] LLM pipeline starting...`);
      
      // Call existing cognize() function
      // This returns: { cycle, mindMoment, sigilPhrase, sigilCode, kinetic, lighting, ... }
      // It also handles sigil generation internally via listeners
      
      // We need to capture the complete result somehow
      // For now, we'll use the existing event listeners
      
      // Store a promise that resolves when cycle completes
      await cognize(
        percepts.visualPercepts,
        percepts.audioPercepts,
        PRIOR_CONTEXT_DEPTH
      );
      
      // NOTE: The actual result comes via listeners (onMindMoment, onSigil)
      // We need to refactor real-cog.js to return the complete package directly
      
      const duration = Date.now() - startTime;
      console.log(`  ✅ [Cycle ${cycleNumber}] Complete (${(duration/1000).toFixed(1)}s)`);
      
    } catch (error) {
      console.error(`  ❌ [Cycle ${cycleNumber}] Failed:`, error.message);
    }
  })();
}
```

**NOTE**: This requires refactoring `real-cog.js` to support both event-based (current) and promise-based (new) usage.

#### 7. Implement `liveIntegrationPhases()`

```javascript
/**
 * INTEGRATION phases for LIVE mode: SPOOL → SIGILIN → SIGILHOLD → SIGILOUT → RESET
 */
async liveIntegrationPhases(moment) {
  const cycleNumber = moment.cycle;
  const label = moment.isPlaceholder ? 'placeholder' : `cycle ${cycleNumber}`;
  
  // SPOOL (2s)
  this.emitPhase('SPOOL', SPOOL_PHASE_MS, cycleNumber, false);
  console.log(`  🧠 Displaying ${label} - SPOOL`);
  await this.sleep(SPOOL_PHASE_MS);
  
  // SIGILIN (3s) - emit mind moment + sigil at start
  this.emitPhase('SIGILIN', SIGILIN_PHASE_MS, cycleNumber, false);
  console.log(`  🧠 Displaying ${label} - SIGILIN (emitting)`);
  this.broadcastMoment(moment);
  await this.sleep(SIGILIN_PHASE_MS);
  
  // SIGILHOLD (15s)
  this.emitPhase('SIGILHOLD', SIGILHOLD_PHASE_MS, cycleNumber, false);
  await this.sleep(SIGILHOLD_PHASE_MS);
  
  // SIGILOUT (3s)
  this.emitPhase('SIGILOUT', SIGILOUT_PHASE_MS, cycleNumber, false);
  await this.sleep(SIGILOUT_PHASE_MS);
  
  // RESET (2s)
  this.emitPhase('RESET', RESET_PHASE_MS, cycleNumber, false);
  await this.sleep(RESET_PHASE_MS);
}
```

#### 8. Update Percept Methods

**Replace `addPercept()` and `dumpPercepts()`**:

```javascript
/**
 * Add a percept to the queue (LIVE mode only)
 */
addPercept(percept) {
  if (this.mode !== 'LIVE') return;
  
  if (percept.type === 'visual') {
    this.cycleBuffer.current.percepts.visual.push(percept);
  } else if (percept.type === 'audio') {
    this.cycleBuffer.current.percepts.audio.push(percept);
  }
}

/**
 * Dump and clear percept queue
 */
dumpPercepts() {
  const snapshot = {
    visualPercepts: [...this.cycleBuffer.current.percepts.visual],
    audioPercepts: [...this.cycleBuffer.current.percepts.audio]
  };
  
  // Clear queue
  this.cycleBuffer.current.percepts.visual = [];
  this.cycleBuffer.current.percepts.audio = [];
  
  return snapshot;
}
```

#### 9. Update `start()` Method

```javascript
start() {
  if (this.intervalId) return;
  
  const intervalMs = this.mode === 'DREAM' ? DREAM_CYCLE_MS : LIVE_CYCLE_MS;
  
  if (this.mode === 'LIVE') {
    this.loadPlaceholder(); // Load bootstrap moment
    this.setupLiveListeners(); // Keep existing listeners for now
  }
  
  this.intervalId = setInterval(async () => {
    await this.tick();
  }, intervalMs);
  
  this.emitState();
  console.log(`🧠 Consciousness loop started (${this.mode} mode, ${intervalMs}ms)`);
}
```

### Critical Challenge: Refactor `real-cog.js`

**Problem**: Current `cognize()` function uses event listeners (callbacks). We need direct return values for buffering.

**Solution Options**:

**Option A: Dual Interface** (Recommended)
- Keep event-based for backwards compatibility
- Add promise-based wrapper that captures events
- Return complete package when done

```javascript
// src/real-cog.js - add new function

export async function cognizeForBuffer(visualPercepts, audioPercepts, priorDepth) {
  return new Promise((resolve, reject) => {
    let result = {};
    
    // Temporary listeners to capture results
    const mindMomentHandler = (cycle, mindMoment, ...args) => {
      result.cycle = cycle;
      result.mindMoment = mindMoment;
      // ... capture all fields
    };
    
    const sigilHandler = (cycle, sigilCode, sigilPhrase, sigilPNG) => {
      result.sigilCode = sigilCode;
      result.sigilPNG = sigilPNG;
      // Resolve when sigil is ready (last step)
      resolve(result);
    };
    
    // Register temporary listeners
    onMindMoment(mindMomentHandler);
    onSigil(sigilHandler);
    
    // Call existing cognize
    cognize(visualPercepts, audioPercepts, priorDepth).catch(reject);
    
    // Timeout after 60s
    setTimeout(() => reject(new Error('Cognition timeout')), 60000);
  });
}
```

**Option B: Full Refactor**
- Rework `cognize()` to return promise with full result
- Remove event-based architecture entirely
- Simpler but more invasive

**Recommendation**: Start with Option A (dual interface) for safety.

#### 10. Update `startBackgroundCognition()` with Dual Interface

```javascript
/**
 * Start background LLM processing (fire and forget)
 */
startBackgroundCognition(cycleNumber, percepts) {
  const startTime = Date.now();
  
  (async () => {
    try {
      console.log(`  🧠 [Cycle ${cycleNumber}] LLM pipeline starting...`);
      
      // Use new promise-based wrapper
      const result = await cognizeForBuffer(
        percepts.visualPercepts,
        percepts.audioPercepts,
        PRIOR_CONTEXT_DEPTH
      );
      
      // Store complete package in ready buffer
      this.cycleBuffer.ready = {
        ...result,
        visualPercepts: percepts.visualPercepts,
        audioPercepts: percepts.audioPercepts,
        isDream: false,
        isPlaceholder: false,
        timestamp: new Date().toISOString()
      };
      
      const duration = Date.now() - startTime;
      console.log(`  ✅ [Cycle ${cycleNumber}] Ready for display (${(duration/1000).toFixed(1)}s)`);
      
    } catch (error) {
      console.error(`  ❌ [Cycle ${cycleNumber}] Failed:`, error.message);
      // Keep previous ready buffer as fallback
    }
  })();
}
```

---

## New Event System

### Event: `phase`

Emitted at the start of each phase.

**Structure**:
```javascript
{
  phase: 'PERCEPTS' | 'SPOOL' | 'SIGILIN' | 'SIGILHOLD' | 'SIGILOUT' | 'RESET',
  startTime: '2025-12-07T15:30:45.123Z',  // ISO timestamp
  duration: 35000,                          // milliseconds
  cycleNumber: 42,                          // Current cycle
  isDream: false                            // true=DREAMING, false=LIVE
}
```

**Client Usage**:
```javascript
socket.on('phase', ({ phase, duration, cycleNumber, isDream }) => {
  switch (phase) {
    case 'PERCEPTS':
      // Show percepts flowing in
      break;
    case 'SPOOL':
      // Prepare for sigil display
      break;
    case 'SIGILIN':
      // Begin 3s fade-in transition
      break;
    case 'SIGILHOLD':
      // Sigil fully visible, hold for 15s
      break;
    case 'SIGILOUT':
      // Begin 3s fade-out transition
      break;
    case 'RESET':
      // Breathing room, prepare for next cycle
      break;
  }
});
```

### Existing Events (Unchanged)

These continue to work as before:
- `perceptReceived` - Emitted during PERCEPTS phase
- `mindMoment` - Emitted at SIGILIN start
- `sigil` - Emitted at SIGILIN start

---

## Bootstrap Placeholder System

### Why Needed

**Problem**: On first cycle (cycle 0), we need to show something during INTEGRATION phase, but cycle 0's results aren't ready yet (still processing).

**Solution**: Pre-load a polished "awakening" moment to display during cycle 0's INTEGRATION.

### Implementation Options

**Option 1: Hardcoded** (Simplest, fastest)
```javascript
loadPlaceholder() {
  this.cycleBuffer.placeholder = {
    cycle: 0,
    mindMoment: "Consciousness initializing...",
    sigilPhrase: "First breath",
    // ... rest of fields
  };
}
```

**Option 2: JSON File** (More flexible)
```javascript
loadPlaceholder() {
  const data = JSON.parse(
    fs.readFileSync('./src/placeholders/startup.json', 'utf8')
  );
  this.cycleBuffer.placeholder = data[0];
}
```

**Option 3: Database Query** (Most polished)
```javascript
async loadPlaceholder() {
  const result = await pool.query(`
    SELECT * FROM mind_moments 
    WHERE cycle = 48
    LIMIT 1
  `);
  this.cycleBuffer.placeholder = normalizeMindMoment(result.rows[0]);
}
```

**Recommendation**: Start with Option 1 (hardcoded) for speed. Can upgrade to Option 3 later.

---

## Implementation Checklist

### Setup
- [ ] Create branch: `git checkout -b feature/60s-timing-refactor`
- [ ] Backup current `consciousness-loop.js` to `consciousness-loop.old.js`

### DREAMING Mode
- [ ] Update `DREAM_CYCLE_MS` to 60000
- [ ] Add phase timing constants
- [ ] Delete old `dreamTick()` logic
- [ ] Implement new `dreamTick()`
- [ ] Implement `dreamPerceptsPhase()`
- [ ] Implement `dreamIntegrationPhases()`
- [ ] Add `emitPhase()` helper
- [ ] Add `sleep()` helper
- [ ] Remove `clearDisplay()` calls
- [ ] Test locally: Does 60s cycle work?
- [ ] Test: Do all 6 phases emit?
- [ ] Test: Do percepts disperse over 35s?
- [ ] Test: Does mind moment emit at right time?

### LIVE Mode - Core
- [ ] Update `LIVE_CYCLE_MS` to 60000
- [ ] Add phase timing constants
- [ ] Replace `perceptQueue` with `cycleBuffer` in constructor
- [ ] Implement `loadPlaceholder()` (hardcoded version)
- [ ] Update `start()` to call `loadPlaceholder()`
- [ ] Delete old `liveTick()` logic
- [ ] Implement new `liveTick()`
- [ ] Implement `livePerceptsPhase()`
- [ ] Implement `liveIntegrationPhases()`
- [ ] Update `addPercept()` to use `cycleBuffer`
- [ ] Update `dumpPercepts()` to use `cycleBuffer`

### LIVE Mode - Cognition Refactor
- [ ] Open `src/real-cog.js`
- [ ] Implement `cognizeForBuffer()` function (dual interface)
- [ ] Add timeout logic (60s)
- [ ] Test: Does it capture full result?
- [ ] Implement `startBackgroundCognition()` in consciousness-loop
- [ ] Test: Does background processing work?
- [ ] Test: Does cycle 0 show placeholder?
- [ ] Test: Does cycle 1 show cycle 0 results?

### Testing - Local
- [ ] Test DREAMING mode: 3 full cycles
- [ ] Test LIVE mode: 5 full cycles
- [ ] Verify interleaved buffering works
- [ ] Verify placeholder shows on cycle 0
- [ ] Check console logs are clear
- [ ] Monitor timing accuracy (±1s acceptable)
- [ ] Test percept accumulation during INTEGRATION phase
- [ ] Test mode switching (DREAM ↔ LIVE)

### Testing - Staging
- [ ] Deploy to staging server
- [ ] Run DREAMING mode for 24 hours
- [ ] Run LIVE mode for 24 hours
- [ ] Check for memory leaks
- [ ] Verify event delivery to clients
- [ ] Test with real LLM costs

### Documentation
- [ ] Update README with new timing constants
- [ ] Document `phase` event in DEVELOPER_GUIDE
- [ ] Add migration notes for client teams
- [ ] Document bootstrap placeholder system

### Production Rollout
- [ ] Merge to main
- [ ] Deploy to production
- [ ] Monitor for 48 hours
- [ ] Gather feedback
- [ ] Iterate if needed

---

## Edge Cases & Error Handling

### Scenario 1: LLM Takes >60s

**Problem**: Background cognition doesn't finish before next cycle

**Impact**: `cycleBuffer.ready` is still null when INTEGRATION starts

**Solution**:
```javascript
// In liveIntegrationPhases()
const toDisplay = this.cycleBuffer.ready || this.cycleBuffer.placeholder;

if (!toDisplay) {
  console.warn('⚠️  No mind moment ready! Using placeholder fallback');
  toDisplay = this.cycleBuffer.placeholder;
}
```

Also add timeout to `cognizeForBuffer()`:
```javascript
setTimeout(() => reject(new Error('Cognition timeout')), 60000);
```

### Scenario 2: No Percepts During PERCEPTS Phase

**Problem**: User doesn't send any percepts, queue is empty

**Impact**: `cognize()` receives empty arrays

**Solution**: Already handled by existing `cognize()` logic (skips cycle or uses prior context)

### Scenario 3: Placeholder Fails to Load

**Problem**: Hardcoded placeholder has bug or DB query fails

**Impact**: Cycle 0 crashes

**Solution**:
```javascript
loadPlaceholder() {
  try {
    // ... load logic
  } catch (error) {
    console.error('Failed to load placeholder:', error);
    // Minimal fallback
    this.cycleBuffer.placeholder = {
      cycle: 0,
      mindMoment: "Initializing...",
      sigilPhrase: "Awakening",
      sigilCode: "ctx.fillRect(0,0,512,512);",
      kinetic: "IDLE",
      lighting: { color: [128,128,128], pattern: "SMOOTH_WAVES", speed: 0.5 },
      // ... minimal valid structure
    };
  }
}
```

### Scenario 4: Client Disconnects Mid-Cycle

**Problem**: Client misses phase events

**Impact**: UI out of sync

**Solution**: Emit current phase on client connect (reconnection logic)

```javascript
socket.on('connect', () => {
  // Emit current phase and progress
  socket.emit('phaseStatus', {
    currentPhase: this.getCurrentPhase(),
    elapsedMs: this.getPhaseElapsed(),
    cycleNumber: this.cycleBuffer.current.number
  });
});
```

---

## Files to Modify

### Primary Changes
- `src/consciousness-loop.js` - Complete refactor (400+ lines changed)
- `src/real-cog.js` - Add `cognizeForBuffer()` function (~50 lines added)

### Minor Changes
- `src/cognitive-states.js` - May update state enum (consider removing old states)
- `server.js` - Update cycle status endpoint if needed

### No Changes Required
- `src/sigil/` - Unchanged
- `src/db/` - Unchanged
- `src/providers/` - Unchanged
- Database schema - Unchanged

---

## Rollback Plan

If refactor fails or issues arise:

1. **Branch rollback**: `git checkout main` (work is on branch)
2. **File rollback**: Restore `consciousness-loop.old.js` backup
3. **Redeploy**: Previous version still on main

**No database migrations** = No rollback complexity

---

## Success Criteria

### DREAMING Mode
- [ ] 60s cycle runs stable for 24 hours
- [ ] All 6 phase events fire on schedule
- [ ] Percepts disperse over 35s ±1s
- [ ] Mind moment emits during SIGILIN
- [ ] No crashes or errors
- [ ] Timing feels natural (user feedback)

### LIVE Mode
- [ ] 60s cycle runs stable for 24 hours
- [ ] Interleaved buffering works (N-1 displays during N)
- [ ] Placeholder shows on cycle 0
- [ ] Real results show on cycle 1+
- [ ] Background cognition completes <60s (95% of cycles)
- [ ] Percepts accumulate correctly
- [ ] No memory leaks
- [ ] Client apps receive all events

### Performance
- [ ] LLM pipeline: <20s (95th percentile)
- [ ] Memory usage stable (<500MB growth over 24h)
- [ ] CPU usage acceptable (<50% average)
- [ ] No timeout errors in logs

---

## Timeline

- **Day 1**: DREAMING mode refactor + local testing
- **Day 2**: LIVE mode refactor + real-cog.js changes
- **Day 3**: Integration testing + placeholder system
- **Day 4**: Staging deployment + monitoring
- **Day 5**: Production rollout

**Total**: ~5 days for complete implementation and validation

---

## Next Steps

1. Get approval to proceed
2. Create feature branch
3. Start with DREAMING mode (lower risk)
4. Test thoroughly before moving to LIVE
5. Deploy to staging before production

---

**Status**: Ready for implementation  
**Risk Level**: Medium (significant refactor, but on branch)  
**Estimated Effort**: 5 days  
**Next Action**: Create feature branch and begin DREAMING mode refactor
