# Extending Cognizer-1: Architecture Planning

**Date**: November 13, 2025  
**Status**: Design Document  
**Purpose**: Plan clean, idiomatic extensions to Cognizer-1

---

## Current Architecture (Baseline)

```
WebSocket Server (server.js)
  ↓
Cognitive Loop (main.js)
  ↓
Real Cognition (real-cog.js) → LLM Providers → Sigil Generation
  ↓
In-Memory History (ephemeral)
```

**Characteristics**:
- Functional, modular design
- In-memory state (lost on restart)
- Single personality (hardcoded)
- No versioning
- WebSocket-only API

---

## Proposed Extensions

### 1. Persistent Storage (Database)
### 2. Version Tracking
### 3. Prior Context Storage
### 4. Personality Management
### 5. Ephemeral Token Endpoint

---

## 1. Database Integration

### Database Choice

**Recommendation: PostgreSQL**

**Why?**
- ✅ Relational data (mind moments ↔ prior moments ↔ personalities)
- ✅ JSON support (store percepts, kinetic, lighting as JSONB)
- ✅ Railway has native PostgreSQL support (easy deployment)
- ✅ Mature Node.js clients (`pg`, Prisma)
- ✅ ACID compliance (data integrity for context chains)
- ✅ Free tier on Railway (500MB storage)

**Alternative: SQLite**
- Simpler for development, but harder to scale
- Good for local dev, Postgres for production

---

### Schema Design

```sql
-- Core versioning
CREATE TABLE cognizer_versions (
  version VARCHAR(20) PRIMARY KEY,  -- e.g. "0.2.0"
  released_at TIMESTAMP DEFAULT NOW(),
  notes TEXT
);

-- Personality definitions
CREATE TABLE personalities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,  -- e.g. "uni-tripartite-v2"
  prompt TEXT NOT NULL,              -- Full personality prompt
  schema JSONB,                      -- Output schema definition
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  active BOOLEAN DEFAULT true
);

-- Mind moments (central record)
CREATE TABLE mind_moments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle INTEGER NOT NULL,
  session_id VARCHAR(100),           -- Which session generated this
  
  -- Content
  mind_moment TEXT NOT NULL,
  sigil_phrase VARCHAR(200),
  sigil_code TEXT,
  
  -- Physical outputs
  kinetic JSONB,                     -- { pattern: "HAPPY_BOUNCE" }
  lighting JSONB,                    -- { color, pattern, speed }
  
  -- Context
  visual_percepts JSONB NOT NULL,    -- Array of percepts
  audio_percepts JSONB NOT NULL,     -- Array of percepts
  prior_moment_ids UUID[],           -- Array of 3 prior moment IDs
  
  -- Metadata
  cognizer_version VARCHAR(20) REFERENCES cognizer_versions(version),
  personality_id UUID REFERENCES personalities(id),
  llm_provider VARCHAR(20),          -- "openai", "anthropic", "gemini"
  
  -- Timing
  created_at TIMESTAMP DEFAULT NOW(),
  processing_duration_ms INTEGER,
  
  -- Indexes
  CONSTRAINT unique_session_cycle UNIQUE (session_id, cycle)
);

CREATE INDEX idx_mind_moments_session ON mind_moments(session_id);
CREATE INDEX idx_mind_moments_personality ON mind_moments(personality_id);
CREATE INDEX idx_mind_moments_version ON mind_moments(cognizer_version);
CREATE INDEX idx_mind_moments_created ON mind_moments(created_at DESC);

-- Prior context junction (explicit relationships)
CREATE TABLE mind_moment_context (
  moment_id UUID REFERENCES mind_moments(id) ON DELETE CASCADE,
  prior_moment_id UUID REFERENCES mind_moments(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,         -- 1, 2, or 3 (most recent = 1)
  PRIMARY KEY (moment_id, prior_moment_id)
);

-- Sessions (enhanced from current in-memory version)
CREATE TABLE sessions (
  id VARCHAR(100) PRIMARY KEY,
  start_time TIMESTAMP DEFAULT NOW(),
  end_time TIMESTAMP,
  percept_count INTEGER DEFAULT 0,
  mind_moment_count INTEGER DEFAULT 0,
  personality_id UUID REFERENCES personalities(id),
  metadata JSONB                     -- Store custom session data
);
```

---

### Data Access Layer

