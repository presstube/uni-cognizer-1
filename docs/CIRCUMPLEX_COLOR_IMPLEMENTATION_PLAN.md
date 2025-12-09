# Circumplex Color Implementation Plan

**Goal:** Add color triad generation (primary, secondary, accent) from circumplex values and display in dashboard.

**Color Palette:** Ethereal Vapour (from spec)

**Integration Point:** Colors calculated immediately after LLM response, before `mindMomentInit` event fires.

---

## Phase 1: Create Color Generation Module

### File: `src/circumplex-to-color.js`

**Purpose:** Pure function module to convert circumplex coordinates to hex color triad.

**Exports:**
- `circumplexToColor(circumplex, palette)` - Main function
- `ETHEREAL_VAPOUR_PALETTE` - Default color palette constant

**Functions to implement:**
1. `cartesianToPolar(valence, arousal)` → `{ degrees, distance }`
2. `getRimColor(degrees, palette)` → `{ primary, secondary, accent }`
3. `getFinalColor(distance, centerColor, rimColor)` → `{ primary, secondary, accent }`
4. `interpolateRgb(color1, color2, t)` → hex string
5. `hexToRgb(hex)` → `{ r, g, b }`
6. `rgbToHex(r, g, b)` → hex string

**Palette Definition:**
```javascript
export const ETHEREAL_VAPOUR_PALETTE = {
  center: {
    primary: "#6E6E73",
    secondary: "#858590",
    accent: "#C0C0C0"
  },
  q1: {  // Happy (High V, High A)
    primary: "#50C878",
    secondary: "#4DEEEA",
    accent: "#FFFFAA"
  },
  q2: {  // Angry (Low V, High A)
    primary: "#804040",
    secondary: "#FF6B6B",
    accent: "#FFE0B0"
  },
  q3: {  // Sad (Low V, Low A)
    primary: "#454555",
    secondary: "#5A5A65",
    accent: "#9090A0"
  },
  q4: {  // Calm (High V, Low A)
    primary: "#5D7C99",
    secondary: "#A3D1FF",
    accent: "#FFFFFF"
  }
};
```

**Target:** ~100 lines, pure functions, no dependencies

---

## Phase 2: Integrate Color Generation in Real-Cog

### File: `src/real-cog.js`

**Location:** Line ~410, in `dispatchMindMoment()` callback chain

**Current flow:**
```
realLLMCall() → result with circumplex
  ↓
dispatchMindMoment(cycle, mindMoment, ..., circumplex)
  ↓
consciousness-loop.js setupLiveListeners() receives event
  ↓
emits 'mindMomentInit' to clients
```

**New flow:**
```
realLLMCall() → result with circumplex
  ↓
circumplexToColor() → color triad  ← NEW
  ↓
dispatchMindMoment(cycle, mindMoment, ..., circumplex, color)  ← MODIFIED
  ↓
consciousness-loop.js setupLiveListeners() receives event
  ↓
emits 'mindMomentInit' with color to clients  ← MODIFIED
```

**Changes needed:**

1. **Import color module** (top of file):
   ```javascript
   import { circumplexToColor, ETHEREAL_VAPOUR_PALETTE } from './circumplex-to-color.js';
   ```

2. **Generate color after circumplex** (line ~358):
   ```javascript
   cognitiveHistory[thisCycle].circumplex = result.circumplex;
   
   // Generate color triad from circumplex
   const color = circumplexToColor(result.circumplex, ETHEREAL_VAPOUR_PALETTE);
   cognitiveHistory[thisCycle].color = color;
   
   console.log(`Color: primary=${color.primary}, secondary=${color.secondary}, accent=${color.accent}`);
   ```

3. **Update dispatchMindMoment signature** (line ~251):
   ```javascript
   function dispatchMindMoment(cycle, mindMoment, visualPercepts, audioPercepts, priorMoments, sigilPhrase, circumplex, color) {
     mindMomentListeners.forEach(listener => {
       listener(cycle, mindMoment, visualPercepts, audioPercepts, priorMoments, sigilPhrase, circumplex, color);
     });
   }
   ```

4. **Call with color parameter** (line ~410):
   ```javascript
   dispatchMindMoment(thisCycle, result.mindMoment, visualPercepts, audioPercepts, priorMoments, result.sigilPhrase, result.circumplex, color);
   ```

