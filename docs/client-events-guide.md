# Client Events Guide - What Clients Should Listen For

## TL;DR - The Two Events That Matter

**For rendering clients (Unity, web apps):**
- Listen to `mindMoment` at SPOOL (35s) - get everything in one payload
- Listen to `phase` for timing/display triggers

**For monitoring clients (dashboard):**
- Listen to `mindMomentInit` (~37s) - get mind moment text ASAP
- Optional: Listen to `mindMoment` at SPOOL (next cycle) for complete data

---

## The Two-Event Model

**Everything is ready by SPOOL (35s)** - that's when the complete moment gets broadcast.
**SIGILIN (37s)** is when you should start displaying/animating the content.

The `mindMoment` event at SPOOL is **fully hydrated** with:
- ✅ Mind moment text
- ✅ Sigil phrase
- ✅ **Sigil draw code** (canvas code)
- ✅ **Sigil PNG** (base64 image)
- ✅ **Sigil SDF** (optional, for advanced rendering)
- ✅ Kinetic state
- ✅ Lighting state
- ✅ Visual percepts
- ✅ Audio percepts
- ✅ **Sound brief** (music + texture selections)
- ✅ Prior moments context

---

## Primary Client Events

### 1. `mindMoment` - **THE BIG ONE** 🎯

**When**: SPOOL phase (35s into 60s cycle)
**Why**: Fully hydrated, complete moment ready for preloading/display
**Frequency**: Once per 60s cycle
**Modes**: Both LIVE and DREAM

```javascript
socket.on('mindMoment', (data) => {
  // data contains EVERYTHING:
  {
    cycle: 123,
    mindMoment: "UNI observes...",
    sigilPhrase: "ethereal presence",
    
    // ✅ SIGIL DATA (complete, ready to render)
    sigilCode: "ctx.beginPath()...",
    sigilPNG: {
      width: 512,
      height: 512,
      data: "base64..."  // ready for <img> or canvas
    },
    sigilSDF: {  // optional, for advanced rendering
      width: 512,
      height: 512,
      data: "base64..."
    },
    
    kinetic: { pattern: "gentle", intensity: 0.3 },
    lighting: { color: "#4a90e2", pattern: "pulse", speed: 0.5 },
    visualPercepts: [...],
    audioPercepts: [...],
    priorMoments: [...],
    
    soundBrief: {
      selections: {
        music_filename: "music_sample_42",
        texture_filename: "texture_sample_17",
        music_volume: 0.7,
        texture_volume: 0.3,
        crossfade_duration: 2.0,
        preset_name: "ambient-reflection"
      },
      music_sample: { key: "C", scale: "major", ... },
      texture_sample: { character: "soft", ... },
      reasoning: "Calm visitor presence suggests..."
    },
    
    isDream: false,
    timestamp: "2025-12-08T..."
  }
  
  // Preload everything during SPOOL window
  preloadAudio(data.soundBrief.selections.music_filename);
  prepareSigil(data.sigilCode, data.sigilPNG);
});
```

**Purpose**: This is the complete "cognitive moment" ready for any client to render. All parts (mind moment, sigil, sound brief, images) are included in one atomic payload.

---

### 1b. `mindMomentInit` - **EARLY NOTIFICATION** 📡

**When**: Immediately when LLM completes (~37s after percepts dump, during previous cycle)
**Why**: Dashboard gets mind moment text ASAP, before sigil/sound generation
**Frequency**: Once per cycle
**Modes**: LIVE only (not in DREAM mode)

```javascript
socket.on('mindMomentInit', (data) => {
  // Lightweight early notification:
  {
    cycle: 123,
    mindMoment: "UNI observes...",
    sigilPhrase: "ethereal presence",
    kinetic: { pattern: "gentle", intensity: 0.3 },
    lighting: { color: "#4a90e2", pattern: "pulse", speed: 0.5 },
    visualPercepts: [...],      // shallow, no PNGs
    audioPercepts: [...],       // shallow
    priorMoments: [...],
    timestamp: "2025-12-08T...",
    
    // Status indicators
    status: {
      sigilReady: false,        // sigil still generating
      soundBriefReady: false    // sound brief still generating
    }
  }
  
  // Show text immediately
  displayMindMomentText(data.mindMoment);
  showLoadingIndicators(data.status);
});
```