**Pattern: Repository Pattern** (clean abstraction)

Create `src/db/` directory:

```
src/db/
├── index.js           # Database connection & setup
├── mind-moments.js    # Mind moment queries
├── personalities.js   # Personality CRUD
├── sessions.js        # Session tracking
└── migrations/        # Schema migrations
    ├── 001_initial.sql
    ├── 002_add_context.sql
    └── ...
```

**Example: `src/db/mind-moments.js`** (~60 lines)

```javascript
import { pool } from './index.js';

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
  priorMomentIds,
  cognizerVersion,
  personalityId,
  llmProvider,
  processingDuration
}) {
  const result = await pool.query(`
    INSERT INTO mind_moments (
      cycle, session_id, mind_moment, sigil_phrase, sigil_code,
      kinetic, lighting, visual_percepts, audio_percepts, prior_moment_ids,
      cognizer_version, personality_id, llm_provider, processing_duration_ms
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING id
  `, [
    cycle, sessionId, mindMoment, sigilPhrase, sigilCode,
    JSON.stringify(kinetic), JSON.stringify(lighting),
    JSON.stringify(visualPercepts), JSON.stringify(audioPercepts),
    priorMomentIds,
    cognizerVersion, personalityId, llmProvider, processingDuration
  ]);
  
  return result.rows[0].id;
}

export async function getPriorMindMoments(sessionId, limit = 3) {
  const result = await pool.query(`
    SELECT id, cycle, mind_moment, created_at
    FROM mind_moments
    WHERE session_id = $1
    ORDER BY cycle DESC
    LIMIT $2
  `, [sessionId, limit]);
  
  return result.rows;
}

export async function getMindMomentById(id) {
  const result = await pool.query(
    'SELECT * FROM mind_moments WHERE id = $1',
    [id]
  );
  return result.rows[0];
}

export async function getSessionHistory(sessionId) {
  const result = await pool.query(`
    SELECT * FROM mind_moments
    WHERE session_id = $1
    ORDER BY cycle ASC
  `, [sessionId]);
  
  return result.rows;
}
```

**Key principle**: Repository layer stays under 80 lines per file, pure functions, no side effects except DB I/O.

---

## 2. Version Tracking

### Strategy

**Recommendation: Semantic versioning in package.json + DB storage**

**Current Flow**:
```javascript
// real-cog.js creates mind moment → ephemeral history
```

**New Flow**:
```javascript
// real-cog.js creates mind moment → save to DB with version metadata
```

### Implementation

**Step 1: Add version to package.json** (already exists: `0.1.0`)

**Step 2: Read version at startup**

```javascript
// src/version.js (15 lines)
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
```

**Step 3: Pass version to mind moment save**

```javascript
// real-cog.js (add to save call)
import { COGNIZER_VERSION } from './version.js';

// When saving:
await saveMindMoment({
  // ... existing fields
  cognizerVersion: COGNIZER_VERSION,
  llmProvider: providerName  // from providers/index.js export
});
```

**Step 4: Migration script**

```javascript
// scripts/register-version.js
// Run on deploy: npm run register-version
import { pool } from '../src/db/index.js';
import { COGNIZER_VERSION } from '../src/version.js';

await pool.query(`
  INSERT INTO cognizer_versions (version, notes)
  VALUES ($1, $2)
  ON CONFLICT (version) DO NOTHING
`, [COGNIZER_VERSION, 'Auto-registered on deploy']);

console.log(`✓ Registered version ${COGNIZER_VERSION}`);
```

**Benefits**:
- Every mind moment tagged with cognizer version
- Query mind moments by version range
- Track behavior changes across versions
- Debug issues: "This only happens in v0.3.x"

---

## 3. Prior Context Storage

### Strategy: Hybrid Approach

**Option A: Store IDs Only** (Recommended)
- Store array of prior moment IDs in `prior_moment_ids` column
- Query to fetch full prior moments when needed
- Efficient storage, flexible queries

**Option B: Denormalize Full Context**
- Store full prior moments as JSONB
- Faster reads, but data duplication
- Harder to update if retroactively fixing moments

**Recommendation: Option A + Junction Table**

```javascript
// When creating mind moment
const priorMoments = await getPriorMindMoments(sessionId, 3);
const priorIds = priorMoments.map(m => m.id);

const momentId = await saveMindMoment({
  // ... fields
  priorMomentIds: priorIds
});

// Also create explicit relationships (for complex queries)
for (let i = 0; i < priorIds.length; i++) {
  await pool.query(`
    INSERT INTO mind_moment_context (moment_id, prior_moment_id, position)
    VALUES ($1, $2, $3)
  `, [momentId, priorIds[i], i + 1]);
}
```

**Query Example: Get moment with full context**

```javascript
export async function getMindMomentWithContext(momentId) {
  const moment = await getMindMomentById(momentId);
  
  const priorResult = await pool.query(`
    SELECT mm.* FROM mind_moments mm
    JOIN mind_moment_context mmc ON mm.id = mmc.prior_moment_id
    WHERE mmc.moment_id = $1
    ORDER BY mmc.position ASC
  `, [momentId]);
  
  return {
    ...moment,
    priorContext: priorResult.rows
  };
}
```

**Benefits**:
- Reconstruct exact context used for any moment
- Analyze how context affects responses
- Debug: "Why did it say that?"
- Traceable lineage of thought

---

## 4. Personality Management

### Architecture

**Components**:
1. **Database Storage** (personalities table)
2. **Personality API** (REST endpoints for CRUD)
3. **Personality Forge UI** (separate frontend app)
4. **Dynamic Loading** (replace hardcoded personality)

### Database Schema (Already Designed Above)

```sql
CREATE TABLE personalities (
  id UUID PRIMARY KEY,
  name VARCHAR(100),
  slug VARCHAR(50) UNIQUE,
  prompt TEXT,
  schema JSONB,
  active BOOLEAN,
  created_at, updated_at
);
```

### Personality Repository

**File: `src/db/personalities.js`** (~70 lines)

```javascript
import { pool } from './index.js';

export async function createPersonality({ name, slug, prompt, schema }) {
  const result = await pool.query(`
    INSERT INTO personalities (name, slug, prompt, schema)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `, [name, slug, prompt, JSON.stringify(schema)]);
  
  return result.rows[0];
}

export async function getPersonalityBySlug(slug) {
  const result = await pool.query(
    'SELECT * FROM personalities WHERE slug = $1 AND active = true',
    [slug]
  );
  return result.rows[0];
}

export async function getPersonalityById(id) {
  const result = await pool.query(
    'SELECT * FROM personalities WHERE id = $1',
    [id]
  );
  return result.rows[0];
}

export async function listPersonalities({ activeOnly = true } = {}) {
  const query = activeOnly
    ? 'SELECT * FROM personalities WHERE active = true ORDER BY name'
    : 'SELECT * FROM personalities ORDER BY name';
  
  const result = await pool.query(query);
  return result.rows;
}

export async function updatePersonality(id, updates) {
  const { name, prompt, schema, active } = updates;
  
  const result = await pool.query(`
    UPDATE personalities
    SET name = COALESCE($2, name),
        prompt = COALESCE($3, prompt),
        schema = COALESCE($4, schema),
        active = COALESCE($5, active),
        updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `, [id, name, prompt, schema ? JSON.stringify(schema) : null, active]);
  
  return result.rows[0];
}

export async function deletePersonality(id) {
  // Soft delete (keep for historical records)
  await pool.query(
    'UPDATE personalities SET active = false WHERE id = $1',
    [id]
  );
}
```

### REST API Layer

**File: `src/api/personalities.js`** (~80 lines)

```javascript
// Express router for personality management
import { Router } from 'express';
import * as personalities from '../db/personalities.js';

const router = Router();

// List all personalities
router.get('/personalities', async (req, res) => {
  try {
    const list = await personalities.listPersonalities();
    res.json({ personalities: list });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific personality
router.get('/personalities/:id', async (req, res) => {
  try {
    const personality = await personalities.getPersonalityById(req.params.id);
    if (!personality) {
      return res.status(404).json({ error: 'Personality not found' });
    }
    res.json({ personality });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new personality
router.post('/personalities', async (req, res) => {
  try {
    const { name, slug, prompt, schema } = req.body;
    
    if (!name || !slug || !prompt) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, slug, prompt' 
      });
    }
    
    const personality = await personalities.createPersonality({
      name, slug, prompt, schema
    });
    
    res.status(201).json({ personality });
  } catch (error) {
    if (error.constraint === 'personalities_slug_key') {
      return res.status(409).json({ error: 'Slug already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update personality
router.patch('/personalities/:id', async (req, res) => {
  try {
    const personality = await personalities.updatePersonality(
      req.params.id,
      req.body
    );
    
    if (!personality) {
      return res.status(404).json({ error: 'Personality not found' });
    }
    
    res.json({ personality });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete (deactivate) personality
router.delete('/personalities/:id', async (req, res) => {
  try {
    await personalities.deletePersonality(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### Dynamic Personality Loading

**Current**:
```javascript
// real-cog.js
import { ROBOT_PERSONALITY } from './personality-uni-v2.js';  // Hardcoded
```

**New**:
```javascript
// real-cog.js
let currentPersonality = null;

export function setPersonality(personalityPrompt) {
  currentPersonality = personalityPrompt;
}

async function realLLMCall(visualPercepts, audioPercepts, priorMoments) {
  const personality = currentPersonality || DEFAULT_PERSONALITY;
  
  const prompt = `${personality}
  
CURRENT PERCEPTS:
// ... rest of prompt
`;
  // ...
}
```

**Session-Level Personality Selection**:
```javascript
// server.js - startSession handler
socket.on('startSession', async ({ sessionId, personalityId }) => {
  const personality = personalityId 
    ? await getPersonalityById(personalityId)
    : await getPersonalityBySlug('uni-tripartite-v2');  // Default
  
  setPersonality(personality.prompt);
  
  // Store personality ID with session
  await createSession({
    id: sessionId,
    personalityId: personality.id
  });
});
```

### Personality Forge UI

**Separate Frontend App: `/forge`** (like `/host`)

```
forge/
├── index.html
├── editor.html
├── css/
│   └── forge.css
└── js/
    ├── api-client.js      # Personality API calls
    ├── editor.js          # Monaco editor integration
    ├── preview.js         # Live preview with mock percepts
    └── validator.js       # Validate prompt structure
```

**Features**:
- Monaco editor (like VS Code) for prompt editing
- Live preview: Test personality with mock percepts
- Version history (store revisions in `personality_versions` table)
- Template library (start from examples)
- Validation: Ensure output format compliance

**API Integration**:
```javascript
// forge/js/api-client.js
const API_BASE = 'http://localhost:3001/api';

export async function savePersonality(personality) {
  const response = await fetch(`${API_BASE}/personalities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(personality)
  });
  return response.json();
}

export async function testPersonality(prompt, mockPercepts) {
  // Send to special test endpoint
  const response = await fetch(`${API_BASE}/personalities/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, percepts: mockPercepts })
  });
  return response.json();
}
```

---

## 5. Ephemeral Token Endpoint

### Current Problem

**Aggregator app** currently hosts the Gemini ephemeral token endpoint. This creates:
- Split backend logic
- Deployment complexity
- CORS complications

### Solution: Consolidate in Cognizer

**New Structure**:
```
Cognizer-1 Backend
├── WebSocket Server (cognitive loop)
└── REST API
    ├── /api/personalities/*      (personality management)
    ├── /api/sessions/*            (session queries)
    ├── /api/mind-moments/*        (history queries)
    └── /api/gemini/token          (ephemeral token generation)
```

### Implementation

**File: `src/api/gemini-token.js`** (~40 lines)

```javascript
import { Router } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = Router();

router.post('/gemini/token', async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ 
        error: 'Gemini API key not configured' 
      });
    }
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Generate ephemeral token for client-side use
    // This allows aggregator to use Gemini Live without exposing API key
    const token = await genAI.generateToken({
      scope: ['audio'], // Limit to audio transcription
      expiresIn: 3600   // 1 hour
    });
    
    res.json({ 
      token: token.value,
      expiresAt: token.expiresAt 
    });
    
  } catch (error) {
    console.error('Token generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

**Server Integration** (update `server.js`):

```javascript
// server.js
import express from 'express';
import personalitiesAPI from './src/api/personalities.js';
import geminiTokenAPI from './src/api/gemini-token.js';

// Create Express app for REST API
const app = express();
app.use(express.json());

// Mount API routes
app.use('/api', personalitiesAPI);
app.use('/api', geminiTokenAPI);

// Attach Express app to same HTTP server as Socket.io
const httpServer = createServer(app);
const io = new Server(httpServer, { /* ... */ });

