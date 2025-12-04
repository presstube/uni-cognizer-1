# Legacy Sigil Image Generators

Archive of previous sigil rendering approaches. Not used in production.

---

## Overview

These files represent the evolution of sigil image generation, from simple canvas rendering to complex distance field computation. All have been superseded by direct PNG rasterization (`canvas-to-png.js`).

---

## Files

### canvas-to-sdf.js
**Purpose:** Generate Signed Distance Field (SDF) PNG from canvas code  
**Features:**
- 512×512 grayscale distance field
- Custom distance transform algorithm
- 32px search radius for edge detection
- Returns PNG buffer

**Why Archived:** Distance field computation was slow and complex. SDF was intended for GPU shader effects, but simple PNG display is sufficient for current needs.

---

### canvas-to-svg.js
**Purpose:** Convert Canvas 2D commands to SVG path data  
**Features:**
- Mock context intercepts drawing calls
- Converts arc/bezier/line commands to SVG paths
- Generates scalable vector graphics

**Why Archived:** SVG generation was disabled in production (stubbed as null). PNG rasterization provides better compatibility and simpler pipeline.

---

### svg-to-sdf.js
**Purpose:** Convert SVG to SDF using `svg-path-sdf` library  
**Features:**
- Extract SVG path data
- Generate distance field via external library
- Dynamic import/require fallback

**Why Archived:** Part of canvas→SVG→SDF pipeline that was overly complex. Direct canvas→PNG is faster and simpler.

---

### svg-to-sdf-library.js
**Purpose:** SVG to SDF with browser polyfills  
**Features:**
- Loads browser polyfills first
- Uses `svg-path-sdf` library
- Ensures DOM APIs available

**Why Archived:** Required complex polyfill setup. Not needed with direct PNG approach.

---

### svg-to-sdf-simple.js
**Purpose:** Manual SVG to SDF implementation  
**Features:**
- Custom SVG path parser
- Canvas rasterization
- Manual distance transform
- No external SDF library dependency

**Why Archived:** Most complete SDF implementation, but still unnecessary complexity for display purposes.

---

### browser-polyfill.js
**Purpose:** Polyfill DOM APIs for server-side rendering  
**Features:**
- Mock `document.createElement`
- Enable browser-only libraries in Node.js

**Why Archived:** Only needed by `svg-path-sdf` library. Not required for node-canvas PNG generation.

---

## History Timeline

1. **Initial (v0.1):** Canvas code only, rendered client-side
2. **Phase 1 (v0.15):** Added SVG generation for export capability
3. **Phase 2 (v0.2):** Added SDF for potential GPU shader effects
4. **Multiple Iterations:** Tried 3 different SDF generation approaches
5. **Current (v0.3):** Simplified to PNG rasterization, archived legacy

---

## Why Simplified to PNG?

### Complexity vs Value
- **SDF:** Required distance field math, slow computation
- **SVG:** Needed mock context, path conversion logic
- **PNG:** Direct rasterization via node-canvas, simple and fast

### Use Cases
- **SDF was for:** GPU shader effects (glow, outlines, smooth scaling)
- **SVG was for:** Vector export, CSS styling, print quality
- **PNG is for:** Simple display in dashboard and history grid
- **Reality:** We only need simple display

### Performance
- **SDF generation:** ~0.5s per sigil
- **PNG generation:** ~0.3s per sigil
- **Benefit:** 40% faster, simpler code

### Maintenance
- **Legacy:** 6 files, 1200+ lines, external dependencies
- **Current:** 1 file, 100 lines, no extra dependencies
- **Benefit:** Less code to maintain, easier to understand

---

## Current Approach

See `src/sigil/canvas-to-png.js` for the active implementation:

```javascript
canvasToPNG(canvasCode, options) → { data: Buffer, width: 512, height: 512 }
```

Simple, fast, transparent PNG with white lines. No distance fields, no SVG conversion, no polyfills.

---

## Potential Future Uses

If advanced rendering is needed later:

- **SDF:** Restore `canvas-to-sdf.js` for GPU shader effects
- **SVG:** Restore `canvas-to-svg.js` for vector export
- **Both:** Restore full pipeline for maximum flexibility

All code is preserved here for potential future restoration.

---

## References

- Original SDF plan: `docs/graveyard/sigil-implementation/sigil-svg-sdf-expansion-plan.md`
- Simplification plan: `docs/sigil-png-simplification-plan.md`
- Implementation log: `docs/sigil-png-simplification-implementation.md`

---

**Archived:** December 4, 2025  
**Reason:** Unnecessary complexity for current display needs  
**Replacement:** Direct PNG rasterization (`canvas-to-png.js`)

