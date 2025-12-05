# Percept PNG Implementation Plan

Generate and display PNG icons for visual and audio percepts.

---

## Overview

Percepts already contain canvas drawing code (`drawCalls` for visual, `sigilDrawCalls` for audio). We need to:
1. Render these to 256×256 PNG (white on transparent) as percepts arrive
2. Store PNG data in database alongside percept JSON
3. Backfill existing percepts
4. Display percept PNGs in UI (20×20px grid)

---

## Phase 1: Database Schema

### Add PNG columns to `mind_moments` table

**New Migration:** `017_add_percept_pngs.sql`

```sql
-- Add JSONB arrays to store PNG metadata for each percept
-- Keeps PNG data alongside the percept it represents

ALTER TABLE mind_moments 
  ADD COLUMN IF NOT EXISTS visual_percept_pngs JSONB DEFAULT '[]'::jsonb;

ALTER TABLE mind_moments 
  ADD COLUMN IF NOT EXISTS audio_percept_pngs JSONB DEFAULT '[]'::jsonb;

-- Each array element structure:
-- {
--   "index": 0,              // Corresponds to percept index in visual_percepts/audio_percepts
--   "png_data": <bytea>,     // PNG buffer as base64 string in JSONB
--   "width": 256,
--   "height": 256
-- }

COMMENT ON COLUMN mind_moments.visual_percept_pngs IS 
  'Array of PNG icon data for each visual percept, indexed to visual_percepts array';

COMMENT ON COLUMN mind_moments.audio_percept_pngs IS 
  'Array of PNG icon data for each audio percept, indexed to audio_percepts array';
```

**Alternative approach (simpler):** Store PNGs directly in percept JSONB:
- Add `pngData` field to each percept object in `visual_percepts`/`audio_percepts`
- No new columns needed
- PNGs travel with percepts automatically

**Recommendation:** Use alternative (embed in percept objects) for simplicity.

---

## Phase 2: PNG Generation Module

**New file:** `src/percepts/percept-to-png.js`

```javascript
import { canvasToPNG } from '../sigil/canvas-to-png.js';

/**
 * Generate PNG from percept canvas code
 * @param {Object} percept - Visual or audio percept with drawCalls/sigilDrawCalls
 * @returns {Promise<Object>} { data: Buffer, width: 256, height: 256, format: 'png' }
 */
export async function perceptToPNG(percept) {
  const canvasCode = percept.drawCalls || percept.sigilDrawCalls;
  
  if (!canvasCode) {
    throw new Error('Percept has no canvas drawing code');
  }
  
  return await canvasToPNG(canvasCode, {
    width: 256,
    height: 256,
    canvasWidth: 100,
    canvasHeight: 100,
    strokeWidth: 1.5,  // Slightly thicker for smaller size
    scale: 1.0
  });
}

/**
 * Generate PNGs for all percepts in a mind moment
 * @param {Array} visualPercepts - Array of visual percepts
 * @param {Array} audioPercepts - Array of audio percepts
 * @returns {Promise<Object>} { visualPNGs: Buffer[], audioPNGs: Buffer[] }
 */
export async function generatePerceptPNGs(visualPercepts = [], audioPercepts = []) {
  const visualPNGs = [];
  const audioPNGs = [];
  
  // Generate visual percept PNGs
  for (const percept of visualPercepts) {
    try {
      const png = await perceptToPNG(percept);
      visualPNGs.push(png);
    } catch (error) {
      console.warn(`Failed to generate PNG for visual percept:`, error.message);
      visualPNGs.push(null);
    }
  }
  
  // Generate audio percept PNGs
  for (const percept of audioPercepts) {
    try {
      const png = await perceptToPNG(percept);
      audioPNGs.push(png);
    } catch (error) {
      console.warn(`Failed to generate PNG for audio percept:`, error.message);
      audioPNGs.push(null);
    }
  }
  
  return { visualPNGs, audioPNGs };
}
```

---

## Phase 3: Hook into Percept Ingestion

### Find where percepts enter the system

**Key question:** Where are percepts created/received?

Possible locations:
1. `src/real-cog.js` - Receives percepts in `cognize()` function
2. WebSocket server (`server.js`) - Receives `percept` events from clients
3. External system (aggregator-1?) sending formatted percepts

**Action:** Investigate percept flow to determine hook point.

**Most likely:** Percepts arrive via WebSocket and are passed to `cognize()`. Hook should be:
- **After** percepts are received
- **Before** they're saved to database