// Both REST and WebSocket on same port!
httpServer.listen(PORT);
```

**Aggregator Integration**:
```javascript
// aggregator-1/src/gemini-client.js
const COGNIZER_API = 'https://cognizer.railway.app/api';

async function getEphemeralToken() {
  const response = await fetch(`${COGNIZER_API}/gemini/token`, {
    method: 'POST'
  });
  const { token, expiresAt } = await response.json();
  return token;
}
```

**Benefits**:
- All backend logic in one place
- Easier deployment (single service)
- Simpler CORS setup
- Token management centralized

---

## Unified Server Architecture

### Current: WebSocket Only

```
server.js (218 lines) → Socket.io only
```

### New: Hybrid WebSocket + REST API

```
server.js (50 lines - orchestration only)
  ↓
├── Express app → REST API
│   ├── /api/personalities/*
│   ├── /api/sessions/*
│   ├── /api/mind-moments/*
│   └── /api/gemini/token
│
└── Socket.io → Real-time cognitive loop
    ├── startSession
    ├── percept
    ├── mindMoment (broadcast)
    └── sigil (broadcast)
```

**Simplified `server.js`**:

```javascript
import 'dotenv/config';
import { createServer } from 'http';
import { createApp } from './src/api/index.js';      // Express app
import { createSocketServer } from './src/ws/index.js';  // Socket.io

const PORT = process.env.PORT || 3001;

// Create HTTP server with Express
const app = createApp();
const httpServer = createServer(app);

// Attach Socket.io to same server
const io = createSocketServer(httpServer);

httpServer.listen(PORT, () => {
  console.log(`🌐 Server listening on port ${PORT}`);
  console.log(`   REST API: http://localhost:${PORT}/api`);
  console.log(`   WebSocket: ws://localhost:${PORT}`);
});
```

**Modular Structure**:
```
src/
├── api/                    # REST API layer
│   ├── index.js            # Express app setup
│   ├── personalities.js    # Personality endpoints
│   ├── mind-moments.js     # History queries
│   ├── sessions.js         # Session management
│   └── gemini-token.js     # Token generation
│
├── ws/                     # WebSocket layer
│   ├── index.js            # Socket.io setup
│   ├── handlers.js         # Event handlers
│   └── cognitive-loop.js   # Loop management
│
├── db/                     # Database layer
│   ├── index.js            # Connection pool
│   ├── mind-moments.js     # Mind moment queries
│   ├── personalities.js    # Personality queries
│   ├── sessions.js         # Session queries
│   └── migrations/         # SQL migrations
│
├── main.js                 # Cognitive loop orchestration
├── real-cog.js             # LLM processing
├── providers/              # LLM abstraction
├── sigil/                  # Sigil generation
└── fake/                   # Testing infrastructure
```

---

## Migration Path

### Phase 1: Database Foundation (Week 1)

1. Add PostgreSQL to Railway
2. Create schema (migrations)
3. Build repository layer (`src/db/`)
4. Add version tracking
5. Update `real-cog.js` to save to DB
6. Keep in-memory history as fallback

**Compatibility**: WebSocket API unchanged, DB runs alongside

### Phase 2: Personality System (Week 2)

1. Migrate current personality to DB
2. Build REST API (`src/api/personalities.js`)
3. Dynamic personality loading
4. Session-personality linking

**Compatibility**: Default personality = current behavior

### Phase 3: Personality Forge UI (Week 3)

1. Build `/forge` frontend
2. Editor, preview, validation
3. Template library

**Compatibility**: Optional tool, doesn't affect core

### Phase 4: Token Endpoint (Week 4)

1. Add Gemini token endpoint
2. Update aggregator to use new endpoint
3. Remove old token endpoint

**Compatibility**: Transparent to end users

### Phase 5: Advanced Features (Week 5+)

1. Context relationship queries
2. Version comparison tools
3. Analytics dashboard
4. Personality A/B testing

---

## Configuration

### Environment Variables (Updated)

```bash
# Existing
LLM_PROVIDER=openai
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
GEMINI_API_KEY=...
PORT=3001
SESSION_TIMEOUT_MS=60000

# New
DATABASE_URL=postgresql://user:pass@host:5432/cognizer
DEFAULT_PERSONALITY_SLUG=uni-tripartite-v2
ENABLE_PERSONALITY_API=true
ENABLE_TOKEN_ENDPOINT=true
```

### Railway Deployment

```yaml
# railway.toml (new)
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "npm run migrate && npm start"
healthcheckPath = "/health"
healthcheckTimeout = 100

[[services]]
name = "cognizer-backend"
domains = ["cognizer.railway.app"]

[[databases]]
name = "cognizer-postgres"
type = "postgresql"
```

---

## Data Retention & Performance

### Retention Policy

```javascript
// scripts/cleanup-old-moments.js
// Run daily via cron or Railway scheduled job

import { pool } from '../src/db/index.js';

const RETENTION_DAYS = 90;  // Keep 3 months

await pool.query(`
  DELETE FROM mind_moments
  WHERE created_at < NOW() - INTERVAL '${RETENTION_DAYS} days'
  AND session_id NOT IN (
    -- Keep moments from sessions marked for preservation
    SELECT id FROM sessions WHERE preserve = true
  )
`);
```

### Indexing Strategy

Already included in schema:
- `idx_mind_moments_session` - Fast session queries
- `idx_mind_moments_created` - Recent moments
- `idx_mind_moments_personality` - Personality analytics
- `idx_mind_moments_version` - Version tracking

### Caching Layer (Optional)

For high-traffic scenarios:

```javascript
// src/cache/redis.js
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function cachePersonality(slug, personality) {
  await redis.setex(
    `personality:${slug}`,
    3600,  // 1 hour TTL
    JSON.stringify(personality)
  );
}

export async function getCachedPersonality(slug) {
  const cached = await redis.get(`personality:${slug}`);
  return cached ? JSON.parse(cached) : null;
}
```

---

## API Documentation

### REST API Reference

**Base URL**: `https://cognizer.railway.app/api`

#### Personalities

```
GET    /api/personalities              # List all
GET    /api/personalities/:id          # Get by ID
POST   /api/personalities              # Create new
PATCH  /api/personalities/:id          # Update
DELETE /api/personalities/:id          # Deactivate
POST   /api/personalities/test         # Test with mock percepts
```

#### Mind Moments

```
GET    /api/mind-moments?sessionId=... # Session history
GET    /api/mind-moments/:id           # Specific moment with context
GET    /api/mind-moments/search        # Query: ?version=0.2.0&personality=...
```

#### Sessions

```
GET    /api/sessions/:id               # Session details + stats
GET    /api/sessions?active=true       # List sessions
```

#### Tokens

```
POST   /api/gemini/token               # Generate ephemeral token
```

### WebSocket API (Unchanged)

```
Client → Server:
  - startSession({ sessionId, personalityId })  # personalityId is NEW
  - percept({ sessionId, type, data })
  - endSession({ sessionId })

Server → Client:
  - mindMoment({ cycle, mindMoment, ... })
  - sigil({ cycle, sigilCode, ... })
  - cognitiveState({ state })
```

---

## Testing Strategy

### Unit Tests

```javascript
// tests/db/mind-moments.test.js
import { saveMindMoment, getPriorMindMoments } from '../../src/db/mind-moments.js';

test('saves mind moment with all metadata', async () => {
  const id = await saveMindMoment({
    cycle: 1,
    sessionId: 'test-session',
    mindMoment: 'Test thought',
    cognizerVersion: '0.2.0',
    // ...
  });
  
  expect(id).toBeDefined();
});

test('retrieves prior moments in correct order', async () => {
  // ... test prior context fetching
});
```

### Integration Tests

```javascript
// tests/api/personalities.test.js
import request from 'supertest';
import { createApp } from '../../src/api/index.js';

const app = createApp();

test('creates personality via API', async () => {
  const response = await request(app)
    .post('/api/personalities')
    .send({
      name: 'Test Personality',
      slug: 'test-v1',
      prompt: 'You are a test robot.'
    });
  
  expect(response.status).toBe(201);
  expect(response.body.personality.id).toBeDefined();
});
```

### Load Testing

```javascript
// tests/load/cognitive-loop.test.js
// Test: Can DB handle 10 mind moments/second?
// Test: Can personality API handle 100 req/s?
```

---

## Monitoring & Observability

### Metrics to Track

```javascript
// src/metrics/index.js
import prometheus from 'prom-client';

export const mindMomentCounter = new prometheus.Counter({
  name: 'cognizer_mind_moments_total',
  help: 'Total mind moments generated',
  labelNames: ['version', 'personality', 'provider']
});

export const processingDuration = new prometheus.Histogram({
  name: 'cognizer_processing_duration_ms',
  help: 'Mind moment processing time',
  buckets: [1000, 2000, 5000, 10000, 20000]
});

export const dbQueryDuration = new prometheus.Histogram({
  name: 'cognizer_db_query_duration_ms',
  help: 'Database query time'
});
```

### Health Endpoint

```javascript
// src/api/health.js
router.get('/health', async (req, res) => {
  try {
    // Check DB connection
    await pool.query('SELECT 1');
    
    res.json({
      status: 'healthy',
      version: COGNIZER_VERSION,
      uptime: process.uptime(),
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

---

## Security Considerations

### Personality Forge Access

**Problem**: Anyone with URL can edit personalities

**Solutions**:
1. **Basic Auth** (simple, good for MVP)
   ```javascript
   app.use('/api/personalities', basicAuth({
     users: { 'admin': process.env.FORGE_PASSWORD }
   }));
   ```

2. **Session-based Auth** (production)
   - Login flow
   - JWT tokens
   - Role-based access (admin, writer, viewer)

3. **Read-Only Public API**
   ```javascript
   // GET endpoints = public
   // POST/PATCH/DELETE = require auth
   ```

### Database Security

- Use parameterized queries (already doing this)
- Limit connection pool size
- Read-only replicas for analytics queries
- Regular backups (Railway automated backups)

### Rate Limiting

```javascript
// src/api/middleware/rate-limit.js
import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                   // 100 requests per window
  message: 'Too many requests'
});

// Apply to API routes
app.use('/api', apiLimiter);
```

---

## Cost Estimation

### Database (Railway PostgreSQL)

- **Free tier**: 500MB storage, shared CPU
- **Estimated usage**: 
  - 1000 mind moments/day × 5KB = 5MB/day
  - 150MB/month → **stays in free tier for 3+ months**
- **Paid tier**: $5/month for 1GB, scales as needed

### API Hosting

- Railway free tier: $5/month credit
- Expected usage: Minimal (mostly WebSocket traffic)
- **Cost**: Free tier sufficient

### LLM Costs (Unchanged)

- Per mind moment: ~$0.01 (GPT-4o) to $0.005 (Claude)
- Database adds **zero LLM cost**

### Total Additional Cost

- **Development**: Free
- **Production (low traffic)**: $0-5/month
- **Production (high traffic)**: ~$20/month

---

## Success Metrics

### Technical Goals

- [ ] Mind moment persistence: 100% save rate
- [ ] Query performance: <50ms average
- [ ] API latency: <100ms p95
- [ ] Zero data loss on restart
- [ ] Backward compatibility maintained

### Product Goals

- [ ] Writers can create personalities without code
- [ ] Personality changes deploy in <5 minutes
- [ ] Mind moment history queryable by version
- [ ] Prior context always traceable
- [ ] Aggregator uses consolidated backend

---

## Open Questions

1. **Personality Version Control**: Should we track personality revisions?
   - Proposal: Add `personality_versions` table
   - Link mind moments to specific version

2. **Multi-tenancy**: Should each user have their own personality set?
   - Current plan: Shared personality pool
   - Future: User-scoped personalities

3. **Real-time Personality Switching**: Can sessions change personality mid-stream?
   - Proposal: Add `switchPersonality` WebSocket event
   - Track personality changes in session timeline

4. **Analytics Dashboard**: What metrics matter most?
   - Mind moment sentiment over time?
   - Personality effectiveness scores?
   - Context depth impact analysis?

---

## Conclusion

This design maintains Cognizer's core strengths:
- ✅ Functional, modular architecture
- ✅ Clean separation of concerns
- ✅ <80 line file target (repository pattern helps)
- ✅ Backward compatible
- ✅ Minimal dependencies

While adding powerful new capabilities:
- ✅ Persistent storage with PostgreSQL
- ✅ Version tracking for reproducibility
- ✅ Prior context traceability
- ✅ Dynamic personality system with UI
- ✅ Consolidated backend (token endpoint)

**Next Steps**:
1. Review this proposal
2. Prioritize phases
3. Create GitHub issues for each phase
4. Start with Phase 1: Database foundation

**Estimated Timeline**: 5 weeks for all phases

---

**Author**: AI Assistant  
**Reviewed**: Pending  
**Status**: Design proposal - ready for implementation planning