---

## Phase 3: Update Consciousness Loop Event Emission

### File: `src/consciousness-loop.js`

**Location:** Line ~782, `onMindMoment()` listener in `setupLiveListeners()`

**Changes needed:**

1. **Update listener signature** (line ~782):
   ```javascript
   onMindMoment((cycle, mindMoment, visualPercepts, audioPercepts, priorMoments, sigilPhrase, circumplex, color) => {
     // Store partial result
     processingCycle = cycle;
     processingResult = {
       cycle,
       mindMoment,
       sigilPhrase,
       circumplex,
       color,  // ← ADD THIS
       visualPercepts,
       audioPercepts,
       priorMoments,
       isDream: false,
       isPlaceholder: false
     };
   ```

2. **Include color in mindMomentInit event** (line ~799):
   ```javascript
   this.io.emit('mindMomentInit', {
     cycle,
     mindMoment,
     sigilPhrase,
     circumplex,
     color,  // ← ADD THIS
     visualPercepts,
     audioPercepts,
     priorMoments,
     timestamp: new Date().toISOString(),
     status: {
       sigilReady: false,
       soundBriefReady: false
     }
   });
   ```

**Note:** The `broadcastMoment()` function (line ~702) already spreads the entire moment object, so `color` will automatically be included in the full `mindMoment` event.

---

## Phase 4: Update Dashboard Display

### File: `web/dashboard/index.html`

**Location:** After circumplex section (after line ~108)

**Add new section:**
```html
<div class="color-triad-section">
  <div class="label">Color Triad (Emotional Palette)</div>
  <div class="color-triad-display" id="color-triad-display">
    <span class="color-text">—</span>
  </div>
</div>
```

### File: `web/dashboard/dashboard.css`

**Location:** After circumplex styles (after line ~323)

**Add styles:**
```css
/* Color Triad Display */
.color-triad-section {
  margin-top: 20px;
}

.color-triad-display {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
}

.color-swatch-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.color-swatch {
  width: 60px;
  height: 60px;
  border-radius: 4px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.color-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.color-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 600;
}

.color-value {
  font-size: 13px;
  font-family: 'Monaco', 'Courier New', monospace;
  color: #fff;
  font-weight: 500;
}

.color-text {
  font-size: 13px;
  color: #ccc;
}
```

### File: `web/dashboard/app.js`

**Changes needed:**

1. **Add DOM reference** (line ~59, after `$circumplexValues`):
   ```javascript
   const $colorTriadDisplay = document.getElementById('color-triad-display');
   ```

2. **Create display function** (after `updateCircumplexDisplay`, around line ~1123):
   ```javascript
   /**
    * Update color triad display with primary, secondary, and accent colors
    */
   function updateColorTriadDisplay(color) {
     if (!color || !color.primary || !color.secondary || !color.accent) {
       $colorTriadDisplay.innerHTML = '<span class="color-text">—</span>';
       return;
     }
     
     $colorTriadDisplay.innerHTML = `
       <div class="color-swatch-row">
         <div class="color-swatch" style="background-color: ${color.primary};"></div>
         <div class="color-info">
           <div class="color-label">Primary</div>
           <div class="color-value">${color.primary}</div>
         </div>
       </div>
       <div class="color-swatch-row">
         <div class="color-swatch" style="background-color: ${color.secondary};"></div>
         <div class="color-info">
           <div class="color-label">Secondary</div>
           <div class="color-value">${color.secondary}</div>
         </div>
       </div>
       <div class="color-swatch-row">
         <div class="color-swatch" style="background-color: ${color.accent};"></div>
         <div class="color-info">
           <div class="color-label">Accent</div>
           <div class="color-value">${color.accent}</div>
         </div>
       </div>
     `;
   }
   ```

3. **Call in mindMomentInit handler** (line ~729, after `updateCircumplexDisplay`):
   ```javascript
   // Circumplex (emotional state)
   updateCircumplexDisplay(data.circumplex);
   
   // Color triad (emotional palette)
   updateColorTriadDisplay(data.color);  // ← ADD THIS
   ```

4. **Call in mindMoment handler** (line ~792, after `updateCircumplexDisplay`):
   ```javascript
   // Circumplex (emotional state)
   updateCircumplexDisplay(data.circumplex);
   
   // Color triad (emotional palette)
   updateColorTriadDisplay(data.color);  // ← ADD THIS
   ```

