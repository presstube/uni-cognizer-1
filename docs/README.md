# 📚 Cognizer-1 Documentation

**Current Living Documentation**

---

## 🎯 Living Documentation

### `DEVELOPER_GUIDE.md`
**Practical reference for working with Cognizer-1**

Everything you need to know to work with the codebase:
- Architecture overview
- Database schema & queries
- Development workflow
- Version management
- Deployment process
- API reference
- Troubleshooting

**Read this first if you're developing.**

### `extending-cognizer.md`
**Active design document for architecture extensions**

Planning and implementing future phases:
- Phase 1: ✅ Database Foundation (COMPLETE)
- Phase 2: ✅ Version Tracking (COMPLETE)
- Phase 3: ⏳ Personality Management (IN PROGRESS)
- Phase 4: ⏳ Ephemeral Token Endpoint
- Phase 5: ⏳ Advanced Features

**Read this if you're planning features.**

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
| **How to develop** | `DEVELOPER_GUIDE.md` (this dir) |
| **Architecture planning** | `extending-cognizer.md` (this dir) |
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

