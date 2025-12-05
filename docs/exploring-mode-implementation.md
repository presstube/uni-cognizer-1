# Exploring Mode Implementation

**Date**: December 5, 2025  
**Feature**: Client-side EXPLORING mode for viewing historical mind moments

---

## Overview

When clicking a historical mind moment in the dashboard, the client now enters **EXPLORING mode**. This prevents live socket events from overwriting the historical data being viewed, creating a clean separation between LIVE and EXPLORING modes.

---

## Architecture

### Design Decision: Client-Side Guard Pattern

**Approach**: Keep socket connected, but guard event handlers with early returns.

**Why not disconnect?**
- Avoids connection overhead and race conditions
- Maintains visibility into system status (state, sessions, cycle)
- Simpler state management
- Socket reconnection doesn't miss events

---

## Implementation Details

### 1. State Management

**New State Variable**:
```javascript
let exploringMode = false; // false = LIVE, true = EXPLORING
```

**CSS Class**:
```javascript
document.body.classList.add('exploring-mode');  // When exploring
document.body.classList.remove('exploring-mode'); // When live
```

### 2. Entering EXPLORING Mode

**Trigger**: Clicking any historical mind moment in the history grid

**Function**: `enterExploringMode(cycle)`

**Actions**:
1. Set `exploringMode = true`
2. Add `.exploring-mode` class to body
3. Show visual banner at top of page
4. Log console message

**Code Location**: `web/dashboard/app.js` (lines ~289-297)

### 3. Exiting EXPLORING Mode

**Trigger**: Clicking "Return to Live ▶" button in banner

**Function**: `exitExploringMode()`

**Actions**:
1. Set `exploringMode = false`
2. Remove `.exploring-mode` class from body
3. Remove banner
4. Deselect history grid items
5. Clear current view (show collecting state)
6. Request latest cycle status from server
7. Log console message

**Code Location**: `web/dashboard/app.js` (lines ~302-322)

### 4. Socket Event Guards

All live update handlers now check `exploringMode` before processing:

**Guarded Events**:
- ✅ `perceptReceived` - blocks new percepts
- ✅ `mindMoment` - blocks new mind moments
- ✅ `sigil` - blocks new sigils
- ✅ `clearDisplay` - blocks dream mode clears
- ✅ `cycleStarted` - doesn't clear percepts or start countdown

**Unguarded Events** (still active in EXPLORING mode):
- `cognitiveState` - shows current system state
- `sessionsUpdate` - tracks active sessions
- `cycleStatus` - maintains cycle info
- `connect`/`disconnect` - connection health

**Pattern**:
```javascript
socket.on('eventName', (data) => {
  if (exploringMode) {
    console.log('🔒 EXPLORING mode - ignoring live eventName');
    return; // Early exit
  }
  
  // ... existing event handling
});
```

**Code Locations**:
- `perceptReceived`: line ~511
- `mindMoment`: line ~523
- `sigil`: line ~580
- `clearDisplay`: line ~642
- `cycleStarted`: line ~496

---

## Visual Design

### Layout States

The dashboard has three distinct layout states:

**1. NO SESSION (Idle/Dreaming)**
```
┌──────────────────────────────────────────────────────────────┐
│ [Status Strip]                                               │
├────────┬─────────────────┬──────────────────────────────────┤
│ Left   │ Center          │ Far Right                        │
│ 20%    │ 30%             │ 50%                              │
│        │                 │                                  │
│ Latest │ Mind Moment     │ History Grid                     │
│ Percept│ Details         │                                  │
│        │                 │                                  │
│ Queue  │                 │                                  │
└────────┴─────────────────┴──────────────────────────────────┘
```

**2. ACTIVE SESSION (Live observing)**
```
┌──────────────────────────────────────────────────────────────┐
│ [Status Strip]                                               │
├──────────────────────────────┬───────────────────────────────┤
│ Left                         │ Center                        │
│ 50%                          │ 50%                           │
│                              │                               │
│ Latest Percept               │ Mind Moment Details           │
│                              │                               │
│ Percept Queue                │                               │
└──────────────────────────────┴───────────────────────────────┘
```

**3. EXPLORING MODE (Historical browsing)**
```
┌──────────────────────────────────────────────────────────────┐
│ [📜 Exploring History - Cycle #123]  [Return to Live ▶]     │
├──────────────────────────────────────────────────────────────┤
│ [Status Strip]                                               │
├──────────────────────────────┬───────────────────────────────┤
│ Center                       │ Far Right                     │
│ 50%                          │ 50%                           │
│                              │                               │
│ Historical Mind Moment       │ History Grid                  │
│ Details                      │                               │
│                              │                               │
└──────────────────────────────┴───────────────────────────────┘
```

Key difference: In exploring mode, the left percept pane is completely hidden.

### Exploring Banner

**Layout**:
```
┌─────────────────────────────────────────────────────┐
│ 📜 Exploring History - Cycle #123  [Return to Live ▶]│
└─────────────────────────────────────────────────────┘
```

**Styling**:
- Height: 40px
- Background: `rgba(255, 200, 0, 0.15)` (subtle yellow/orange tint)
- Border: `rgba(255, 200, 0, 0.3)` (bottom border)
- Text: Yellow-tinted white
- Button: Monospace font, subtle hover states

