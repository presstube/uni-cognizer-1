# Personality Forge Implementation Plan

**Date**: November 17, 2025  
**Status**: Planning  
**Goal**: Enable writers to create, test, and manage UNI personalities

---

## Overview

**The Problem**: UNI's personality is hardcoded in `src/personality-uni-v2.js`. Writers can't experiment without touching code.

**The Solution**: Personality Forge - a standalone tool for writers to:
1. Write/edit personality prompts
2. Test with mock percepts (instant LLM feedback)
3. Save versions to database
4. Activate a personality for production use

**The Approach**: Minimal, clean separation. Forge is standalone. Production reads from DB.

---

## Architecture

### Components

```
┌──────────────────┐
│ Personality DB   │ ← Single source of truth
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼──────────┐
│ Forge │ │ Production  │
│  App  │ │ Cognizer    │
└───┬───┘ └──┬──────────┘
    │        │
    └────┬───┘
         │
    ┌────▼────┐
    │REST API │
    └─────────┘
```

**Key principle**: Forge and Production never talk directly. DB + API bridge.

---

## Phase 3a: Backend (Database + API)

### Step 1: Database Schema

**New table: `personalities`**

```sql
CREATE TABLE personalities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,           -- "UNI Tripartite v2.1"
  slug VARCHAR(100) UNIQUE NOT NULL,    -- "uni-tripartite-v2-1"
  prompt TEXT NOT NULL,                 -- Full personality prompt
  active BOOLEAN DEFAULT false,         -- Only one can be active
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Only one active personality at a time
CREATE UNIQUE INDEX idx_one_active 
  ON personalities(active) 
  WHERE active = true;
```

**Update `mind_moments` table:**

```sql
ALTER TABLE mind_moments 
  ADD COLUMN personality_id UUID REFERENCES personalities(id);

CREATE INDEX idx_mind_moments_personality 
  ON mind_moments(personality_id);
```

**Migration file**: `src/db/migrations/002_personalities.sql`

---

### Step 2: Seed Current Personality

```javascript
// scripts/seed-personality.js
import { getPool } from '../src/db/index.js';
import { ROBOT_PERSONALITY } from '../src/personality-uni-v2.js';

const pool = getPool();

await pool.query(`
  INSERT INTO personalities (name, slug, prompt, active)
  VALUES ($1, $2, $3, true)
  ON CONFLICT (slug) DO NOTHING
`, [
  'UNI Tripartite v2.0',
  'uni-tripartite-v2-0',
  ROBOT_PERSONALITY
]);

console.log('✓ Seeded default personality');
```

**Run once**: `npm run db:seed-personality`

---

### Step 3: Repository Layer

**File**: `src/db/personalities.js` (~80 lines)

```javascript
import { getPool } from './index.js';

// Get currently active personality
export async function getActivePersonality() {
  const pool = getPool();
  const result = await pool.query(
    'SELECT * FROM personalities WHERE active = true'
  );
  return result.rows[0];
}

// Get personality by ID
export async function getPersonalityById(id) {
  const pool = getPool();
  const result = await pool.query(
    'SELECT * FROM personalities WHERE id = $1',
    [id]
  );
  return result.rows[0];
}

// List all personalities
export async function listPersonalities() {
  const pool = getPool();
  const result = await pool.query(
    'SELECT id, name, slug, active, created_at, updated_at FROM personalities ORDER BY updated_at DESC'
  );
  return result.rows;
}

// Create or update personality
export async function savePersonality({ id, name, slug, prompt }) {
  const pool = getPool();
  
  if (id) {
    // Update existing
    const result = await pool.query(`
      UPDATE personalities 
      SET name = $2, slug = $3, prompt = $4, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id, name, slug, prompt]);
    return result.rows[0];
  } else {
    // Create new
    const result = await pool.query(`
      INSERT INTO personalities (name, slug, prompt, active)
      VALUES ($1, $2, $3, false)
      RETURNING *
    `, [name, slug, prompt]);
    return result.rows[0];
  }
}

