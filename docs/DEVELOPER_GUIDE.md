# Cognizer-1 Developer Guide

**Practical reference for working with Cognizer-1**

Last updated: November 17, 2025

---

## Architecture Overview

### System Components

```
WebSocket Server (server.js)
  ↓
Cognitive Loop (main.js)
  ↓
Real Cognition (real-cog.js) → LLM Providers → Sigil Generation
  ↓
Database Persistence (PostgreSQL)
```

### Key Characteristics
- **Functional**: Pure functions, minimal side effects
- **Modular**: Clean separation of concerns
- **Persistent**: PostgreSQL for mind moments & sessions
- **Versioned**: Every mind moment tagged with Cognizer version
- **Provider-agnostic**: Supports OpenAI, Anthropic, Gemini

### File Structure

```
server.js                    # WebSocket server entry point
src/
├── main.js                  # Cognitive loop orchestration
├── real-cog.js              # LLM cognition (generates mind moments)
├── version.js               # Version management
├── cognitive-states.js      # State constants (AGGREGATING, COGNIZING, etc.)
├── session-manager.js       # Session lifecycle
├── personality-uni-v2.js    # UNI's personality prompt
├── providers/               # LLM abstraction layer
│   ├── index.js             # Provider selection
│   ├── openai.js
│   ├── anthropic.js
│   └── gemini.js
├── sigil/                   # Sigil generation
│   ├── generator.js         # Main generator
│   ├── prompt.js            # LLM prompt for sigils
│   └── image.js             # Image generation (future)
├── db/                      # Database layer
│   ├── index.js             # Connection pool
│   ├── migrate.js           # Migration runner
│   ├── mind-moments.js      # Mind moment repository
│   ├── sessions.js          # Session repository
│   └── migrations/          # SQL migrations
│       └── 001_initial_schema.sql
└── fake/                    # Mock server for testing
    ├── server.js            # Mock WebSocket server
    ├── cog.js               # Mock cognition (no LLM cost)
    └── main.js              # Standalone test runner
```

---

## Database Schema

### Tables

#### `cognizer_versions`
Tracks Cognizer releases.

```sql
version VARCHAR(20) PRIMARY KEY   -- "0.1.0"
released_at TIMESTAMP             -- When deployed
notes TEXT                        -- Release notes
```

#### `sessions`
Tracks cognitive sessions.

```sql
id VARCHAR(100) PRIMARY KEY       -- Session ID
start_time TIMESTAMP              -- Session start
end_time TIMESTAMP                -- Session end (null if active)
percept_count INTEGER             -- Total percepts received
mind_moment_count INTEGER         -- Total mind moments generated
metadata JSONB                    -- Custom session data
```

#### `mind_moments`
Core table - every mind moment UNI generates.

```sql
id UUID PRIMARY KEY               -- Unique ID
cycle INTEGER                     -- Cycle number
session_id VARCHAR(100)           -- Which session (FK to sessions)

-- Content
mind_moment TEXT                  -- The observation
sigil_phrase VARCHAR(200)         -- Visual essence
sigil_code TEXT                   -- Canvas drawing code

-- Physical outputs
kinetic JSONB                     -- Movement pattern
lighting JSONB                    -- Lighting settings

-- Context
visual_percepts JSONB             -- Array of visual percepts
audio_percepts JSONB              -- Array of audio percepts
prior_moment_ids UUID[]           -- Array of 3 prior moment IDs

-- Metadata
cognizer_version VARCHAR(20)      -- Version that generated this (FK)
llm_provider VARCHAR(20)          -- "openai", "anthropic", "gemini"
processing_duration_ms INTEGER    -- How long it took

-- Timing
created_at TIMESTAMP              -- When created

-- Constraints
UNIQUE(session_id, cycle)         -- One moment per cycle per session
```

### Indexes

```sql
idx_mind_moments_session     -- Fast session queries
idx_mind_moments_created     -- Recent moments
idx_mind_moments_version     -- Query by version
```

### Query Examples

```sql
-- Get session history
SELECT cycle, mind_moment, created_at
FROM mind_moments
WHERE session_id = 'uni'
ORDER BY cycle ASC;

-- Get recent moments with version
SELECT cycle, mind_moment, cognizer_version, llm_provider
FROM mind_moments
ORDER BY created_at DESC
LIMIT 10;

-- Performance by version
SELECT cognizer_version,
       COUNT(*) as moments,
       AVG(processing_duration_ms) as avg_speed
FROM mind_moments
GROUP BY cognizer_version;

-- Get moment with full prior context
SELECT mm.*, 
       array_agg(prior.mind_moment) as prior_moments
FROM mind_moments mm
LEFT JOIN LATERAL (
  SELECT mind_moment 
  FROM mind_moments 
  WHERE id = ANY(mm.prior_moment_ids)
) prior ON true
WHERE mm.id = 'some-uuid'
GROUP BY mm.id;
```

