# SigilAndPhrase Component - Extraction Plan

**Goal**: Create a shared, reusable component for sigil rendering + phrase typewriting used by both visual-percept and audio-percept.

---

## Component Design

### Name
`SigilAndPhrase`

### API (Public Methods)
```javascript
sigilAndPhrase.awaiting()           // Show "awaiting sigil..." + thinkingVaried()
sigilAndPhrase.render({phrase, drawCalls})  // Typewrite phrase + drawSigil()
```

### Internal Behavior
- Uses `Sigil.drawSigil(calls)` - draws the sigil
- Uses `Sigil.thinkingVaried()` - animated thinking state
- Uses `typewrite(element, text, speed)` - types phrase character-by-character

### Config Strategy
- Preset config with sensible defaults
- Allow overrides for special cases
- Keep it simple - most editors use same values

---

## File Structure

### New Files
```
prompt-editor/shared/
├── prompt-editor.css          (existing)
├── sigil-and-phrase.js        (NEW - the component)
├── sigil.standalone.js        (MOVE from visual-percept)
└── typewriter.js              (MOVE from visual-percept)
```

### Files to Delete
```
prompt-editor/audio-percept/sigil.standalone.js  (delete - use shared)
```

---

## Implementation Steps

### Step 1: Move shared dependencies
- [ ] Move `prompt-editor/visual-percept/sigil.standalone.js` → `prompt-editor/shared/`
- [ ] Move `prompt-editor/visual-percept/typewriter.js` → `prompt-editor/shared/`
- [ ] Delete `prompt-editor/audio-percept/sigil.standalone.js`

### Step 2: Create SigilAndPhrase component
- [ ] Create `prompt-editor/shared/sigil-and-phrase.js`
- [ ] Import Sigil and typewrite
- [ ] Implement constructor with preset config
- [ ] Implement `awaiting()` method
- [ ] Implement `render({phrase, drawCalls})` method
- [ ] Add drawCalls fixing logic (moveTo before arc)

### Step 3: Update visual-percept
- [ ] Update import: `import { SigilAndPhrase } from '../shared/sigil-and-phrase.js'`
- [ ] Remove old imports: `Sigil`, `typewrite`
- [ ] Update state: `sigil` → `sigilAndPhrase`
- [ ] Replace initialization code
- [ ] Replace `sendFrame()` awaiting logic
- [ ] Replace `renderSigil()` function with `sigilAndPhrase.render()`
- [ ] Update all references throughout file

### Step 4: Update audio-percept
- [ ] Update import: `import { SigilAndPhrase } from '../shared/sigil-and-phrase.js'`
- [ ] Remove old import: `Sigil`
- [ ] Update state: `sigil` → `sigilAndPhrase`
- [ ] Replace initialization code
- [ ] Remove `renderSigil()` function
- [ ] Update `handleResponse()` to use `sigilAndPhrase.render()`

---

## Component Implementation

### `prompt-editor/shared/sigil-and-phrase.js`

```javascript
import { Sigil } from './sigil.standalone.js';
import { typewrite } from './typewriter.js';

/**
 * SigilAndPhrase - Unified component for sigil rendering + phrase typewriting
 * 
 * Usage:
 *   const sap = new SigilAndPhrase({ canvasId: '...', phraseId: '...' });
 *   sap.awaiting();  // When starting request
 *   sap.render({ phrase: 'Steel Fists', drawCalls: 'ctx.beginPath()...' });
 */
export class SigilAndPhrase {
  constructor(config = {}) {
    const {
      canvasId,
      phraseId,
      // Preset defaults (can be overridden)
      canvasSize = 200,
      drawDuration = 200,
      undrawDuration = 300,
      thinkingShiftInterval = 100,
      thinkingVariedMin = 1000,
      thinkingVariedMax = 3000,
      scale = 1.0,
      lineColor = '#fff',
      lineWeight = 1.2,
      awaitingMessage = 'awaiting sigil...',
      awaitingSpeed = 20,
      phraseSpeed = 10
    } = config;
    
    // Store config
    this.awaitingMessage = awaitingMessage;
    this.awaitingSpeed = awaitingSpeed;
    this.phraseSpeed = phraseSpeed;
    
    // Get DOM elements
    this.phraseElement = document.getElementById(phraseId);
    if (!this.phraseElement) {
      throw new Error(`Phrase element not found: ${phraseId}`);
    }
    
    // Initialize Sigil instance
    this.sigil = new Sigil({
      canvas: document.getElementById(canvasId),
      canvasSize,
      drawDuration,
      undrawDuration,
      thinkingShiftInterval,
      thinkingVariedMin,
      thinkingVariedMax,
      scale,
      lineColor,
      lineWeight
    });
    
    // Start in awaiting state
    this.awaiting();
  }
  
  /**
   * PUBLIC API: Set awaiting state
   * Shows "awaiting sigil..." with typewriter + thinking animation
   */
  awaiting() {
    typewrite(this.phraseElement, this.awaitingMessage, this.awaitingSpeed);
    this.sigil.thinkingVaried();
  }
  
  /**
   * PUBLIC API: Render sigil + phrase
   * @param {Object} data - { phrase, drawCalls }
   */
  render({ phrase, drawCalls }) {
    if (!phrase || !drawCalls) {
      console.warn('SigilAndPhrase.render: Missing phrase or drawCalls');
      return;
    }
    
    try {
      // Fix orphaned lines (ensure moveTo before arc calls)
      const fixedDrawCalls = this._fixDrawCalls(drawCalls);
      
      // Typewrite phrase (lowercase for aesthetic consistency)
      typewrite(this.phraseElement, phrase.toLowerCase(), this.phraseSpeed);
      
      // Draw sigil (automatically stops thinking animation)
      this.sigil.drawSigil({ calls: fixedDrawCalls });
      
    } catch (error) {
      console.error('SigilAndPhrase.render failed:', error);
      this.awaiting(); // Fall back to awaiting state
    }
  }
  
  /**
   * INTERNAL: Fix orphaned lines in draw calls
   * Prevents connecting lines to arc starting points
   */
  _fixDrawCalls(drawCalls) {
    return drawCalls.replace(
      /ctx\.arc\(/g,
      (match, offset) => {
        const before = drawCalls.substring(Math.max(0, offset - 50), offset);
        const hasRecentMoveTo = /moveTo\([^)]+\)\s*$/.test(before.trim());
        return hasRecentMoveTo ? match : `ctx.moveTo(arguments[0], arguments[1]);${match}`;
      }
    );
  }
}
```

