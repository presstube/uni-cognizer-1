# Phase 3: Consciousness Unification - Archived Files

**Date**: December 2, 2025  
**Reason**: Files merged into unified `src/consciousness-loop.js`

## Files Moved

### `main.js`
- **Purpose**: Orchestrated cognitive loop with percept queue
- **Functionality**: 
  - Managed interval-based cognition cycles
  - Dumped percepts every 5 seconds
  - Set up listener/dispatcher pattern for real-cog.js
  - Exported: `startCognitiveLoop()`, `stopCognitiveLoop()`, `addPercept()`, `getHistory()`

**Replaced by**: `ConsciousnessLoop` class LIVE mode in `consciousness-loop.js`

### `dream-loop.js`  
- **Purpose**: Replayed random historical mind moments from database
- **Functionality**:
  - Queried random moment with sigil every 20 seconds
  - Emitted mindMoment and sigil events
  - Included percepts after Phase 2
  - Exported: `startDreamLoop()`, `stopDreamLoop()`, `isDreaming()`

**Replaced by**: `ConsciousnessLoop` class DREAM mode in `consciousness-loop.js`

## Why They Were Merged

**Problem**: Two separate files treated dreams and cognition as different systems architecturally, when they're really ONE consciousness with TWO modes.

**Solution**: Unified `consciousness-loop.js` that encapsulates both:
- **LIVE mode**: Generate from percepts (was `main.js` functionality)
- **DREAM mode**: Replay from memory (was `dream-loop.js` functionality)

## Restoration

If you need to restore the old architecture:

```bash
# From project root
cp graveyard/consciousness-unification-phase3/main.js src/
cp graveyard/consciousness-unification-phase3/dream-loop.js src/

# Revert server.js imports to:
# import { startCognitiveLoop, stopCognitiveLoop, ... } from './src/main.js';
# import { startDreamLoop, stopDreamLoop } from './src/dream-loop.js';
```

## Migration Notes

- All functionality preserved
- Event structure identical
- Percept handling unchanged
- Database queries unchanged
- Listener/dispatcher pattern maintained for LIVE mode
- Mode switching now centralized in single class

---

**See**: `docs/consciousness-unification-implementation.md` for full details