// Activate a personality (deactivate others)
export async function activatePersonality(id) {
  const pool = getPool();
  
  await pool.query('BEGIN');
  try {
    // Deactivate all
    await pool.query('UPDATE personalities SET active = false');
    
    // Activate this one
    const result = await pool.query(`
      UPDATE personalities 
      SET active = true, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);
    
    await pool.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }
}

// Delete personality (only if not active)
export async function deletePersonality(id) {
  const pool = getPool();
  
  const personality = await getPersonalityById(id);
  if (personality?.active) {
    throw new Error('Cannot delete active personality');
  }
  
  await pool.query('DELETE FROM personalities WHERE id = $1', [id]);
}
```

---

### Step 4: REST API

**File**: `src/api/personalities.js` (~100 lines)

```javascript
import { Router } from 'express';
import * as personalities from '../db/personalities.js';
import { callLLM } from '../providers/index.js';

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
      return res.status(404).json({ error: 'Not found' });
    }
    res.json({ personality });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get active personality
router.get('/personalities/active', async (req, res) => {
  try {
    const personality = await personalities.getActivePersonality();
    if (!personality) {
      return res.status(404).json({ error: 'No active personality' });
    }
    res.json({ personality });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save personality (create or update)
router.post('/personalities', async (req, res) => {
  try {
    const { id, name, slug, prompt } = req.body;
    
    if (!name || !slug || !prompt) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, slug, prompt' 
      });
    }
    
    const personality = await personalities.savePersonality({
      id, name, slug, prompt
    });
    
    res.json({ personality });
  } catch (error) {
    if (error.constraint === 'personalities_slug_key') {
      return res.status(409).json({ error: 'Slug already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Activate personality
router.post('/personalities/:id/activate', async (req, res) => {
  try {
    const personality = await personalities.activatePersonality(req.params.id);
    res.json({ personality });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test personality with mock percepts
router.post('/personalities/:id/test', async (req, res) => {
  try {
    const personality = await personalities.getPersonalityById(req.params.id);
    if (!personality) {
      return res.status(404).json({ error: 'Not found' });
    }
    
    const { visualPercepts = [], audioPercepts = [] } = req.body;
    
    // Build prompt with personality
    const visualStr = visualPercepts.map(p => `${p.emoji} ${p.action}`).join('; ') || '(none)';
    const audioStr = audioPercepts.map(p => {
      if (p.transcript) return `"${p.transcript}"`;
      return p.analysis;
    }).join('; ') || '(none)';
    
    const prompt = `${personality.prompt}

CURRENT PERCEPTS:
Visual: ${visualStr}
Audio: ${audioStr}

Generate a complete cognitive response as JSON. Be specific about what you notice.

Respond with ONLY valid JSON, nothing else.`;
    
    const response = await callLLM(prompt);
    const parsed = JSON.parse(response.trim());
    
    res.json({
      mindMoment: parsed.mindMoment || parsed.mind_moment,
      sigilPhrase: parsed.sigilPhrase || parsed.sigil_phrase,
      kinetic: parsed.kinetic || { pattern: 'IDLE' },
      lighting: parsed.lighting || { color: '0xffffff', pattern: 'IDLE', speed: 0 }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete personality
router.delete('/personalities/:id', async (req, res) => {
  try {
    await personalities.deletePersonality(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
```

---

### Step 5: Integrate API into Server

**Update**: `server.js`

```javascript
import express from 'express';
import personalitiesAPI from './src/api/personalities.js';

// Create Express app
const app = express();
app.use(express.json());
app.use(express.static('forge')); // Serve Forge UI

// Mount API
app.use('/api', personalitiesAPI);

// Attach to same HTTP server as Socket.io
const httpServer = createServer(app);
const io = new Server(httpServer, { /* ... */ });

// Existing WebSocket code...

httpServer.listen(PORT);
```

---

### Step 6: Production Integration

**Update**: `src/real-cog.js`

```javascript
import { getActivePersonality } from './db/personalities.js';

// Cache active personality
let currentPersonality = ROBOT_PERSONALITY; // Fallback
let currentPersonalityId = null;

// Load on startup
export async function initializePersonality() {
  if (process.env.DATABASE_ENABLED === 'true') {
    try {
      const active = await getActivePersonality();
      if (active) {
        currentPersonality = active.prompt;
        currentPersonalityId = active.id;
        console.log(`🎭 Loaded personality: ${active.name}`);
      }
    } catch (error) {
      console.error('Failed to load personality:', error.message);
      console.log('🎭 Using default personality');
    }
  }
}

// Call in main.js startup
await initializePersonality();

// Use in realLLMCall
async function realLLMCall(visualPercepts, audioPercepts, priorMoments) {
  // ... existing code
  const prompt = `${currentPersonality}\n\nCURRENT PERCEPTS:...`;
  // ...
}

// Include in mind moment save
await saveMindMoment({
  // ... existing fields
  personalityId: currentPersonalityId
});
```

**Personality reload**: Restart server or add WebSocket event for live reload.

---

## Phase 3b: Personality Forge UI

### Overview

Single HTML page in `/forge/index.html`. No build tools, no frameworks. Pure vanilla JS like `test-client/`.

### UI Structure

```
forge/
├── index.html          # Main page
├── style.css           # Styles
└── forge.js            # Logic
```

### Features

1. **Personality List** (dropdown)
   - Load all personalities via `GET /api/personalities`
   - Show active indicator
   
2. **Editor** (textarea)
   - Edit personality prompt
   - Auto-save to localStorage (draft)
   - Character count
   
3. **Mock Percepts** (configurable)
   - Preset templates (greeting, silence, visitor, etc.)
   - Custom percept builder
   - JSON editor for advanced use
   
4. **Test Button**
   - Sends to `POST /api/personalities/:id/test`
   - Shows loading state
   - Displays result (mind moment, sigil, kinetic, lighting)
   
5. **Save Button**
   - Name + slug input
   - Saves via `POST /api/personalities`
   - Updates list
   
6. **Activate Button**
   - Marks personality as active
   - Confirms before activating
   - Shows success message

### Mock Percepts Presets

```javascript
const PRESETS = {
  greeting: {
    visual: [{ emoji: '👋', action: 'Person waving at UNI' }],
    audio: [{ transcript: 'Hello UNI!' }]
  },
  silence: {
    visual: [{ emoji: '🏢', action: 'Empty lobby' }],
    audio: [{ analysis: 'Silence - building ambiance only' }]
  },
  conversation: {
    visual: [
      { emoji: '👥', action: 'Two people talking' },
      { emoji: '😊', action: 'Smiling faces' }
    ],
    audio: [{ transcript: 'The event is starting soon' }]
  },
  technical: {
    visual: [{ emoji: '🔧', action: 'Maintenance crew working' }],
    audio: [{ analysis: 'Mechanical sounds - HVAC system' }]
  }
};
```

### Minimal HTML Structure

```html
<!DOCTYPE html>
<html>
<head>
  <title>Personality Forge</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="container">
    <h1>🎭 Personality Forge</h1>
    
    <!-- Personality selector -->
    <div class="section">
      <label>Personality:</label>
      <select id="personality-select">
        <option value="new">+ New Personality</option>
      </select>
      <button id="delete-btn" class="danger">Delete</button>
    </div>
    
    <!-- Editor -->
    <div class="section">
      <label>Name:</label>
      <input type="text" id="name" placeholder="UNI Tripartite v2.1">
      
      <label>Slug:</label>
      <input type="text" id="slug" placeholder="uni-tripartite-v2-1">
      
      <label>Personality Prompt: <span id="char-count">0 chars</span></label>
      <textarea id="prompt" rows="20"></textarea>
    </div>
    
    <!-- Mock percepts -->
    <div class="section">
      <label>Mock Percepts:</label>
      <select id="preset-select">
        <option value="greeting">Greeting</option>
        <option value="silence">Silence</option>
        <option value="conversation">Conversation</option>
        <option value="technical">Technical</option>
        <option value="custom">Custom</option>
      </select>
      
      <textarea id="percepts" rows="5"></textarea>
    </div>
    
    <!-- Actions -->
    <div class="actions">
      <button id="test-btn" class="primary">Test</button>
      <button id="save-btn">Save</button>
      <button id="activate-btn" class="success">Set Active</button>
    </div>
    
    <!-- Results -->
    <div id="results" class="section hidden">
      <h3>Test Result:</h3>
      <div class="result-box">
        <strong>Mind Moment:</strong>
        <p id="result-moment"></p>
        
        <strong>Sigil Phrase:</strong>
        <p id="result-sigil"></p>
        
        <strong>Kinetic:</strong>
        <p id="result-kinetic"></p>
        
        <strong>Lighting:</strong>
        <p id="result-lighting"></p>
      </div>
    </div>
  </div>
  
  <script src="forge.js"></script>
</body>
</html>
```

### Key JavaScript Functions

```javascript
// forge.js
const API_BASE = '/api';

// Load personalities
async function loadPersonalities() {
  const res = await fetch(`${API_BASE}/personalities`);
  const { personalities } = await res.json();
  // Populate dropdown...
}

// Test personality
async function testPersonality(id, percepts) {
  const res = await fetch(`${API_BASE}/personalities/${id}/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(percepts)
  });
  return await res.json();
}

