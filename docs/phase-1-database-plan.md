# Phase 1: Database Foundation

**Status**: Implementation Plan  
**Started**: TBD  
**Completed**: TBD  
**Depends On**: None (first phase)  
**Blocks**: Phase 2 (Personality Management)

---

## Platform Notes

This implementation is **platform-agnostic**. The code works identically on:
- Railway (current deployment)
- Render (planned future migration)
- Heroku, Fly.io, or any Node.js + PostgreSQL host

All code uses **standard PostgreSQL** and **environment variables** - no platform-specific features.

**Current Deployment**: Railway  
**Future Migration**: Easy move to Render (30-minute process, covered at end of this document)

---

## Overview

Add PostgreSQL database to persist mind moments, enabling:
- Mind moments survive server restarts
- Query historical data
- Version tracking
- Prior context relationships
- Foundation for personality system (Phase 2)

**Approach**: Add database alongside existing in-memory system. Both run in parallel initially for safety.

---

## Acceptance Criteria

- [ ] PostgreSQL running locally (Docker or hosted)
- [ ] Schema created via migration script
- [ ] Mind moments save to database after generation
- [ ] Prior moments query from database
- [ ] Version tracking appears in records
- [ ] `npm run test-fake` saves to DB
- [ ] `npm start` + WebSocket session saves to DB
- [ ] In-memory fallback works if DB unavailable
- [ ] All existing tests still pass
- [ ] Production deployment updated with DB (Railway or Render)

---

## Phase 1 Scope

### In Scope ✅
- PostgreSQL setup (local + Railway/Render)
- Schema design & migrations
- Repository layer (`src/db/`)
- Version tracking
- Mind moment persistence
- Prior context storage (IDs only, no junction table yet)
- Basic session tracking

### Out of Scope ❌
- Personality management (Phase 2)
- REST API endpoints (Phase 2)
- Personality Forge UI (Phase 3)
- Token endpoint (Phase 4)
- Analytics dashboard (Phase 5)

---

## Dependencies to Install

```bash
npm install pg dotenv
```

**Why `pg`?** Official PostgreSQL client for Node.js, battle-tested, well-maintained.

---

## Environment Variables

Add to `.env` (local) or platform dashboard (Railway/Render):

```bash
# Existing variables
LLM_PROVIDER=openai
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
# ... etc

# NEW: Database
DATABASE_URL=postgresql://localhost:5432/cognizer_dev  # Local dev
DATABASE_ENABLED=true
```

**Production Note**: Both Railway and Render auto-inject `DATABASE_URL` when you link a PostgreSQL database to your web service. You only need to manually set `DATABASE_ENABLED=true`.

**For Railway**: Railway will auto-inject `DATABASE_URL` when you add PostgreSQL service.

**For Render**: Render will auto-inject `DATABASE_URL` when you link the database to your web service.

---

## Files to Create

### 1. `src/db/index.js` (~40 lines)

**Purpose**: Database connection pool + health check

```javascript
import pkg from 'pg';
const { Pool } = pkg;

let pool = null;

export function initDatabase() {
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️  DATABASE_URL not set - database features disabled');
    return null;
  }
  
  if (pool) return pool;
  
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
  });
  
  pool.on('error', (err) => {
    console.error('Unexpected database error:', err);
  });
  
  console.log('✓ Database connection pool initialized');
  return pool;
}

export function getPool() {
  if (!pool) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return pool;
}

export async function healthCheck() {
  try {
    const result = await pool.query('SELECT NOW()');
    return { healthy: true, timestamp: result.rows[0].now };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}

export async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('✓ Database connection pool closed');
  }
}
```

---

### 2. `src/db/migrations/001_initial_schema.sql` (~120 lines)

**Purpose**: Initial database schema

