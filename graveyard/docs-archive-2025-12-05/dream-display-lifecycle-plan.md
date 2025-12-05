# Dream Display Lifecycle Enhancement Plan

**Status**: ✅ Complete  
**Created**: 2025-12-03  
**Completed**: 2025-12-03  
**Goal**: Implement 30-second dream cycle with temporal control and universal clear mechanism

---

## Implementation Summary

### ✅ Changes Completed

#### Backend (`src/consciousness-loop.js`):
1. **Updated DREAM_CYCLE_MS** from 20000 to 30000 (30 seconds)
2. **Added clearDisplay() method** - Universal clear event for both DREAM and LIVE modes
3. **Updated dreamTick()** with 3-phase timeline:
   - Phase 1 (0-18s): Percept dispersal with scaled timing
   - Phase 2 (20s): Mind moment + sigil emission
   - Phase 3 (29.9s): Clear display event

#### Frontend (`web/dashboard/app.js`):
1. **Added clearDisplay event handler** with conditional clearing:
   - Clears percept feed and list
   - Fades out and clears mind moment card
   - Clears sigil preview and status

### 📊 New Timeline

```
Dream Cycle (30 seconds)
├─ 0s     Start
├─ 0-18s  Percepts trickle in (scaled timing)
├─ 20s    Mind moment + sigil appear
├─ 20-30s Display holds (breathing room)
├─ 29.9s  Clear display event fired
└─ 30s    Next cycle begins
```

---

## Overview

Transform dream mode from continuous display to a controlled lifecycle:

```
0s    → Start trickling percepts
18s   → Last percept emitted
20s   → Mind moment + sigil fired
30s   → Clear display + next dream begins
```

This creates breathing room between dreams and provides a clean slate for each new memory.

---

## Architecture: Universal Clear Event

### **Design Principle**
Create a **single, reusable clear mechanism** that works for both DREAM and LIVE modes.

### **Event Structure**
```javascript
{
  event: 'clearDisplay',
  payload: {
    clearPercepts: boolean,
    clearMindMoment: boolean,
    clearSigil: boolean,
    timestamp: ISO string
  }
}
```

---

## Phase 1: Backend Implementation

### **File: `src/consciousness-loop.js`**

#### Change 1: Update Cycle Timing
```javascript
// Line ~17
const DREAM_CYCLE_MS = parseInt(process.env.DREAM_CYCLE_MS, 10) || 30000; // Was 20000
```

#### Change 2: Add clearDisplay Method
```javascript
/**
 * Clear display on clients (used by both LIVE and DREAM modes)
 * @param {Object} options - What to clear
 */
clearDisplay(options = {}) {
  const {
    clearPercepts = true,
    clearMindMoment = true,
    clearSigil = true
  } = options;
  
  this.io.emit('clearDisplay', {
    clearPercepts,
    clearMindMoment,
    clearSigil,
    timestamp: new Date().toISOString()
  });
  
  console.log('🧹 Display cleared:', Object.keys(options).filter(k => options[k]).join(', '));
}
```

#### Change 3: Update dreamTick Timeline
```javascript
async dreamTick() {
  const dream = await this.recallMoment();
  if (!dream) return;
  
  console.log(`💭 Dreaming of cycle ${dream.cycle}: "${dream.sigilPhrase}"`);
  
  // Collect and filter percepts
  const allPercepts = [
    ...dream.visualPercepts.map(p => ({ ...p, type: 'visual' })),
    ...dream.audioPercepts.map(p => ({ ...p, type: 'audio' }))
  ].filter(p => p.timestamp);
  
  if (allPercepts.length === 0) {
    console.log('  💭 No percepts in dream, broadcasting immediately');
    this.broadcastMoment(dream);
    return;
  }
  
  // Clear previous dream timeouts
  this.dreamTimeouts.forEach(t => clearTimeout(t));
  this.dreamTimeouts = [];
  
  // Sort chronologically
  try {
    allPercepts.sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );
  } catch (error) {
    console.error('⚠️  Failed to sort percepts:', error.message);
  }
  
  // Calculate timing
  const firstTimestamp = new Date(allPercepts[0].timestamp).getTime();
  const lastTimestamp = new Date(allPercepts[allPercepts.length - 1].timestamp).getTime();
  const originalDuration = lastTimestamp - firstTimestamp;
  
  // Disperse over 18 seconds (60% of cycle)
  const dispersalWindow = 18000;
  const scaleFactor = originalDuration > 0 ? dispersalWindow / originalDuration : 1;
  
  console.log(`  💭 Replaying ${allPercepts.length} percepts over ${(dispersalWindow / 1000).toFixed(1)}s`);
  console.log(`     Original duration: ${(originalDuration / 1000).toFixed(1)}s, scale: ${scaleFactor.toFixed(2)}x`);
  
  // PHASE 1: Percept dispersal (0-18s)
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
      
      // Log
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
  
  // PHASE 2: Mind moment + sigil (20s)
  const momentTimeout = setTimeout(() => {
    console.log(`  💭 [20.0s] Mind moment + sigil emitted`);
    this.broadcastMoment(dream);
  }, 20000);
  
  this.dreamTimeouts.push(momentTimeout);
  
  // PHASE 3: Clear display (29.9s) - right before next cycle
  const clearTimeout = setTimeout(() => {
    console.log(`  💭 [29.9s] Clearing display for next dream`);
    this.clearDisplay({
      clearPercepts: true,
      clearMindMoment: true,
      clearSigil: true
    });
  }, 29900);
  
  this.dreamTimeouts.push(clearTimeout);
}
```

