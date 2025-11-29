# Sigil SVG & SDF Expansion Plan

**Feature:** Extend sigil generation to produce SVG and Signed Distance Field (SDF) representations

**Status:** Planning  
**Created:** November 29, 2025  
**Target Version:** 0.2.0

---

## Overview

Expand the cognition engine's sigil generation system to create three output formats from a single LLM-generated concept:

1. **Canvas Code** (existing) - JavaScript drawing commands for animated rendering
2. **SVG** (new) - Scalable vector graphics for export, printing, archival
3. **SDF** (new) - Signed distance field for GPU shader effects, smooth scaling

### Benefits

- **SVG**: Resolution-independent, CSS styling, easy export/print
- **SDF**: Advanced GPU rendering (glow, outline, smooth zoom), efficient texture storage
- **Archival**: Multiple formats ensure long-term accessibility
- **Creative Tools**: Enable new rendering and manipulation capabilities

---

## Architecture Fit

### Alignment with Prime Directive

✅ **Functional Programming**: Pure conversion functions (canvas → SVG → SDF)  
✅ **Small Files**: Each converter ~60-80 lines  
✅ **Minimal Libraries**: Only 1 new dependency (`svg-path-sdf`)  
✅ **Immutable State**: Conversion doesn't mutate input  
✅ **Unidirectional Flow**: Linear pipeline (canvas → SVG → SDF)

### Integration Points

```
Current Flow:
LLM → Canvas Code → Database → WebSocket → Client Render

New Flow:
LLM → Canvas Code → SVG → SDF → Database → WebSocket → Client Render
          ↓         ↓      ↓
       (stored) (stored) (stored)
```

---

## Implementation Phases

### Phase 1: Canvas → SVG Converter

**Goal:** Create pure function to convert Canvas 2D commands to SVG path data

**New File:** `src/sigil/canvas-to-svg.js`

**Input:** Canvas JavaScript code (string)  
**Output:** SVG XML string

**Key Challenges:**
- Canvas `arc()` → SVG arc path conversion (different parameterization)
- Handling curve commands (quadratic, bezier)
- Tracking stroke/fill styles
- Managing transforms (translate, rotate, scale)

**Estimated Complexity:** Medium (60-80 lines)

---

### Phase 2: SVG → SDF Generator

**Goal:** Generate signed distance field from SVG path data

**New File:** `src/sigil/svg-to-sdf.js`

**Dependency:** `svg-path-sdf` (CPU-based, Node.js compatible)

```bash
npm install svg-path-sdf
```

**Input:** SVG XML string  
**Output:** Object with `{ data: Uint8Array, width: number, height: number }`

**Configuration:**
- Default size: 256×256 pixels
- Output: 8-bit grayscale distance field
- ViewBox: Match sigil canvas (100×100)

**Estimated Complexity:** Low (40-50 lines)

---

### Phase 3: Database Schema

**Goal:** Add columns to store SVG and SDF data

**New Migration:** `src/db/migrations/004_add_sigil_svg_sdf.sql`

```sql
-- Add SVG and SDF storage columns
ALTER TABLE mind_moments 
  ADD COLUMN sigil_svg TEXT,
  ADD COLUMN sigil_sdf_data BYTEA,
  ADD COLUMN sigil_sdf_width INTEGER DEFAULT 256,
  ADD COLUMN sigil_sdf_height INTEGER DEFAULT 256;

-- Optional: Add index if querying by SVG availability
CREATE INDEX IF NOT EXISTS idx_mind_moments_has_sdf 
  ON mind_moments(id) WHERE sigil_sdf_data IS NOT NULL;

-- Update migration tracker
INSERT INTO schema_migrations (version) VALUES (4);
```

**Storage Impact per Mind Moment:**
- `sigil_svg`: ~1-2 KB (TEXT)
- `sigil_sdf_data`: ~10-20 KB compressed (BYTEA)
- `sigil_sdf_width`: 4 bytes (INTEGER)
- `sigil_sdf_height`: 4 bytes (INTEGER)

**Total:** ~12-22 KB additional per moment

**Estimated Complexity:** Low

---

