# 60-Second Consciousness Cycle - Implementation Plan

**Status**: Planning  
**Created**: Dec 7, 2025  
**Target**: Phase 1 (DREAMING) → Phase 2 (LIVE)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [LLM Processing Pipeline](#llm-processing-pipeline)
4. [Sound Generation System](#sound-generation-system)
5. [Phase 1: DREAMING Mode](#phase-1-dreaming-mode)
6. [Phase 2: LIVE Mode](#phase-2-live-mode)
7. [Database Schema](#database-schema)
8. [Event System](#event-system)
9. [Bootstrap Placeholders](#bootstrap-placeholders)
10. [Implementation Checklist](#implementation-checklist)
11. [Risk Mitigation](#risk-mitigation)
12. [Success Metrics](#success-metrics)

---

## Overview

### Current State
- **DREAMING**: 30s cycles (18s percept dispersal → 2s pause → 2s clear)
- **LIVE**: 5s cycles (immediate cognition and display)
- **No sound generation**
- **No interleaved buffering**

### Target State
- **Both modes**: 60s cycles with 6-phase choreography
- **DREAMING**: Validate timing with historical mind moments
- **LIVE**: Full production with interleaved A/B buffering + sound
- **60-95s reflection latency**: Display cycle N-1 while processing cycle N

### Goals
✅ Natural breathing rhythm (35s perception + 25s integration)  
✅ Complete audiovisual moments (sigil + sound + kinetic + lighting)  
✅ Meditative reflection delay (60-95s = actual memory)  
✅ Graceful bootstrap experience  
✅ Scalable, clean architecture  
✅ Risk-managed rollout

---

## Architecture

### 60-Second Master Cycle

```
┌─ PERCEPTS (35s) ──────────────────────────────────┐
│ • Percepts flow continuously (constant river)     │
│ • Queue accumulating for Cycle N                  │
│ • Display: Percepts being collected              │
│ • Ends at 0:35: Dump queue → cognize()           │
└────────────────────────────────────────────────────┘
         ↓ Background LLM Processing Begins
┌─ INTEGRATION (25s) ───────────────────────────────┐
│ 0:00  SPOOL (2s)      → Systems prepare           │
│ 0:02  SIGILIN (3s)    → Sigil fades in           │
│ 0:05  SIGILHOLD (15s) → Sigil fully present      │
│ 0:20  SIGILOUT (3s)   → Sigil fades out          │
│ 0:23  RESET (2s)      → Breathing room           │
│                                                    │
│ Display: Cycle N-1 mind moment + sigil + sound    │
│ Background: Cycle N LLM processing continues      │
└────────────────────────────────────────────────────┘
         ↓ Loop back to PERCEPTS (cycle complete)
```

### Timeline Example

```
Cycle 0 (Bootstrap):
0:00-0:35   PERCEPTS₀ (collect first real percepts)
0:35        Dump → cognize() starts
0:35-1:00   INTEGRATION₀ (show PLACEHOLDER)
            Background: Processing Cycle 0 (finishes ~0:54)

Cycle 1:
1:00-1:35   PERCEPTS₁ (collect second batch)
1:35        Dump → cognize() starts
1:35-2:00   INTEGRATION₁ (show REAL Cycle 0 🎉)
            Background: Processing Cycle 1

[Steady State Achieved]
Cycle N:
- PERCEPTS phase: Collect Cycle N
- INTEGRATION phase: Display Cycle N-1
- Background: Process Cycle N
```

### Key Insights

**Interleaved A/B Pattern**:
- Show **previous cycle's** results during **current cycle**
- They never meet (N percepts ≠ N sigil)
- First cycle uses placeholder while real processing happens

**Constant River**:
- Percepts flow at all times (both phases)
- Queue accumulates during INTEGRATION
- Only dumped at end of PERCEPTS phase

**Reflection Latency**:
- Percepts collected at 0:00 reflected at 1:35+ (95s old)
- Percepts collected at 0:35 reflected at 1:35+ (60s old)
- This is intentional: consciousness as memory/reflection

---

## LLM Processing Pipeline

### Timeline (19s total budget, fits in 60s cycle)

```
0:35 Percept Dump
     ↓
0:35-0:38 Mind Moment Generation (3s)
     • Provider: Gemini 2.0 Flash Exp
     • Input: Percepts + personality + prior context (3 moments)
     • Output: {
         mindMoment: "...",
         sigilPhrase: "...",
         kinetic: "...",
         lighting: { ... }
       }
     ↓
0:38-0:54 Parallel Processing (16s)
     ├─ Sigil Generation (16s)
     │  • Provider: Anthropic Sonnet 4.5
     │  • Input: sigilPhrase
     │  • Output: sigilCode, PNG, SDF
     │
     └─ Sound Generation (3s)
        • Provider: Gemini 2.0 Flash Exp
        • Input: mindMoment text (from step 1)
        • Output: 11 audio parameters + reasoning
     ↓
0:54 Everything Ready
     • Total: 19s (41s buffer before next cycle)
     • Store in ready buffer for next INTEGRATION phase
```

### Why Separate (Not Merged)?

**Reasons for keeping sound separate**:
1. **Architectural clarity**: Each LLM call has single, focused purpose
2. **Independent tuning**: Can adjust prompts/models independently
3. **Graceful degradation**: If sound fails, mind moment still works
4. **Debugging**: Easier to isolate which component failed
5. **Flexibility**: Can merge later if cost/timing demands it

**Cost Consideration**:
- Separate calls duplicate input tokens (~20-30% more expensive)
- But at Gemini Flash Exp prices ($0.10/1M tokens), difference is negligible
- Clarity and maintainability worth the minimal extra cost

---

## Sound Generation System

### Input
- **Primary**: Mind moment text (e.g., "Awareness begins, patterns stirring in the void.")
- **Context**: Music/texture CSV sample libraries (from database)
- **Prompt**: Active sound prompt from `sound_prompts` table

### Output Structure

**Format**: Key-value pairs with reasoning section

```
REASONING:
Sparse, ethereal tones reflect nascent consciousness. 
Minor scale with slow modulation creates sense of emergence.

SELECTIONS:
music_filename: music_sample_12
texture_filename: texture_sample_7
bass_preset: bass_lfo_gain
bass_speed: 0.3
bass_stability: 0.7
bass_coloration: 0.5
bass_scale: 0.2
melody_speed: 0.6
melody_stability: 0.8
melody_coloration: 0.4
melody_scale: 0.3
```

### 11 Required Fields

| Field | Type | Range | Description |
|-------|------|-------|-------------|
| `music_filename` | string | CSV ref | Music sample from library |
| `texture_filename` | string | CSV ref | Texture sample from library |
| `bass_preset` | enum | 4 options | `bass_lfo_gain`, `bass_delay`, `bass_lfo_filter`, `bass_basic` |
| `bass_speed` | float | 0.0-1.0 | Bass layer speed parameter |
| `bass_stability` | float | 0.0-1.0 | Bass layer stability |
| `bass_coloration` | float | 0.0-1.0 | Bass layer coloration |
| `bass_scale` | float | 0.0-1.0 | Bass scale (0-0.49=minor, 0.5-1.0=major) |
| `melody_speed` | float | 0.0-1.0 | Melody layer speed parameter |
| `melody_stability` | float | 0.0-1.0 | Melody layer stability |
| `melody_coloration` | float | 0.0-1.0 | Melody layer coloration |
| `melody_scale` | float | 0.0-1.0 | Melody scale (0-0.49=minor, 0.5-1.0=major) |

### Validation Rules

**Critical Scale Constraint**:
- If `music_filename` has `scale: major` → `bass_scale` AND `melody_scale` must be ≥ 0.5
- If `music_filename` has `scale: minor` → `bass_scale` AND `melody_scale` must be < 0.5
- Violations logged as errors but don't block (graceful degradation)

**Validation Logic** (from `src/sound/validator.js`):
```javascript
const musicSample = musicSamples.find(s => s.filename === selections.music_filename);
const isMajor = musicSample.scale === 'major';
const bassScale = parseFloat(selections.bass_scale);
const melodyScale = parseFloat(selections.melody_scale);

if (isMajor && (bassScale < 0.5 || melodyScale < 0.5)) {
  errors.push(`Scale mismatch: major music requires scales ≥ 0.5`);
}
```

---

## Phase 1: DREAMING Mode

### Objectives

✅ **Validate timing**: Does 60s cycle feel natural?  
✅ **Enable client development**: New phase events available  
✅ **Zero risk**: No LLM changes, uses existing DB mind moments  
✅ **Gradual rollout**: Feature flag for v1 (30s) vs v2 (60s)

### Changes to `src/consciousness-loop.js`

#### 1. Update Constants

```javascript
// Line 17
const DREAM_CYCLE_MS = parseInt(process.env.DREAM_CYCLE_MS, 10) || 60000; // Was 30000
const PERCEPTS_PHASE_MS = 35000; // New constant
```

#### 2. Add Environment Variable Toggle

```javascript
const DREAM_MODE_VERSION = process.env.DREAM_MODE_VERSION || '2'; // '1' for old, '2' for new

async dreamTick() {
  if (DREAM_MODE_VERSION === '2') {
    await this.dreamTickV2();
  } else {
    await this.dreamTickV1(); // Keep old implementation
  }
}
```

#### 3. Implement `dreamTickV2()`

```javascript
/**
 * DREAM mode V2: 60s cycle with 6-phase choreography
 */
async dreamTickV2() {
  const dream = await this.recallMoment();
  if (!dream) return;
  
  console.log(`💭 Dreaming of cycle ${dream.cycle}: "${dream.sigilPhrase}"`);
  
  // Clear any pending timeouts from previous dream
  this.dreamTimeouts.forEach(t => clearTimeout(t));
  this.dreamTimeouts = [];
  
  // PHASE 1: PERCEPTS (35s) - disperse percepts over extended window
  await this.runPerceptsPhase(dream, PERCEPTS_PHASE_MS);
  
  // PHASE 2: INTEGRATION (25s) - display mind moment and sigil
  await this.runIntegrationPhases(dream);
}
```

#### 4. Implement `runPerceptsPhase()`

```javascript
/**
 * PERCEPTS phase: Disperse percepts chronologically over specified duration
 */
async runPerceptsPhase(dream, durationMs) {
  const cycleStartTime = Date.now();
  
  // Emit phase event
  this.io.emit('phase', {
    phase: 'PERCEPTS',
    startTime: new Date().toISOString(),
    duration: durationMs,
    cycleNumber: dream.cycle,
    isDream: true
  });
  
  // Collect all percepts with type markers
  const allPercepts = [
    ...dream.visualPercepts.map(p => ({ ...p, type: 'visual' })),
    ...dream.audioPercepts.map(p => ({ ...p, type: 'audio' }))
  ].filter(p => p.timestamp);
  
  if (allPercepts.length === 0) {
    console.log('  💭 No percepts in dream');
    return;
  }
  
  // Sort chronologically
  allPercepts.sort((a, b) => 
    new Date(a.timestamp) - new Date(b.timestamp)
  );
  
  // Calculate timing scale
  const firstTimestamp = new Date(allPercepts[0].timestamp).getTime();
  const lastTimestamp = new Date(allPercepts[allPercepts.length - 1].timestamp).getTime();
  const originalDuration = lastTimestamp - firstTimestamp;
  const scaleFactor = originalDuration > 0 ? durationMs / originalDuration : 1;
  
  console.log(`  💭 Replaying ${allPercepts.length} percepts over ${(durationMs / 1000).toFixed(1)}s`);
  console.log(`     Original duration: ${(originalDuration / 1000).toFixed(1)}s, scale: ${scaleFactor.toFixed(2)}x`);
  
  // Emit percepts with scaled timing
  allPercepts.forEach((percept, index) => {
    const perceptTime = new Date(percept.timestamp).getTime();
    const relativeTime = perceptTime - firstTimestamp;
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
      
      // Log percept emission
      if (type === 'visual') {
        console.log(`  💭 [${(scaledTime / 1000).toFixed(1)}s] 👁️  ${data.emoji} ${data.action}`);
      } else {
        const preview = data.transcript 
          ? `"${data.transcript.slice(0, 40)}..."` 
          : data.analysis;
        console.log(`  💭 [${(scaledTime / 1000).toFixed(1)}s] 🎤 ${data.emoji} ${preview}`);
      }
    }, scaledTime);
    
    this.dreamTimeouts.push(timeoutId);
  });
}
```

#### 5. Implement `runIntegrationPhases()`

```javascript
/**
 * INTEGRATION phases: SPOOL → SIGILIN → SIGILHOLD → SIGILOUT → RESET
 */
async runIntegrationPhases(dream) {
  // SPOOL (2s) - Systems prepare
  await this.emitPhaseAndWait('SPOOL', 2000, dream.cycle);
  
  // SIGILIN (3s) - Sigil transition in + emit mind moment/sigil
  await this.emitPhaseAndWait('SIGILIN', 3000, dream.cycle, () => {
    console.log(`  💭 Mind moment + sigil emitted`);
    this.broadcastMoment(dream);
  });
  
  // SIGILHOLD (15s) - Sigil fully visible
  await this.emitPhaseAndWait('SIGILHOLD', 15000, dream.cycle);
  
  // SIGILOUT (3s) - Sigil transition out
  await this.emitPhaseAndWait('SIGILOUT', 3000, dream.cycle);
  
  // RESET (2s) - Breathing room + clear display
  await this.emitPhaseAndWait('RESET', 2000, dream.cycle, () => {
    console.log(`  💭 Clearing display for next dream`);
    this.clearDisplay({
      clearPercepts: true,
      clearMindMoment: true,
      clearSigil: true
    });
  });
}
```

#### 6. Helper: `emitPhaseAndWait()`

```javascript
/**
 * Emit phase event, optionally execute callback, wait for duration
 */
async emitPhaseAndWait(phase, durationMs, cycleNumber, callback = null) {
  const startTime = new Date().toISOString();
  
  this.io.emit('phase', {
    phase,
    startTime,
    duration: durationMs,
    cycleNumber,
    isDream: true
  });
  
  // Execute callback at phase start (if provided)
  if (callback) {
    callback();
  }
  
  // Wait for phase duration
  return new Promise(resolve => {
    const timeoutId = setTimeout(resolve, durationMs);
    this.dreamTimeouts.push(timeoutId);
  });
}
```

### Environment Variables

```bash
# .env updates
DREAM_CYCLE_MS=60000           # New 60s cycle
DREAM_MODE_VERSION=2           # Toggle: '1' for 30s, '2' for 60s
```

### What NOT to Change

- ❌ No LLM pipeline changes
- ❌ No sound generation
- ❌ No interleaved buffering (not needed for replay)
- ❌ No bootstrap system (dreams already have content)
- ✅ Keep existing `broadcastMoment()` unchanged
- ✅ Keep database queries unchanged

### Testing Strategy

1. **Local testing**: Toggle `DREAM_MODE_VERSION=1` vs `2` to compare
2. **Staging deployment**: Deploy with toggle, default to v2
3. **Client integration**: Teams test new `phase` events
4. **Timing validation**: Does 60s feel natural? Too slow?
5. **Stability check**: Run for 24 hours, monitor for errors
6. **Production rollout**: Deploy with v2 as default, keep v1 as fallback

---

## Phase 2: LIVE Mode

### Objectives

✅ **Full 60s cycle**: Production-ready perceiving/cognizing  
✅ **Interleaved buffering**: Show N-1 while processing N  
✅ **Sound integration**: Complete audiovisual moments  
✅ **Bootstrap system**: Polished startup experience  
✅ **Clean architecture**: Maintainable, scalable foundation

### Core Architecture Changes

#### 1. Add Interleaved Buffer System

```javascript
// src/consciousness-loop.js - constructor updates

constructor(io) {
  // ...existing properties
  
  // Replace simple perceptQueue with cycle buffer system
  this.cycleBuffer = {
    current: {
      number: 0,
      percepts: { visual: [], audio: [] },
      dumpedAt: null
    },
    ready: null,        // Completed mind moment ready to display
    placeholder: null,  // Bootstrap moment (cycle 0)
    processing: null    // Promise tracking background cognition
  };
}
```

#### 2. Load Bootstrap Placeholders

```javascript
/**
 * Load startup placeholders on initialization
 */
async loadPlaceholders() {
  try {
    // Option A: Load from JSON file
    const placeholdersPath = path.join(__dirname, 'placeholders', 'startup-moments.json');
    const placeholdersData = fs.readFileSync(placeholdersPath, 'utf8');
    const placeholders = JSON.parse(placeholdersData);
    
    // Pick random placeholder
    this.cycleBuffer.placeholder = placeholders[
      Math.floor(Math.random() * placeholders.length)
    ];
    
    console.log(`🌅 Loaded bootstrap placeholder: "${this.cycleBuffer.placeholder.sigilPhrase}"`);
  } catch (error) {
    console.error('⚠️  Failed to load placeholders:', error.message);
    // Create minimal fallback
    this.cycleBuffer.placeholder = {
      cycleNumber: 0,
      mindMoment: "Consciousness initializing...",
      sigilPhrase: "First breath",
      kinetic: "SLOW_SWAY",
      lighting: { color: [100, 150, 200], pattern: "SMOOTH_WAVES", speed: 0.5 },
      sigilCode: "ctx.fillStyle='#6496C8';ctx.fillRect(0,0,512,512);",
      isDream: false,
      isPlaceholder: true
    };
  }
}
```

#### 3. Refactor `liveTick()`

```javascript
/**
 * LIVE mode: 60s cycle with interleaved A/B buffering
 */
async liveTick() {
  const cycleNumber = this.cycleBuffer.current.number;
  const cycleStartTime = Date.now();
  
  console.log(`🧠 Cycle ${cycleNumber} starting`);
  
  // PHASE 1: PERCEPTS (35s) - accumulate percepts
  await this.runPerceptsPhaseLive(PERCEPTS_PHASE_MS);
  
  // Dump percepts and start background processing
  const percepts = this.dumpPercepts();
  const perceptCount = percepts.visualPercepts.length + percepts.audioPercepts.length;
  
  console.log(`🧠 Cycle ${cycleNumber}: ${perceptCount} percepts dumped, starting cognition`);
  this.startBackgroundCognition(cycleNumber, percepts);
  
  // PHASE 2: INTEGRATION (25s) - display PREVIOUS cycle
  const toDisplay = this.cycleBuffer.ready || this.cycleBuffer.placeholder;
  
  if (!toDisplay) {
    console.warn('⚠️  No mind moment ready to display! Using placeholder fallback.');
    toDisplay = this.cycleBuffer.placeholder;
  }
  
  await this.runIntegrationPhasesLive(toDisplay);
  
  // Advance cycle counter
  this.cycleBuffer.current.number++;
  
  const cycleDuration = Date.now() - cycleStartTime;
  console.log(`🧠 Cycle ${cycleNumber} complete (${(cycleDuration / 1000).toFixed(1)}s)`);
}
```

#### 4. PERCEPTS Phase for LIVE Mode

```javascript
/**
 * PERCEPTS phase for LIVE mode: Display incoming percepts in real-time
 */
async runPerceptsPhaseLive(durationMs) {
  const cycleNumber = this.cycleBuffer.current.number;
  const startTime = Date.now();
  
  // Emit phase event
  this.io.emit('phase', {
    phase: 'PERCEPTS',
    startTime: new Date().toISOString(),
    duration: durationMs,
    cycleNumber,
    isDream: false
  });
  
  console.log(`  🧠 PERCEPTS phase (${durationMs / 1000}s) - accumulating percepts`);
  
  // Wait for phase duration (percepts arrive via WebSocket and queue automatically)
  await new Promise(resolve => setTimeout(resolve, durationMs));
  
  const elapsed = Date.now() - startTime;
  console.log(`  🧠 PERCEPTS phase complete (${(elapsed / 1000).toFixed(1)}s)`);
}
```

#### 5. Background Cognition Pipeline

```javascript
/**
 * Start background LLM processing pipeline (fire and forget)
 */
startBackgroundCognition(cycleNumber, percepts) {
  const processingStartTime = Date.now();
  
  this.cycleBuffer.processing = (async () => {
    try {
      console.log(`  🧠 [Cycle ${cycleNumber}] Starting LLM pipeline...`);
      
      // STEP 1: Mind moment generation (3s)
      const mindMomentStart = Date.now();
      const mindMoment = await cognize(
        percepts.visualPercepts, 
        percepts.audioPercepts, 
        PRIOR_CONTEXT_DEPTH
      );
      const mindMomentDuration = Date.now() - mindMomentStart;
      console.log(`  🧠 [Cycle ${cycleNumber}] Mind moment ready (${(mindMomentDuration / 1000).toFixed(1)}s)`);
      
      // STEP 2: Parallel sound + sigil generation (16s)
      const parallelStart = Date.now();
      const [sound, sigil] = await Promise.all([
        this.generateSound(mindMoment.mindMoment).catch(err => {
          console.error(`  ⚠️  [Cycle ${cycleNumber}] Sound generation failed:`, err.message);
          return null; // Graceful degradation
        }),
        this.generateSigil(mindMoment.sigilPhrase, mindMoment.cycle).catch(err => {
          console.error(`  ⚠️  [Cycle ${cycleNumber}] Sigil generation failed:`, err.message);
          return null; // Graceful degradation
        })
      ]);
      const parallelDuration = Date.now() - parallelStart;
      console.log(`  🧠 [Cycle ${cycleNumber}] Sound + Sigil ready (${(parallelDuration / 1000).toFixed(1)}s)`);
      
      // STEP 3: Store complete package in ready buffer
      this.cycleBuffer.ready = {
        cycleNumber,
        ...mindMoment,
        sound,
        sigil,
        timestamp: new Date().toISOString(),
        isDream: false,
        isPlaceholder: false
      };
      
      const totalDuration = Date.now() - processingStartTime;
      console.log(`  ✅ [Cycle ${cycleNumber}] Complete package ready (${(totalDuration / 1000).toFixed(1)}s total)`);
      
    } catch (error) {
      console.error(`  ❌ [Cycle ${cycleNumber}] Cognition pipeline failed:`, error.message);
      // Keep previous ready buffer or placeholder as fallback
    }
  })();
}
```

#### 6. Sound Generation Method

```javascript
/**
 * Generate sound selections from mind moment text
 */
async generateSound(mindMomentText) {
  const { generateAudioSelections } = await import('./sound/generator.js');
  const { getSoundPrompt, getCSVLibraries } = await import('./db/sound-prompts.js');
  
  try {
    // Load active prompt and CSV libraries from database
    const prompt = await getSoundPrompt();
    const { musicCSV, textureCSV } = await getCSVLibraries();
    
    // Generate audio selections
    const result = await generateAudioSelections({
      input: mindMomentText,
      prompt: prompt.system_prompt,
      llmSettings: prompt.generation_config || {},
      musicCSV,
      textureCSV
    });
    
    if (!result.valid) {
      console.warn('  ⚠️  Sound validation errors:', result.errors);
    }
    
    return {
      selections: result.selections,
      reasoning: result.reasoning,
      musicSample: result.musicSample,
      textureSample: result.textureSample,
      valid: result.valid,
      errors: result.errors,
      duration: result.duration
    };
  } catch (error) {
    console.error('  ❌ Sound generation error:', error.message);
    throw error;
  }
}
```

#### 7. Sigil Generation Method (Wrapper)

```javascript
/**
 * Generate sigil from sigil phrase (wrapper for existing sigil generation)
 */
async generateSigil(sigilPhrase, cycleNumber) {
  // This leverages existing sigil generation in real-cog.js
  // We need to refactor to make it callable directly
  
  const { generateSigil } = await import('./sigil/generator.js');
  
  try {
    const result = await generateSigil(sigilPhrase, cycleNumber);
    return result;
  } catch (error) {
    console.error('  ❌ Sigil generation error:', error.message);
    throw error;
  }
}
```

#### 8. INTEGRATION Phases for LIVE Mode

```javascript
/**
 * INTEGRATION phases for LIVE mode: Display complete mind moment
 */
async runIntegrationPhasesLive(mindMoment) {
  const cycleNumber = mindMoment.cycleNumber;
  
  // SPOOL (2s) - Systems prepare
  await this.emitPhaseAndWaitLive('SPOOL', 2000, cycleNumber);
  
  // SIGILIN (3s) - Sigil transition in + emit mind moment/sigil/sound
  await this.emitPhaseAndWaitLive('SIGILIN', 3000, cycleNumber, () => {
    console.log(`  🧠 Broadcasting Cycle ${cycleNumber} mind moment`);
    this.broadcastMomentLive(mindMoment);
  });
  
  // SIGILHOLD (15s) - Sigil fully visible
  await this.emitPhaseAndWaitLive('SIGILHOLD', 15000, cycleNumber);
  
  // SIGILOUT (3s) - Sigil transition out
  await this.emitPhaseAndWaitLive('SIGILOUT', 3000, cycleNumber);
  
  // RESET (2s) - Breathing room (no clear in LIVE mode, just transitions)
  await this.emitPhaseAndWaitLive('RESET', 2000, cycleNumber);
}
```

#### 9. Helper: `emitPhaseAndWaitLive()`

```javascript
/**
 * Emit phase event for LIVE mode, optionally execute callback, wait
 */
async emitPhaseAndWaitLive(phase, durationMs, cycleNumber, callback = null) {
  const startTime = new Date().toISOString();
  
  this.io.emit('phase', {
    phase,
    startTime,
    duration: durationMs,
    cycleNumber,
    isDream: false
  });
  
  if (callback) {
    callback();
  }
  
  return new Promise(resolve => setTimeout(resolve, durationMs));
}
```

#### 10. Broadcast Mind Moment (LIVE)

```javascript
/**
 * Broadcast complete mind moment package (with sound)
 */
broadcastMomentLive(moment) {
  // Emit mind moment event (existing)
  this.io.emit('mindMoment', {
    cycle: moment.cycleNumber,
    mindMoment: moment.mindMoment,
    sigilPhrase: moment.sigilPhrase,
    kinetic: moment.kinetic,
    lighting: moment.lighting,
    visualPercepts: moment.visualPercepts,
    audioPercepts: moment.audioPercepts,
    priorMoments: moment.priorMoments,
    isDream: false,
    isPlaceholder: moment.isPlaceholder || false,
    timestamp: moment.timestamp
  });
  
  // Emit sigil event (existing)
  if (moment.sigil && moment.sigil.sigilCode) {
    const sigilData = {
      cycle: moment.cycleNumber,
      sigilCode: moment.sigil.sigilCode,
      sigilPhrase: moment.sigilPhrase,
      isDream: false,
      timestamp: moment.timestamp
    };
    
    if (moment.sigil.png) {
      sigilData.png = {
        width: moment.sigil.png.width,
        height: moment.sigil.png.height,
        data: Buffer.from(moment.sigil.png.data).toString('base64')
      };
    }
    
    this.io.emit('sigil', sigilData);
  }
  
  // Emit sound event (NEW)
  if (moment.sound) {
    this.io.emit('sound', {
      cycle: moment.cycleNumber,
      selections: moment.sound.selections,
      reasoning: moment.sound.reasoning,
      musicSample: moment.sound.musicSample,
      textureSample: moment.sound.textureSample,
      valid: moment.sound.valid,
      errors: moment.sound.errors,
      timestamp: moment.timestamp
    });
  }
}
```

#### 11. Update `start()` Method

```javascript
/**
 * Start the consciousness loop in current mode
 */
async start() {
  if (this.intervalId) return;
  
  // Load placeholders if in LIVE mode
  if (this.mode === 'LIVE') {
    await this.loadPlaceholders();
    this.setupLiveListeners();
  }
  
  const intervalMs = this.mode === 'DREAM' ? DREAM_CYCLE_MS : LIVE_CYCLE_MS;
  
  this.intervalId = setInterval(async () => {
    await this.tick();
  }, intervalMs);
  
  this.emitState();
  console.log(`🧠 Consciousness loop started (${this.mode} mode, ${intervalMs}ms)`);
}
```

### New Files Required

#### `src/placeholders/startup-moments.json`

```json
[
  {
    "cycleNumber": 0,
    "mindMoment": "Awareness begins, patterns stirring in the void.",
    "sigilPhrase": "First light emerging",
    "sigilCode": "ctx.fillStyle='#6496C8';ctx.arc(256,256,200,0,Math.PI*2);ctx.fill();",
    "kinetic": "SLOW_SWAY",
    "lighting": {
      "color": [100, 150, 200],
      "pattern": "SMOOTH_WAVES",
      "speed": 0.5
    },
    "sound": {
      "selections": {
        "music_filename": "music_sample_1",
        "texture_filename": "texture_sample_1",
        "bass_preset": "bass_basic",
        "bass_speed": 0.3,
        "bass_stability": 0.7,
        "bass_coloration": 0.5,
        "bass_scale": 0.2,
        "melody_speed": 0.4,
        "melody_stability": 0.8,
        "melody_coloration": 0.3,
        "melody_scale": 0.25
      },
      "reasoning": "Sparse, ethereal tones to reflect nascent consciousness emerging from silence.",
      "valid": true
    },
    "isDream": false,
    "isPlaceholder": true
  }
]
```

**NOTE**: You will provide 5 cycle IDs from production database to populate this file with real, polished moments.

#### `src/db/sound-prompts.js` (Database Interface)

```javascript
import { getPool } from './index.js';

/**
 * Get active sound prompt
 */
export async function getSoundPrompt() {
  const pool = getPool();
  
  const result = await pool.query(`
    SELECT id, slug, name, system_prompt, generation_config
    FROM sound_prompts
    WHERE is_active = true
    LIMIT 1
  `);
  
  if (result.rows.length === 0) {
    throw new Error('No active sound prompt found');
  }
  
  return result.rows[0];
}

/**
 * Get CSV libraries from database
 */
export async function getCSVLibraries() {
  const pool = getPool();
  
  const result = await pool.query(`
    SELECT music_samples_csv, texture_samples_csv
    FROM sound_prompts
    WHERE is_active = true
    LIMIT 1
  `);
  
  if (result.rows.length === 0) {
    throw new Error('No CSV libraries found');
  }
  
  return {
    musicCSV: result.rows[0].music_samples_csv,
    textureCSV: result.rows[0].texture_samples_csv
  };
}
```

### Environment Variables

```bash
# .env updates for Phase 2
COGNITIVE_CYCLE_MS=60000           # Live mode cycle (was 5000)
SOUND_GENERATION_ENABLED=true      # Feature flag for sound pipeline
```

---

## Database Schema

### Migration 020: Add Sound Generation Fields

**File**: `src/db/migrations/020_add_sound_to_mind_moments.sql`

```sql
-- Add sound generation columns to mind_moments
ALTER TABLE mind_moments 
  ADD COLUMN IF NOT EXISTS sound_selections JSONB,
  ADD COLUMN IF NOT EXISTS sound_reasoning TEXT,
  ADD COLUMN IF NOT EXISTS sound_prompt_id UUID REFERENCES sound_prompts(id),
  ADD COLUMN IF NOT EXISTS sound_music_sample VARCHAR(255),
  ADD COLUMN IF NOT EXISTS sound_texture_sample VARCHAR(255),
  ADD COLUMN IF NOT EXISTS sound_valid BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS sound_errors JSONB;

-- Add index for querying by sound validity
CREATE INDEX IF NOT EXISTS idx_mind_moments_sound_valid 
  ON mind_moments(sound_valid) 
  WHERE sound_selections IS NOT NULL;

-- Add comment
COMMENT ON COLUMN mind_moments.sound_selections IS 
  'Audio parameter selections (11 fields: music, texture, bass/melody params)';
COMMENT ON COLUMN mind_moments.sound_reasoning IS 
  'LLM reasoning for sound choices (2-3 sentences)';
```

### Persist Sound Data in `real-cog.js`

Update `src/real-cog.js` to save sound data when persisting mind moments:

```javascript
// In saveMindMoment() or equivalent function
async function saveMindMoment(cycle, mindMoment, sigil, sound) {
  const pool = getPool();
  
  await pool.query(`
    INSERT INTO mind_moments (
      cycle, mind_moment, sigil_phrase, sigil_code,
      kinetic, lighting,
      sound_selections, sound_reasoning, sound_prompt_id,
      sound_music_sample, sound_texture_sample,
      sound_valid, sound_errors,
      ...
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11, $12, $13,
      ...
    )
  `, [
    cycle, mindMoment.mindMoment, sigil.sigilPhrase, sigil.sigilCode,
    mindMoment.kinetic, mindMoment.lighting,
    sound.selections, sound.reasoning, sound.promptId,
    sound.musicSample?.filename, sound.textureSample?.filename,
    sound.valid, sound.errors,
    ...
  ]);
}
```

---

## Event System

### New Event: `phase`

Emitted at the start of each phase to signal choreography to clients.

```javascript
socket.emit('phase', {
  phase: 'PERCEPTS' | 'SPOOL' | 'SIGILIN' | 'SIGILHOLD' | 'SIGILOUT' | 'RESET',
  startTime: '2025-12-07T15:30:45.123Z',  // ISO timestamp
  duration: 35000,                          // milliseconds
  cycleNumber: 42,                          // Current cycle
  isDream: false                            // true for DREAMING, false for LIVE
});
```

**Usage by Clients**:
- **PERCEPTS**: Show percepts flowing in, prepare for cognition
- **SPOOL**: Audio/visual systems spool up, prepare for sigil
- **SIGILIN**: Begin sigil fade-in transition (3s)
- **SIGILHOLD**: Sigil fully visible, maintain display (15s)
- **SIGILOUT**: Begin sigil fade-out transition (3s)
- **RESET**: Breathing room, prepare for next cycle

### New Event: `sound`

Emitted during `SIGILIN` phase alongside `mindMoment` and `sigil`.

```javascript
socket.emit('sound', {
  cycle: 42,
  selections: {
    music_filename: 'music_sample_12',
    texture_filename: 'texture_sample_7',
    bass_preset: 'bass_lfo_gain',
    bass_speed: 0.3,
    bass_stability: 0.7,
    bass_coloration: 0.5,
    bass_scale: 0.2,
    melody_speed: 0.6,
    melody_stability: 0.8,
    melody_coloration: 0.4,
    melody_scale: 0.3
  },
  reasoning: 'Sparse tones reflect nascent consciousness...',
  musicSample: {
    filename: 'music_sample_12',
    description: 'Ethereal pad with gentle movement',
    tone: 'warm',
    density: 'sparse',
    mood: 'soothing',
    scale: 'minor',
    rhythm: 'arhythmic'
  },
  textureSample: {
    filename: 'texture_sample_7',
    description: 'Ocean waves on a rocky shore',
    tone: 'cool',
    density: 'moderate',
    mood: 'soothing',
    category: 'Nature'
  },
  valid: true,
  errors: [],
  timestamp: '2025-12-07T15:30:45.123Z'
});
```

### Existing Events (Unchanged)

These continue to work as before for backwards compatibility:

- `perceptReceived` - Emitted during PERCEPTS phase
- `mindMoment` - Emitted at SIGILIN phase start
- `sigil` - Emitted at SIGILIN phase start
- `cognitiveState` - State machine updates (may be revised)
- `cycleStarted` / `cycleCompleted` - May be deprecated

---

## Bootstrap Placeholders

### Strategy

**Phase 1 (DREAMING)**: Not needed, uses historical mind moments  
**Phase 2 (LIVE)**: Required for cycle 0 display while first real cycle processes

### Implementation

#### 1. Export Selected Mind Moments from Database

Run this script to export 5 polished cycles:

**File**: `scripts/export-placeholders.js`

```javascript
import { getPool } from '../src/db/index.js';
import fs from 'fs';
import path from 'path';

const SELECTED_CYCLES = [48, 84, 138, 219, 284]; // User-provided cycle IDs

async function exportPlaceholders() {
  const pool = getPool();
  
  const result = await pool.query(`
    SELECT 
      cycle, mind_moment, sigil_phrase, sigil_code,
      kinetic, lighting,
      sigil_png_data, sigil_png_width, sigil_png_height
    FROM mind_moments
    WHERE cycle = ANY($1)
    ORDER BY cycle
  `, [SELECTED_CYCLES]);
  
  const placeholders = result.rows.map((row, index) => ({
    cycleNumber: 0, // All become cycle 0 (placeholder)
    originalCycle: row.cycle,
    mindMoment: row.mind_moment,
    sigilPhrase: row.sigil_phrase,
    sigilCode: row.sigil_code,
    kinetic: row.kinetic,
    lighting: row.lighting,
    sound: {
      // Default sound selections (can be customized)
      selections: {
        music_filename: 'music_sample_1',
        texture_filename: 'texture_sample_1',
        bass_preset: 'bass_basic',
        bass_speed: 0.3,
        bass_stability: 0.7,
        bass_coloration: 0.5,
        bass_scale: 0.2,
        melody_speed: 0.4,
        melody_stability: 0.8,
        melody_coloration: 0.3,
        melody_scale: 0.25
      },
      reasoning: 'Placeholder sound selections for bootstrap cycle.',
      valid: true
    },
    isDream: false,
    isPlaceholder: true
  }));
  
  // Write to JSON file
  const outputPath = path.join(process.cwd(), 'src', 'placeholders', 'startup-moments.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(placeholders, null, 2));
  
  console.log(`✅ Exported ${placeholders.length} placeholders to ${outputPath}`);
  
  await pool.end();
}

exportPlaceholders();
```

#### 2. Run Export

```bash
node scripts/export-placeholders.js
```

#### 3. Customize Sound Selections (Optional)

Manually edit `src/placeholders/startup-moments.json` to fine-tune sound parameters for each placeholder.

---

## Implementation Checklist

### Phase 1: DREAMING Mode (2-3 Days)

#### Code Changes
- [ ] Update `DREAM_CYCLE_MS` constant to 60000
- [ ] Add `DREAM_MODE_VERSION` env var toggle
- [ ] Add `PERCEPTS_PHASE_MS` constant (35000)
- [ ] Implement `dreamTickV2()` method
- [ ] Implement `runPerceptsPhase()` method
- [ ] Implement `runIntegrationPhases()` method
- [ ] Implement `emitPhaseAndWait()` helper
- [ ] Keep `dreamTickV1()` as fallback (rename existing)
- [ ] Add toggle logic in `dreamTick()`

#### Testing
- [ ] Local testing with both v1 and v2
- [ ] Verify percepts disperse over 35s
- [ ] Verify all 6 phases emit correctly
- [ ] Verify mind moment displays at SIGILIN
- [ ] Verify clear happens at RESET
- [ ] Check console logs are clear and helpful

#### Documentation
- [ ] Update README with new timing constants
- [ ] Update DEVELOPER_GUIDE with phase event details
- [ ] Add migration notes for client teams

#### Deployment
- [ ] Deploy to staging with `DREAM_MODE_VERSION=2`
- [ ] Client teams integrate new `phase` events
- [ ] Run for 24 hours, monitor logs
- [ ] Gather feedback on timing
- [ ] Deploy to production with toggle
- [ ] Monitor for 48 hours

### Phase 2: LIVE Mode (1-2 Weeks)

#### Bootstrap System
- [ ] Create `src/placeholders/` directory
- [ ] Write `scripts/export-placeholders.js`
- [ ] Get 5 cycle IDs from user for export
- [ ] Run export script
- [ ] Manually customize sound selections
- [ ] Test placeholder loading in `loadPlaceholders()`

#### Code Changes - Core
- [ ] Add `cycleBuffer` system to constructor
- [ ] Implement `loadPlaceholders()` method
- [ ] Refactor `liveTick()` for 60s cycle
- [ ] Implement `runPerceptsPhaseLive()` method
- [ ] Implement `runIntegrationPhasesLive()` method
- [ ] Implement `emitPhaseAndWaitLive()` helper
- [ ] Add `startBackgroundCognition()` method
- [ ] Update `start()` to call `loadPlaceholders()`

#### Code Changes - Sound
- [ ] Create `src/db/sound-prompts.js` (DB interface)
- [ ] Adapt `src/sound/generator.js` from web editor
- [ ] Implement `generateSound()` method in consciousness-loop
- [ ] Implement `generateSigil()` wrapper method
- [ ] Add parallel Promise.all execution
- [ ] Add error handling and graceful degradation
- [ ] Implement `broadcastMomentLive()` with sound event

#### Database
- [ ] Write migration 020 SQL script
- [ ] Test migration on local database
- [ ] Test migration on staging database
- [ ] Update `real-cog.js` to persist sound data
- [ ] Test sound data persists correctly

#### Testing - Local
- [ ] Test bootstrap placeholder loads
- [ ] Test cycle 0 shows placeholder
- [ ] Test cycle 1 shows real moment
- [ ] Test LLM pipeline completes in <60s
- [ ] Test sound generation works
- [ ] Test sigil generation works
- [ ] Test parallel execution
- [ ] Test error handling (LLM fails)
- [ ] Test graceful degradation (sound fails)

#### Testing - Staging
- [ ] Deploy to staging
- [ ] Test with real LLMs (cost implications)
- [ ] Monitor timing (does it complete in 19s?)
- [ ] Test multiple cycles in sequence
- [ ] Test interleaved buffering works
- [ ] Verify sound validation
- [ ] Check database persistence
- [ ] Run for 24 hours, monitor logs

#### Documentation
- [ ] Update README with new cycle timing
- [ ] Update DEVELOPER_GUIDE with sound system
- [ ] Document new `sound` event
- [ ] Document `phase` event details
- [ ] Add troubleshooting guide

#### Deployment
- [ ] Deploy to production
- [ ] Monitor LLM costs closely
- [ ] Monitor timing metrics
- [ ] Gather user feedback
- [ ] Monitor for 1 week
- [ ] Iterate based on feedback

---

## Risk Mitigation

### Risk 1: LLMs Don't Finish in Time

**Scenario**: LLM pipeline takes >60s, causes cycle desync

**Impact**: HIGH - Breaks entire cycle choreography

**Mitigation**:
- Add 60s timeout to `startBackgroundCognition()`
- If timeout, log error and keep previous `ready` buffer
- Monitor LLM timing metrics in production
- Alert if >45s (warning threshold)

**Code**:
```javascript
this.cycleBuffer.processing = Promise.race([
  cognitionPipeline(),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('LLM timeout')), 60000)
  )
]).catch(err => {
  console.error('LLM pipeline timeout or failure:', err);
  // Keep previous ready buffer as fallback
});
```

### Risk 2: Sound Generation Fails

**Scenario**: Sound LLM call fails or validation errors

**Impact**: MEDIUM - Mind moment works, but no sound

**Mitigation**:
- Make sound optional (graceful degradation)
- Log warning but continue
- Emit `sound` event with `valid: false` and error details
- Client can handle missing sound gracefully

**Code**:
```javascript
const sound = await this.generateSound(...).catch(err => {
  console.warn('Sound generation failed, continuing without sound:', err);
  return null;
});

// Later in broadcast
if (moment.sound) {
  this.io.emit('sound', { ... });
}
```

### Risk 3: 60s Feels Too Slow

**Scenario**: Users find 60s cycle too slow, want faster updates

**Impact**: MEDIUM - UX issue, may need redesign

**Mitigation**:
- Phase 1 validates timing before committing to full refactor
- Add env var to adjust cycle time dynamically
- Consider 45s cycle as alternative (25s percepts + 20s integration)
- Gather feedback early and often

### Risk 4: Clients Break on New Events

**Scenario**: New `phase` events cause existing clients to error

**Impact**: LOW-MEDIUM - Client app breakage

**Mitigation**:
- Supplement existing events, don't replace
- Keep `mindMoment`, `sigil`, `perceptReceived` unchanged
- Add `phase` as new optional event
- Document migration guide for client teams
- Version API if needed

### Risk 5: Bootstrap Feels Janky

**Scenario**: First placeholder moment feels artificial or low-quality

**Impact**: LOW - First impression issue

**Mitigation**:
- Export 5 hand-picked polished moments
- Customize sound selections manually
- Rotate through placeholders (not always same one)
- Make bootstrap moments feel intentional, like "awakening"

### Risk 6: Memory Leak from Buffers

**Scenario**: `cycleBuffer.ready` accumulates old data over time

**Impact**: MEDIUM - Server memory grows, eventual crash

**Mitigation**:
- Clear old buffers after display
- Add memory monitoring
- Test long-running sessions (24+ hours)
- Add memory usage logging

**Code**:
```javascript
// After INTEGRATION phases complete
this.cycleBuffer.ready = null; // Clear old moment
```

### Risk 7: Database Migration Fails

**Scenario**: Migration 020 fails in production

**Impact**: HIGH - Downtime, rollback required

**Mitigation**:
- Test on local database first
- Test on staging database replica
- Run migration during low-traffic window
- Have rollback script ready
- Use `IF NOT EXISTS` for safety

**Rollback Script**:
```sql
-- 020_rollback.sql
ALTER TABLE mind_moments 
  DROP COLUMN IF EXISTS sound_selections,
  DROP COLUMN IF EXISTS sound_reasoning,
  DROP COLUMN IF EXISTS sound_prompt_id,
  DROP COLUMN IF EXISTS sound_music_sample,
  DROP COLUMN IF EXISTS sound_texture_sample,
  DROP COLUMN IF EXISTS sound_valid,
  DROP COLUMN IF EXISTS sound_errors;
```

---

## Success Metrics

### Phase 1: DREAMING Mode

**Stability**:
- [ ] 60s cycle runs stable for 24+ hours
- [ ] Zero uncaught errors in logs
- [ ] No client-reported breakage

**Timing Accuracy**:
- [ ] Percepts disperse over 35s ±1s
- [ ] Each phase duration within ±100ms
- [ ] Mind moment emits at 20s mark ±200ms
- [ ] Clear emits at 28s mark ±200ms

**Event Delivery**:
- [ ] All 6 `phase` events fire per cycle
- [ ] Existing events (`mindMoment`, `sigil`) unaffected
- [ ] Client apps receive all events in order

**User Feedback**:
- [ ] Timing feels natural (survey client teams)
- [ ] No reports of "too slow" or "too fast"
- [ ] Visual flow feels choreographed

### Phase 2: LIVE Mode

**LLM Pipeline Performance**:
- [ ] Mind moment generation: 2-5s (95th percentile)
- [ ] Sigil generation: 14-18s (95th percentile)
- [ ] Sound generation: 2-4s (95th percentile)
- [ ] Total pipeline: <20s (95th percentile)
- [ ] Pipeline completes before next cycle: >95% success rate

**Sound Generation Quality**:
- [ ] Validation passes: >90% of cycles
- [ ] Scale constraint violations: <10%
- [ ] CSV reference errors: <5%
- [ ] Client-side sound plays successfully: >95%

**Interleaved Buffering**:
- [ ] Bootstrap placeholder shows on cycle 0: 100%
- [ ] Cycle 1 shows real moment from cycle 0: 100%
- [ ] No "moment missing" warnings after bootstrap
- [ ] Memory usage stable over 24+ hours (<500MB growth)

**Database Persistence**:
- [ ] Sound data saves to database: 100% when valid
- [ ] No database errors in logs
- [ ] Query performance unaffected (<100ms queries)

**Cost Management**:
- [ ] Gemini costs: <$0.50 per 100 cycles
- [ ] Anthropic costs: <$2.00 per 100 cycles
- [ ] Total LLM costs: <$2.50 per 100 cycles
- [ ] No unexpected cost spikes

**User Experience**:
- [ ] 60-95s latency acceptable (user feedback)
- [ ] Complete audiovisual moments feel cohesive
- [ ] Bootstrap feels natural, not janky
- [ ] No reports of desync or missing data

**Stability**:
- [ ] System runs for 7+ days without restart
- [ ] Error rate: <1% of cycles
- [ ] Graceful degradation on failures: 100%
- [ ] No memory leaks detected

---

## Next Steps

1. **User Confirmation**: Confirm 5 cycle IDs for bootstrap placeholders
2. **Phase 1 Development**: Implement DREAMING mode V2
3. **Phase 1 Testing**: Deploy to staging, validate timing
4. **Client Team Coordination**: Communicate new event system
5. **Phase 2 Development**: Implement LIVE mode with full pipeline
6. **Cost Monitoring**: Set up LLM cost alerts
7. **Production Rollout**: Gradual deployment with monitoring

---

**Status**: Ready for implementation  
**Estimated Timeline**: Phase 1 (3 days) + Phase 2 (2 weeks)  
**Next Action**: Get user approval to proceed with Phase 1