```sql
-- Cognizer version tracking
CREATE TABLE IF NOT EXISTS cognizer_versions (
  version VARCHAR(20) PRIMARY KEY,
  released_at TIMESTAMP DEFAULT NOW(),
  notes TEXT
);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(100) PRIMARY KEY,
  start_time TIMESTAMP DEFAULT NOW(),
  end_time TIMESTAMP,
  percept_count INTEGER DEFAULT 0,
  mind_moment_count INTEGER DEFAULT 0,
  metadata JSONB
);

-- Mind moments (core table)
CREATE TABLE IF NOT EXISTS mind_moments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle INTEGER NOT NULL,
  session_id VARCHAR(100),
  
  -- Content
  mind_moment TEXT NOT NULL,
  sigil_phrase VARCHAR(200),
  sigil_code TEXT,
  
  -- Physical outputs
  kinetic JSONB,
  lighting JSONB,
  
  -- Percepts (store as JSONB arrays)
  visual_percepts JSONB NOT NULL DEFAULT '[]'::jsonb,
  audio_percepts JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Prior context (array of UUIDs)
  prior_moment_ids UUID[],
  
  -- Metadata
  cognizer_version VARCHAR(20),
  llm_provider VARCHAR(20),
  
  -- Timing
  created_at TIMESTAMP DEFAULT NOW(),
  processing_duration_ms INTEGER,
  
  -- Constraints
  CONSTRAINT unique_session_cycle UNIQUE (session_id, cycle),
  CONSTRAINT fk_session FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_version FOREIGN KEY (cognizer_version) REFERENCES cognizer_versions(version)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_mind_moments_session 
  ON mind_moments(session_id);

CREATE INDEX IF NOT EXISTS idx_mind_moments_created 
  ON mind_moments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mind_moments_version 
  ON mind_moments(cognizer_version);

CREATE INDEX IF NOT EXISTS idx_sessions_start 
  ON sessions(start_time DESC);

-- Insert current version
INSERT INTO cognizer_versions (version, notes)
VALUES ('0.1.0', 'Initial schema - Phase 1 implementation')
ON CONFLICT (version) DO NOTHING;

-- Migration metadata
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO schema_migrations (version) VALUES (1);
```

---

### 3. `src/db/migrate.js` (~50 lines)

**Purpose**: Run migrations programmatically

```javascript
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { getPool, initDatabase } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function runMigrations() {
  const pool = initDatabase();
  
  if (!pool) {
    console.log('⏭️  Skipping migrations (database disabled)');
    return;
  }
  
  console.log('🔄 Running database migrations...');
  
  try {
    // Read migration file
    const migrationPath = join(__dirname, 'migrations', '001_initial_schema.sql');
    const sql = readFileSync(migrationPath, 'utf-8');
    
    // Execute migration
    await pool.query(sql);
    
    console.log('✓ Migration 001_initial_schema.sql applied');
    console.log('✓ Database schema ready');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

// Allow running standalone: node src/db/migrate.js
if (import.meta.url === `file://${process.argv[1]}`) {
  await runMigrations();
  process.exit(0);
}
```

---

### 4. `src/db/mind-moments.js` (~80 lines)

**Purpose**: Mind moment repository (CRUD operations)

```javascript
import { getPool } from './index.js';

export async function saveMindMoment({
  cycle,
  sessionId,
  mindMoment,
  sigilPhrase,
  sigilCode,
  kinetic,
  lighting,
  visualPercepts,
  audioPercepts,
  priorMomentIds = [],
  cognizerVersion,
  llmProvider,
  processingDuration
}) {
  const pool = getPool();
  
  try {
    const result = await pool.query(`
      INSERT INTO mind_moments (
        cycle, session_id, mind_moment, sigil_phrase, sigil_code,
        kinetic, lighting, visual_percepts, audio_percepts, prior_moment_ids,
        cognizer_version, llm_provider, processing_duration_ms
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id, created_at
    `, [
      cycle, sessionId, mindMoment, sigilPhrase, sigilCode,
      JSON.stringify(kinetic), JSON.stringify(lighting),
      JSON.stringify(visualPercepts), JSON.stringify(audioPercepts),
      priorMomentIds,
      cognizerVersion, llmProvider, processingDuration
    ]);
    
    return result.rows[0];
  } catch (error) {
    console.error('Error saving mind moment:', error.message);
    throw error;
  }
}

export async function getPriorMindMoments(sessionId, limit = 3) {
  const pool = getPool();
  
  try {
    const result = await pool.query(`
      SELECT id, cycle, mind_moment, created_at
      FROM mind_moments
      WHERE session_id = $1
      ORDER BY cycle DESC
      LIMIT $2
    `, [sessionId, limit]);
    
    return result.rows;
  } catch (error) {
    console.error('Error fetching prior moments:', error.message);
    return [];
  }
}

export async function getMindMomentById(id) {
  const pool = getPool();
  
  const result = await pool.query(
    'SELECT * FROM mind_moments WHERE id = $1',
    [id]
  );
  
  return result.rows[0];
}

