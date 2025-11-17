# 📚 Cognizer-1 Documentation

**Current Living Documentation**

---

## 🎯 Current Work

### `extending-cognizer.md`
**Active design document for Cognizer-1 architecture extensions**

This is the **current living doc** for planning and implementing:
- Phase 1: ✅ Database Foundation (COMPLETE)
- Phase 2: ✅ Version Tracking (COMPLETE)
- Phase 3: ⏳ Personality Management (IN PROGRESS)
- Phase 4: ⏳ Ephemeral Token Endpoint
- Phase 5: ⏳ Advanced Features

**This is the doc you want.** Everything else is historical.

---

## 🪦 Historical Docs

All previous documentation has been moved to `/graveyard/`.

**Why?** To keep living docs clean and current. Historical thinking is valuable but shouldn't clutter active work.

See `/graveyard/README.md` for organized historical documentation.

---

## 📖 Where to Look

| Need | Look Here |
|------|-----------|
| **Quick start** | `/README.md` |
| **Current architecture work** | `extending-cognizer.md` (this dir) |
| **API reference** | Code comments in `server.js`, WebSocket events |
| **Database schema** | `src/db/migrations/*.sql` |
| **Version management** | `scripts/register-version.js` comments |
| **Historical context** | `/graveyard/` (organized by topic) |
| **Code principles** | `/prime-directive.md` |

---

## ✍️ Documentation Philosophy

### Living Docs (Here in `/docs`)
- **Maintained**: Updated as system evolves
- **Current**: Reflects actual state of codebase
- **Minimal**: Only what's actively needed

### Dead Docs (In `/graveyard`)
- **Historical**: Shows how we got here
- **Unmaintained**: May be stale or contradictory
- **Archived**: Preserved but not active

---

## 🚫 What NOT to Do

❌ Don't add multiple docs for the same feature  
❌ Don't create "quick reference" + "detailed guide" (pick one)  
❌ Don't write completion summaries (use git commits + CHANGELOG)  
❌ Don't keep outdated docs in `/docs` (move to graveyard)  

✅ Do write inline code comments  
✅ Do update existing docs rather than creating new ones  
✅ Do consolidate redundant information  
✅ Do move old planning docs to graveyard immediately  

---

## 📝 When to Add Documentation

### YES, add to `/docs`:
- New architectural patterns that span multiple files
- Breaking changes that need migration guides
- Complex systems that aren't obvious from code

### NO, don't add to `/docs`:
- Feature completion notes (use git commit messages)
- Planning docs (start in `/graveyard/planning` from day 1)
- Quick references (inline in main doc or code comments)
- Implementation diaries (use git history)

---

**Keep it ruthless. Keep it current. Keep it minimal.**

---

Last updated: November 17, 2025

