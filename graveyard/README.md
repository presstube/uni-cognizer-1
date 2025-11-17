# 🪦 THE GRAVEYARD

**Here lie the docs of projects past.**

This directory contains historical documentation—the design thinking, planning notes, implementation diaries, and reviews that shaped Cognizer-1. These documents are **NOT living documentation**. They are preserved for archaeological purposes only.

---

## ⚠️ WARNING

**If you're looking for current information about Cognizer-1:**
- See `/README.md` for quick start
- See `/docs/extending-cognizer.md` for current architecture work
- See code comments for implementation details

**Do NOT treat these docs as current.** They may contradict each other, contain outdated information, or describe features that were changed or removed.

---

## 📂 What's Here

### `phase-1-database/`
**Database persistence implementation (November 2025)**
- `phase-1-database-plan.md` - Initial planning
- `phase-1-database-implementation.md` - Build diary
- `phase-1.5-continuous-consciousness.md` - Cycle counter continuity

**Status**: ✅ Completed, integrated into codebase

---

### `phase-2-versioning/`
**Version tracking implementation (November 2025)**
- `PHASE_2_COMPLETE.md` - Implementation summary
- `VERSION_QUICKSTART.md` - Quick start guide (redundant)
- `VERSION_MANAGEMENT.md` - Detailed guide (redundant)
- `VERSION_CHEATSHEET.txt` - Command reference (redundant)
- `VERSION_FLOW_DIAGRAM.txt` - ASCII diagram (redundant)

**Status**: ✅ Completed, over-documented (5 docs for 1 feature!)

**Note**: The version system works. See `scripts/register-version.js` and `src/version.js` for current implementation.

---

### `integrations/`
**Integration guides for external systems**
- `AGGREGATOR_INTEGRATION.md` - How aggregator-1 connects to Cognizer
- `KINETIC_LIGHTING_INTEGRATION.md` - Physical output integration
- `SIGIL_INTEGRATION_COMPLETE.md` - Sigil system completion notes
- `COGNITIVE_STATE_EVENTS.md` - State machine events

**Status**: ✅ Completed, but docs are stale

**Note**: These may still be useful for reference, but check actual code for current API.

---

### `mvp/`
**Original MVP planning and implementation**
- `MVP-cognizer-1.md` - Original MVP spec
- `MVP-cognizer-1-implementation.md` - Build notes

**Status**: ✅ Completed and superseded

**Note**: Historical record of how we got here. Not current architecture.

---

### `planning/`
**Design docs and roadmaps**
- `cognizer-roadmap.md` - Future plans (may be outdated)
- `deploy-plan.md` - Deployment planning
- `role-and-responsibility-1.md` - System boundaries

**Status**: 📝 Planning documents, may not reflect current reality

---

### `reviews/`
**Code reviews and analysis**
- `review-1.md` - First review
- `review-2.md` - Second review
- `README-ANALYSIS.md` - README analysis

**Status**: 📊 Historical snapshots

---

### `docs/` (old archive docs)
**Even older documents from the previous archive**
- Various implementation plans, spike plans, integration guides
- See `docs/` subdirectory for these ancient texts

---

## 🔍 How to Use This Graveyard

### If You're Looking for History:
```bash
# Find when something was decided
grep -r "personality system" graveyard/

# See design evolution
ls -lt graveyard/*/
```

### If You're Looking for Current Info:
**Don't look here.** Go to:
1. Root `/README.md`
2. `/docs/extending-cognizer.md`
3. The actual code

### If You're Writing New Docs:
**Don't add to the graveyard.** This is write-once, read-rarely.

Add to:
- `/docs/` for living architecture docs
- Code comments for implementation details
- Git commit messages for why you did something

---

## 📜 Philosophy

### Why Keep This?

1. **Design decisions**: "Why did we choose PostgreSQL over SQLite?"
2. **Evolution tracking**: "How did the personality system evolve?"
3. **Lessons learned**: "What mistakes did we make?"
4. **Onboarding context**: "How did we get here?"

### Why Call It a Graveyard?

To make it **crystal clear** these are not living docs. They are:
- ⚰️ **Dead**: Not maintained, may be stale
- 🪦 **Buried**: Preserved but not active
- 👻 **Haunting**: May provide insight, but don't trust them

If you find yourself referencing these docs regularly, something is wrong. Either:
1. The current docs are inadequate (fix them!)
2. The code is unclear (add comments!)
3. You're overthinking (trust the current state!)

---

## 🎯 Summary

**The Graveyard preserves the path we took, but doesn't show where we are.**

For current state, see code and living docs.
For history, spelunk here.
For future, see `/docs/extending-cognizer.md`.

---

**Last updated**: November 17, 2025  
**Graveyard created**: November 17, 2025  
**Rest in peace**: 20+ documents 🪦
