# Archive

This directory contains files that were moved out of the main project structure during cleanup on November 13, 2025.

All files here are preserved for historical reference but are not actively used in the current system.

---

## Contents

### `/docs` - Old Planning & Implementation Files
- `aggregator-integration-guide.md` - Early integration guide (superseded by `AGGREGATOR_INTEGRATION.md`)
- `cognitive-loop-spike-plan.md` - Original spike planning (completed)
- `deploy-notes.md` - Early deployment notes (superseded by `deploy-plan.md`)
- `fake-land-*.md` - Planning docs for fake testing layer (completed)
- `finalize-plan-1*.md` - Finalization planning (completed)
- `host-plan-1.md` - Host UI planning (completed)
- `sigil-integration-plan*.md` - Sigil system planning (completed)
- `overview-3.txt` - Early project overview

### `/data` - Unused Mock Data
- `mock-audio-percepts.json` - Original audio mock data
- `mock-audio-percepts-2.json` - Second iteration of audio mocks
- `mock-visual-percepts.json` - Original visual mock data

**Active mock data** (still in `/data`):
- `mock-audio-percepts-detailed.json` ← Used by fake-percepts.js
- `mock-visual-percepts-visitor.json` ← Used by fake-percepts.js

### `/output` - Test Artifacts
- `v2-output.txt` - Test run outputs
- `v2-output-claude4.5.txt` - Claude-specific test output
- `v2-output-gemini2flash.txt` - Gemini-specific test output
- `v2-output-gpt4o.txt` - GPT-4o-specific test output

### `/host2-backup` - Experimental Host UI
- `host2/index.html` - Alternative host implementation (purpose unclear)

### Root Level
- `personality-unisphere-v1.js` - Original personality definition before tripartite structure

---

## Why These Were Archived

**From Code Review #2**:
- Planning/implementation doc pairs are completed milestones (historical value only)
- Test outputs are one-time artifacts
- Unused mock data superseded by newer versions
- Old personality version preserved for reference but not used
- host2 directory had unclear purpose

---

## Restoration

If any of these files are needed, they can be moved back to their original locations:

```bash
# Example: Restore old personality
mv archive/personality-unisphere-v1.js src/

# Example: Restore a planning doc
mv archive/docs/cognitive-loop-spike-plan.md docs/
```

---

**Archived**: November 13, 2025  
**Reason**: Code cleanup following Review #2  
**Status**: Preserved for historical reference

