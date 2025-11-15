# README vs Codebase Analysis

**Date**: 2025-11-14  
**Purpose**: Identify discrepancies between README documentation and actual codebase implementation

---

## Executive Summary

The README is **mostly accurate** but contains several **outdated references** and **missing critical features**. Key issues:

1. **Outdated Commands**: References removed scripts (`dev:full`, `host`)
2. **Missing Database Documentation**: Major feature (PostgreSQL) not mentioned
3. **Missing Fake Server**: New fake server architecture not documented
4. **Missing Cognitive States**: State machine (AGGREGATING/COGNIZING/VISUALIZING) not explained
5. **Missing Kinetic/Lighting**: Physical outputs not documented
6. **Deployment Mismatch**: Says Railway, but code references Render
7. **File Structure Outdated**: References archived `/host/` directory

---

## 1. OUTDATED README CONTENT

### 1.1 Commands Section (Lines 73-80)

**❌ OUTDATED:**
```markdown
| `npm run dev:full` | Kill old processes, start both servers |
| `npm run host` | Frontend only |
```

**✅ ACTUAL (package.json):**
- `dev:full` - **REMOVED** (was in package.json, now removed)
- `host` - **REMOVED** (was in package.json, now removed)
- These scripts reference archived `/host/` directory that no longer exists

**✅ CURRENT COMMANDS:**
- `npm start` - Backend only ✅
- `npm run test-fake` - Standalone cognitive loop test ✅
- `npm run client:render` - Test client → Render (NEW)
- `npm run client:local` - Test client + local real server (NEW)
- `npm run client:fake` - Test client + local fake server (NEW)
- `npm run db:query` - Query mind moments (NEW)
- `npm run migrate` - Database migrations (NEW)
- `npm run db:setup` - Alias for migrate (NEW)

### 1.2 Quick Start Section (Lines 9-16)

**❌ OUTDATED:**
```markdown
npm run dev:full
Open `http://localhost:8080/host/` to test.
```

**✅ SHOULD BE:**
```markdown
npm run client:local    # For local testing with real LLM
npm run client:fake     # For local testing with mock LLM (no cost)
npm run client:render   # Connect to production Render server
```

The `/host/` directory is archived. Current test client is in `/test-client/`.

### 1.3 Testing Section (Lines 115-137)

**❌ OUTDATED:**
```markdown
### 2. Full Integration Test
npm run dev:full
Open `http://localhost:8080/host/`
```

**✅ SHOULD BE:**
```markdown
### 2. Full Integration Test
npm run client:local    # Real LLM (costs money)
npm run client:fake     # Mock LLM (no cost)
```

### 1.4 File Structure Section (Lines 84-111)

**❌ OUTDATED:**
```markdown
src/
├── fake-cog.js            # Mock cognition for testing
...
host/
└── index.html             # Test client UI
```

**✅ ACTUAL STRUCTURE:**
```markdown
src/
├── fake/
│   ├── cog.js            # Mock cognition (not fake-cog.js)
│   ├── main.js           # Standalone test runner
│   ├── main-server.js    # Fake server cognitive loop manager
│   ├── server.js         # Fake WebSocket server (NEW)
│   └── percepts.js       # Mock percept generator
├── real-cog.js           # Real LLM-based cognition
├── cognitive-states.js   # State constants (NEW)
├── version.js            # Version tracking (NEW)
└── db/                   # Database layer (NEW - MAJOR FEATURE)
    ├── index.js
    ├── migrate.js
    ├── migrations/
    └── mind-moments.js

test-client/              # Test client (not host/)
└── index.html            # Modern test client UI
```

### 1.5 Deployment Section (Lines 344-368)

**❌ OUTDATED:**
```markdown
### Production (Railway)
Live URL: `https://uni-cognizer-1-production.up.railway.app`
```

**✅ ACTUAL:**
- Code references Render: `https://uni-cognizer-1.onrender.com`
- Test client defaults to Render URL
- Database implementation docs reference Render
- Railway URL may be outdated or different deployment

**Recommendation**: Verify which is current production URL, update README accordingly.

### 1.6 Cognitive State Machine (Lines 250-258)

**❌ INCOMPLETE:**
```markdown
IDLE          → No clients connected, loop stopped
READY         → ≥1 client connected, waiting for next 5s cycle
COGNIZING     → LLM call in flight, processing percepts
```

**✅ ACTUAL STATES** (from `src/cognitive-states.js`):
- `AGGREGATING` - Waiting for next cycle, aggregating percepts
- `COGNIZING` - LLM call in flight, processing
- `VISUALIZING` - Generating sigil visualization

**Missing**: `VISUALIZING` state not mentioned. `READY`/`IDLE` are conceptual, not actual states.

---

## 2. MISSING README CONTENT

### 2.1 Database Features (CRITICAL MISSING)

**✅ IMPLEMENTED BUT NOT DOCUMENTED:**

