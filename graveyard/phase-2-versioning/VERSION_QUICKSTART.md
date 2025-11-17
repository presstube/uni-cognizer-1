# Quick Start: Version Management

## 🎯 TL;DR

```bash
# When you're ready to release a new version:
npm version minor                # Bump version (0.1.0 → 0.2.0)
git push origin main --follow-tags
npm run version:register         # Register in database
```

---

## How It Works

### 1. **Version is Single Source of Truth**

The version lives in ONE place: `package.json`

```json
{
  "version": "0.1.0"
}
```

### 2. **Automatic Version Injection**

When your server starts, it reads the version:

```javascript
// src/version.js
export const COGNIZER_VERSION = packageJson.version;
// Logs: 📦 Cognizer v0.1.0 (Node v20.10.0)
```

### 3. **Every Mind Moment is Tagged**

```javascript
// real-cog.js automatically includes it
await saveMindMoment({
  mindMoment: "I notice...",
  cognizerVersion: COGNIZER_VERSION,  // ← "0.1.0"
  // ...
});
```

### 4. **Database Tracks Versions**

```sql
-- Two tables work together:

-- 1. Version registry (when versions were released)
cognizer_versions
├── version: "0.1.0"
├── released_at: 2025-11-13 12:00:00
└── notes: "Initial release"

-- 2. Mind moments (which version generated them)
mind_moments
├── mind_moment: "I notice..."
├── cognizer_version: "0.1.0"  ← Foreign key
└── created_at: 2025-11-17 20:30:00
```

---

## When to Bump Version

### PATCH (0.1.0 → 0.1.1)
**Bug fixes only**
- Fixed crash
- Performance improvement
- Internal refactor

### MINOR (0.1.0 → 0.2.0)  ← **Most common**
**New features (backward compatible)**
- Added personality system
- New API endpoints
- Enhanced outputs

### MAJOR (0.9.0 → 1.0.0)
**Breaking changes**
- Changed WebSocket API
- Database schema change
- Removed old features

---

## Step-by-Step: Bumping Version

### Using npm (Recommended)

```bash
# 1. Decide bump type
#    New feature? → minor
#    Bug fix? → patch

# 2. Run npm version
npm version minor -m "feat: Add personality system"

# This automatically:
# ✅ Updates package.json (0.1.0 → 0.2.0)
# ✅ Creates git commit
# ✅ Creates git tag (v0.2.0)

# 3. Push with tags
git push origin main --follow-tags

# 4. After deploy, register in database
npm run version:register -- --notes "Added personality management"
```

### Manual Method

```bash
# 1. Edit package.json
vim package.json
# Change: "version": "0.1.0" → "version": "0.2.0"

# 2. Commit
git add package.json
git commit -m "Bump version to 0.2.0"
git tag v0.2.0

# 3. Push
git push origin main --follow-tags

# 4. Register
npm run version:register
```

---

## Commands

```bash
# Check current version
npm run version:check

# Register version in database (after deploy)
npm run version:register

# Register with notes
npm run version:register -- --notes "Your release notes here"

# Bump version (creates commit + tag)
npm version patch   # 0.1.0 → 0.1.1
npm version minor   # 0.1.0 → 0.2.0  ← Most common
npm version major   # 0.9.0 → 1.0.0
```

---

## What Happens at Deploy

```
1. Railway/Render detects new commit
2. Pulls code
3. Runs: npm install
4. Runs: npm run migrate  ← Database migrations
5. Runs: npm start        ← Server starts
6. Server logs: 📦 Cognizer v0.2.0 (Node v20.10.0)
```

Then **you** manually run (once):
```bash
npm run version:register
```

---

## Example Workflow

Let's say you just added a cool new feature:

```bash
# ✅ Feature is complete, tested locally
npm run client:fake   # Works!

# 📝 Bump version (new feature = minor)
npm version minor -m "feat: Add personality forge UI"
# Output: v0.2.0

# 🚀 Deploy
git push origin main --follow-tags

# ⏳ Wait for deployment to complete...
# (Check Railway/Render dashboard)

# 📊 Register in production database
npm run version:register -- --notes "Added personality forge UI with Monaco editor"

# Output:
# ✅ Version registered successfully!
#    Version: 0.2.0
#    Released: 2025-11-17T20:45:00.000Z
#    Notes: Added personality forge UI...

# 🎉 Done!
```

Now every mind moment generated will be tagged with `0.2.0`.

---

## Why This Matters

### 🔍 Debugging
```sql
-- "Why did UNI say that weird thing?"
SELECT cognizer_version, mind_moment, created_at
FROM mind_moments
WHERE mind_moment LIKE '%weird thing%';

-- Results: Oh! It was version 0.1.5, we fixed that in 0.1.6
```

### 📊 Analytics
```sql
-- Compare versions
SELECT 
  cognizer_version,
  COUNT(*) as moments,
  AVG(processing_duration_ms) as avg_speed
FROM mind_moments
GROUP BY cognizer_version;

-- Results:
-- 0.1.0  | 450 moments | 2341ms
-- 0.2.0  | 523 moments | 1892ms  ← 20% faster!
```

### 🔄 Rollback Safety
If v0.3.0 causes issues:
```bash
git revert v0.3.0
npm version patch   # 0.3.0 → 0.3.1 (revert)
git push
```

---

## Current State

Your version tracking is **fully implemented**:

- ✅ Version in `package.json` (0.1.0)
- ✅ Version module (`src/version.js`)
- ✅ Auto-injection in mind moments
- ✅ Database tables + indexes
- ✅ Registration script
- ✅ NPM commands

**You're ready to start bumping versions!** 🎉

---

For detailed explanation, see: `docs/VERSION_MANAGEMENT.md`

