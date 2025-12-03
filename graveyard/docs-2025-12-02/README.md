# Documentation Archive - December 2, 2025

WIP documentation moved here after consciousness unification completion.

## Files Archived

### Implementation Docs (Historical Reference)
- `consciousness-unification-plan.md` - Original detailed plan (13 checkpoints, 4 phases)
- `consciousness-unification-implementation.md` - Complete implementation log with all changes
- `dreaming-state-plan.md` - Original dream loop planning
- `dreaming-state-implementation.md` - Dream loop implementation notes
- `perceptor-circumplex-v2-implementation.md` - Perceptor UI work
- `perceptor-circumplex-v2-simple.md` - Perceptor simplification

### API Reference Docs (Consolidated into DEVELOPER_GUIDE.md)
- `socket-events.md` - Complete Socket.IO event reference
- `mind-moments-rest-api.md` - REST API documentation

## Why Archived

**Goal**: Streamline documentation to single source of truth  
**Result**: All essential info now in `docs/DEVELOPER_GUIDE.md`

The archived docs were either:
1. Implementation plans/logs (historical, not needed for daily dev)
2. API references (consolidated into terse sections in DEVELOPER_GUIDE)

## What Remains Active

**Single Developer Doc**: `docs/DEVELOPER_GUIDE.md`

Contains:
- Architecture overview (updated with ConsciousnessLoop)
- Database schema
- REST API reference (terse)
- WebSocket API reference (terse)
- Web client guides (dashboard, perceptor, prompt-editors)
- Common workflows
- Deployment guide

## Restoration

If you need any of these docs back:

```bash
# From project root
cp graveyard/docs-2025-12-02/[filename] docs/
```

## Notes

- Implementation history preserved for future reference
- API details can be reconstructed from codebase if needed
- Focus on single, maintained developer guide going forward