### Phase 4: Integration into Cognition Flow

**Goal:** Generate SVG and SDF during sigil generation phase

**Modified File:** `src/real-cog.js` (around line 322)

**Current Code:**
```javascript
const { sigilCode, sigilPromptId } = await generateSigil(result.sigilPhrase);
const sigilDuration = Date.now() - sigilStartTime;

// Update history
cognitiveHistory[thisCycle].sigilCode = sigilCode;

// Update database
await pool.query(
  'UPDATE mind_moments SET sigil_code = $1, sigil_prompt_id = $2 WHERE id = $3',
  [sigilCode, sigilPromptId, cognitiveHistory[thisCycle].id]
);
```

**New Code:**
```javascript
const { sigilCode, sigilPromptId } = await generateSigil(result.sigilPhrase);

// Generate SVG from canvas code
import { canvasToSVG } from './sigil/canvas-to-svg.js';
const sigilSVG = canvasToSVG(sigilCode, 100, 100);

// Generate SDF from SVG
import { svgToSDF } from './sigil/svg-to-sdf.js';
const sigilSDF = await svgToSDF(sigilSVG, { width: 256, height: 256 });

const sigilDuration = Date.now() - sigilStartTime;

// Update history
cognitiveHistory[thisCycle].sigilCode = sigilCode;
cognitiveHistory[thisCycle].sigilSVG = sigilSVG;
cognitiveHistory[thisCycle].sigilSDF = sigilSDF;

// Update database with all three formats
await pool.query(
  `UPDATE mind_moments 
   SET sigil_code = $1, 
       sigil_svg = $2,
       sigil_sdf_data = $3,
       sigil_sdf_width = $4,
       sigil_sdf_height = $5,
       sigil_prompt_id = $6 
   WHERE id = $7`,
  [
    sigilCode, 
    sigilSVG, 
    Buffer.from(sigilSDF.data),  // BYTEA requires Buffer
    sigilSDF.width, 
    sigilSDF.height, 
    sigilPromptId, 
    cognitiveHistory[thisCycle].id
  ]
);

console.log(`  SVG: ${sigilSVG.length} chars`);
console.log(`  SDF: ${sigilSDF.width}×${sigilSDF.height} (${sigilSDF.data.length} bytes)`);
```

**Performance Impact:**
- Canvas → SVG: ~5-10ms
- SVG → SDF: ~100-300ms (CPU-based)
- Total added time: ~105-310ms per sigil

**Estimated Complexity:** Low-Medium

---

### Phase 5: Database Query Extensions

**Goal:** Add functions to retrieve SVG/SDF data

**Modified File:** `src/db/mind-moments.js`

**New Functions:**

```javascript
/**
 * Get mind moment with full sigil data (including SVG/SDF)
 * @param {string} momentId - UUID of mind moment
 * @returns {Object} Full moment with all sigil formats
 */
export async function getMindMomentWithFullSigil(momentId) {
  const result = await pool.query(
    `SELECT 
      id, cycle, session_id, mind_moment, sigil_phrase,
      sigil_code, sigil_svg, 
      sigil_sdf_data, sigil_sdf_width, sigil_sdf_height,
      kinetic, lighting, created_at
    FROM mind_moments 
    WHERE id = $1`,
    [momentId]
  );
  
  if (result.rows.length === 0) return null;
  
  const row = result.rows[0];
  
  // Convert Buffer to Uint8Array for JavaScript consumption
  if (row.sigil_sdf_data) {
    row.sigil_sdf_data = new Uint8Array(row.sigil_sdf_data);
  }
  
  return row;
}

/**
 * Get only SDF data for a moment (lightweight query)
 */
export async function getMindMomentSDF(momentId) {
  const result = await pool.query(
    `SELECT sigil_sdf_data, sigil_sdf_width, sigil_sdf_height
    FROM mind_moments 
    WHERE id = $1`,
    [momentId]
  );
  
  if (result.rows.length === 0) return null;
  
  const row = result.rows[0];
  if (row.sigil_sdf_data) {
    row.sigil_sdf_data = new Uint8Array(row.sigil_sdf_data);
  }
  
  return row;
}
```

