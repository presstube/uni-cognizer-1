# Client Events Guide - What Clients Should Listen For

## TL;DR - The One Event That Matters

**Clients should primarily listen to the `mindMoment` event at SIGILIN phase (37s mark).**

**Everything is ready by SPOOL (35s)** - that's when systems should load what they need from the buffer.
**SIGILIN (37s)** is when the complete moment gets broadcast to clients.

At this point, the mind moment is **fully hydrated** with:
- ✅ Mind moment text
- ✅ Sigil phrase
- ✅ Sigil draw code
- ✅ Kinetic state
- ✅ Lighting state
- ✅ Visual percepts
- ✅ Audio percepts
- ✅ **Sound brief** (music + texture selections)
- ✅ Prior moments context

---

## Primary Client Events

### 1. `mindMoment` - **THE BIG ONE** 🎯

**When**: SIGILIN phase (37s into 60s cycle)
**Why**: Fully hydrated, complete moment ready for display
**Frequency**: Once per 60s cycle

```javascript
socket.on('mindMoment', (data) => {
  // data contains EVERYTHING:
  {
    cycle: 123,
    mindMoment: "UNI observes...",
    sigilPhrase: "ethereal presence",
    sigilCode: "ctx.beginPath()...",
    kinetic: { pattern: "gentle", intensity: 0.3 },
    lighting: { color: "#4a90e2", pattern: "pulse", speed: 0.5 },
    visualPercepts: [...],
    audioPercepts: [...],
    priorMoments: [...],
    soundBrief: {  // 🆕 Now included!
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
    timestamp: "2025-12-07T..."
  }
  
  // Now display everything!
});
```

**Purpose**: This is the complete "cognitive moment" ready for any client to render. All parts (mind moment, sigil, sound brief) have been generated and are included.

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
      // Data is ready in buffer - load what you need!
      preloadSoundSamples(cycleNumber);
      prepareCanvasContext();
      break;
      
    case 'SIGILIN':
      // Now display/broadcast (mindMoment event will fire)
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
- **SPOOL phase** signals "data is ready, load what you need"
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

### 4. `cognitiveState` - ⚠️ DEPRECATED

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

## Secondary Events (Usually Ignored)

### `sigil` - Redundant (Already in `mindMoment`)

**Why it exists**: Legacy from before unified broadcasting.
**Should you use it?**: No, use `mindMoment` instead.

The sigil data (code, phrase, PNG) is already included in the `mindMoment` event. This separate event is fired at the same time (SIGILIN) but is redundant for most clients.

```javascript
// ❌ Don't do this (redundant):
socket.on('sigil', (data) => {
  displaySigil(data.sigilCode);
});

// ✅ Do this instead:
socket.on('mindMoment', (data) => {
  displaySigil(data.sigilCode);
});
```

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

// Phase tracking (UI candy)
socket.on('phase', ({ phase, duration }) => {
  showPhaseIndicator(phase);
  startCountdown(duration);
});

// Live percepts (shows what UNI sees)
socket.on('perceptReceived', (percept) => {
  addPerceptToFeed(percept);
});

// Cognitive state (status indicator)
socket.on('cognitiveState', ({ state }) => {
  updateStatusBadge(state);
});

// The main event (complete moment)
socket.on('mindMoment', (data) => {
  renderCompleteMoment(data);
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

**For most clients, you only need ONE event**:

```javascript
socket.on('mindMoment', (data) => {
  // Everything you need is here!
  // Mind moment, sigil, sound brief, percepts, context
  // All fully hydrated and ready to display
});
```

**At SIGILIN (37s), the moment is 100% complete** ✅

The other events (`phase`, `perceptReceived`, `cognitiveState`) are optional polish for richer UX.

---

## Timing Reference

```
Cycle N: 
0s    PERCEPTS START    (percepts accumulate)
      ↓ perceptReceived events fire as they arrive
      
35s   PERCEPTS END      (dump percepts → background for Cycle N+1 starts)
      ↓ Background: LLM + Sigil + Sound (~6-8s for Cycle N+1)
      
35s   SPOOL            ← 🎯 Cycle N data is READY in buffer!
      ↓                   (prepared during Cycle N-1 @ 35s)
      ↓                   Systems load from buffer (2s window)
      
37s   SIGILIN          ← 🎯 mindMoment event fires HERE
      ↓                   (fully hydrated with EVERYTHING)
      ↓                   Broadcast to all clients
      
40s   SIGILHOLD        (display continues)
      
55s   SIGILOUT         (fade out)
      
58s   RESET            (prepare for next cycle)
      
60s   CYCLE RESTART    (back to 0s, now showing Cycle N+1)

Cycle N+1: SPOOL (@ 35s)
      ↓ Cycle N+1 is now ready (was prepared @ Cycle N's 35s mark)
```

**Key Timing Points**:
- **35s (SPOOL)**: Data is ready in buffer - systems load what they need
- **37s (SIGILIN)**: Broadcast happens - clients receive complete moment
- **The 2s SPOOL window** (35-37s) is for loading/preparation before display

**The sweet spot**: By SPOOL at 35s, everything is ready. SIGILIN at 37s broadcasts it! 🎂✨