---

## Development Workflow

### Setup

```bash
# Clone & install
git clone [repo]
cd cognizer-1
npm install

# Configure environment
cp .env.example .env
vim .env  # Add API keys

# Setup database (if using)
npm run migrate
```

### Environment Variables

```bash
# LLM Provider
LLM_PROVIDER=gemini              # openai | anthropic | gemini
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...

# Server
PORT=3001
COGNITIVE_CYCLE_MS=5000          # Cycle interval (default: 5000ms)
SESSION_TIMEOUT_MS=60000

# Database (optional)
DATABASE_URL=postgresql://user:pass@host:5432/cognizer
DATABASE_ENABLED=true            # Set to false to disable DB
```

### Running Locally

```bash
# Mock LLM (no API cost, instant responses)
npm run client:fake

# Real LLM (costs money, real responses)
npm run client:local

# Production server only (no test client)
npm start

# Test cognitive loop in terminal
npm run test-fake
```

### Testing

```bash
# Mock server - full cognitive loop with fake LLM
npm run test-fake

# Test client connects to:
# - client:fake  → localhost:8081 (mock server)
# - client:local → localhost:8081 (real server)
# - client:render → production Render deployment
```

---

## Version Management

### Current Version

```bash
# Check version
npm run version:check
# Output: Current version: 0.1.0

# Or directly
node -p "require('./package.json').version"
```

### Bumping Version

**When to bump:**
- **PATCH** (0.1.0 → 0.1.1): Bug fixes
- **MINOR** (0.1.0 → 0.2.0): New features (most common)
- **MAJOR** (0.9.0 → 1.0.0): Breaking changes

**Process:**

```bash
# 1. Decide bump type (patch/minor/major)
# 2. Run npm version
npm version minor -m "feat: Add personality system"
# This:
# - Updates package.json
# - Creates git commit
# - Creates git tag (v0.2.0)

# 3. Push with tags
git push origin main --follow-tags

# 4. After deployment, register in database
npm run version:register -- --notes "Added personality management"
```

### How It Works

```
package.json (version: "0.1.0")
    ↓ (read at startup)
src/version.js (exports COGNIZER_VERSION)
    ↓ (imported by)
real-cog.js (includes in every mind moment)
    ↓ (saves)
DATABASE: mind_moments (cognizer_version column)
```

Every mind moment is automatically tagged with the version that generated it.

---

## Deployment

### Railway/Render

**Automatic deployment on git push.**

```bash
# Push to main branch
git push origin main

# Railway/Render automatically:
# 1. Pulls code
# 2. npm install
# 3. npm run migrate (runs DB migrations)
# 4. npm start (starts server)
```

### Environment Variables (Production)

Set in Railway/Render dashboard:
- `LLM_PROVIDER`
- `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GEMINI_API_KEY`
- `DATABASE_URL` (auto-provided by Railway/Render)
- `DATABASE_ENABLED=true`
- `PORT` (auto-provided)

### Post-Deployment

```bash
# Register new version in database (run once per version)
npm run version:register -- --notes "Your release notes"
```

### Health Check

Server logs on startup:
```
📦 Cognizer v0.1.0 (Node v20.10.0)
🗄️  Database: Connected
🌐 Server listening on port 3001
```

---

## API Reference

### WebSocket API

**Connection:**
```javascript
const socket = io('http://localhost:3001');
```

**Client → Server Events:**

```javascript
// Start a session
socket.emit('startSession', { 
  sessionId: 'unique-session-id' 
});

// Send a percept
socket.emit('percept', {
  sessionId: 'unique-session-id',
  type: 'visual',  // or 'audio'
  data: {
    // Visual percept
    emoji: '👋',
    action: 'Person waving',
    confidence: 0.95,
    timestamp: '2025-11-17T20:00:00Z'
    
    // OR Audio percept
    // transcript: "Hello UNI",
    // analysis: "Friendly greeting"
  }
});

// End session
socket.emit('endSession', { 
  sessionId: 'unique-session-id' 
});
```

**Server → Client Events:**