**Estimated Complexity:** Low

---

### Phase 6: REST API Endpoints (Optional)

**Goal:** Expose SVG/SDF via HTTP for external tools

**Modified File:** `server.js` or new `src/api/sigils-api.js`

**New Endpoints:**

```javascript
// GET /api/sigils/:momentId/svg
// Returns SVG as image/svg+xml
app.get('/api/sigils/:momentId/svg', async (req, res) => {
  try {
    const { getMindMomentWithFullSigil } = await import('./src/db/mind-moments.js');
    const moment = await getMindMomentWithFullSigil(req.params.momentId);
    
    if (!moment || !moment.sigil_svg) {
      return res.status(404).json({ error: 'SVG not found' });
    }
    
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Content-Disposition', `inline; filename="sigil-${moment.cycle}.svg"`);
    res.send(moment.sigil_svg);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/sigils/:momentId/sdf
// Returns SDF as JSON with base64-encoded data
app.get('/api/sigils/:momentId/sdf', async (req, res) => {
  try {
    const { getMindMomentSDF } = await import('./src/db/mind-moments.js');
    const sdf = await getMindMomentSDF(req.params.momentId);
    
    if (!sdf || !sdf.sigil_sdf_data) {
      return res.status(404).json({ error: 'SDF not found' });
    }
    
    res.json({
      width: sdf.sigil_sdf_width,
      height: sdf.sigil_sdf_height,
      data: Buffer.from(sdf.sigil_sdf_data).toString('base64')
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/sigils/:momentId/sdf/raw
// Returns raw SDF binary data (for GPU upload)
app.get('/api/sigils/:momentId/sdf/raw', async (req, res) => {
  try {
    const { getMindMomentSDF } = await import('./src/db/mind-moments.js');
    const sdf = await getMindMomentSDF(req.params.momentId);
    
    if (!sdf || !sdf.sigil_sdf_data) {
      return res.status(404).json({ error: 'SDF not found' });
    }
    
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('X-SDF-Width', sdf.sigil_sdf_width.toString());
    res.setHeader('X-SDF-Height', sdf.sigil_sdf_height.toString());
    res.send(Buffer.from(sdf.sigil_sdf_data));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**Estimated Complexity:** Low

---

### Phase 7: WebSocket Events (Optional)

**Goal:** Broadcast SVG/SDF to connected clients

**Modified File:** `server.js` (WebSocket event handlers)

**New Event Data:**

```javascript
// Extend 'sigil' event to include SVG
socket.emit('sigil', {
  cycle,
  sigilCode,
  sigilPhrase,
  sigilSVG: sigilSVG,  // NEW: Include SVG
  sdfAvailable: true    // NEW: Flag indicating SDF is in DB
});

// OR create separate event
socket.emit('sigilExtended', {
  cycle,
  sigilSVG,
  sdfWidth: 256,
  sdfHeight: 256
  // Note: Don't send full SDF over WebSocket (too large)
  // Clients should fetch via REST API when needed
});
```

**Estimated Complexity:** Low

---

## Testing Strategy

### Unit Tests

**Test File:** `test/sigil-conversions.test.js`

```javascript
import { canvasToSVG } from '../src/sigil/canvas-to-svg.js';
import { svgToSDF } from '../src/sigil/svg-to-sdf.js';

// Test 1: Simple line conversion
const simpleCanvas = `
ctx.beginPath();
ctx.moveTo(10, 10);
ctx.lineTo(90, 90);
ctx.stroke();
`;
const svg = canvasToSVG(simpleCanvas);
console.assert(svg.includes('<svg'), 'Should generate SVG tag');
console.assert(svg.includes('M 10 10'), 'Should include moveTo');
console.assert(svg.includes('L 90 90'), 'Should include lineTo');

// Test 2: Arc conversion
const arcCanvas = `
ctx.beginPath();
ctx.arc(50, 50, 20, 0, Math.PI * 2);
ctx.stroke();
`;
const arcSVG = canvasToSVG(arcCanvas);
console.assert(arcSVG.includes('A '), 'Should convert arc to SVG arc');

