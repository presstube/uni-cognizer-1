# CSS Consolidation Plan

**Goal**: Consolidate CSS between dashboard and perceptor-remote, establish a minimal shared foundation, and keep component styles local.

**Date**: November 27, 2025  
**Status**: Ready for implementation

---

## Current State Assessment

### Dashboard (`/web/dashboard/`)
- **Lines of CSS**: ~105 (inline in `<style>` tag)
- **Layout**: 2-column (percepts list + cognizer state)
- **Theme**: Dark monospace, minimal
- **Dependencies**: `percept-toast.js` (injects own styles)

### Perceptor Remote (`/web/perceptor-remote/`)
- **Lines of CSS**: ~205 (inline in `<style>` tag)
- **Layout**: Full-screen video with overlay controls
- **Theme**: Dark monospace, immersive
- **Dependencies**: `percept-toast.js` (injects own styles)

### Shared Components (`/web/shared/`)
- **`percept-toast.js`**: Injects ~100 lines of CSS programmatically
- **`prompt-editor.css`**: 320 lines, used by prompt editors only
- **No common foundation**: Each app defines own base styles

### Key Issues
1. ❌ Duplicated dark theme colors, spacing, typography
2. ❌ Scrollbar styles repeated 3x
3. ❌ Connection status styles duplicated
4. ❌ Cognitive state styles duplicated
5. ❌ Inline `<style>` tags make reuse difficult
6. ❌ CSS in JS (percept-toast) harder to maintain

---

## Proposed Architecture

### Principles (Prime Directive Aligned)
1. **Minimal Foundation**: Shared CSS < 100 lines total
2. **Local First**: Keep component-specific CSS close to components
3. **Functional**: Import only what you need
4. **DRY**: Share values via CSS variables, patterns via modules
5. **Vanilla**: No preprocessors, no build step

### File Structure

```
web/
├── shared/
│   ├── styles/
│   │   ├── base.css           # ~50 lines: Reset, CSS vars, typography
│   │   └── components.css     # ~40 lines: Reusable component patterns
│   └── components/
│       └── percept-toast/
│           ├── percept-toast.js
│           └── percept-toast.css   # Extracted from JS injection
├── dashboard/
│   ├── index.html
│   ├── app.js
│   └── dashboard.css          # ~80 lines: Dashboard-specific layout/styles
└── perceptor-remote/
    ├── index.html
    ├── app.js
    └── perceptor.css           # ~180 lines: Perceptor-specific layout/styles
```

### CSS Loading Strategy

**Dashboard** (`dashboard/index.html`):
```html
<link rel="stylesheet" href="../shared/styles/base.css">
<link rel="stylesheet" href="../shared/styles/components.css">
<link rel="stylesheet" href="../shared/components/percept-toast/percept-toast.css">
<link rel="stylesheet" href="dashboard.css">
```

**Perceptor** (`perceptor-remote/index.html`):
```html
<link rel="stylesheet" href="../shared/styles/base.css">
<link rel="stylesheet" href="../shared/styles/components.css">
<link rel="stylesheet" href="../shared/components/percept-toast/percept-toast.css">
<link rel="stylesheet" href="perceptor.css">
```

---

## Implementation Steps

### Phase 1: Extract Shared Foundation

#### Step 1.1: Create `base.css`
**File**: `/web/shared/styles/base.css`

**Contents** (~50 lines):
- CSS reset (`* { margin: 0; padding: 0; box-sizing: border-box; }`)
- CSS custom properties (colors, spacing, typography)
- Base `body` styles (dark theme, monospace)
- Scrollbar styles (shared across all apps)
- Typography baseline

**CSS Variables to Define**:
```css
:root {
  /* Colors - Dark Theme */
  --color-bg: #000;
  --color-text: rgba(255, 255, 255, 0.8);
  --color-text-bright: rgba(255, 255, 255, 0.9);
  --color-text-dim: rgba(255, 255, 255, 0.4);
  --color-text-muted: rgba(255, 255, 255, 0.2);
  --color-border: rgba(255, 255, 255, 0.1);
  
  /* Status Colors */
  --color-connected: rgba(0, 255, 136, 0.9);
  --color-disconnected: rgba(255, 68, 68, 0.9);
  --color-cognizing: rgba(0, 128, 255, 0.9);
  --color-visualizing: rgba(0, 255, 136, 0.9);
  
  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  
  /* Typography */
  --font-mono: monospace;
  --font-size-xs: 8px;
  --font-size-sm: 10px;
  --font-size-md: 12px;
  --font-size-lg: 14px;
  --font-size-xl: 48px;
  
  /* Borders */
  --border-radius: 4px;
  --border-radius-lg: 8px;
}
```