export async function getSessionHistory(sessionId) {
  const pool = getPool();
  
  const result = await pool.query(`
    SELECT * FROM mind_moments
    WHERE session_id = $1
    ORDER BY cycle ASC
  `, [sessionId]);
  
  return result.rows;
}
```

---

### 5. `src/db/sessions.js` (~40 lines)

**Purpose**: Session tracking

```javascript
import { getPool } from './index.js';

export async function createSession(sessionId, metadata = {}) {
  const pool = getPool();
  
  try {
    await pool.query(`
      INSERT INTO sessions (id, metadata)
      VALUES ($1, $2)
      ON CONFLICT (id) DO NOTHING
    `, [sessionId, JSON.stringify(metadata)]);
  } catch (error) {
    console.error('Error creating session:', error.message);
  }
}

export async function updateSessionPercepts(sessionId, count) {
  const pool = getPool();
  
  try {
    await pool.query(`
      UPDATE sessions 
      SET percept_count = percept_count + $2
      WHERE id = $1
    `, [sessionId, count]);
  } catch (error) {
    console.error('Error updating session percepts:', error.message);
  }
}

export async function endSession(sessionId) {
  const pool = getPool();
  
  try {
    await pool.query(`
      UPDATE sessions 
      SET end_time = NOW()
      WHERE id = $1
    `, [sessionId]);
  } catch (error) {
    console.error('Error ending session:', error.message);
  }
}
```

---

### 6. `src/version.js` (~20 lines)

**Purpose**: Read cognizer version from package.json

```javascript
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8')
);

export const COGNIZER_VERSION = packageJson.version;
export const NODE_VERSION = process.version;

console.log(`📦 Cognizer v${COGNIZER_VERSION} (Node ${NODE_VERSION})`);
```

---

## Files to Modify

### 1. `server.js` (add database initialization)

**Location**: Top of file, after imports

```javascript
import 'dotenv/config';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { addPercept, startCognitiveLoop, stopCognitiveLoop, getHistory } from './src/main.js';
import { SessionManager } from './src/session-manager.js';
import { loadReferenceImage } from './src/sigil/image.js';
import { CognitiveState } from './src/cognitive-states.js';

// NEW: Database initialization
import { initDatabase, runMigrations, closeDatabase } from './src/db/index.js';
import { createSession as dbCreateSession, endSession as dbEndSession } from './src/db/sessions.js';

// Initialize database at startup
try {
  initDatabase();
  if (process.env.DATABASE_ENABLED === 'true') {
    await runMigrations();
  }
} catch (error) {
  console.error('Database initialization failed:', error.message);
  console.warn('⚠️  Continuing without database (in-memory only)');
}

// ... rest of server.js
```

**Location**: In `startSession` handler (~line 45)

```javascript
socket.on('startSession', async ({ sessionId }) => {
  console.log(`▶️  Starting session: ${sessionId} (socket: ${socket.id})`);
  
  const session = sessionManager.startSession(sessionId);
  activeSessions.add(sessionId);
  socketToSession.set(socket.id, sessionId);
  
  // NEW: Create session in database
  if (process.env.DATABASE_ENABLED === 'true') {
    await dbCreateSession(sessionId);
  }
  
  // ... rest of handler
});
```

**Location**: In `endSession` handler (~line 138)

```javascript
socket.on('endSession', async ({ sessionId }) => {
  console.log(`⏸️  Ending session: ${sessionId}`);
  
  const session = sessionManager.endSession(sessionId);
  activeSessions.delete(sessionId);
  socketToSession.delete(socket.id);
  
  // NEW: End session in database
  if (process.env.DATABASE_ENABLED === 'true') {
    await dbEndSession(sessionId);
  }
  
  // ... rest of handler
});
```

**Location**: Graceful shutdown (~line 208)

```javascript
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  stopCognitiveLoop();
  
  // NEW: Close database connection
  await closeDatabase();
  
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
```

---

### 2. `src/real-cog.js` (save to database after mind moment)

**Location**: After mind moment is created (~line 190)

```javascript
// NEW: Import at top
import { saveMindMoment as dbSaveMindMoment } from './db/mind-moments.js';
import { COGNIZER_VERSION } from './version.js';
import { providerName } from './providers/index.js';

// ... existing code ...