---

## Migration Details

### Visual-Percept Changes

**Before:**
```javascript
import { Sigil } from './sigil.standalone.js';
import { typewrite } from './typewriter.js';

const state = {
  sigil: null,
  // ...
};

// Init
state.sigil = new Sigil({ canvas: ..., ... });
typewrite(phraseElement, 'awaiting sigil...', 20);
state.sigil.thinkingVaried();

// When sending frame
typewrite(phraseElement, 'awaiting sigil...', 20);
if (state.sigil) {
  state.sigil.thinkingVaried();
}

// When receiving response
function renderSigil(phrase, drawCalls) {
  // ... fixing logic ...
  typewrite(phraseElement, phrase.toLowerCase(), 10);
  if (state.sigil) {
    state.sigil.drawSigil({ calls: fixedDrawCalls });
  }
}
```

**After:**
```javascript
import { SigilAndPhrase } from '../shared/sigil-and-phrase.js';

const state = {
  sigilAndPhrase: null,
  // ...
};

// Init
state.sigilAndPhrase = new SigilAndPhrase({
  canvasId: 'sigil-canvas',
  phraseId: 'sigil-phrase'
});

// When sending frame
state.sigilAndPhrase.awaiting();

// When receiving response
state.sigilAndPhrase.render({
  phrase: data.sigilPhrase,
  drawCalls: data.drawCalls
});
```

### Audio-Percept Changes

**Before:**
```javascript
import { Sigil } from './sigil.standalone.js';

const state = {
  sigil: null,
  // ...
};

// Init
state.sigil = new Sigil({ canvas: ..., ... });
phraseElement.textContent = 'awaiting sigil...';
state.sigil.thinkingVaried();

// When receiving response
function renderSigil(phrase, drawCalls) {
  // ... fixing logic ...
  phraseElement.textContent = phrase;
  if (state.sigil) {
    state.sigil.drawSigil({ calls: fixedDrawCalls });
  }
}
```

**After:**
```javascript
import { SigilAndPhrase } from '../shared/sigil-and-phrase.js';

const state = {
  sigilAndPhrase: null,
  // ...
};

// Init
state.sigilAndPhrase = new SigilAndPhrase({
  canvasId: 'sigil-canvas',
  phraseId: 'sigil-phrase'
});

// When receiving response
state.sigilAndPhrase.render({
  phrase: json.sigilPhrase,
  drawCalls: json.sigilDrawCalls
});
```

---

## Testing Checklist

### Visual-Percept
- [ ] Sigil displays "awaiting sigil..." on init
- [ ] Thinking animation runs on init
- [ ] Clicking "SEND FRAME" shows "awaiting sigil..." + thinking
- [ ] Response renders sigil correctly
- [ ] Phrase typewriter works
- [ ] Continuous mode works
- [ ] Motion-triggered sends work

### Audio-Percept
- [ ] Sigil displays "awaiting sigil..." on init
- [ ] Thinking animation runs on init
- [ ] Starting listening maintains awaiting state
- [ ] Audio response renders sigil correctly
- [ ] Phrase typewriter works
- [ ] Multiple responses work (sigil updates each time)

---

## Benefits

### Code Reduction
- **Visual-percept**: ~50 lines removed (imports, renderSigil function, manual typewrite calls)
- **Audio-percept**: ~40 lines removed (imports, renderSigil function, manual handling)
- **Shared**: ~120 lines in single component (vs ~90 lines duplicated across 2 files)

### Maintenance
- Single place to update sigil rendering logic
- Single place to update typewriter behavior
- Consistent behavior across all tools

### Extensibility
- Easy to add new tools that need sigil rendering
- Easy to add new states (error, loading, etc.) in future
- Easy to customize per-tool if needed (config overrides)

---

## Status

Ready to implement! 🚀

**Estimated time**: 30-45 minutes
**Risk**: Low (clean abstraction, well-defined API)