// Save personality
async function savePersonality(data) {
  const res = await fetch(`${API_BASE}/personalities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await res.json();
}

// Activate personality
async function activatePersonality(id) {
  const res = await fetch(`${API_BASE}/personalities/${id}/activate`, {
    method: 'POST'
  });
  return await res.json();
}
```

---

## Implementation Order

### Week 1: Backend (Phase 3a)
1. ✅ Create migration: `002_personalities.sql`
2. ✅ Create repository: `src/db/personalities.js`
3. ✅ Create API: `src/api/personalities.js`
4. ✅ Seed current personality
5. ✅ Integrate into `server.js`
6. ✅ Update `real-cog.js` to load from DB
7. ✅ Test with curl/Postman

### Week 2: Frontend (Phase 3b)
1. ✅ Create `forge/index.html` (basic structure)
2. ✅ Add personality list + editor
3. ✅ Add mock percepts presets
4. ✅ Wire up test endpoint
5. ✅ Add save/activate functionality
6. ✅ Polish UI/UX
7. ✅ Test end-to-end

---

## Testing Strategy

### Backend Tests

```bash
# List personalities
curl http://localhost:3001/api/personalities

# Get active
curl http://localhost:3001/api/personalities/active

# Test personality
curl -X POST http://localhost:3001/api/personalities/:id/test \
  -H "Content-Type: application/json" \
  -d '{
    "visualPercepts": [{"emoji": "👋", "action": "waving"}],
    "audioPercepts": [{"transcript": "Hello"}]
  }'

# Activate
curl -X POST http://localhost:3001/api/personalities/:id/activate
```

### Frontend Tests

1. Load Forge UI: `http://localhost:3001/forge/`
2. Select personality from dropdown
3. Edit prompt
4. Select preset percepts
5. Click Test → verify result shows
6. Save new version
7. Activate → restart server → verify production uses new personality

---

## Security Considerations

### For MVP (Internal Use)
- No auth needed (internal tool)
- Same server as Cognizer
- CORS not needed (same origin)

### For Production (If Exposed)
1. Add basic auth to `/api/personalities` endpoints
2. Read-only public endpoint for active personality
3. Rate limit test endpoint (LLM costs money!)
4. CORS config if Forge hosted separately

---

## Success Criteria

✅ Writers can create new personalities without touching code  
✅ Writers can test personalities with instant feedback  
✅ Writers can see all outputs (mind moment, sigil, kinetic, lighting)  
✅ Production always uses active personality from DB  
✅ All mind moments tagged with personality that generated them  
✅ System works with or without DB (fallback to hardcoded)  

---

## Future Enhancements (Not MVP)

- **Version history**: Track personality revisions
- **A/B testing**: Run two personalities side-by-side
- **Analytics**: Compare personalities by metrics
- **Templates**: Personality starter templates
- **Validation**: Ensure personality produces valid JSON
- **Live preview**: See diff before activating
- **Rollback**: Revert to previous personality
- **Export/Import**: Share personalities between deployments

---

## File Checklist

**Created:**
- [ ] `src/db/migrations/002_personalities.sql`
- [ ] `src/db/personalities.js`
- [ ] `src/api/personalities.js`
- [ ] `scripts/seed-personality.js`
- [ ] `forge/index.html`
- [ ] `forge/style.css`
- [ ] `forge/forge.js`

**Modified:**
- [ ] `server.js` (add Express + API routes)
- [ ] `src/real-cog.js` (load personality from DB)
- [ ] `src/main.js` (call `initializePersonality()`)
- [ ] `package.json` (add script: `db:seed-personality`)

---

## Dependencies

**Already have:**
- ✅ PostgreSQL
- ✅ Express (listed in package.json)
- ✅ LLM providers

**Need to add:**
- None! All dependencies already in place.

---

## Deployment

**Railway/Render:**
1. Push to main (triggers deploy)
2. Migration runs automatically
3. Seed personality: `npm run db:seed-personality`
4. Forge accessible at: `https://cognizer.railway.app/forge/`

**Environment variables:**
- None needed (uses existing DATABASE_URL, LLM keys)

---

## Risk Mitigation

### Risk: Active personality deleted
**Mitigation**: Prevent deletion of active personality in code

### Risk: Bad personality crashes production
**Mitigation**: Fallback to hardcoded personality if DB fails

### Risk: Test endpoint costs too much
**Mitigation**: Rate limit + cache + use cheapest LLM for tests

### Risk: Two personalities marked active
**Mitigation**: DB constraint + transaction on activate

---

## Documentation

**For writers:**
- Create `forge/README.md` with:
  - How to access Forge
  - How to write good personalities
  - How to test effectively
  - How to activate for production

**For developers:**
- Update `docs/DEVELOPER_GUIDE.md`:
  - Personality system architecture
  - API endpoints
  - How to add new personality fields

---

## Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| 3a: Backend | 3-4 days | API + DB working |
| 3b: Frontend | 3-4 days | Forge UI complete |
| Testing | 1-2 days | End-to-end tested |
| **Total** | **1-2 weeks** | Production ready |

---

## Ready to Build?

This plan is **production-ready**. Every step is:
- ✅ Clearly defined
- ✅ Minimal scope
- ✅ No unnecessary complexity
- ✅ Testable
- ✅ Deployable

**Next steps**: Switch to agent mode and start with Phase 3a, Step 1 (migration).

---

Last updated: November 17, 2025