### Modify `src/real-cog.js`

In `cognize()` function, after receiving percepts but before saving to DB:

```javascript
// Import at top
import { generatePerceptPNGs } from './percepts/percept-to-png.js';

// In cognize() function, before dbSaveMindMoment()
try {
  const { visualPNGs, audioPNGs } = await generatePerceptPNGs(visualPercepts, audioPercepts);
  
  // Embed PNG data into percept objects
  visualPercepts.forEach((percept, i) => {
    if (visualPNGs[i]) {
      percept.pngData = visualPNGs[i].data.toString('base64');
      percept.pngWidth = visualPNGs[i].width;
      percept.pngHeight = visualPNGs[i].height;
    }
  });
  
  audioPercepts.forEach((percept, i) => {
    if (audioPNGs[i]) {
      percept.pngData = audioPNGs[i].data.toString('base64');
      percept.pngWidth = audioPNGs[i].width;
      percept.pngHeight = audioPNGs[i].height;
    }
  });
  
  console.log(`✓ Generated ${visualPNGs.length} visual + ${audioPNGs.length} audio percept PNGs`);
} catch (error) {
  console.warn('⚠️  Failed to generate percept PNGs:', error.message);
  // Continue without PNGs - don't block mind moment
}
```

---

## Phase 4: Backfill Script

**New file:** `scripts/backfill-percept-pngs.js`

```javascript
import 'dotenv/config';
import { initDatabase, getPool } from '../src/db/index.js';
import { generatePerceptPNGs } from '../src/percepts/percept-to-png.js';

async function backfillPerceptPNGs(limit = null) {
  initDatabase();
  const pool = getPool();
  
  // Query mind moments with percepts but without PNG data
  const query = limit
    ? `SELECT id, cycle, visual_percepts, audio_percepts 
       FROM mind_moments 
       WHERE (jsonb_array_length(visual_percepts) > 0 OR jsonb_array_length(audio_percepts) > 0)
       ORDER BY cycle DESC 
       LIMIT $1`
    : `SELECT id, cycle, visual_percepts, audio_percepts 
       FROM mind_moments 
       WHERE (jsonb_array_length(visual_percepts) > 0 OR jsonb_array_length(audio_percepts) > 0)
       ORDER BY cycle DESC`;
  
  const params = limit ? [limit] : [];
  const result = await pool.query(query, params);
  
  console.log(`\n🔄 Backfilling ${result.rows.length} mind moments with percept PNGs...\n`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const row of result.rows) {
    try {
      const visualPercepts = row.visual_percepts || [];
      const audioPercepts = row.audio_percepts || [];
      
      // Generate PNGs
      const { visualPNGs, audioPNGs } = await generatePerceptPNGs(visualPercepts, audioPercepts);
      
      // Embed PNG data into percept objects
      visualPercepts.forEach((percept, i) => {
        if (visualPNGs[i]) {
          percept.pngData = visualPNGs[i].data.toString('base64');
          percept.pngWidth = visualPNGs[i].width;
          percept.pngHeight = visualPNGs[i].height;
        }
      });
      
      audioPercepts.forEach((percept, i) => {
        if (audioPNGs[i]) {
          percept.pngData = audioPNGs[i].data.toString('base64');
          percept.pngWidth = audioPNGs[i].width;
          percept.pngHeight = audioPNGs[i].height;
        }
      });
      
      // Update database
      await pool.query(
        `UPDATE mind_moments 
         SET visual_percepts = $1, audio_percepts = $2 
         WHERE id = $3`,
        [JSON.stringify(visualPercepts), JSON.stringify(audioPercepts), row.id]
      );
      
      successCount++;
      console.log(`✓ Cycle ${row.cycle}: ${visualPNGs.length} visual + ${audioPNGs.length} audio PNGs`);
      
    } catch (error) {
      errorCount++;
      console.error(`✗ Cycle ${row.cycle}: ${error.message}`);
    }
  }
  
  console.log(`\n📊 Complete: ${successCount} success, ${errorCount} errors\n`);
  process.exit(0);
}

// Parse command line args
const limit = process.argv[2] ? parseInt(process.argv[2]) : null;

backfillPerceptPNGs(limit);
```

**Usage:**
```bash
# Test on latest 10 mind moments
node scripts/backfill-percept-pngs.js 10

# Backfill all
node scripts/backfill-percept-pngs.js
```

