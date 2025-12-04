# Sigil PNG Simplification Plan

**Goal:** Replace complex SDF generation with simple transparent PNG rasterization, archive legacy code cleanly.

**Status:** Planning  
**Created:** December 4, 2025  
**Priority:** Medium

---

## Overview

Simplify sigil image generation by removing distance field complexity and moving to straightforward PNG rasterization. Clean up multiple legacy SDF/SVG conversion approaches into organized archive.

### Current State

- **Active:** Canvas code → SDF (512×512 grayscale distance field)
- **Disabled:** SVG generation (stubbed out)
- **Legacy:** 5 different SDF/SVG converter files with overlapping functionality
- **Problem:** Unnecessary complexity for simple display needs

### Target State

- **Active:** Canvas code → PNG (512×512 transparent with white lines)
- **Archived:** All legacy converters in `/src/sigil/legacy/` with README
- **Result:** Simpler, faster, cleaner codebase

---

## Benefits

✅ **Simplicity:** Single conversion path (canvas → PNG)  
✅ **Performance:** Faster than distance field computation  
✅ **File Size:** PNGs compress better than grayscale SDFs  
✅ **Display:** Transparent PNGs work everywhere, no special rendering  
✅ **Maintenance:** Less code, fewer dependencies  
✅ **Clarity:** Legacy code clearly separated and documented

---

## Architecture Changes

### Before
```
LLM → Canvas Code → SDF (distance field) → Database → Display
                 ↓ (disabled)
                SVG (unused)
```

### After
```
LLM → Canvas Code → PNG (transparent) → Database → Display

Legacy: /src/sigil/legacy/
  - canvas-to-sdf.js
  - canvas-to-svg.js
  - svg-to-sdf.js (3 variants)
  - browser-polyfill.js
```

---

## Implementation Phases

### Phase 1: Archive Legacy Code

**Action:** Organize all legacy image generators into `/src/sigil/legacy/`

**Files to Move:**
- `src/sigil/canvas-to-sdf.js` → `src/sigil/legacy/canvas-to-sdf.js`
- `src/sigil/canvas-to-svg.js` → `src/sigil/legacy/canvas-to-svg.js`
- `src/sigil/svg-to-sdf.js` → `src/sigil/legacy/svg-to-sdf.js`
- `src/sigil/svg-to-sdf-library.js` → `src/sigil/legacy/svg-to-sdf-library.js`
- `src/sigil/svg-to-sdf-simple.js` → `src/sigil/legacy/svg-to-sdf-simple.js`
- `src/sigil/browser-polyfill.js` → `src/sigil/legacy/browser-polyfill.js`

**Create:** `src/sigil/legacy/README.md` documenting history and rationale

**Estimated Time:** 10 minutes

---

### Phase 2: Create PNG Generator

**Create:** `src/sigil/canvas-to-png.js`

**Features:**
- 512×512 transparent canvas
- White stroke/fill color
- 0.75× scale factor (prevents edge cutoff)
- 2px stroke width
- Returns PNG buffer

**Key Function:**
```javascript
export async function canvasToPNG(canvasCode, options = {})
  → { data: Buffer, width: 512, height: 512, format: 'png' }
```

**Dependencies:** 
- `canvas` package (already installed)

**Estimated Time:** 15 minutes

---

### Phase 3: Database Schema

**Create:** `src/db/migrations/015_add_sigil_png.sql`

**Changes:**
- Add `sigil_png_data BYTEA` column
- Add `sigil_png_width INTEGER` column (default 512)
- Add `sigil_png_height INTEGER` column (default 512)
- Add index for PNG queries
- Update migration tracker

**Note:** Leaves existing SDF columns intact for now (can remove later)

**Estimated Time:** 5 minutes

---

### Phase 4: Update Cognition Loop

**Edit:** `src/real-cog.js` (lines ~336-400)

**Changes:**
- Replace `canvasToSDF` import with `canvasToPNG`
- Replace SDF generation with PNG generation
- Update database queries (PNG columns instead of SDF)
- Update WebSocket broadcast (PNG data instead of SDF)
- Update history tracking (sigilPNG instead of sigilSDF)

**Key Code:**
```javascript
const { canvasToPNG } = await import('./sigil/canvas-to-png.js');
const sigilPNG = await canvasToPNG(sigilCode, { 
  width: 512, 
  height: 512,
  canvasWidth: 100,
  canvasHeight: 100,
  strokeWidth: 2,
  scale: 0.75
});
```

**Estimated Time:** 15 minutes

---

### Phase 5: API Endpoints

**Edit:** `src/api/sigils-api.js`

**Add Two Endpoints:**

1. **GET `/api/sigils/:id/png`** - PNG metadata
   - Returns: `{ cycle, available, width, height }`

2. **GET `/api/sigils/:id/png/raw`** - PNG image data
   - Returns: Binary PNG with `Content-Type: image/png`

**Pattern:** Copy existing SDF endpoint logic, adapt for PNG columns

**Estimated Time:** 10 minutes

---

### Phase 6: Dashboard UI Updates

**Files to Edit:**
- `web/dashboard/index.html` (simplify layout)
- `web/dashboard/dashboard.css` (PNG display styles)
- `web/dashboard/app.js` (PNG handling logic)

**HTML Changes:**
- Remove "Sigil Formats" section wrapper
- Remove SDF preview container
- Add simple PNG display: `<div class="sigil-png-display">`
- Show as peer to other pane items (not nested)

**CSS Changes:**
- Add `.sigil-png-display` styles
- Center image, max-height 400px
- Crisp edge rendering
- Subtle background only when populated