The codebase has a **complete PostgreSQL database implementation**:

- **Database Layer**: `src/db/` directory with full repository pattern
- **Migrations**: `src/db/migrate.js` and `src/db/migrations/001_initial_schema.sql`
- **Tables**: `cognizer_versions`, `sessions`, `mind_moments`, `schema_migrations`
- **Persistence**: All mind moments saved to database
- **Version Tracking**: Every record tagged with cognizer version
- **Prior Context**: Prior moment IDs stored as UUID arrays
- **Session Tracking**: Full session lifecycle in database
- **Query Tool**: `npm run db:query` to view mind moments

**Configuration Required:**
```bash
DATABASE_URL=postgresql://...  # PostgreSQL connection string
DATABASE_ENABLED=true          # Enable database features
```

**What Should Be Added:**
- Database setup section
- Environment variables for database
- How to run migrations
- How to query mind moments
- Database schema overview
- Continuous consciousness feature (UNI's cycle counter resumes from DB)

### 2.2 Fake Server Architecture (MISSING)

**✅ IMPLEMENTED BUT NOT DOCUMENTED:**

New fake server system for cost-free testing:

- **`src/fake/server.js`** - Complete WebSocket server using mock LLM
- **`src/fake/main-server.js`** - Cognitive loop manager for fake server
- **`npm run client:fake`** - Starts fake server + test client
- **Identical API**: Same WebSocket interface as real server
- **Database Support**: Fake server also supports database

**What Should Be Added:**
- Explanation of fake vs real server
- When to use `client:fake` vs `client:local`
- Fake server architecture diagram

### 2.3 Kinetic & Lighting Outputs (MISSING)

**✅ IMPLEMENTED BUT NOT DOCUMENTED:**

Every mind moment includes physical embodiment outputs:

- **Kinetic**: Movement patterns (`IDLE`, `HAPPY_BOUNCE`, `SLOW_SWAY`, `JIGGLE`)
- **Lighting**: Color, pattern, speed (`SMOOTH_WAVES`, `CIRCULAR_PULSE`, `HECTIC_NOISE`)
- **Stored in Database**: Both saved as JSONB in `mind_moments` table
- **Broadcast via WebSocket**: Included in `mindMoment` events

**What Should Be Added:**
- Kinetic/Lighting output format
- Available patterns
- Integration with physical systems
- Reference to `docs/KINETIC_LIGHTING_INTEGRATION.md`

### 2.4 Cognitive State Events (PARTIALLY DOCUMENTED)

**✅ IMPLEMENTED BUT INCOMPLETE:**

README mentions `cognitiveState` event but doesn't explain full state machine:

- **States**: `AGGREGATING`, `COGNIZING`, `VISUALIZING`
- **Events**: `cycleStarted`, `cycleCompleted`, `cycleFailed`
- **State Transitions**: Not documented
- **Reference**: `docs/COGNITIVE_STATE_EVENTS.md` exists but not linked

**What Should Be Added:**
- Complete state machine diagram
- State transition rules
- Link to detailed state events documentation

### 2.5 Version Tracking (MISSING)

**✅ IMPLEMENTED BUT NOT DOCUMENTED:**

- **`src/version.js`** - Version constant (`COGNIZER_VERSION = '0.1.0'`)
- **Database**: All mind moments tagged with version
- **Migrations**: Version tracking in `cognizer_versions` table

**What Should Be Added:**
- Version tracking system explanation
- How versions are assigned
- Version history

### 2.6 Test Client Features (MISSING)

**✅ IMPLEMENTED BUT NOT DOCUMENTED:**

Modern test client (`test-client/index.html`) has:

- **Server URL Configuration**: Via URL parameter `?server=...`
- **Countdown Timer**: Shows time until next cycle
- **Cognitive State Display**: Visual state indicator
- **Sigil Rendering**: Canvas-based sigil visualization
- **Percept Stream**: Real-time percept display
- **Mind Moment History**: Scrollable history with sigils

**What Should Be Added:**
- Test client features overview
- How to use URL parameters
- UI components explanation

### 2.7 Environment Variables (INCOMPLETE)

**✅ PARTIALLY DOCUMENTED:**

README shows basic env vars but missing:

- `DATABASE_URL` - PostgreSQL connection string
- `DATABASE_ENABLED` - Enable/disable database features
- `COGNITIVE_CYCLE_MS` - Cycle interval (default 5000ms, configurable)

**What Should Be Added:**
- Complete environment variable reference
- Database configuration
- Cycle timing configuration

---

## 3. FILE STRUCTURE DISCREPANCIES

### 3.1 Archived Files Referenced

**❌ README References:**
- `host/index.html` - **ARCHIVED** (moved to `archive/host/`)
- `scripts/dev.sh` - **EXISTS** but script removed from package.json

**✅ Actual:**
- `test-client/index.html` - **ACTIVE** test client
- `scripts/client-*.sh` - **ACTIVE** client scripts

### 3.2 Missing File References

**❌ Not in README:**
- `src/cognitive-states.js` - State constants
- `src/version.js` - Version tracking
- `src/db/` - **ENTIRE DATABASE LAYER** (major feature)
- `src/fake/server.js` - Fake WebSocket server
- `src/fake/main-server.js` - Fake server cognitive loop
- `scripts/query-mind-moments.js` - Database query tool
- `scripts/client-*.sh` - New client scripts

---

## 4. ARCHITECTURE DISCREPANCIES

### 4.1 Cognitive Loop Description

**✅ README Says:**
- "5-second heartbeat" (correct, but configurable)
- "Context-aware processing (3 prior moments)" (correct)

**❌ Missing:**
- Cycle interval is configurable via `COGNITIVE_CYCLE_MS`
- Database persistence of prior moments
- Cycle counter resumes from database (continuous consciousness)

### 4.2 Output Format

**✅ README Says:**
- Mind Moment ✅
- Sigil Phrase ✅
- Sigil Code ✅

**❌ Missing:**
- Kinetic patterns (movement)
- Lighting patterns (color, pattern, speed)
- These are part of every mind moment output

### 4.3 Session Management

**✅ README Accurate:**
- 60s timeout ✅
- Graceful cleanup ✅
- Auto-cleanup on disconnect ✅

**❌ Missing:**
- Sessions saved to database
- Session history queryable
- UNI's continuous session (`session_id = 'uni'`)

---

## 5. DOCUMENTATION REFERENCES

### 5.1 Missing Links

**✅ Should Link To:**
- `docs/COGNITIVE_STATE_EVENTS.md` - State machine details
- `docs/KINETIC_LIGHTING_INTEGRATION.md` - Physical outputs
- `docs/phase-1-database-implementation.md` - Database setup
- `docs/phase-1.5-continuous-consciousness.md` - Continuous consciousness

### 5.2 Outdated Links

**❌ May Be Outdated:**
- `docs/deploy-plan.md` - References Railway, but code uses Render
- Verify deployment URLs match current production

---

## 6. RECOMMENDATIONS

### Priority 1: Critical Updates

1. **Update Commands Section**
   - Remove `dev:full` and `host`
   - Add all `client:*` commands
   - Add `db:*` commands

2. **Add Database Section**
   - Setup instructions
   - Environment variables
   - Migration commands
   - Query examples

3. **Update Quick Start**
   - Replace `dev:full` with `client:fake` or `client:local`
   - Update test client path

4. **Fix File Structure**
   - Remove `host/` reference
   - Add `test-client/`
   - Add `src/db/`
   - Add `src/fake/` structure

### Priority 2: Important Additions

5. **Add Fake Server Documentation**
   - When to use fake vs real
   - Architecture explanation

6. **Add Kinetic/Lighting Section**
   - Output format
   - Available patterns
   - Integration guide

7. **Complete State Machine Documentation**
   - All three states
   - State transitions
   - Link to detailed docs

8. **Update Deployment Section**
   - Verify Render vs Railway
   - Update URLs
   - Add database setup for deployment

### Priority 3: Nice to Have

9. **Add Test Client Features**
   - UI overview
   - URL parameters
   - Usage guide

10. **Add Version Tracking**
    - How versions work
    - Version history

11. **Complete Environment Variables**
    - All variables documented
    - Defaults explained

---

## 7. SUMMARY CHECKLIST

### Outdated Content to Remove/Update:
- [ ] Remove `dev:full` command reference
- [ ] Remove `host` command reference
- [ ] Update Quick Start to use `client:*` commands
- [ ] Fix test client path (`/host/` → `/test-client/`)
- [ ] Update file structure section
- [ ] Fix deployment URL (Railway → Render?)
- [ ] Update cognitive state machine (add VISUALIZING)

### Missing Content to Add:
- [ ] Database setup section
- [ ] Database environment variables
- [ ] Migration commands
- [ ] Query tool documentation
- [ ] Fake server architecture
- [ ] Kinetic/Lighting outputs
- [ ] Complete state machine
- [ ] Version tracking
- [ ] Test client features
- [ ] Complete environment variables

### Documentation Links to Add:
- [ ] Link to `COGNITIVE_STATE_EVENTS.md`
- [ ] Link to `KINETIC_LIGHTING_INTEGRATION.md`
- [ ] Link to `phase-1-database-implementation.md`
- [ ] Link to `phase-1.5-continuous-consciousness.md`

---

## 8. ACCURACY SCORE

**Current README Accuracy: ~60%**

- ✅ **Accurate**: Core architecture, WebSocket API, personality, basic commands
- ⚠️ **Partially Accurate**: State machine, deployment, file structure
- ❌ **Outdated**: Commands, Quick Start, test client path
- ❌ **Missing**: Database (major feature!), fake server, kinetic/lighting

**Recommendation**: README needs significant update to reflect current codebase state, especially database features which are a major addition.