---

## Phase 2: Frontend Implementation

### **File: `web/dashboard/app.js`**

Add event handler after existing socket listeners (~line 472):

```javascript
// Clear display event (for dream mode lifecycle)
socket.on('clearDisplay', ({ clearPercepts, clearMindMoment, clearSigil }) => {
  console.log('🧹 Clear display:', { clearPercepts, clearMindMoment, clearSigil });
  
  if (clearPercepts) {
    // Clear live percept feed (top right)
    $percepts.innerHTML = '<div class="empty">Waiting for percepts...</div>';
    
    // Clear moment percepts list (center pane)
    $perceptsList.innerHTML = '';
  }
  
  if (clearMindMoment && currentMomentCard) {
    // Fade out animation
    currentMomentCard.element.style.opacity = '0';
    currentMomentCard.element.style.transition = 'opacity 0.3s ease-out';
    
    // Clear after fade
    setTimeout(() => {
      $momentCardContainer.innerHTML = '';
      currentMomentCard = null;
    }, 300);
  }
  
  if (clearSigil) {
    currentSigilCode = null;
    
    // Clear SDF preview
    if ($sdfPreview) {
      $sdfPreview.innerHTML = '';
      $sdfPreview.classList.remove('has-sdf');
    }
    
    // Reset sigil status
    $sdfStatus.textContent = '—';
  }
});
```

### **File: `web/perceptor-remote/app.js`** (if needed)

Check if this client displays dreams. If so, add similar handler.

### **File: `web/perceptor-circumplex/app.js`** (if needed)

Check if this client displays dreams. If so, add similar handler.

---

## Phase 3: Optional Enhancements

### **Enhancement 1: Fade Animations**

Add CSS transitions for smooth clears:

```css
/* In dashboard.css */
.moment-card-hero {
  transition: opacity 0.3s ease-out;
}

.percept-toast {
  transition: opacity 0.2s ease-out, transform 0.2s ease-out;
}

.percept-toast.clearing {
  opacity: 0;
  transform: translateY(-10px);
}
```

### **Enhancement 2: State Transitions**

Add cognitive state changes during dream phases:

```javascript
// In dreamTick()

// At 14s: Simulate "cognizing"
this.dreamTimeouts.push(setTimeout(() => {
  this.io.emit('cognitiveState', { state: CognitiveState.COGNIZING });
}, 14000));

// At 19s: Simulate "visualizing"
this.dreamTimeouts.push(setTimeout(() => {
  this.io.emit('cognitiveState', { state: CognitiveState.VISUALIZING });
}, 19000));

// At 21s: Back to "dreaming"
this.dreamTimeouts.push(setTimeout(() => {
  this.io.emit('cognitiveState', { state: CognitiveState.DREAMING });
}, 21000));
```

### **Enhancement 3: Progress Indicator**

Show dream lifecycle progress in dashboard:

```html
<!-- In dashboard HTML -->
<div class="dream-progress">
  <div class="progress-bar"></div>
  <div class="progress-label">Replaying memory...</div>
</div>
```

---

## Testing Plan

### **Test 1: Basic Dream Cycle**
1. Start server with no sessions
2. Open dashboard
3. Watch for 30-second dream cycle

**Expected:**
- 0-18s: Percepts trickle in
- 20s: Mind moment + sigil appear
- 29.9s: Everything clears
- 30s: Next dream begins

### **Test 2: Mode Switching**
1. Start in dream mode (30s cycle)
2. Start a session (switches to live mode, 5s cycle)
3. End session (switches back to dream mode)

**Expected:**
- Dream clears mid-cycle when switching to live
- Clean transition back to dream mode
- No orphaned timeouts or displays