```javascript
// Cycle started (pre-cognition)
socket.on('cycleStarted', ({ 
  cycle,           // Cycle number
  visualPercepts,  // Count of visual percepts
  audioPercepts,   // Count of audio percepts
  priorMoments,    // Count of prior moments in context
  timestamp        // ISO timestamp
}) => {});

// Mind moment generated
socket.on('mindMoment', ({ 
  cycle,           // Cycle number
  mindMoment,      // Text observation
  sigilPhrase,     // Visual essence (1-5 words)
  kinetic,         // Movement pattern object
  lighting,        // Lighting settings object
  visualPercepts,  // Array of visual percepts
  audioPercepts,   // Array of audio percepts
  priorMoments     // Array of prior moments used
}) => {});

// Sigil generated (after mind moment)
socket.on('sigil', ({ 
  cycle,           // Cycle number
  sigilCode,       // Canvas drawing commands
  sigilPhrase      // Visual essence
}) => {});

// Cognitive state changed
socket.on('cognitiveState', ({ 
  state            // 'AGGREGATING' | 'COGNIZING' | 'VISUALIZING'
}) => {});

// Cycle completed (final event)
socket.on('cycleCompleted', ({ 
  cycle,           // Cycle number
  mindMoment,      // Text observation
  sigilPhrase,     // Visual essence
  kinetic,         // Movement pattern
  lighting,        // Lighting settings
  sigilCode,       // Canvas code (or null)
  duration,        // Total duration in ms
  timestamp        // ISO timestamp
}) => {});
```

### Cognitive States

| State | Meaning |
|-------|---------|
| `AGGREGATING` | Waiting for next cycle, collecting percepts |
| `COGNIZING` | LLM processing in flight |
| `VISUALIZING` | Generating sigil visualization |

### Output Formats

**Kinetic Pattern:**
```javascript
{
  pattern: "IDLE" | "HAPPY_BOUNCE" | "SLOW_SWAY" | "JIGGLE"
}
```

**Lighting:**
```javascript
{
  color: "0xffffff",     // Hex color string
  pattern: "SMOOTH_WAVES" | "CIRCULAR_PULSE" | "HECTIC_NOISE" | "IDLE",
  speed: 0-1             // Animation speed
}
```

---

## Database Queries

```bash
# Query recent mind moments
npm run db:query

# Or use psql directly
psql $DATABASE_URL -c "SELECT cycle, mind_moment, cognizer_version FROM mind_moments ORDER BY cycle DESC LIMIT 10;"
```

---

## Troubleshooting

### Database Connection Fails

```bash
# Check DATABASE_URL is set
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# Run migrations
npm run migrate
```

### Version Registration Fails

```bash
# Make sure DATABASE_ENABLED=true
# Make sure version doesn't already exist
npm run version:register
# If "already registered", that's correct - versions are immutable
```

### LLM Provider Not Working

```bash
# Check provider is set
echo $LLM_PROVIDER

# Check API key is set
echo $OPENAI_API_KEY  # (or ANTHROPIC_API_KEY, GEMINI_API_KEY)

# Test with fake server (no LLM needed)
npm run client:fake
```

### Server Won't Start

```bash
# Check port isn't in use
lsof -i :3001

# Check environment variables
cat .env

# Check logs for errors
npm start
```

---

## Code Principles (Prime Directive)

1. **Functional Programming**: Pure functions, single responsibility
2. **Immutable State**: `const` by default, no mutation
3. **File Size**: Target <80 lines per file
4. **Minimal Libraries**: Use vanilla JS where practical
5. **Dumb Client Architecture**: All state on server

---

## Adding Features

### Adding a New LLM Provider

1. Create `src/providers/new-provider.js`
2. Export `callLLM` function
3. Add to `src/providers/index.js`
4. Add API key to `.env`

### Adding a New Output Type

1. Update personality prompt in `src/personality-uni-v2.js`
2. Update schema in `src/db/migrations/*.sql`
3. Update `saveMindMoment` in `src/db/mind-moments.js`
4. Update WebSocket events in `server.js`

### Adding a New Cognitive State

1. Add constant to `src/cognitive-states.js`
2. Update state transitions in `src/main.js`
3. Emit state changes via WebSocket

---

## Performance

### Typical Timings

- **Mind moment generation**: 1-5s (depending on LLM)
- **Sigil generation**: 2-4s
- **Total cycle**: 3-9s
- **Database save**: <50ms

### Optimization Tips

- Use `COGNITIVE_CYCLE_MS` to control cycle frequency
- Mock server for development (instant responses)
- Database indexes are already optimized
- LLM provider choice affects speed:
  - Gemini Flash: Fast, cheap
  - GPT-4o: Medium, expensive
  - Claude: Slow, high quality

---

## Further Reading

- **Current architecture work**: `docs/extending-cognizer.md`
- **Historical docs**: `graveyard/` (organized by topic)
- **Code principles**: `prime-directive.md`
- **Root README**: Quick start guide

---

**This is the practical guide. For design/planning, see `extending-cognizer.md`.**

