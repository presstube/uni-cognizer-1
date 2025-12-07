# LIVE Session Startup: Timing & Placeholder Questions

## Question 1: Does the timing loop restart or pick up mid-flow?

**Answer: It RESTARTS completely.**

### The Flow

1. **System boots**: Starts in DREAM mode, 60s cycles running
2. **Perceptor connects**: Calls `startSession()`
3. **First session triggers**: `loopManager.sessionStarted()` → `transitionToLive()`
4. **Mode switch happens**: `consciousness.switchMode('LIVE')`

### Inside `switchMode()`

```javascript
switchMode(mode) {
  const wasRunning = this.intervalId !== null;  // true (was dreaming)
  
  if (wasRunning) {
    this.stop();  // ⬅️ STOPS the current cycle
  }
  
  this.mode = mode;  // Switch to LIVE
  
  if (wasRunning) {
    this.start();  // ⬅️ STARTS fresh from beginning
  }
}
```

### What `start()` Does

```javascript
start() {
  // ... setup ...
  
  // Execute first tick immediately
  this.tick();
  
  // Then set up 60s interval
  this.intervalId = setInterval(() => {
    this.tick();
  }, 60000);
}
```

**Result**: 
- ✅ **Timing loop RESTARTS from 0**
- ✅ **First tick fires immediately** (no waiting)
- ✅ **Always starts with PERCEPTS phase**
- ✅ **Cycle counter resets to 0**

### Mid-Flow Scenario

**If you're in middle of DREAM cycle:**
```
DREAMING Cycle 42
├─ PERCEPTS (0-35s)
├─ SPOOL (35-37s)  ⬅️ You're here when session starts
└─ ... rest of phases
```

**What happens:**
1. Dream cycle is **stopped immediately**
2. All dream timeouts **cleared**
3. LIVE mode **starts fresh at PERCEPTS phase**
4. Old dream cycle is **abandoned mid-flight**

---

## Question 2: Where does the placeholder come from?

**Answer: Hardcoded in `loadPlaceholder()` method.**

### The Code

When `start()` is called in LIVE mode:

```javascript
start() {
  if (this.mode === 'LIVE') {
    this.loadPlaceholder();  // ⬅️ Loads placeholder
    this.setupLiveListeners();
  }
  // ... rest of start logic
}
```

### The Placeholder Data

```javascript
loadPlaceholder() {
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
  
  console.log('🌅 Loaded bootstrap placeholder');
}
```

### When It's Used

**Cycle 0 Timeline:**
```
0:00-0:35  PERCEPTS phase
           - Collect percepts from perceptor
           - At end: dump percepts → cognize() starts

0:35-1:00  INTEGRATION phase
           - cycleBuffer.ready = null (nothing ready yet)
           - Falls back to: cycleBuffer.placeholder
           - Displays: "Consciousness initializing, patterns emerging..."
           - Shows: Blue circle sigil
```

**Cycle 1 Timeline:**
```
1:00-1:35  PERCEPTS phase
           - Collect new percepts

1:35-2:00  INTEGRATION phase
           - IF Cycle 0 finished: Shows real results
           - IF Cycle 0 still processing: Shows placeholder again
           - Depends on: cycleBuffer.ready != null
```

---

## The Bootstrap Sequence (Step by Step)

### System Boot
```
npm start
↓
Loop starts in DREAM mode
↓
Dreaming cycles running (Cycle 42, 43, 44...)
```

### User Opens Perceptor
```
Perceptor connects
↓
Calls socket.emit('startSession', { sessionId: 'abc123' })
```

### Server Receives startSession
```javascript
socket.on('startSession', ({ sessionId }) => {
  sessionManager.startSession(sessionId);
  ↓
  loopManager.sessionStarted(sessionId);
  ↓
  if (first session) {
    consciousness.switchMode('LIVE');
    ↓
    STOPS dream cycle mid-flight
    ↓
    STARTS LIVE mode:
      - loadPlaceholder() ✅
      - setupLiveListeners() ✅
      - tick() immediately ✅
      - setInterval(60s) ✅
  }
});
```

### First LIVE Cycle (Cycle 0)
```
0:00  Phase: PERCEPTS starts
      - User sends percepts from perceptor
      - They accumulate in cycleBuffer.current.percepts

0:35  PERCEPTS ends
      - Dump percepts → cognize()
      - LLM processing starts (background, ~20s)

0:35  Phase: SPOOL starts
      - cycleBuffer.ready is NULL
      - Falls back to cycleBuffer.placeholder

0:37  Phase: SIGILIN starts
      - Broadcasts PLACEHOLDER mind moment
      - Text: "Consciousness initializing..."
      - Sigil: Blue circle

0:40  Phase: SIGILHOLD starts
      - Placeholder displays for 15s

0:55  Phase: SIGILOUT starts
      - Placeholder clears

0:57  Phase: RESET starts
      - Pane clears

0:59  Cycle 0 complete
```

### Background During Cycle 0
```
0:35  LLM processing starts
↓
~0:38 Mind moment returns (3s)
↓
~0:54 Sigil + sound finish (16s parallel)
↓
0:54  Cycle 0 results stored in cycleBuffer.ready ✅
      console.log("✅ [Cycle 0] Ready for display")
```

### Second LIVE Cycle (Cycle 1)
```
1:00  Phase: PERCEPTS starts
      - New percepts flow in

1:35  PERCEPTS ends
      - Dump → cognize() for Cycle 1

1:35  Phase: SPOOL starts
      - cycleBuffer.ready IS NOT NULL ✅
      - Will display Cycle 0 REAL results!

1:37  Phase: SIGILIN starts
      - Broadcasts Cycle 0 mind moment
      - Real text, real sigil!
      
[... normal display continues ...]
```

---

## Key Insights

### 1. Timing Always Restarts
- ❌ Does NOT pick up mid-flow
- ✅ Always starts fresh from PERCEPTS phase
- ✅ Immediate first tick (no 60s wait)

### 2. Placeholder Source
- ❌ Not from database
- ❌ Not from JSON file
- ✅ Hardcoded in loadPlaceholder()
- ✅ Simple, reliable, always available

### 3. First "Go Around" 
- Cycle 0 INTEGRATION: Shows placeholder
- Cycle 1 INTEGRATION: Shows Cycle 0 real results (if ready)
- One cycle of "initialization" is expected

### 4. Fallback Behavior
If LLMs are slow (>60s):
- Cycle 1 might also show placeholder
- Cycle 2 would show Cycle 0 results
- System is resilient but delayed

---

## Recommendation

This design is actually **good**:
- Clean restart prevents partial state
- Hardcoded placeholder is reliable
- One-cycle initialization is acceptable UX
- User sees "Consciousness initializing..." briefly

**Future enhancement**: Could pre-populate placeholder from a curated DB moment instead of hardcoded text.