---

## Phase 5: UI Component

### Add percept PNG grid to mind moment pane

**File:** `web/dashboard/app.js` (or wherever mind moment UI lives)

**Location:** At the end of the mind moment display panel

```javascript
function renderPerceptGrid(visualPercepts = [], audioPercepts = []) {
  const allPercepts = [...visualPercepts, ...audioPercepts];
  
  if (allPercepts.length === 0) return '';
  
  const perceptIcons = allPercepts
    .filter(p => p.pngData)
    .map(percept => {
      const dataUrl = `data:image/png;base64,${percept.pngData}`;
      return `<img 
        src="${dataUrl}" 
        alt="${percept.description || percept.sigilPhrase || 'percept'}"
        title="${percept.description || percept.sigilPhrase || 'percept'}"
        class="percept-icon" />`;
    })
    .join('');
  
  return `
    <div class="percept-grid">
      ${perceptIcons}
    </div>
  `;
}
```

**CSS:**
```css
.percept-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, 20px);
  gap: 4px;
  margin-top: 12px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 4px;
}

.percept-icon {
  width: 20px;
  height: 20px;
  display: block;
  opacity: 0.8;
  transition: opacity 0.2s, transform 0.2s;
  cursor: pointer;
}

.percept-icon:hover {
  opacity: 1;
  transform: scale(3);
  z-index: 100;
}
```

### Integration point

In the function that renders mind moments (likely `displayMindMoment()` or similar):

```javascript
function displayMindMoment(moment) {
  const html = `
    <div class="mind-moment">
      <div class="cycle">Cycle ${moment.cycle}</div>
      <div class="text">${moment.mind_moment}</div>
      <div class="sigil-phrase">"${moment.sigil_phrase}"</div>
      
      <!-- Existing sigil display -->
      <div class="sigil">...</div>
      
      <!-- NEW: Percept grid at the end -->
      ${renderPerceptGrid(moment.visual_percepts, moment.audio_percepts)}
    </div>
  `;
  
  return html;
}
```

---

## Implementation Order

### Step 1: Test on Latest 10 (Manual)
1. Create `src/percepts/percept-to-png.js`
2. Create `scripts/backfill-percept-pngs.js`
3. Run: `node scripts/backfill-percept-pngs.js 10`
4. Verify PNGs are embedded in percept JSONB
5. Query DB to confirm data structure

### Step 2: Live Integration
1. Modify `src/real-cog.js` to generate PNGs on percept arrival
2. Test with live system (fake server first)
3. Verify new mind moments have PNG data

### Step 3: Backfill All
1. Run: `node scripts/backfill-percept-pngs.js`
2. Monitor progress and errors

### Step 4: UI Component
1. Add `renderPerceptGrid()` to dashboard
2. Add CSS for percept grid
3. Test hover zoom effect
4. Deploy to test client

---

## Testing Checklist

- [ ] PNG generation works for visual percepts
- [ ] PNG generation works for audio percepts
- [ ] PNGs are 256×256, white on transparent
- [ ] PNGs are embedded in percept JSONB as base64
- [ ] Backfill script works on 10 mind moments
- [ ] Backfill script handles errors gracefully
- [ ] Live system generates PNGs for new percepts
- [ ] UI displays percept grid (20×20px)
- [ ] Hover zoom works on percept icons
- [ ] Performance is acceptable (PNG generation doesn't block cognitive cycle)

---

## Database Size Considerations

**Per percept PNG:**
- 256×256 white-on-transparent PNG ≈ 5-15 KB
- Stored as base64 in JSONB ≈ 7-20 KB

**Per mind moment:**
- ~5-10 percepts average
- Total: ~50-200 KB per mind moment

**1000 mind moments:** ~50-200 MB (acceptable)

---

## Future Optimizations

1. **Lazy loading:** Only generate PNGs when requested via API
2. **Caching:** Store PNGs separately in file storage, reference by hash
3. **Deduplication:** Cache by canvas code hash (many percepts are identical)
4. **Compression:** Use more aggressive PNG compression
5. **WebP format:** Switch to WebP for better compression (~30% smaller)

---

## Notes

- PNGs should NOT block cognitive cycle - wrap in try/catch
- Backfill can run in background, not urgent
- UI should handle missing PNGs gracefully (don't show icon)
- Consider adding percept count badge to mind moment header
- Future: Click percept icon to see full description/transcript