5. **Clear in reset functions** (lines ~637 and ~917):
   ```javascript
   if (circumplexViz) circumplexViz.clear();
   $circumplexValues.innerHTML = '<span class="circumplex-text">—</span>';
   $colorTriadDisplay.innerHTML = '<span class="color-text">—</span>';  // ← ADD THIS
   ```

---

## Phase 5: Update Mind Moment Type Definition

### File: `src/types/mind-moment.js`

**Changes needed:**

1. **Add color to JSDoc** (line ~14):
   ```javascript
   * @property {Object} circumplex - Emotional state (valence and arousal axes)
   * @property {Object|null} color - Color triad (primary, secondary, accent hex colors)
   * @property {Array} visualPercepts - Array of visual percept objects
   ```

2. **Add color to normalization** (line ~54):
   ```javascript
   circumplex: data.circumplex || { valence: 0, arousal: 0 },
   color: data.color || null,
   visualPercepts: data.visualPercepts || data.visual_percepts || [],
   ```

---

## Testing Checklist

### Unit Testing (Manual)
- [ ] Test `circumplexToColor()` with various circumplex values
  - [ ] Center: `{ valence: 0, arousal: 0 }` → should return center colors
  - [ ] Q1 (Happy): `{ valence: 0.8, arousal: 0.6 }` → greenish/cyan
  - [ ] Q2 (Angry): `{ valence: -0.7, arousal: 0.6 }` → reddish/orange
  - [ ] Q3 (Sad): `{ valence: -0.5, arousal: -0.5 }` → dark/muted
  - [ ] Q4 (Calm): `{ valence: 0.5, arousal: -0.5 }` → blue/white
  - [ ] Edge cases: extreme values, NaN, null

### Integration Testing (Live)
- [ ] Start cognition system: `npm start`
- [ ] Trigger mind moment with visual/audio percepts
- [ ] Check server console:
  - [ ] "Color: primary=..., secondary=..., accent=..." logged
- [ ] Check dashboard:
  - [ ] Color triad section appears in center pane
  - [ ] Three color swatches displayed
  - [ ] Hex values shown correctly
  - [ ] Colors update on each new mind moment
- [ ] Test DREAM mode:
  - [ ] Existing moments show "—" (no color yet)
  - [ ] New moments after implementation show colors

### Visual Verification
- [ ] Colors look aesthetically pleasing
- [ ] Color transitions are smooth (not jarring between moments)
- [ ] Color swatches render properly on different screen sizes
- [ ] Hex codes are readable

---

## Implementation Order

1. ✅ **Phase 1**: Create `src/circumplex-to-color.js` (pure function module)
2. ✅ **Phase 2**: Update `src/real-cog.js` (generate colors)
3. ✅ **Phase 3**: Update `src/consciousness-loop.js` (emit colors)
4. ✅ **Phase 4**: Update dashboard (HTML, CSS, JS) (display colors)
5. ✅ **Phase 5**: Update `src/types/mind-moment.js` (type definition)
6. ✅ **Test**: Verify end-to-end flow

---

## Post-Implementation Tasks (Out of Scope for Now)

- [ ] Database migration: Add `color` JSONB column to `mind_moments` table
- [ ] Update `saveMindMoment()` to persist color
- [ ] Backfill script: Regenerate colors for existing mind moments
- [ ] Update DREAM mode to load/display colors from DB
- [ ] Add color to history grid cards (optional enhancement)

---

## Notes

- **No database changes for now** - colors are ephemeral in LIVE mode only
- **DREAM mode** will show "—" for existing moments (no colors in DB yet)
- **Backfill script** will be separate task after live implementation is verified
- **Performance**: Color calculation is ~0.1ms, negligible impact on cognition cycle
- **Prime Directive Compliance**: Pure functions, functional approach, small files, minimal dependencies

---

## Success Criteria

✅ Colors generate correctly from circumplex values  
✅ Colors appear in dashboard center pane immediately on `mindMomentInit`  
✅ Color display matches design pattern of other sections  
✅ No errors in console  
✅ No impact on cognition performance  
✅ Code follows project best practices (pure functions, small files)
