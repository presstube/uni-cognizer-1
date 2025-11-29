# Prompt Editor CSS Consolidation Analysis

**Date**: November 27, 2025  
**Purpose**: Review prompt editors and align with new CSS foundation established in dashboard/perceptor-remote

---

## Current State

### Prompt Editor Apps (4 total)

1. `/web/prompt-editor/personality/` - Personality Forge
2. `/web/prompt-editor/sigil/` - Sigil Prompt Editor
3. `/web/prompt-editor/visual-percept/` - Visual Percept Editor
4. `/web/prompt-editor/audio-percept/` - Audio Percept Editor

### Current CSS Architecture

**Each editor has:**
- `index.html` - Main HTML file
- `style.css` - Local CSS file (250-350 lines each)
- `editor.js` / `forge.js` - JavaScript logic

**Shared CSS:**
- `/web/shared/prompt-editor.css` (320 lines) - ONLY used by audio-percept editor currently
- Other 3 editors have completely independent `style.css` files

### Problems Identified

❌ **Massive Duplication**: 4 editors × ~300 lines = ~1200 lines of CSS with 80% duplication  
❌ **No CSS Variables**: Hardcoded colors, spacing, typography in each file  
❌ **Inconsistent Styling**: Similar but slightly different across editors  
❌ **No Shared Foundation**: Each editor re-defines reset, scrollbars, base styles  
❌ **Diverged from Best Practices**: Different from dashboard/perceptor-remote architecture  

---

## Comparison: Current vs. New Foundation

### Current Prompt Editors

```css
/* personality/style.css (350 lines) */
* { margin: 0; padding: 0; box-sizing: border-box; }
body { 
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 14px;
  color: #ddd;
  background: #0a0a0a;
  /* ... */
}
/* Hardcoded colors throughout */
.btn-primary { background: #4CAF50; }
.btn-secondary { background: #2196F3; }
/* ... 300+ more lines */
```

### New Foundation (Dashboard/Perceptor)

```css
/* base.css - CSS variables */
:root {
  --color-bg: #000;
  --color-text: rgba(255, 255, 255, 0.8);
  --space-md: 16px;
  /* ... */
}

/* local css - uses variables */
.btn-primary { background: var(--color-primary); }
```

---

## Recommended Architecture

### Shared Foundation (Extend Existing)

**`/web/shared/styles/base.css`** - Add prompt-editor-specific variables:
```css
:root {
  /* Add: */
  --color-primary: #4CAF50;
  --color-secondary: #2196F3;
  --color-danger: #f44336;
  --color-input-bg: #1a1a1a;
  --color-input-border: #3a3a3a;
  --border-radius-input: 6px;
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
```

**`/web/shared/styles/prompt-editor-base.css`** - NEW shared file for prompt editors:
- Two-column grid layout (left editor, right preview)
- Form elements (inputs, selects, textareas, buttons)
- Button variants (primary, secondary, danger, success)
- Pane styling
- ~150 lines, replaces 1200+ lines across 4 files

### Local CSS (Per Editor)

Each editor keeps its own `style.css` for unique features:
- **personality**: Mock percepts dropdown, output results panel
- **sigil**: Canvas wrapper, phrase input, reference image display, LLM settings panel
- **visual-percept**: Motion detector UI, camera preview
- **audio-percept**: Audio waveform display, sample rate controls

**Target**: ~50-100 lines each (down from 250-350 lines)

---

## Implementation Plan

### Phase 1: Extend Shared Foundation
- [x] Add prompt-editor variables to `base.css`
- [x] Create `prompt-editor-base.css` with shared patterns

### Phase 2: Migrate Each Editor (Priority Order)
1. **audio-percept** - Already uses shared CSS, easiest to migrate
2. **personality** - Simplest editor, good test case
3. **visual-percept** - Medium complexity
4. **sigil** - Most complex (LLM controls, image upload)

### Phase 3: Extract Sigil-and-Phrase Component
- [x] Extract CSS from JS to `/web/shared/components/sigil-and-phrase/sigil-and-phrase.css`
- [x] Update component to reference CSS file instead of injection