**Purpose**: Gives monitoring tools (dashboard) immediate feedback when LLM completes, without waiting for sigil/sound generation. Rendering clients can ignore this event.

**Who should use this:**
- ✅ Dashboard / monitoring tools (want early feedback)
- ❌ Rendering clients (wait for complete `mindMoment` instead)

---

### 2. `phase` - Timing & State Display

**When**: Every phase transition (6 times per cycle)
**Why**: Track consciousness state and coordinate timing
**Frequency**: 6x per 60s cycle

```javascript
socket.on('phase', ({ phase, mode, nextPhase, duration, cycleNumber, isDream }) => {
  // Phases: PERCEPTS → SPOOL → SIGILIN → SIGILHOLD → SIGILOUT → RESET
  // Mode: 'LIVE' or 'DREAM'
  
  // Update state display
  displayMode(mode);                    // "LIVE" or "DREAM"
  displayPhase(phase);                  // "PERCEPTS", "SPOOL", etc.
  displayNextPhase(nextPhase, duration); // "SPOOL (12s)"
  
  switch(phase) {
    case 'SPOOL':
      // mindMoment event fires at SPOOL with full data
      // Use the 2-second SPOOL window to preload resources
      break;
      
    case 'SIGILIN':
      // Now display the content you preloaded during SPOOL
      displayMindMoment();
      break;
      
    default:
      // Show phase indicator for UX
      displayCurrentPhase(phase);
      startPhaseCountdown(duration);
  }
});
```

**Purpose**: 
- **State display**: Mode + Phase = complete consciousness state
- **Next phase countdown**: Show "Next: SPOOL (12s)" countdown
- **SPOOL phase** is when `mindMoment` broadcasts with full data
- **SIGILIN phase** is when you should start displaying/animating
- Other phases provide visual feedback and timing coordination
- Makes the system's breathing rhythm visible to users

**Recommended Display**:
```
Mode: LIVE | Phase: PERCEPTS | Next: SPOOL (12s)
Mode: DREAM | Phase: SIGILHOLD | Next: SIGILOUT (8s)
```

---

### 3. `perceptReceived` - Optional Live Percepts Display

**When**: As percepts arrive (0-35s PERCEPTS phase)
**Why**: Show "UNI is observing X" in real-time
**Frequency**: Variable (0-20+ per cycle)

```javascript
socket.on('perceptReceived', (percept) => {
  if (percept.type === 'visual') {
    // Show: "👁️ visitor_arrival"
  } else if (percept.type === 'audio') {
    // Show: "🎤 'hello there'"
  }
  
  // Optional: accumulate for display
});
```

**Purpose**: Gives users something to watch during the 35s PERCEPTS phase. Shows what UNI is "seeing/hearing" before cognition.

---

### 4. `cycleStatus` - Initial State Sync

**When**: Immediately on connection
**Why**: Get current phase and remaining time when joining mid-cycle
**Frequency**: Once on connection, or on request via `getCycleStatus` emit

```javascript
socket.on('cycleStatus', (status) => {
  // status contains:
  {
    isRunning: true,
    mode: 'LIVE',                // LIVE or DREAM
    phase: 'SIGILHOLD',          // Current phase
    phaseStartTime: 1234567890,  // Timestamp when phase started
    phaseDuration: 15000,        // Total phase duration (ms)
    msRemainingInPhase: 8234,    // Time left in current phase (ms)
    intervalMs: 60000            // Total cycle duration
  }
  
  // Start countdown with remaining time
  if (status.msRemainingInPhase > 0) {
    startCountdownAt(status.phaseDuration, status.msRemainingInPhase);
  }
});
```

**Purpose**: Allows clients to sync immediately when connecting mid-cycle, showing accurate phase and countdown instead of waiting for next phase transition.

---

### 5. `cognitiveState` - ⚠️ DEPRECATED

**⚠️ This event is deprecated. Use `phase` event instead.**

**When**: State transitions (less frequent)
**Why**: Legacy state tracking
**Frequency**: Variable

```javascript
// DEPRECATED - use phase event instead
socket.on('cognitiveState', ({ state }) => {
  // States: IDLE, AGGREGATING, COGNIZING, VISUALIZING, DREAMING
  
  // Migration:
  // - DREAMING → use phase.mode === 'DREAM'
  // - AGGREGATING → use phase.mode === 'LIVE' && phase.phase === 'PERCEPTS'
  // - COGNIZING/VISUALIZING → background processing, not needed for UI
});
```