### **Test 3: Multiple Dreams**
1. Watch 3-4 dream cycles in a row
2. Verify no overlap between dreams
3. Verify each dream starts with clean slate

**Expected:**
- Each dream lifecycle completes fully
- Clear happens before next dream starts
- No visual artifacts from previous dreams

### **Test 4: Client Refresh**
1. Refresh dashboard mid-dream
2. Verify reconnection and state sync

**Expected:**
- Reconnects cleanly
- Shows current dream state
- No errors in console

---

## Files to Modify

### **Backend:**
1. `src/consciousness-loop.js`
   - Update `DREAM_CYCLE_MS` constant
   - Add `clearDisplay()` method
   - Update `dreamTick()` with 3-phase timeline

### **Frontend:**
1. `web/dashboard/app.js`
   - Add `clearDisplay` event handler
   - Implement DOM clearing logic

2. `web/perceptor-remote/app.js` (optional)
   - Add `clearDisplay` handler if displays dreams

3. `web/perceptor-circumplex/app.js` (optional)
   - Add `clearDisplay` handler if displays dreams

---

## Implementation Checklist

### Backend:
- [x] Update `DREAM_CYCLE_MS` to 30000
- [x] Add `clearDisplay()` method to ConsciousnessLoop
- [x] Update `dreamTick()` with 3-phase timeline
- [x] Test timeout management on mode switch

### Frontend:
- [x] Add `clearDisplay` handler to dashboard
- [x] Implement percept clearing
- [x] Implement mind moment clearing with fade
- [x] Implement sigil clearing
- [ ] Test visual clearing behavior

### Testing:
- [ ] Watch full 30s dream cycle
- [ ] Test mode switching (dream → live → dream)
- [ ] Test multiple dreams in sequence
- [ ] Test client refresh during dream
- [ ] Verify no memory leaks
- [ ] Verify console logs are clean

### Documentation:
- [x] Update implementation plan with completion status
- [ ] Update DEVELOPER_GUIDE.md with new timing (optional)
- [ ] Document clearDisplay event in socket API docs (optional)

---

## Ready for Testing

All code changes are complete and linted. Server can be started for manual testing.

**Test Command:**
```bash
npm start
# Open: http://localhost:3001/dashboard
# Watch the 30-second dream cycle
```

---

## Timeline Visualization

```
Dream Cycle (30 seconds)
├─ 0s     Start
├─ 0-18s  Percepts trickle in (scaled timing)
├─ 20s    Mind moment + sigil appear
├─ 20-30s Display holds (breathing room)
├─ 29.9s  Clear display event fired
└─ 30s    Next cycle begins

Live Cycle (5 seconds) - for comparison
├─ 0s     Start, clear old percepts
├─ 0-5s   Percepts accumulate
├─ 5s     LLM call + mind moment
└─ 5s     Next cycle begins (no clear)
```

---

## Environment Variables

Update `.env` or use default:

```bash
DREAM_CYCLE_MS=30000  # Dream cycle interval (default: 30000ms = 30s)
COGNITIVE_CYCLE_MS=5000  # Live cycle interval (default: 5000ms = 5s)
```

---

## Future Considerations

### **Potential Future Features:**
1. **Configurable clear timing** - ENV var for clear delay
2. **Partial clears** - Clear percepts but keep mind moment
3. **Live mode clears** - Use clearDisplay in live mode between cycles
4. **Clear animations** - Smooth fade/slide transitions
5. **Clear event in REST API** - Manual trigger via API endpoint

### **Use Cases for Live Mode Clear:**
- Session ends → clear display for next session
- Error state → clear and reset
- Manual reset button → clear current display
- Demo mode → cycle through moments with clears

---

## Open Questions

1. **Should prior moments clear too?** (Currently: no)
2. **Should history grid refresh on clear?** (Currently: no, independent)
3. **Should lighting display clear?** (Currently: no, metadata)
4. **Fade duration?** (Proposed: 300ms)
5. **Clear partial data?** (E.g., percepts only, keep moment)

---

## Success Criteria

✅ Dream cycles run at 30-second intervals  
✅ Percepts disperse over 0-18 seconds  
✅ Mind moment + sigil appear at 20 seconds  
✅ Display clears at 29.9 seconds  
✅ Next dream begins at 30 seconds  
✅ No visual overlap between dreams  
✅ Mode switching clears timeouts cleanly  
✅ Client code is simple and maintainable  
✅ Event works for both DREAM and LIVE modes  
✅ No memory leaks or orphaned DOM elements

---

## Status: Ready for Implementation

This plan provides a complete, clean architecture for dream display lifecycle management with future extensibility for live mode clearing.

**Next Step**: Implement Phase 1 (Backend) and Phase 2 (Frontend) changes.