### Phase 4: Cleanup
- [ ] Remove duplicate `prompt-editor.css` (or deprecate/rename)
- [ ] Update documentation

---

## Migration Pattern (Per Editor)

### Example: Personality Forge

**Before** (`personality/index.html`):
```html
<link rel="stylesheet" href="style.css">
```

**After**:
```html
<!-- Shared foundation -->
<link rel="stylesheet" href="../../shared/styles/base.css">
<link rel="stylesheet" href="../../shared/styles/prompt-editor-base.css">
<!-- Local overrides -->
<link rel="stylesheet" href="style.css">
```

**Before** (`personality/style.css` - 350 lines):
```css
* { margin: 0; padding: 0; box-sizing: border-box; }
body { /* ... */ }
.left-pane { /* ... */ }
.btn-primary { background: #4CAF50; }
/* ... 300+ lines of shared patterns */
```

**After** (`personality/style.css` - ~80 lines):
```css
/* Only personality-specific styles */
#preset-select { /* ... */ }
#results { /* ... */ }
.output-text { /* ... */ }
```

---

## Benefits

### Quantitative
- **CSS Reduction**: ~1200 lines → ~400 lines total (67% reduction)
- **Shared**: base.css (75) + prompt-editor-base.css (150) = 225 lines
- **Local**: 4 editors × 50 lines = 200 lines (down from 1200 lines)

### Qualitative
- ✅ **Consistent**: All editors use same colors, spacing, typography
- ✅ **Maintainable**: Change button color once, affects all 4 editors
- ✅ **Themeable**: CSS variables enable easy theming
- ✅ **DRY**: Zero duplication of common patterns
- ✅ **Aligned**: Same architecture as dashboard/perceptor-remote
- ✅ **Prime Directive**: Functional, modular, minimal

---

## File Structure (After Migration)

```
web/
├── shared/
│   ├── styles/
│   │   ├── base.css                        # ~90 lines (extended)
│   │   ├── components.css                  # ~50 lines
│   │   └── prompt-editor-base.css          # ~150 lines (NEW)
│   └── components/
│       ├── percept-toast/
│       │   └── percept-toast.css
│       └── sigil-and-phrase/
│           └── sigil-and-phrase.css        # ~30 lines (NEW)
├── prompt-editor/
│   ├── personality/
│   │   ├── index.html                      # Links to 3 CSS files
│   │   ├── style.css                       # ~80 lines (local only)
│   │   └── forge.js
│   ├── sigil/
│   │   ├── index.html                      # Links to 3 CSS files
│   │   ├── style.css                       # ~100 lines (local only)
│   │   └── editor.js
│   ├── visual-percept/
│   │   ├── index.html                      # Links to 3 CSS files
│   │   ├── style.css                       # ~90 lines (local only)
│   │   └── editor.js
│   └── audio-percept/
│       ├── index.html                      # Links to 3 CSS files
│       ├── style.css                       # ~60 lines (local only)
│       └── editor.js
```

---

## Estimated Effort

- **Phase 1** (Extend foundation): 30 minutes
- **Phase 2** (Migrate 4 editors): 2 hours (30 min each)
- **Phase 3** (Extract sigil-and-phrase): 20 minutes
- **Phase 4** (Cleanup): 15 minutes

**Total**: ~3 hours

---

## Success Criteria

- [ ] All 4 editors use `base.css` + `prompt-editor-base.css`
- [ ] Local `style.css` files < 100 lines each
- [ ] Zero CSS duplication across editors
- [ ] All editors visually identical to current state
- [ ] sigil-and-phrase component uses external CSS (no JS injection)
- [ ] Documentation updated

---

## Next Steps

1. Create `prompt-editor-base.css` with shared patterns
2. Extend `base.css` with prompt-editor variables
3. Extract sigil-and-phrase CSS
4. Migrate each editor one by one
5. Test all 4 editors thoroughly
6. Update documentation

---

**Ready to implement. Awaiting approval to proceed.**