**Migration**: Use the `phase` event's `mode` and `phase` fields:

```javascript
socket.on('phase', ({ mode, phase }) => {
  // Old: state === 'DREAMING'
  // New: mode === 'DREAM'
  
  // Old: state === 'AGGREGATING'
  // New: mode === 'LIVE' && phase === 'PERCEPTS'
  
  // Display: `Mode: ${mode} | Phase: ${phase}`
});
```

**Why deprecated**: The phase system provides more accurate, deterministic state. The old states mixed operational mode (LIVE/DREAM) with internal processing stages that don't need UI exposure.

---

## Secondary Events

### `sigil` - **DEPRECATED** ⚠️

**Status**: This event is deprecated. Use `mindMoment` instead which includes all sigil data.

**Why it exists**: Legacy from before unified broadcasting.
**Should you use it?**: No, use `mindMoment` instead.

The sigil data (code, phrase, PNG, SDF) is already included in the `mindMoment` event. This separate event is fired at the same time (SPOOL) but is redundant for all clients.

```javascript
// ❌ Don't do this (redundant):
socket.on('sigil', (data) => {
  displaySigil(data.sigilCode);
});

// ✅ Do this instead:
socket.on('mindMoment', (data) => {
  displaySigil(data.sigilCode, data.sigilPNG);
});
```

**Backward compatibility**: This event is kept for existing clients but will be removed in a future version.

---

### `cycleStarted` - Internal Timing Event

Marks the start of background cognition. Clients don't usually need this unless building advanced monitoring tools.

### `sessionsUpdate` - Connection Tracking

Shows how many clients are connected. Purely informational.

---

## The Magic: Interleaved A/B Buffer & SPOOL

**Why is everything ready by SPOOL?**

The system uses an **interleaved buffer pattern**:

```
Cycle 99: PERCEPTS END (@ 35s)
  └─> Dump percepts, start background for Cycle 100
      ├─> Mind moment LLM (~2s)
      ├─> Sigil generation (~2s)
      └─> Sound brief (~2s)
      Total: ~6-8s → stored in cycleBuffer.ready

Cycle 100: SPOOL (@ 35s = 60s later)
  └─> 🎯 Cycle 100 is READY in buffer!
      ✅ All data prepared during Cycle 99's background
      ✅ Time to "spool" (load) the complete moment

Cycle 100: SIGILIN (@ 37s)
  └─> broadcastMoment() broadcasts Cycle 100
      ✅ Fully hydrated with everything!
      ✅ mindMoment event fires with complete data

Cycle 101: SPOOL (@ 95s)
  └─> 🎯 Cycle 101 is READY in buffer!
      ✅ Prepared during Cycle 100's background @ 35s
```

**Key Insight**: By the time SPOOL fires (35s), all the generative work from the PREVIOUS cycle (LLM, sigil, sound) is complete and sitting in `cycleBuffer.ready`. 

**SPOOL (35-37s)** = Load/prepare phase - systems fetch from buffer
**SIGILIN (37-40s)** = Display/broadcast phase - clients receive and render

The 2-second SPOOL window gives systems time to load resources before display.

---

## Practical Client Implementation

### Minimal Client (Just the Essentials)

```javascript
const socket = io('http://localhost:3456');

// That's it! Just listen for mind moments.
socket.on('mindMoment', (data) => {
  document.querySelector('.mind-moment').textContent = data.mindMoment;
  document.querySelector('.sigil-phrase').textContent = data.sigilPhrase;
  
  // Render sigil canvas
  if (data.sigilCode) {
    const canvas = document.querySelector('.sigil-canvas');
    const ctx = canvas.getContext('2d');
    eval(data.sigilCode); // (yes, eval - it's generative art!)
  }
  
  // Display sound brief
  if (data.soundBrief) {
    document.querySelector('.music').textContent = 
      data.soundBrief.selections.music_filename;
    document.querySelector('.texture').textContent = 
      data.soundBrief.selections.texture_filename;
  }
});
```

### Full Client (All the Bells and Whistles)