**Code Location**: 
- CSS: `web/dashboard/dashboard.css` (lines ~11-68)
- Banner creation: `showExploringBanner()` function (lines ~327-341)

### CSS Specificity

The exploring mode layout rules use `body.exploring-mode` selectors, which override both:
- `body.no-session` rules (20/30/50 layout)
- `body.active-session` rules (50/50 layout)

This ensures exploring mode always displays correctly regardless of session state.

### Layout Adjustments

**Normal Layout (No Session)**:
```
[Status Strip: 60px]
[Percepts: 20% | Mind Moment: 30% | History: 50%]
```

**Active Session Layout**:
```
[Status Strip: 60px]
[Percepts: 50% | Mind Moment: 50% | History: hidden]
```

**Exploring Mode Layout**:
```
[Exploring Banner: 40px]
[Status Strip: 60px]
[Percepts: hidden | Mind Moment: 50% | History: 50%]
```

The exploring mode:
1. Pushes down the entire interface by 40px (banner height)
2. Hides the left percepts pane completely
3. Splits the view 50/50 between mind moment details and history grid
4. Focuses attention on historical exploration

---

## User Experience

### Entering EXPLORING Mode

1. User clicks any historical moment in the right pane
2. Banner appears instantly at top
3. Center pane populates with historical data
4. Live events are silently ignored (visible in console)
5. Status strip continues updating (state, sessions, countdown)

### While in EXPLORING Mode

- **What's blocked**: percepts, mind moments, sigils, clears
- **What's active**: connection status, system state, session tracking
- **Visual indicator**: Yellow banner always visible
- **Keyboard nav**: Left/Right arrows still work in history grid

### Exiting EXPLORING Mode

1. User clicks "Return to Live ▶" button
2. Banner disappears instantly
3. Center pane shows "Collecting Percepts..."
4. Next live event will populate the display
5. System returns to normal real-time operation

---

## Code Changes Summary

### Modified Files

1. **`web/dashboard/app.js`**
   - Added `exploringMode` state variable
   - Added `enterExploringMode()` function
   - Added `exitExploringMode()` function
   - Added `showExploringBanner()` function
   - Added guards to 5 socket event handlers
   - Updated `onHistoryMomentClick()` to call `enterExploringMode()`
   - Exposed `exitExploringMode` globally for onclick handler

2. **`web/dashboard/dashboard.css`**
   - Added `.exploring-banner` styles
   - Added `.exploring-label` styles
   - Added `.exploring-exit-btn` styles (with hover/active states)
   - Added layout adjustment for `body.exploring-mode`
   - Added `.left` hide rule for exploring mode
   - Added `.center` 50% width + border rule for exploring mode
   - Added `.far-right` 50% width + border removal for exploring mode

3. **`web/shared/components/history-grid/history-grid.css`**
   - Fixed grid to use fixed 60px columns (not minmax)
   - Removed duplicate overflow/height (handled by parent)
   - Added width: 100% and box-sizing for proper layout
   - Grid now fills available width without scrollbar issues

### No Server Changes

This feature is **100% client-side**. The server is unaware of exploring mode.

---

## Testing Checklist

### Entering Exploring Mode
- [ ] Click historical moment → banner appears
- [ ] Left percept pane disappears
- [ ] Center pane expands to 50% width
- [ ] Right history grid remains at 50% width
- [ ] Historical data displays correctly in center pane
- [ ] Selected moment is highlighted in grid

### While in Exploring Mode
- [ ] Live `mindMoment` events don't overwrite historical view
- [ ] Live `percept` events don't appear in percept feed
- [ ] Live `sigil` events don't update sigil display
- [ ] Status strip still updates (state, sessions, countdown)
- [ ] Console shows guard messages when events are blocked
- [ ] Keyboard navigation (arrows) works in history grid
- [ ] Selecting different historical moment updates banner cycle number

### Exiting Exploring Mode
- [ ] Click "Return to Live ▶" → banner disappears
- [ ] Left percept pane reappears
- [ ] Layout returns to no-session (20/30/50) or active-session (50/50)
- [ ] After exiting, next live event populates display
- [ ] Center pane shows "Collecting Percepts..." message

### Edge Cases
- [ ] Exploring mode works in no-session state
- [ ] Exploring mode works when session becomes active
- [ ] Switching between historical moments works smoothly
- [ ] Banner updates with correct cycle number
- [ ] No visual glitches during state transitions

---

## Future Enhancements

Possible improvements (not implemented):

1. **ESC key to exit** - Add keyboard shortcut
2. **Auto-exit on session start** - Return to live when user starts observing
3. **Breadcrumb trail** - Show path through history (prior moments)
4. **Comparison mode** - View two historical moments side-by-side
5. **Direct cycle jump** - Input field to jump to specific cycle
6. **Persist exploring state** - Remember last viewed moment on refresh

---

## Design Philosophy

This implementation follows the existing codebase patterns:

- **Minimal CSS variables** - Uses existing color/spacing system
- **Monospace font** - Matches dashboard aesthetic
- **No external dependencies** - Pure vanilla JS
- **Clear console logging** - Emoji-prefixed for easy scanning
- **Fail-safe defaults** - Guards check exploring mode first
- **Progressive enhancement** - Works without JS banner interaction

---

**Last Updated**: December 5, 2025  
**Version**: Cognizer-1 (Exploring Mode)
