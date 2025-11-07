# Cognitive State Events for Aggregator-1

**New Feature:** Real-time cognitive state tracking

Cognizer-1 now broadcasts cognitive state changes, allowing Aggregator-1 to display thinking/ready indicators.

---

## The State Machine

Cognizer-1 has **ONE shared cognitive loop** for all connected clients:

```
IDLE          → No clients connected (loop stopped)
READY         → ≥1 client connected, waiting for next 5s cycle
COGNIZING     → LLM call in flight (processing percepts)
```

The loop runs every 5 seconds. During each cycle:
1. Dumps queued percepts
2. Sends to LLM → **COGNIZING** state
3. Receives mind moment → **READY** state

---

## Two Levels of Events

### 1. High-Level: Simple State Tracking

**Event:** `cognitiveState`

```javascript
socket.on('cognitiveState', ({ state }) => {
  // state = 'COGNIZING' | 'READY'
});
```

**Use for:** Simple status indicators, loading spinners

**Example:**
```javascript
socket.on('cognitiveState', ({ state }) => {
  if (state === 'COGNIZING') {
    showSpinner('UNI is thinking...');
  } else {
    hideSpinner();
  }
});
```

### 2. Low-Level: Detailed Cycle Events

**Events:** `cycleStarted`, `cycleCompleted`, `cycleFailed`

```javascript
socket.on('cycleStarted', (data) => {
  // data = {
  //   cycle: 42,
  //   visualPercepts: 3,
  //   audioPercepts: 1,
  //   priorMoments: 2,
  //   timestamp: "2025-11-06T10:30:05.000Z"
  // }
});

socket.on('cycleCompleted', (data) => {
  // data = {
  //   cycle: 42,
  //   mindMoment: "...",
  //   sigilPhrase: "...",
  //   duration: 1200,  // milliseconds
  //   timestamp: "2025-11-06T10:30:06.200Z"
  // }
});

socket.on('cycleFailed', (data) => {
  // data = {
  //   cycle: 42,
  //   error: "LLM error message",
  //   duration: 800,
  //   timestamp: "2025-11-06T10:30:05.800Z"
  // }
});
```

**Use for:** Analytics, debugging, detailed UI feedback

**Example:**
```javascript
socket.on('cycleStarted', ({ cycle, visualPercepts, audioPercepts }) => {
  console.log(`[Cycle ${cycle}] Processing ${visualPercepts}V + ${audioPercepts}A`);
  startTimer();
});

socket.on('cycleCompleted', ({ cycle, duration }) => {
  console.log(`[Cycle ${cycle}] Completed in ${duration}ms`);
  stopTimer();
});

socket.on('cycleFailed', ({ cycle, error }) => {
  console.error(`[Cycle ${cycle}] Failed:`, error);
  showError('UNI encountered an error');
});
```

---

## Event Timeline

```
Time  Event             State       Description
───────────────────────────────────────────────────────────
T+0s  cycleStarted      COGNIZING   Percepts sent to LLM
      cognitiveState                state='COGNIZING'

T+1s  (LLM processing)  COGNIZING   Waiting for response...

T+2s  cycleCompleted    READY       Mind moment received
      cognitiveState                state='READY'
      mindMoment                    Full mind moment data

T+3s  (waiting)         READY       Next cycle in 3s...
T+4s  (waiting)         READY       Next cycle in 2s...
T+5s  cycleStarted      COGNIZING   New cycle begins
```

---

## Integration Example

```javascript
// In CognizerClient class (from AGGREGATOR_INTEGRATION.md):

async connect() {
  // ... existing connection code ...

  // Add state event listeners
  this.socket.on('cognitiveState', (data) => {
    console.log(`🧠 [Cognizer] State: ${data.state}`);
    this.dispatch('cognitiveState', data);
  });

  this.socket.on('cycleStarted', (data) => {
    console.log(`🔄 [Cognizer] Cycle ${data.cycle} started`);
    this.dispatch('cycleStarted', data);
  });

  this.socket.on('cycleCompleted', (data) => {
    console.log(`✅ [Cognizer] Cycle ${data.cycle} completed in ${data.duration}ms`);
    this.dispatch('cycleCompleted', data);
  });

  this.socket.on('cycleFailed', (data) => {
    console.error(`❌ [Cognizer] Cycle ${data.cycle} failed:`, data.error);
    this.dispatch('cycleFailed', data);
  });
}

// Usage in Aggregator-1:
cognizer.addEventListener('cognitiveState', (event) => {
  const { state } = event.detail;
  updateStatusIndicator(state); // Show COGNIZING/READY
});

cognizer.addEventListener('cycleCompleted', (event) => {
  const { duration } = event.detail;
  logPerformance(`Cycle took ${duration}ms`);
});
```

---

## Recommended UI

### Minimal (use `cognitiveState` only):

```html
<div id="status" class="status-indicator">
  <span class="dot"></span>
  <span id="status-text">READY</span>
</div>
```

```javascript
socket.on('cognitiveState', ({ state }) => {
  document.getElementById('status-text').textContent = state;
  document.getElementById('status').className = 
    `status-indicator ${state.toLowerCase()}`;
});
```

```css
.status-indicator { display: flex; align-items: center; gap: 8px; }
.status-indicator .dot { 
  width: 8px; height: 8px; border-radius: 50%; 
  background: #22c55e; /* green */
}
.status-indicator.cognizing .dot { 
  background: #f59e0b; /* orange */
  animation: pulse 1s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

### Detailed (use cycle events):

```html
<div id="cognitive-stats">
  <div>Status: <span id="state">READY</span></div>
  <div>Cycle: <span id="cycle">-</span></div>
  <div>Duration: <span id="duration">-</span></div>
  <div>Percepts: <span id="percepts">-</span></div>
</div>
```

```javascript
socket.on('cycleStarted', ({ cycle, visualPercepts, audioPercepts }) => {
  document.getElementById('state').textContent = 'COGNIZING';
  document.getElementById('cycle').textContent = cycle;
  document.getElementById('percepts').textContent = 
    `${visualPercepts}V + ${audioPercepts}A`;
});

socket.on('cycleCompleted', ({ duration }) => {
  document.getElementById('state').textContent = 'READY';
  document.getElementById('duration').textContent = `${duration}ms`;
});
```

---

## Key Points

✅ **Both event types are always emitted** - use what you need  
✅ **Shared state** - all clients see the same cognitive state  
✅ **Backwards compatible** - existing `mindMoment` events still work  
✅ **No configuration** - events are automatic when connected  

🎯 **Recommendation:** Start with `cognitiveState` for simple status display. Add cycle events later if you need analytics or detailed feedback.

---

## Live Now

These events are available on:
- **Production:** `https://uni-cognizer-1-production.up.railway.app`
- **Local:** `http://localhost:3001` (after pulling latest code)

No client changes required - events are broadcast automatically! 🚀