```javascript
const socket = io('http://localhost:3456');

let currentMoment = null;

// Early notification (optional, for monitoring)
socket.on('mindMomentInit', (data) => {
  console.log(`Mind moment ${data.cycle} ready:`, data.mindMoment);
});

// The main event (complete moment) - fires at SPOOL
socket.on('mindMoment', (data) => {
  currentMoment = data;
  
  // Preload resources immediately
  preloadAudio(data.soundBrief.selections.music_filename);
  preloadAudio(data.soundBrief.selections.texture_filename);
  prepareSigilCanvas(data.sigilCode);
  
  // Could also preload PNG as image
  if (data.sigilPNG) {
    preloadImage(`data:image/png;base64,${data.sigilPNG.data}`);
  }
});

// Phase tracking (UI candy + display trigger)
socket.on('phase', ({ phase, mode, duration }) => {
  showPhaseIndicator(phase, mode);
  startCountdown(duration);
  
  if (phase === 'SIGILIN' && currentMoment) {
    // Now display the content we preloaded during SPOOL
    renderCompleteMoment(currentMoment);
  }
});

// Live percepts (shows what UNI sees during PERCEPTS phase)
socket.on('perceptReceived', (percept) => {
  addPerceptToFeed(percept);
});
```

---

## DREAM Mode vs LIVE Mode

From a client perspective, **there's no difference!**

Both modes emit the same `mindMoment` event at SIGILIN with the same complete data structure. The only difference:

```javascript
socket.on('mindMoment', (data) => {
  if (data.isDream) {
    // This is a historical moment being replayed
    showDreamBadge();
  } else {
    // This is a fresh moment from live percepts
    showLiveBadge();
  }
  
  // Either way, render it the same!
  renderMoment(data);
});
```

---

## Summary

**For rendering clients (Unity, web apps):**

```javascript
socket.on('mindMoment', (data) => {
  // Everything you need is here in one payload!
  // - Mind moment text
  // - Sigil code + PNG + SDF
  // - Sound brief with file selections
  // - Percepts, kinetic, lighting, context
  
  // Preload resources immediately (during SPOOL window)
  preloadAudio(data.soundBrief.selections.music_filename);
  preloadAudio(data.soundBrief.selections.texture_filename);
});

socket.on('phase', ({ phase }) => {
  if (phase === 'SIGILIN') {
    displayPreloadedContent();
  }
});
```

**For monitoring clients (dashboard):**

```javascript
// Get early feedback
socket.on('mindMomentInit', (data) => {
  displayMindMomentText(data.mindMoment);
  showLoadingIndicators(data.status);
});

// Optional: show complete data when ready
socket.on('mindMoment', (data) => {
  updateToFullDisplay(data);
});
```

**At SPOOL (35s), mindMoment fires with complete payload** ✅  
**At SIGILIN (37s), you display it** ✅

The other events (`perceptReceived`, `cognitiveState`, `sigil`) are optional or deprecated.

---

## Timing Reference

```
Cycle N: 
0s    PERCEPTS START    (percepts accumulate)
      ↓ perceptReceived events fire as they arrive
      
35s   PERCEPTS END      (dump percepts → background for Cycle N+1 starts)
      ↓ Background: LLM + Sigil + Sound (~6-8s for Cycle N+1)
      
35s   SPOOL            ← 🎯 mindMoment event fires HERE!
      ↓                   Cycle N data is READY (prepared during Cycle N-1)
      ↓                   Clients receive complete moment
      ↓                   Preload audio, prepare canvases (2s window)
      
37s   SIGILIN          ← 🎯 Display phase begins
      ↓                   Clients render the preloaded content
      ↓                   Smooth display (resources already loaded)
      
40s   SIGILHOLD        (display continues)
      
55s   SIGILOUT         (fade out)
      
58s   RESET            (prepare for next cycle)
      
60s   CYCLE RESTART    (back to 0s, now showing Cycle N+1)

Cycle N+1: SPOOL (@ 35s)
      ↓ mindMoment fires with Cycle N+1 data
      ↓ Cycle N+1 was prepared during Cycle N's background @ 35s mark
```

**Key Timing Points**:
- **35s (SPOOL)**: mindMoment event fires - clients receive data and preload resources
- **37s (SIGILIN)**: Display phase - clients render the preloaded content
- **The 2s SPOOL window** (35-37s) is for preloading before display begins

**The sweet spot**: mindMoment fires at SPOOL (35s) so you have 2 seconds to preload before display at SIGILIN (37s)! 🎂✨