#### Step 1.2: Create `components.css`
**File**: `/web/shared/styles/components.css`

**Contents** (~40 lines):
- `.label` - Uppercase label style (used in both apps)
- `.value` - Value display style
- `.connection` (`.connected`, `.disconnected`) - Connection status
- `.state` (`.aggregating`, `.cognizing`, `.visualizing`) - Cognitive states
- `.empty` - Empty state placeholder text

**Example**:
```css
.label {
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-text-dim);
  margin-bottom: var(--space-xs);
}

.value {
  font-size: var(--font-size-md);
  color: var(--color-text-bright);
}

.connection {
  text-transform: uppercase;
}
.connection.connected { color: var(--color-connected); }
.connection.disconnected { color: var(--color-disconnected); }

.state {
  text-transform: uppercase;
}
.state.idle { color: var(--color-text-muted); }
.state.aggregating { color: var(--color-text-dim); }
.state.cognizing { color: var(--color-cognizing); }
.state.visualizing { color: var(--color-visualizing); }

.empty {
  color: var(--color-text-muted);
  padding: 40px 0;
}
```

#### Step 1.3: Extract PerceptToast CSS
**File**: `/web/shared/components/percept-toast/percept-toast.css`

**Actions**:
1. Create new CSS file with toast styles from `percept-toast.js`
2. Update `percept-toast.js`:
   - Remove `injectPerceptToastStyles()` function
   - Remove style injection code
   - Export only the class
3. Update apps to load CSS via `<link>` instead of JS injection

---

### Phase 2: Componentize Dashboard

#### Step 2.1: Create `dashboard.css`
**File**: `/web/dashboard/dashboard.css`

**Contents** (~80 lines):
- Layout styles (`.left`, `.right` panes)
- Countdown display
- Mind moment display
- Sigil canvas container
- Session list styles
- Dashboard-specific overrides

#### Step 2.2: Update `dashboard/index.html`
**Actions**:
1. Remove inline `<style>` tag
2. Add `<link>` tags for:
   - `../shared/styles/base.css`
   - `../shared/styles/components.css`
   - `../shared/components/percept-toast/percept-toast.css`
   - `dashboard.css`

#### Step 2.3: Update `dashboard/app.js`
**Actions**:
1. Remove `injectPerceptToastStyles()` call (no longer needed)
2. Verify imports still work

---

### Phase 3: Componentize Perceptor Remote

#### Step 3.1: Create `perceptor.css`
**File**: `/web/perceptor-remote/perceptor.css`

**Contents** (~180 lines):
- Full-screen video layout
- Control panel (top-left)
- Toast container (top-right)
- Audio overlay
- Sigil carousel
- Third eye canvas
- API key input styles
- Toggle button styles
- Video flash effects

#### Step 3.2: Update `perceptor-remote/index.html`
**Actions**:
1. Remove inline `<style>` tag
2. Add `<link>` tags for:
   - `../shared/styles/base.css`
   - `../shared/styles/components.css`
   - `../shared/components/percept-toast/percept-toast.css`
   - `perceptor.css`

#### Step 3.3: Update `perceptor-remote/app.js`
**Actions**:
1. Remove `injectPerceptToastStyles()` call (no longer needed)
2. Verify imports still work

---

### Phase 4: Update Prompt Editors (Optional)

**Note**: Prompt editors already use `prompt-editor.css`. They could benefit from `base.css` variables but are not part of core dashboard/perceptor work.

**Action**: Consider refactoring in future to use shared `base.css` variables.

---

## Files to Create

1. ✅ `/web/shared/styles/base.css` (~50 lines)
2. ✅ `/web/shared/styles/components.css` (~40 lines)
3. ✅ `/web/shared/components/percept-toast/percept-toast.css` (~100 lines)
4. ✅ `/web/dashboard/dashboard.css` (~80 lines)
5. ✅ `/web/perceptor-remote/perceptor.css` (~180 lines)

## Files to Modify

