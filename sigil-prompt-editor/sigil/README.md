# Sigil Client - Standalone Bundle

This directory contains a self-contained demo of the Sigil system using a standalone bundled file.

## Files

- `index.html` - Demo interface
- `sigil.standalone.js` - Bundled single-file version of Sigil (73 KB)
- `sigil.standalone.js.map` - Sourcemap for debugging
- `README.md` - This file

## Building the Standalone File

The standalone bundle is built from `/src/sigil.js` and includes all dependencies:

```bash
# From project root
npm run build:sigil
```

This creates:
- `sigil-client/sigil.standalone.js` - The bundled file
- `sigil-client/sigil.standalone.js.map` - Sourcemap

## Running the Demo

```bash
# From project root
npm run sigil-client
```

Opens browser to `http://localhost:8001/sigil-client/`

## Using Sigil in Your Project

### Option 1: Copy the standalone file

1. Copy `sigil.standalone.js` to your project
2. Import and use:

```html
<canvas id="myCanvas"></canvas>
<script type="module">
  import { Sigil } from './sigil.standalone.js';
  
  const sigil = new Sigil({
    canvas: document.getElementById('myCanvas'),
    canvasSize: 200,
    drawDuration: 200,
    undrawDuration: 300,
    thinkingShiftInterval: 100,
    scale: 1.0,
    lineColor: '#fff',
    lineWeight: 1.2
  });
  
  // Start thinking mode
  sigil.thinking();
  
  // Or draw a specific sigil
  sigil.drawSigil({
    calls: "ctx.beginPath();\nctx.moveTo(50, 20);\n..."
  });
</script>
```

### Option 2: Use as ES Module

The standalone file is an ES module that exports the `Sigil` class.

## Bundle Details

- **Format**: ES Module (ESM)
- **Size**: ~73 KB unminified
- **Target**: ES2020
- **Platform**: Browser
- **Dependencies**: All bundled (no external imports needed)

## Configuration Options

```javascript
{
  canvas: HTMLCanvasElement,     // Required
  canvasSize: number,            // Optional: fixed size (null = fullscreen)
  drawDuration: 200,             // Animation speed (ms)
  undrawDuration: 300,           // Undraw speed (ms)
  thinkingShiftInterval: 100,    // Seed shift frame rate (ms)
  scale: 1.0,                    // Drawing scale factor
  lineColor: '#fff',             // Line color
  lineWeight: 1.2                // Base line weight
}
```

## API

```javascript
sigil.thinking()              // Start thinking mode (SigilAlpha)
sigil.drawSigil({ calls })    // Draw specific sigil (Glyphgen)
```

## Phase 1 Complete

This standalone bundle represents Phase 1 of the Sigil system:
- ✅ Simple two-method API
- ✅ Immediate interruption model
- ✅ Seamless mode switching
- ✅ Single file distribution
- ✅ Self-contained demo

See `/md/SIGIL-PHASE-1-COMPLETE.md` for full documentation.
