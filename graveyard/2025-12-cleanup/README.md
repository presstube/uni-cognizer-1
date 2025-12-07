# December 2025 Cleanup

**Date**: December 7, 2025  
**Branch**: `feature/60s-timing-refactor`

## What Was Moved

This cleanup simplified the project by removing development scaffolding that was no longer needed after the real web apps were built.

---

## 📁 Directory Structure

### `fake-server/`
**Moved from**: `src/fake/`  
**Reason**: Legacy mock LLM server no longer needed

The fake server was useful during early development to test without API costs, but now:
- Real web apps (dashboard, perceptor) are production-ready
- Development can use production server safely
- Mock LLM added complexity without benefit

**Contents**:
- `server.js` - Mock WebSocket server
- `cog.js` - Mock cognition responses
- `main.js` - Standalone test runner
- `percepts.js` - Mock percept generators

---

### `test-clients/`
**Moved from**: `scripts/`  
**Reason**: Legacy test client scripts superseded by real web apps

These bash scripts bundled fake/real server + http-server + browser opening. They're obsolete because:
- `server.js` now serves all web apps directly
- No need for separate http-server
- No need for browser automation scripts
- Just `npm start` is enough

**Contents**:
- `client-fake.sh` - Started fake server + test client
- `client-local.sh` - Started real server + test client
- `client-render.sh` - Connected test client to Render
- `test-client.sh` - Additional test script

---

### `implementation-notes/`
**Moved from**: `docs/`  
**Reason**: Historical implementation docs, not living documentation

These were created during the 60s timing refactor implementation. They served their purpose (documenting changes) but aren't needed for day-to-day development.

**Contents**:
- `TIMING-REFACTOR-IMPLEMENTATION.md` - Detailed fix-by-fix notes
- `TIMING-REFACTOR-SUMMARY.md` - Executive summary
- `TIMING-REFACTOR-TESTING.md` - Testing guide
- `TIMING-REFACTOR-QUICKREF.md` - Quick reference
- `TIMING-REFACTOR-COMPLETE.md` - Completion summary
- `TIMING-REFACTOR-CODE-REVIEW.md` - Original code review
- `TESTING-READY.md` - Testing readiness notes

---

### `planning/`
**Moved from**: `docs/`  
**Reason**: Historical planning docs, work is complete

These were planning documents for the 60s consciousness cycle refactor. The work is done, so they're historical context now.

**Contents**:
- `60s-timing-refactor-plan.md` - Original refactor plan
- `60s-consciousness-cycle-plan.md` - Detailed consciousness cycle design
- `60s-timing-refactor-implementation.md` - Implementation tracking
- `cognizer-roadmap.md` - Historical roadmap
- `deploy-plan.md` - Deployment planning
- `role-and-responsibility-1.md` - Role definitions

---

### `investigations/`
**Moved from**: `docs/`  
**Reason**: Historical debugging/investigation notes

These documents tracked debugging sessions and investigations during development. They're valuable historical context but not needed for ongoing work.

**Contents**:
- `CYCLE-NUMBER-CONFUSION.md` - Debugging cycle numbering issues
- `LIVE-MODE-INVESTIGATION.md` - Investigating LIVE mode behavior
- `LIVE-MODE-STATUS.md` - LIVE mode status tracking
- `LIVE-MODE-FINAL-STATUS.md` - Final LIVE mode resolution
- `LIVE-SESSION-STARTUP.md` - Startup behavior investigation

---

### `fixes/`
**Moved from**: `docs/`  
**Reason**: Historical fix documentation

These documents describe specific bugs that were fixed and optimizations that were made. The fixes are complete and integrated, so these are now historical records.

**Contents**:
- `DREAM-CACHE-OPTIMIZATION.md` - Dream cache performance optimization
- `DREAM-PREFETCH-FIX.md` - Dream prefetch bug fix
- `OVERLAPPING-TICKS-FIX.md` - Fixed overlapping tick issues
- `STARTUP-BLOCKING-FIX.md` - Fixed blocking startup behavior
- `SIMPLIFIED-TIMING-COMPLETE.md` - Timing simplification completion
- `SIMPLIFIED-TIMING-PROPOSAL.md` - Original timing proposal

---

## 🗑️ What Was Removed from package.json

**Scripts removed**:
```json
"test-fake": "node src/fake/main.js",
"client:render": "./scripts/client-render.sh",
"client:local": "./scripts/client-local.sh",
"client:fake": "./scripts/client-fake.sh"
```

**Why**: These referenced moved/deleted code. Development now uses:
- `npm start` - Starts server with all web apps
- Visit `http://localhost:3001/dashboard` etc. in browser

---

## ✅ What Stayed

### Essential Scripts
- `npm start` - Main server
- `npm run migrate` - Database migrations
- `npm run db:query` - Query mind moments
- `npm run db:*` - Other database tools
- `npm run version:*` - Version management

### Essential Code
- `src/consciousness-loop.js` - Core 60s cycle
- `src/real-cog.js` - LLM cognition
- `src/db/` - Database layer
- `web/` - All production web apps
- `server.js` - WebSocket + web server

### Living Documentation
- `docs/DEVELOPER_GUIDE.md` - Current dev reference
- `docs/extending-cognizer.md` - Architecture
- `prime-directive.md` - Coding principles

---

## 📊 Impact

### Before Cleanup
- 9 npm scripts (4 obsolete)
- `src/fake/` directory (unused)
- 3 test client scripts (obsolete)
- 15 docs in `/docs` (12 historical)
- Confusing: "Do I use client:fake or start?"

### After Cleanup
- 5 npm scripts (all essential)
- No fake server code
- No test client scripts
- 3 living docs in `/docs` (only current operational docs)
- Clear: "Just use npm start"

**Files Moved**: 26 total
- 5 fake server files
- 4 test client scripts
- 7 implementation notes
- 6 planning documents
- 5 investigation documents
- 6 fix/optimization documents

---

## 🎯 Result

**Simpler workflow**:
```bash
npm start
# Open http://localhost:3001/dashboard
```

**Clearer separation**:
- `/src` - Active code
- `/web` - Active web apps
- `/docs` - Living documentation
- `/graveyard` - Historical artifacts

---

## 🔍 Finding Old Code

If you need to reference the old fake server or test scripts:
- Fake server: `graveyard/2025-12-cleanup/fake-server/`
- Test scripts: `graveyard/2025-12-cleanup/test-clients/`
- Implementation notes: `graveyard/2025-12-cleanup/implementation-notes/`
- Planning docs: `graveyard/2025-12-cleanup/planning/`

---

**Cleanup completed**: December 7, 2025  
**Files moved**: 16  
**Scripts removed**: 4  
**Result**: Cleaner, simpler, more maintainable