realLLMCall(visualPercepts, audioPercepts, priorMoments)
  .then(async result => {
    const mindMomentDuration = Date.now() - startTime;
    
    cognitiveHistory[thisCycle].mindMoment = result.mindMoment;
    cognitiveHistory[thisCycle].sigilPhrase = result.sigilPhrase;
    cognitiveHistory[thisCycle].kinetic = result.kinetic;
    cognitiveHistory[thisCycle].lighting = result.lighting;
    
    // NEW: Save to database
    if (process.env.DATABASE_ENABLED === 'true') {
      try {
        const priorIds = priorMoments.map(m => m.id).filter(Boolean);
        
        const saved = await dbSaveMindMoment({
          cycle: thisCycle,
          sessionId: 'default', // TODO: Get from session context
          mindMoment: result.mindMoment,
          sigilPhrase: result.sigilPhrase,
          sigilCode: null, // Not yet generated
          kinetic: result.kinetic,
          lighting: result.lighting,
          visualPercepts,
          audioPercepts,
          priorMomentIds: priorIds,
          cognizerVersion: COGNIZER_VERSION,
          llmProvider: providerName,
          processingDuration: mindMomentDuration
        });
        
        // Store DB ID in history
        cognitiveHistory[thisCycle].id = saved.id;
        
        console.log(`💾 Saved to database (ID: ${saved.id.substring(0, 8)}...)`);
      } catch (error) {
        console.error('Failed to save to database:', error.message);
        // Continue without DB save
      }
    }
    
    // ... rest of existing code (logging, sigil generation, etc)
```

**Location**: After sigil generation (~line 228)

```javascript
// Update sigil code in database
if (process.env.DATABASE_ENABLED === 'true' && cognitiveHistory[thisCycle].id) {
  try {
    await pool.query(
      'UPDATE mind_moments SET sigil_code = $1 WHERE id = $2',
      [sigilCode, cognitiveHistory[thisCycle].id]
    );
  } catch (error) {
    console.error('Failed to update sigil in database:', error.message);
  }
}
```

---

### 3. `package.json` (add migration script)

```json
{
  "scripts": {
    "start": "node server.js",
    "test-fake": "node src/fake/main.js",
    "host": "./scripts/host.sh",
    "dev:full": "./scripts/dev.sh",
    "migrate": "node src/db/migrate.js",
    "db:setup": "npm run migrate"
  }
}
```

---

## PostgreSQL Setup

### Option A: Local PostgreSQL (Docker)

```bash
# Start PostgreSQL in Docker
docker run --name cognizer-postgres \
  -e POSTGRES_PASSWORD=dev123 \
  -e POSTGRES_DB=cognizer_dev \
  -p 5432:5432 \
  -d postgres:16

# Add to .env
DATABASE_URL=postgresql://postgres:dev123@localhost:5432/cognizer_dev
DATABASE_ENABLED=true

# Run migrations
npm run migrate
```

### Option B: Railway or Render (Production)

**Railway:**
1. Go to Railway project: https://railway.app
2. Click "New" → "Database" → "Add PostgreSQL"
3. Railway auto-injects `DATABASE_URL` env var
4. Set `DATABASE_ENABLED=true` in Railway env vars
5. Deploy - migrations run automatically

**Render:**
1. Go to Render dashboard: https://render.com
2. Click "New" → "PostgreSQL"
3. Note the database name
4. In your web service, link to the database
5. Render auto-injects `DATABASE_URL` env var
6. Set `DATABASE_ENABLED=true` in Render env vars
7. Deploy - migrations run automatically

**Both platforms**: The code and setup process are identical. Only difference is the dashboard UI.

---

## Testing Procedure

### Test 1: Database Connection

```bash
node -e "import('./src/db/index.js').then(db => db.initDatabase().then(() => db.healthCheck().then(r => console.log(r))))"

# Expected output:
# { healthy: true, timestamp: '2025-11-13T...' }
```

### Test 2: Migrations

```bash
npm run migrate

# Expected output:
# ✓ Migration 001_initial_schema.sql applied
# ✓ Database schema ready
```

### Test 3: Verify Schema

```bash
psql $DATABASE_URL -c "\dt"

# Expected tables:
# - cognizer_versions
# - sessions
# - mind_moments
# - schema_migrations
```

### Test 4: Fake System with DB

```bash
DATABASE_ENABLED=true npm run test-fake

# Watch for log:
# 💾 Saved to database (ID: abc123...)
```

After 2-3 cognitive cycles, check database:

```bash
psql $DATABASE_URL -c "SELECT cycle, mind_moment, cognizer_version FROM mind_moments ORDER BY cycle;"
```

### Test 5: Real System with DB

```bash
DATABASE_ENABLED=true npm start

# In another terminal:
# Run host UI and trigger session
# Check database for saved moments
```

### Test 6: Fallback Mode (DB Disabled)

```bash
DATABASE_ENABLED=false npm start

# Should work normally, just without persistence
# Check logs for: "⚠️ DATABASE_URL not set - database features disabled"
```

---

## Rollback Procedure

If Phase 1 causes issues:

### Quick Rollback (Keep DB, Disable Saving)

```bash
# Set in .env or Railway:
DATABASE_ENABLED=false

# Restart server
npm start

# System reverts to in-memory only
```

### Full Rollback (Remove DB Code)

```bash
# Revert git commits
git revert <phase-1-commit-hash>

# Or manually:
# 1. Remove DATABASE_* env vars
# 2. Comment out DB imports in server.js
# 3. Comment out DB save in real-cog.js
# 4. Server works as before Phase 1
```

### Database Recovery

```sql
-- If bad data, clear and restart:
TRUNCATE mind_moments, sessions CASCADE;

-- Or drop everything:
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
-- Then re-run: npm run migrate
```

---

## Success Metrics

After Phase 1 completion:

- [ ] Database has >50 mind moments from testing
- [ ] Prior moments array populated correctly
- [ ] Version `0.1.0` appears in all records
- [ ] No crashes or errors in logs
- [ ] Performance: DB save adds <100ms to cycle time
- [ ] Railway deployment working with PostgreSQL
- [ ] Comfortable with database queries

---

## Common Issues & Solutions

### Issue: `ECONNREFUSED` - Can't connect to database

**Solution**:
- Check DATABASE_URL is correct
- Verify PostgreSQL is running: `docker ps` or Railway dashboard
- Try: `psql $DATABASE_URL` to test connection

### Issue: Migration fails with "already exists"

**Solution**:
- Migrations are idempotent (use IF NOT EXISTS)
- Safe to re-run
- If truly stuck: Drop schema and re-run

### Issue: "Cannot call getPool() before initDatabase()"

**Solution**:
- Ensure `initDatabase()` called in server.js startup
- Check DATABASE_ENABLED=true in .env
- Check import order

### Issue: Prior moments not linking correctly

**Solution**:
- In-memory history doesn't have UUIDs yet
- Phase 1: Prior moments stored as empty array
- Will populate correctly once all moments are DB-generated

---

## Post-Phase 1: What You'll Have

1. **Persistent Storage**: Mind moments survive restarts
2. **Version Tracking**: Every moment tagged with 0.1.0
3. **Session History**: Query all moments from a session
4. **Foundation**: Ready for Phase 2 (personalities)
5. **Confidence**: Understand database layer

## Post-Phase 1: Testing Period

Before moving to Phase 2:

- [ ] Run for 1-2 days, verify stability
- [ ] Check database growth rate (storage usage)
- [ ] Experiment with queries:
  ```sql
  -- All moments from today
  SELECT * FROM mind_moments WHERE created_at > CURRENT_DATE;
  
  -- Moments by version
  SELECT cognizer_version, count(*) FROM mind_moments GROUP BY 1;
  
  -- Session stats
  SELECT session_id, count(*) as moments, min(created_at), max(created_at)
  FROM mind_moments GROUP BY session_id;
  ```
- [ ] Performance check: Does DB slow things down?
- [ ] Backup test: Export DB, restore elsewhere

---

## Future: Migrating Railway → Render

When ready to move from Railway to Render (can be done anytime after Phase 1 is stable):

### Pre-Migration Checklist

- [ ] Phase 1 stable and tested on Railway
- [ ] Database has <1GB data (fits Render free tier)
- [ ] Environment variables documented
- [ ] Downtime window scheduled (5-10 minutes needed)

### Migration Steps (30-45 minutes total)

#### 1. Create Render PostgreSQL Database (5 min)

```bash
# In Render dashboard:
# - Click "New" → "PostgreSQL"
# - Name: cognizer-postgres
# - Plan: Free (or Starter if needed)
# - Note the connection string
```

#### 2. Export Railway Data (2 min)

```bash
# Get Railway database URL from dashboard
export RAILWAY_DB="postgresql://..."

# Export all data
pg_dump $RAILWAY_DB > cognizer_backup.sql

# Verify backup
ls -lh cognizer_backup.sql
# Should see file size (e.g., 500KB for 1000 moments)
```

#### 3. Import to Render (3 min)

```bash
# Get Render database URL from dashboard
export RENDER_DB="postgresql://..."

# Import data
psql $RENDER_DB < cognizer_backup.sql

# Verify import
psql $RENDER_DB -c "SELECT count(*) FROM mind_moments;"
# Should match Railway count
```

#### 4. Deploy Web Service to Render (10 min)

```bash
# In Render dashboard:
# 1. Click "New" → "Web Service"
# 2. Connect your GitHub repo
# 3. Settings:
#    - Name: cognizer-1
#    - Build Command: npm install && npm run migrate
#    - Start Command: npm start
# 4. Environment Variables:
#    Copy from Railway:
#    - LLM_PROVIDER
#    - OPENAI_API_KEY (or whichever provider)
#    - ANTHROPIC_API_KEY
#    - GEMINI_API_KEY
#    - DATABASE_ENABLED=true
#    - DATABASE_URL: Link to Render PostgreSQL
# 5. Click "Create Web Service"
```

#### 5. Verify Render Deployment (5 min)

```bash
# Check database connection
psql $RENDER_DB -c "SELECT count(*) FROM mind_moments;"

# Test WebSocket endpoint
# Use your test client or:
curl https://cognizer-1.onrender.com/

# Check logs in Render dashboard
# Look for: "✓ Database connection pool initialized"
```

#### 6. Test Full Flow (10 min)

```bash
# Option A: Use test-fake
# SSH into Render container or run locally with Render DB:
DATABASE_URL=$RENDER_DB npm run test-fake

# Option B: Test with aggregator
# Update aggregator WebSocket URL temporarily:
const COGNIZER_URL = 'https://cognizer-1.onrender.com';

# Send test percepts, verify mind moments generated
```

#### 7. Cutover (5 min)

```bash
# Update aggregator permanently:
# Change WebSocket URL from Railway to Render

# In aggregator .env or code:
COGNIZER_WS_URL=wss://cognizer-1.onrender.com

# Deploy aggregator update
# Monitor for issues

# If problems: Revert to Railway URL (instant rollback)
```

#### 8. Monitor & Cleanup (24 hours)

```bash
# Day 1: Monitor Render logs, verify stability
# Check for errors, performance issues

# If all good after 24 hours:
# - Delete Railway PostgreSQL database
# - Delete Railway web service
# - Update documentation with Render URLs
```

### Migration Troubleshooting

**Issue**: pg_dump fails with connection error

```bash
# Solution: Check Railway database is still running
# Get fresh connection string from Railway dashboard
```

**Issue**: Import fails with "relation already exists"

```bash
# Solution: Render database may not be empty
# Drop and recreate:
psql $RENDER_DB -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
# Then re-run import
```

**Issue**: Render build fails

```bash
# Solution: Check package.json scripts exist
# Verify: npm run migrate exists
# Check Render build logs for specific error
```

**Issue**: WebSocket connection fails

```bash
# Solution: Render free tier may sleep after inactivity
# Check Render dashboard - service may be spinning up (30-60s)
# Consider Starter plan if uptime is critical
```

### Migration Benefits

- ✅ **Zero code changes** - same code runs on both platforms
- ✅ **Full data preservation** - all mind moments transferred
- ✅ **Quick rollback** - just point aggregator back to Railway
- ✅ **Low risk** - Railway remains available during migration
- ✅ **Learn the process** - easy to migrate between platforms in future

### Post-Migration Validation

```sql
-- Compare record counts
-- Railway:
SELECT 'railway' as platform, count(*) FROM mind_moments;

-- Render:
SELECT 'render' as platform, count(*) FROM mind_moments;

-- Should be identical

-- Verify latest records transferred
SELECT * FROM mind_moments ORDER BY created_at DESC LIMIT 5;

-- Check version tracking intact
SELECT cognizer_version, count(*) FROM mind_moments GROUP BY 1;
```

---

## Next Steps After Phase 1

Once Phase 1 is stable and tested:

1. **Create Phase 2 Plan**: Personality Management
   - Migrate current personality to DB
   - Build personality CRUD API
   - Dynamic loading

2. **Document Learnings**: Update extending-cognizer.md with any changes discovered

3. **Celebrate**: You have a persistent, version-tracked cognitive system! 🎉

---

**Status**: Ready to implement (Platform-agnostic: Railway + Render migration guide included)  
**Estimated Time**: 4-6 hours coding + 2-3 days testing  
**Risk Level**: Low (fallback mode, incremental)  
**Platform Migration**: 30-45 minutes when ready (covered in detail above)

**Ready when you are!** 🚀