**JavaScript Changes:**
- Replace SDF variables with PNG (`$pngStatus`, `$pngDisplay`)
- Update WebSocket `sigil` event handler
- Update historical moment display function
- Handle base64 data URLs for live preview
- Add download link to status line

**Estimated Time:** 20 minutes

---

### Phase 7: Backfill Script

**Create:** `scripts/backfill-pngs.js`

**Features:**
- Query all moments with `sigil_code`
- Generate 512×512 transparent PNG for each
- Update `sigil_png_data` column
- Dry run mode (require `--confirm` flag)
- Progress reporting
- Summary statistics

**Usage:**
```bash
# Preview
node scripts/backfill-pngs.js

# Execute
node scripts/backfill-pngs.js --confirm
```

**Performance:** ~0.3s per PNG (estimated)

**Estimated Time:** 15 minutes

---

## Testing Strategy

### 1. Unit Test PNG Generator
```bash
# Create test script
node -e "
import('./src/sigil/canvas-to-png.js').then(async ({ canvasToPNG }) => {
  const testCode = 'ctx.beginPath(); ctx.arc(50, 50, 30, 0, Math.PI * 2); ctx.stroke();';
  const png = await canvasToPNG(testCode);
  require('fs').writeFileSync('test-sigil.png', png.data);
  console.log('✓ Test PNG generated');
});
"
```

### 2. Test New Cognition Cycle
- Start server
- Trigger cognition cycle
- Verify PNG generation in console
- Check WebSocket event includes PNG data
- Confirm database storage

### 3. Test Dashboard Display
- Open dashboard
- Verify live PNG preview appears
- Check historical moment loading
- Test download link
- Verify transparency renders correctly

### 4. Run Backfill
```bash
# Dry run first
node scripts/backfill-pngs.js

# Execute if looks good
node scripts/backfill-pngs.js --confirm
```

### 5. Verify Database
```sql
SELECT 
  COUNT(*) as total,
  COUNT(sigil_code) as with_code,
  COUNT(sigil_png_data) as with_png
FROM mind_moments;
```

---

## Rollback Plan

If issues arise:

1. **Database:** SDF columns remain intact, can revert code
2. **Git:** Commit each phase separately for granular rollback
3. **Legacy:** All old code preserved in `/legacy` folder
4. **Quick Revert:** Restore `src/real-cog.js` from git history

**Key Commits:**
- "Archive legacy sigil converters"
- "Add PNG generator and database schema"
- "Update cognition loop for PNG generation"
- "Update dashboard for PNG display"
- "Add PNG backfill script"

---

## File Checklist

### New Files
- [ ] `src/sigil/legacy/README.md`
- [ ] `src/sigil/canvas-to-png.js`
- [ ] `src/db/migrations/015_add_sigil_png.sql`
- [ ] `scripts/backfill-pngs.js`

### Modified Files
- [ ] `src/real-cog.js` (PNG generation)
- [ ] `src/api/sigils-api.js` (PNG endpoints)
- [ ] `web/dashboard/index.html` (simplified layout)
- [ ] `web/dashboard/dashboard.css` (PNG styles)
- [ ] `web/dashboard/app.js` (PNG handling)

### Moved Files
- [ ] `src/sigil/canvas-to-sdf.js` → `legacy/`
- [ ] `src/sigil/canvas-to-svg.js` → `legacy/`
- [ ] `src/sigil/svg-to-sdf.js` → `legacy/`
- [ ] `src/sigil/svg-to-sdf-library.js` → `legacy/`
- [ ] `src/sigil/svg-to-sdf-simple.js` → `legacy/`
- [ ] `src/sigil/browser-polyfill.js` → `legacy/`

---

## Estimated Timeline

| Phase | Task | Time |
|-------|------|------|
| 1 | Archive legacy code | 10 min |
| 2 | Create PNG generator | 15 min |
| 3 | Database migration | 5 min |
| 4 | Update cognition loop | 15 min |
| 5 | API endpoints | 10 min |
| 6 | Dashboard updates | 20 min |
| 7 | Backfill script | 15 min |
| | **Testing** | 20 min |
| | **Total** | **110 min (~2 hours)** |

---

## Success Criteria

✅ All legacy converters archived with documentation  
✅ PNG generator produces 512×512 transparent images  
✅ New cognition cycles generate PNGs automatically  
✅ Dashboard displays PNGs correctly  
✅ Backfill script processes all historical moments  
✅ No SDF references remain in active code  
✅ Database schema updated with PNG columns  
✅ API endpoints serve PNG data  
✅ All tests pass  
✅ Code is cleaner and simpler than before

---

## Post-Implementation Cleanup (Future)

After PNG system is stable for 1-2 weeks:

1. **Remove SDF Columns:** Migration to drop `sigil_sdf_*` columns
2. **Remove Old Scripts:** Archive `backfill-sdfs.js`, `test-scaled-sdf.js`
3. **Update Documentation:** Remove SDF references from other docs
4. **Consider Legacy Deletion:** After 1 month, potentially delete `/legacy` folder entirely

---

## Notes

- **Prime Directive Alignment:** ✅ Functional, small files, minimal dependencies
- **Database Safety:** Old columns preserved during transition
- **Backward Compatible:** History grid still renders via canvas code
- **Performance Win:** PNGs generate ~2× faster than SDFs
- **Future Proof:** PNG format is universal, no special rendering needed

---

## References

- Current SDF implementation: `src/sigil/canvas-to-sdf.js`
- Cognition loop: `src/real-cog.js` (lines 315-400)
- Dashboard display: `web/dashboard/app.js` (lines 444-737)
- Database schema: `src/db/migrations/014_add_sigil_svg_sdf.sql`

---

**Ready to implement:** Switch to agent mode and execute phases 1-7 in order.