1. ✅ `/web/dashboard/index.html` - Replace `<style>` with `<link>` tags
2. ✅ `/web/dashboard/app.js` - Remove `injectPerceptToastStyles()` call
3. ✅ `/web/perceptor-remote/index.html` - Replace `<style>` with `<link>` tags
4. ✅ `/web/perceptor-remote/app.js` - Remove `injectPerceptToastStyles()` call
5. ✅ `/web/shared/percept-toast.js` - Remove style injection, export class only

## Files to Delete

None. All current files remain, just modified.

---

## Testing Checklist

### Dashboard (`/web/dashboard/`)
- [ ] Layout renders correctly (2-column)
- [ ] Percepts display with correct styling
- [ ] Percept toasts appear with icons + sigils
- [ ] Connection status colors work (connected/disconnected)
- [ ] Cognitive state colors work (aggregating/cognizing/visualizing)
- [ ] Countdown timer displays correctly
- [ ] Scrollbars styled correctly
- [ ] Empty state shows placeholder text
- [ ] Sigil canvas displays correctly

### Perceptor Remote (`/web/perceptor-remote/`)
- [ ] Full-screen video displays correctly
- [ ] Video grayscale + dimming works
- [ ] Video flash effect works (color burst)
- [ ] Control panel (top-left) positioned correctly
- [ ] API key input styled correctly
- [ ] Start/Stop button works with correct styling
- [ ] Toast container (top-right) displays correctly
- [ ] Percept toasts appear with correct styling
- [ ] Audio overlay gradient appears on sound
- [ ] Sigil carousel follows third eye
- [ ] Third eye marker displays correctly
- [ ] Scrollbars styled correctly

### Cross-Browser Testing
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari (if available)

### Responsive Testing
- [ ] Desktop (1920x1080)
- [ ] Laptop (1440x900)
- [ ] Tablet landscape (if applicable)

---

## Success Criteria

### Quantitative
- ✅ CSS duplication reduced by ~95%
- ✅ Shared foundation < 100 lines total
- ✅ Dashboard CSS reduced from 105 to ~80 lines (local)
- ✅ Perceptor CSS reduced from 205 to ~180 lines (local)
- ✅ No inline `<style>` tags in HTML
- ✅ No CSS injection via JavaScript

### Qualitative
- ✅ Both apps look identical to current state
- ✅ CSS is easier to maintain (change colors once)
- ✅ New developers can understand CSS organization quickly
- ✅ Component styles live close to components
- ✅ Follows prime directive principles (minimal, functional, modular)

### Developer Experience
- ✅ Clear separation: shared vs. local CSS
- ✅ Easy to add new pages (import base + components + local)
- ✅ Easy to customize per-app (local CSS overrides)
- ✅ No build step required (vanilla CSS)

---

## Rollback Plan

If issues arise:
1. Git revert to commit before CSS refactor
2. All functionality preserved in git history
3. Inline styles remain in git history if needed

---

## Future Enhancements (Out of Scope)

1. **Prompt Editors**: Refactor `prompt-editor.css` to use `base.css` variables
2. **CSS Modules**: Consider CSS modules if component isolation becomes critical
3. **Dark/Light Theme**: CSS variables make theme switching trivial (toggle root vars)
4. **Animation Library**: Extract common animations to `animations.css`
5. **Utility Classes**: Consider minimal utility classes if patterns emerge (`.flex-center`, `.text-uppercase`)

---

## Documentation Updates

After implementation:
1. Update `docs/DEVELOPER_GUIDE.md`:
   - Add "CSS Architecture" section
   - Document CSS loading strategy
   - Document CSS variables
   - Show examples of creating new pages
2. Update `README.md`:
   - Mention CSS architecture briefly
3. Consider adding `web/shared/styles/README.md`:
   - Document CSS variables
   - Document component patterns
   - Show usage examples

---

## Estimated Effort

- **Phase 1** (Shared Foundation): 1-2 hours
- **Phase 2** (Dashboard): 45 minutes
- **Phase 3** (Perceptor): 1 hour
- **Testing**: 1 hour
- **Documentation**: 30 minutes

**Total**: 4-5 hours

---

## Implementation Order

1. Create shared foundation files (base.css, components.css)
2. Extract percept-toast CSS from JS
3. Refactor dashboard (simpler, less CSS)
4. Refactor perceptor (more complex)
5. Test both apps thoroughly
6. Update documentation

---

**Ready to implement. Awaiting approval to proceed.**