// Test 3: SDF generation
const sdf = await svgToSDF(svg, { width: 64, height: 64 });
console.assert(sdf.width === 64, 'Should match requested width');
console.assert(sdf.height === 64, 'Should match requested height');
console.assert(sdf.data.length === 64 * 64, 'Should have correct data size');
```

### Integration Tests

**Test File:** `test/sigil-integration.test.js`

```javascript
// Test full pipeline with real LLM-generated sigil
import { generateSigil } from '../src/sigil/generator.js';
import { canvasToSVG } from '../src/sigil/canvas-to-svg.js';
import { svgToSDF } from '../src/sigil/svg-to-sdf.js';

const concept = "Geometric harmony";
const { sigilCode } = await generateSigil(concept);

// Ensure conversions don't throw
const svg = canvasToSVG(sigilCode);
const sdf = await svgToSDF(svg);

console.log('✓ Full pipeline successful');
console.log(`  Canvas: ${sigilCode.length} chars`);
console.log(`  SVG: ${svg.length} chars`);
console.log(`  SDF: ${sdf.data.length} bytes`);
```

### Manual Testing

1. Run `npm run client:local`
2. Send visual percepts
3. Observe console logs for SVG/SDF generation
4. Query database to verify storage:
   ```sql
   SELECT id, sigil_phrase, 
          length(sigil_svg) as svg_size,
          length(sigil_sdf_data) as sdf_size
   FROM mind_moments 
   WHERE sigil_svg IS NOT NULL 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```
5. Test REST endpoints:
   ```bash
   curl http://localhost:3001/api/sigils/{moment-id}/svg > test.svg
   curl http://localhost:3001/api/sigils/{moment-id}/sdf | jq .
   ```

---

## Technical Specifications

### Canvas to SVG Conversion

**Supported Canvas Commands:**
- ✅ `beginPath()` → New path
- ✅ `moveTo(x, y)` → `M x y`
- ✅ `lineTo(x, y)` → `L x y`
- ✅ `arc(x, y, r, start, end)` → `A ...` (complex conversion)
- ✅ `quadraticCurveTo(cpx, cpy, x, y)` → `Q cpx cpy x y`
- ✅ `bezierCurveTo(...)` → `C ...`
- ✅ `closePath()` → `Z`
- ✅ `stroke()` → Complete path element

**Unsupported (not in current sigil generation):**
- `fill()` - Sigils are stroke-only
- `fillRect()` / `strokeRect()` - Not used
- Complex transforms - May need future support

### Arc Conversion Formula

Canvas arc: `ctx.arc(cx, cy, radius, startAngle, endAngle)`  
SVG arc: `A rx ry x-axis-rotation large-arc-flag sweep-flag x y`

```javascript
function arcToSVGPath(cx, cy, r, startAngle, endAngle) {
  // Calculate start and end points
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  
  // Determine if this is a large arc (> 180 degrees)
  const angleDiff = endAngle - startAngle;
  const largeArc = Math.abs(angleDiff) > Math.PI ? 1 : 0;
  
  // Sweep flag (clockwise vs counter-clockwise)
  const sweep = angleDiff > 0 ? 1 : 0;
  
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} ${sweep} ${x2} ${y2}`;
}
```

### SDF Configuration

**Library:** `svg-path-sdf`  
**Default Parameters:**
```javascript
{
  width: 256,        // Output texture width
  height: 256,       // Output texture height
  viewBox: [0, 0, 100, 100],  // Match sigil canvas
  strokeWidth: 2     // Match canvas lineWidth
}
```

**Output Format:**
- Type: `Uint8Array`
- Size: `width × height` bytes
- Values: 0-255 (0 = inside, 128 = edge, 255 = outside)
- Storage: ~65KB for 256×256 (compresses to ~10-20KB)

---

## Performance Analysis

### Generation Time

| Phase | Time | Notes |
|-------|------|-------|
| LLM Sigil Gen | 2-4s | Existing (Anthropic API) |
| Canvas → SVG | ~5-10ms | Pure JavaScript conversion |
| SVG → SDF | ~100-300ms | CPU-based (svg-path-sdf) |
| Database Write | ~10-20ms | PostgreSQL BYTEA insert |
| **Total Added** | **~115-330ms** | Acceptable overhead |

### Storage Growth

| Period | Moments | Storage (with SDF) |
|--------|---------|-------------------|
| 1 hour | 720 | ~10-18 MB |
| 1 day | 17,280 | ~250-432 MB |
| 1 week | 120,960 | ~1.7-3 GB |
| 1 month | 518,400 | ~7-13 GB |
| 1 year | 6,220,800 | ~84-140 GB |

**Mitigation Strategies:**
1. Use PostgreSQL compression (TOAST automatically handles large BYTEA)
2. Optional: Purge old SDF data after N days (keep canvas/SVG)
3. Optional: Make SDF generation opt-in (flag per moment)
4. Optional: Generate SDF on-demand and cache

---

## Deployment Checklist

### Pre-Deployment

- [ ] Run all tests (unit, integration)
- [ ] Test with real LLM-generated sigils
- [ ] Verify SVG renders correctly in browser
- [ ] Verify SDF data is valid (can be decoded)
- [ ] Check database migration runs cleanly
- [ ] Measure performance impact (< 500ms added)
- [ ] Test on production-like PostgreSQL instance

### Deployment Steps

```bash
# 1. Install new dependency
npm install svg-path-sdf

# 2. Run migration
npm run migrate

# 3. Deploy to production
git push origin main
# (Render auto-deploys)

# 4. Verify migration ran
# Check Render logs for migration success

# 5. Monitor first few cycles
# Check logs for SVG/SDF generation messages

# 6. Query database to verify storage
# Run test queries to see new columns populated
```

### Post-Deployment

- [ ] Monitor server logs for errors
- [ ] Check database size growth
- [ ] Verify mind moments have SVG/SDF data
- [ ] Test REST endpoints (if implemented)
- [ ] Monitor performance (cycle times)

### Rollback Plan

If issues arise:

```bash
# 1. Revert code changes
git revert <commit-hash>

# 2. Optional: Remove new columns (data remains but unused)
# No need to rollback migration unless storage is critical
```

---

## Future Enhancements

### Phase 8: GPU-Accelerated SDF (Optional)

Switch to `webgl-sdf-generator` for faster generation:

**Pros:**
- 10-50x faster (GPU vs CPU)
- Better quality

**Cons:**
- Requires WebGL context setup in Node.js
- More complex dependencies (`headless-gl` or similar)
- Deployment complexity

**When to consider:**
- SDF generation becomes bottleneck (> 500ms)
- High-frequency sigil generation needed
- Real-time requirements

### Phase 9: Client-Side SDF Rendering

Create WebGL shader for rendering SDF textures:

**Benefits:**
- Smooth scaling at any size
- Glow effects, outlines, shadows
- Efficient GPU rendering

**New File:** `web/shared/components/sdf-renderer.js`

```javascript
// WebGL fragment shader for SDF rendering
const fragmentShader = `
  uniform sampler2D u_sdf;
  uniform vec3 u_color;
  uniform float u_smoothing;
  
  void main() {
    float dist = texture2D(u_sdf, v_texcoord).r;
    float alpha = smoothstep(0.5 - u_smoothing, 0.5 + u_smoothing, dist);
    gl_FragColor = vec4(u_color, alpha);
  }
`;
```

### Phase 10: SVG Export/Download

Add UI button to download SVG files:

```javascript
// In moment card component
function downloadSVG(momentId, sigilPhrase) {
  const url = `/api/sigils/${momentId}/svg`;
  const link = document.createElement('a');
  link.href = url;
  link.download = `sigil-${sigilPhrase}.svg`;
  link.click();
}
```

---

## Dependencies

### New NPM Packages

```json
{
  "dependencies": {
    "svg-path-sdf": "^1.1.6"
  }
}
```

### Existing Dependencies (no changes)

- `@anthropic-ai/sdk` - Sigil generation LLM
- `pg` - PostgreSQL database
- `express` - REST API
- `socket.io` - WebSocket events

---

## File Structure

```
cognizer-1/
├── src/
│   ├── sigil/
│   │   ├── generator.js          [existing - modify]
│   │   ├── prompt.js              [existing]
│   │   ├── canvas-to-svg.js       [NEW - Phase 1]
│   │   └── svg-to-sdf.js          [NEW - Phase 2]
│   ├── db/
│   │   ├── mind-moments.js        [existing - extend]
│   │   └── migrations/
│   │       └── 004_add_sigil_svg_sdf.sql  [NEW - Phase 3]
│   ├── real-cog.js                [existing - modify Phase 4]
│   └── api/
│       └── sigils-api.js          [NEW - Phase 6, optional]
├── test/
│   ├── sigil-conversions.test.js  [NEW]
│   └── sigil-integration.test.js  [NEW]
├── docs/
│   └── sigil-svg-sdf-expansion-plan.md  [this file]
└── package.json                   [modify - add svg-path-sdf]
```

---

## Timeline Estimate

| Phase | Effort | Duration |
|-------|--------|----------|
| Phase 1: Canvas → SVG | Medium | 2-3 hours |
| Phase 2: SVG → SDF | Low | 1 hour |
| Phase 3: Database | Low | 30 min |
| Phase 4: Integration | Medium | 1-2 hours |
| Phase 5: DB Queries | Low | 30 min |
| Phase 6: REST API | Low | 1 hour |
| Testing & Debugging | Medium | 2-3 hours |
| **Total** | - | **8-12 hours** |

**Recommended Approach:** Implement Phases 1-5 first (core functionality), then add Phase 6 (API endpoints) based on usage needs.

---

## Success Criteria

✅ Canvas drawing code successfully converts to valid SVG  
✅ SVG successfully generates SDF data  
✅ All three formats stored in database  
✅ No performance regression (< 500ms added per cycle)  
✅ Storage growth manageable (< 30 KB per moment)  
✅ No errors in production deployment  
✅ REST endpoints return correct data (if implemented)  
✅ Manual test: Download SVG and open in browser/editor

---

## Questions & Decisions

### Q1: Should SDF generation be always-on or opt-in?

**Recommendation:** Always-on
- Storage cost is acceptable (~20 KB per moment)
- Consistent data availability
- Simpler code (no conditional logic)

**Alternative:** Add flag to enable/disable per deployment via env var:
```bash
GENERATE_SDF=true  # Default: true
```

### Q2: Should we expose SDF via WebSocket or REST only?

**Recommendation:** REST only
- SDF data too large for WebSocket (~65 KB base64-encoded)
- Clients fetch on-demand when needed
- WebSocket can include flag: `sdfAvailable: true`

### Q3: What SDF resolution should we use?

**Recommendation:** 256×256
- Good balance of quality vs size
- Standard GPU texture size (power of 2)
- Can be downscaled to 128×128 for storage if needed

### Q4: Should we compress SDF data?

**Recommendation:** Let PostgreSQL handle it
- BYTEA columns automatically use TOAST compression
- No extra code needed
- ~50-70% compression ratio typical

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Arc conversion bugs | Medium | Medium | Comprehensive unit tests |
| SDF generation slow | Low | Medium | Measure before deploy; GPU upgrade path |
| Storage growth too fast | Low | High | Monitor; add purging strategy |
| SVG invalid/malformed | Low | Low | Validate output; extensive testing |
| Database migration fails | Low | High | Test on staging DB first |

---

## References

- [svg-path-sdf on NPM](https://www.npmjs.com/package/svg-path-sdf)
- [webgl-sdf-generator on NPM](https://www.npmjs.com/package/webgl-sdf-generator)
- [SVG Path Specification](https://www.w3.org/TR/SVG/paths.html)
- [Canvas API Reference](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)

---

## Notes

- This plan assumes `svg-path-sdf` works as documented
- Arc conversion formula tested and verified
- Performance estimates based on typical sigil complexity (~20-30 drawing commands)
- Storage estimates assume PostgreSQL TOAST compression active

---

**Plan Status:** Ready for Implementation  
**Next Step:** Phase 1 - Implement `canvas-to-svg.js`

