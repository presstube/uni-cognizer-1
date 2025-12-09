# Sound Engine Prompt Editor - Implementation Plan

**Date:** December 6, 2025  
**Status:** 📝 Ready for Implementation  
**Location:** `/web/prompt-editor/sound/`

---

## Overview

A real-time prompt editor for testing and refining the UNI Audio Instrument system. Users can adjust prompts, upload CSV sample files, test with custom text or random mind moments, view AI reasoning, and visualize audio parameter selections.

**Goals:**
- Edit and test sound generation prompts
- Upload custom music/texture sample CSVs
- Test with mind moments or custom text
- View AI reasoning and parameter selections
- Validate scale constraints
- Save/activate/manage prompt versions

---

## Architecture

### Project Patterns

This editor follows the established patterns from existing prompt editors:

**Two-Pane Layout:**
- Left: Controls, prompts, settings
- Right: Test input, results, visualizations

**State Management:**
- Server holds all state (database)
- Client is event-driven and stateless
- localStorage only for "last used" prompt

**API Pattern:**
```
GET    /api/sound-prompts              # List all
GET    /api/sound-prompts/:id          # Get one
GET    /api/sound-prompts/active       # Get active
POST   /api/sound-prompts              # Create/update
POST   /api/sound-prompts/:id/activate # Set active
DELETE /api/sound-prompts/:id          # Delete
POST   /api/sound-prompts/test         # Test generation
POST   /api/sound-prompts/upload-csv   # Upload CSV file
```

---

## UI Layout

### Left Pane (Controls & Configuration)

```
┌─────────────────────────────────────┐
│ Load Prompt: [Dropdown ▼]           │
├─────────────────────────────────────┤
│ Name: [UNI Audio Instrument v1.0 ]  │
│ Slug: [uni-audio-instrument-v1-0 ]  │
├─────────────────────────────────────┤
│ [💾 Save] [✓ Activate] [Delete]    │
├─────────────────────────────────────┤
│ System Prompt Template              │
│ ┌─────────────────────────────────┐ │
│ │ You will control an audio       │ │
│ │ software instrument designed to │ │
│ │ express your internal moods...  │ │
│ │                                 │ │
│ │ [Full UNI spec text here]       │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│                       1,234 chars   │
├─────────────────────────────────────┤
│ ⚙️ LLM Settings                      │
│ Provider: [Gemini ▼]                │
│ Model:    [2.0 Flash Exp ▼]         │
│                                     │
│ Temperature: [0.7    ]              │
│ Max Tokens:  [500    ]              │
│ Top P:       [0.95   ]              │
│ Top K:       [40     ]              │
│                                     │
│ Presets:                            │
│ [Deterministic] [Balanced] [Creative]│
├─────────────────────────────────────┤
│ 📁 Sample Files (CSV)                │
│                                     │
│ Music Samples:                      │
│ 📄 music_samples.csv (default)      │
│ [📁 Upload Custom]                  │
│                                     │
│ Texture Samples:                    │
│ 📄 texture_samples.csv (default)    │
│ [📁 Upload Custom]                  │
│                                     │
│ [↺ Reset to Defaults]               │
└─────────────────────────────────────┘
```

### Right Pane (Test Input & Results)

```
┌─────────────────────────────────────┐
│ 🎵 Test Audio Generation             │
├─────────────────────────────────────┤
│ Test Input:                          │
│ ┌─────────────────────────────────┐ │
│ │ The phrase 'Is it going to work │ │
│ │ for me?' echoes through the     │ │
│ │ structure as Zone 2's fire...   │ │
│ │                                 │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│ [🎲 Random Mind Moment] [⚡ Generate]│
├─────────────────────────────────────┤
│                                     │
│ [Results appear below after generate]│
│                                     │
├─────────────────────────────────────┤
│ ✅ Generated in 1.24s                │
│                                     │
│ 💭 AI Reasoning:                     │
│ ┌─────────────────────────────────┐ │
│ │ Selected music_sample_20 for    │ │
│ │ its lonely, sparse quality that │ │
│ │ mirrors the isolated atmosphere.│ │
│ │ The cool tone and minor scale   │ │
│ │ (0.2-0.3 range) capture the     │ │
│ │ melancholic mood...              │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ 🎸 Audio Selections:                 │
│ ┌─────────────────────────────────┐ │
│ │ music_filename:   music_sample_20│ │
│ │ texture_filename: texture_samp_65│ │
│ │ bass_preset:      bass_lfo_filter│ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ 📊 Parameters:                       │
│                                     │
│ Bass:                               │
│ Speed       ████░░░░░░ 0.25         │
│ Stability   ███████░░░ 0.35         │
│ Coloration  ███░░░░░░░ 0.15         │
│ Scale       ████░░░░░░ 0.20 [minor ✓]│
│                                     │
│ Melody:                             │
│ Speed       ████████░░ 0.40         │
│ Stability   ████████████ 0.60       │
│ Coloration  ████░░░░░░ 0.20         │
│ Scale       ██████░░░░ 0.30 [minor ✓]│
├─────────────────────────────────────┤
│ 📋 Selected Samples:                 │
│                                     │
│ Music: music_sample_20              │
│ "Lonely and ponderous. Single       │
│ sparse noise synth notes unfold"    │
│ • Tone: cool                        │
│ • Density: sparse                   │
│ • Mood: neutral                     │
│ • Scale: minor                      │
│ • Rhythm: arhythmic                 │
│                                     │
│ Texture: texture_sample_65          │
│ "Drops of water in a big cave"      │
│ • Category: Nature                  │
│ • Tone: cool                        │
└─────────────────────────────────────┘
```

---

## File Structure

All files follow the Prime Directive (functional, small, focused modules):

```
/web/prompt-editor/sound/
├── index.html              # Main editor UI (~200 lines)
├── editor.js               # State & CRUD operations (~300 lines)
├── csv-manager.js          # CSV upload/parse/validate (~100 lines)
├── generator.js            # LLM API wrapper (~80 lines)
├── results-display.js      # Render results/reasoning (~120 lines)
├── parameter-viz.js        # Parameter bars/scales (~100 lines)
├── style.css               # Custom styles (~150 lines)
└── README.md               # Usage documentation
```

### Module Responsibilities

#### `index.html`
- Two-pane layout structure
- Form elements (dropdowns, inputs, textareas)
- Test input textarea
- Results containers
- Import shared CSS (`editor-base.css`)

#### `editor.js`
**Core state management and CRUD operations**

```javascript
// State
const state = {
  prompts: [],
  currentPromptId: null,
  musicCSV: null,
  textureCSV: null,
  isGenerating: false
};

// Key functions
async function init()
async function loadPrompts()
async function loadPrompt(id)
async function savePrompt()
async function activatePrompt()
async function deletePrompt()
async function handleGenerate()
function updateUI()
```

#### `csv-manager.js`
**CSV file handling and parsing**

```javascript
export async function uploadCSV(file, type)
export function parseCSV(csvString)
export function validateMusicCSV(rows)
export function validateTextureCSV(rows)
export async function loadDefaultCSVs()
export async function resetToDefaults()
```

#### `generator.js`
**LLM API communication**

```javascript
export async function generateSelections(params)
export function parseResponse(response)
export function validateSelections(selections, musicSamples, textureSamples)
```

#### `results-display.js`
**Render generation results**

```javascript
export function displayResults(container, result)
export function displayReasoning(container, reasoning)
export function displaySelections(container, selections)
export function displaySampleDetails(container, sample, type)
export function clearResults(container)
```

#### `parameter-viz.js`
**Visual parameter representations**

```javascript
export function renderParameterBar(label, value, max = 1.0)
export function renderScaleIndicator(value, musicScale)
export function renderParameterSection(container, params, type)
export function getScaleColor(value)
```

---

## Backend Implementation

### Database Schema

**New migration:** `/src/db/migrations/017_sound_prompts.sql`

```sql
-- Sound Engine Prompts
-- Allows saving and managing prompts for UNI Audio Instrument

CREATE TABLE IF NOT EXISTS sound_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  prompt TEXT NOT NULL,
  active BOOLEAN DEFAULT false,
  llm_settings JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only one active prompt at a time
CREATE UNIQUE INDEX idx_sound_prompts_active 
  ON sound_prompts (active) 
  WHERE active = true;

-- Track updates
CREATE INDEX idx_sound_prompts_updated 
  ON sound_prompts (updated_at DESC);

-- CSV files table
CREATE TABLE IF NOT EXISTS sound_csv_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL,  -- 'music' or 'texture'
  filename VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for default lookup
CREATE INDEX idx_sound_csv_files_default 
  ON sound_csv_files (type, is_default) 
  WHERE is_default = true;

-- Seed with default prompt
INSERT INTO sound_prompts (name, slug, prompt, llm_settings, active) VALUES (
  'UNI Audio Instrument v1.0',
  'uni-audio-instrument-v1-0',
  '[Full content from UNI_Audio_Instrument_Specification.md]',
  '{
    "provider": "gemini",
    "model": "gemini-2.0-flash-exp",
    "temperature": 0.7,
    "maxTokens": 500,
    "topP": 0.95,
    "topK": 40
  }',
  true
);
```

### Database Module

**New file:** `/src/db/sound-prompts.js`

```javascript
import { getPool } from './index.js';
import fs from 'fs/promises';
import path from 'path';

// List all prompts
export async function listSoundPrompts() {
  const pool = getPool();
  const result = await pool.query(
    'SELECT * FROM sound_prompts ORDER BY updated_at DESC'
  );
  return result.rows;
}

// Get single prompt
export async function getSoundPrompt(id) {
  const pool = getPool();
  const result = await pool.query(
    'SELECT * FROM sound_prompts WHERE id = $1',
    [id]
  );
  return result.rows[0];
}

// Get active prompt
export async function getActiveSoundPrompt() {
  const pool = getPool();
  const result = await pool.query(
    'SELECT * FROM sound_prompts WHERE active = true'
  );
  return result.rows[0];
}

// Save prompt (create or update)
export async function saveSoundPrompt(data) {
  const pool = getPool();
  
  if (data.id) {
    // Update existing
    const result = await pool.query(`
      UPDATE sound_prompts 
      SET name = $1, slug = $2, prompt = $3, 
          llm_settings = $4, updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [data.name, data.slug, data.prompt, data.llmSettings, data.id]);
    return result.rows[0];
  } else {
    // Create new
    const result = await pool.query(`
      INSERT INTO sound_prompts (name, slug, prompt, llm_settings)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [data.name, data.slug, data.prompt, data.llmSettings]);
    return result.rows[0];
  }
}

// Activate prompt
export async function activateSoundPrompt(id) {
  const pool = getPool();
  
  await pool.query('BEGIN');
  try {
    // Deactivate all
    await pool.query('UPDATE sound_prompts SET active = false');
    
    // Activate selected
    const result = await pool.query(
      'UPDATE sound_prompts SET active = true WHERE id = $1 RETURNING *',
      [id]
    );
    
    await pool.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }
}

// Delete prompt
export async function deleteSoundPrompt(id) {
  const pool = getPool();
  await pool.query('DELETE FROM sound_prompts WHERE id = $1', [id]);
}

// Seed default CSVs
export async function seedDefaultCSVs() {
  const pool = getPool();
  
  // Check if already seeded
  const existing = await pool.query(
    'SELECT COUNT(*) FROM sound_csv_files WHERE is_default = true'
  );
  
  if (parseInt(existing.rows[0].count) > 0) {
    console.log('✅ Default CSV files already seeded');
    return;
  }
  
  // Load from assets
  const musicPath = path.join(process.cwd(), 'assets/sound-samples/music_samples.csv');
  const texturePath = path.join(process.cwd(), 'assets/sound-samples/texture_samples.csv');
  
  const musicContent = await fs.readFile(musicPath, 'utf-8');
  const textureContent = await fs.readFile(texturePath, 'utf-8');
  
  // Insert defaults
  await pool.query(`
    INSERT INTO sound_csv_files (type, filename, content, is_default)
    VALUES 
      ('music', 'music_samples.csv', $1, true),
      ('texture', 'texture_samples.csv', $2, true)
  `, [musicContent, textureContent]);
  
  console.log('✅ Default CSV files seeded');
}

// Get default CSVs
export async function getDefaultCSVs() {
  const pool = getPool();
  const result = await pool.query(
    'SELECT * FROM sound_csv_files WHERE is_default = true'
  );
  
  return {
    music: result.rows.find(r => r.type === 'music'),
    texture: result.rows.find(r => r.type === 'texture')
  };
}

// Upload custom CSV
export async function uploadCSV(type, filename, content) {
  const pool = getPool();
  const result = await pool.query(`
    INSERT INTO sound_csv_files (type, filename, content, is_default)
    VALUES ($1, $2, $3, false)
    RETURNING *
  `, [type, filename, content]);
  return result.rows[0];
}
```

### API Routes

**New file:** `/src/api/sound-prompts.js`

```javascript
import express from 'express';
import * as db from '../db/sound-prompts.js';
import { generateAudioSelections } from '../sound/generator.js';

const router = express.Router();

// List all prompts
router.get('/sound-prompts', async (req, res) => {
  try {
    const prompts = await db.listSoundPrompts();
    res.json({ prompts });
  } catch (error) {
    console.error('Failed to list prompts:', error);
    res.status(500).json({ error: 'Failed to load prompts' });
  }
});

// Get single prompt
router.get('/sound-prompts/:id', async (req, res) => {
  try {
    const prompt = await db.getSoundPrompt(req.params.id);
    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    res.json({ prompt });
  } catch (error) {
    console.error('Failed to get prompt:', error);
    res.status(500).json({ error: 'Failed to load prompt' });
  }
});

// Get active prompt
router.get('/sound-prompts/active', async (req, res) => {
  try {
    const prompt = await db.getActiveSoundPrompt();
    if (!prompt) {
      return res.status(404).json({ error: 'No active prompt' });
    }
    res.json({ prompt });
  } catch (error) {
    console.error('Failed to get active prompt:', error);
    res.status(500).json({ error: 'Failed to load active prompt' });
  }
});

// Save prompt (create or update)
router.post('/sound-prompts', async (req, res) => {
  try {
    const { id, name, slug, prompt, llmSettings } = req.body;
    
    if (!name || !slug || !prompt) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const savedPrompt = await db.saveSoundPrompt({
      id, name, slug, prompt, llmSettings
    });
    
    res.json({ prompt: savedPrompt });
  } catch (error) {
    console.error('Failed to save prompt:', error);
    res.status(500).json({ error: error.message });
  }
});

// Activate prompt
router.post('/sound-prompts/:id/activate', async (req, res) => {
  try {
    const prompt = await db.activateSoundPrompt(req.params.id);
    res.json({ prompt });
  } catch (error) {
    console.error('Failed to activate prompt:', error);
    res.status(500).json({ error: 'Failed to activate prompt' });
  }
});

// Delete prompt
router.delete('/sound-prompts/:id', async (req, res) => {
  try {
    await db.deleteSoundPrompt(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete prompt:', error);
    res.status(500).json({ error: 'Failed to delete prompt' });
  }
});

// Test generation (without saving)
router.post('/sound-prompts/test', async (req, res) => {
  try {
    const { input, prompt, llmSettings, musicCSV, textureCSV } = req.body;
    
    if (!input || !prompt) {
      return res.status(400).json({ error: 'Missing input or prompt' });
    }
    
    const result = await generateAudioSelections({
      input,
      prompt,
      llmSettings,
      musicCSV,
      textureCSV
    });
    
    res.json(result);
  } catch (error) {
    console.error('Generation failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload CSV file
router.post('/sound-prompts/upload-csv', async (req, res) => {
  try {
    const { type, filename, content } = req.body;
    
    if (!['music', 'texture'].includes(type)) {
      return res.status(400).json({ error: 'Invalid CSV type' });
    }
    
    const csv = await db.uploadCSV(type, filename, content);
    res.json({ csv });
  } catch (error) {
    console.error('Failed to upload CSV:', error);
    res.status(500).json({ error: 'Failed to upload CSV' });
  }
});

// Get default CSVs
router.get('/sound-prompts/csvs/defaults', async (req, res) => {
  try {
    const csvs = await db.getDefaultCSVs();
    res.json(csvs);
  } catch (error) {
    console.error('Failed to get default CSVs:', error);
    res.status(500).json({ error: 'Failed to load default CSVs' });
  }
});

export default router;
```

---

## Asset Files

### CSV Files Location

**Path:** `/assets/sound-samples/`

```
/assets/
└── sound-samples/           # NEW folder
    ├── music_samples.csv    # From spike
    └── texture_samples.csv  # From spike
```

These files will be:
1. Copied from current location to `/assets/sound-samples/`
2. Loaded into database during migration/seeding
3. Served as defaults for new prompts

---

## Implementation Phases

### Phase 1: Setup & Migration (2 hours)

**Tasks:**
1. ✅ Create `/assets/sound-samples/` folder
2. ✅ Copy CSVs from spike to assets
3. ✅ Create migration `017_sound_prompts.sql`
4. ✅ Create database module `/src/db/sound-prompts.js`
5. ✅ Seed default CSVs on server boot
6. ✅ Test database operations

**Deliverables:**
- Database tables created
- Default prompt seeded
- Default CSVs loaded
- Database module tested

---

### Phase 2: Backend API (3 hours)

**Tasks:**
1. ✅ Create `/src/api/sound-prompts.js`
2. ✅ Implement all CRUD endpoints
3. ✅ Create sound generator module
4. ✅ Port validator logic from spike
5. ✅ Test all endpoints with curl/Postman

**Deliverables:**
- All API routes functional
- Generator integrated
- Validation working
- CSV upload/download working

---

### Phase 3: Frontend Structure (2 hours)

**Tasks:**
1. ✅ Create `/web/prompt-editor/sound/` folder
2. ✅ Create `index.html` with two-pane layout
3. ✅ Create `style.css` (extend `editor-base.css`)
4. ✅ Create empty JS modules
5. ✅ Test basic page load

**Deliverables:**
- HTML structure complete
- Styling applied
- JS modules scaffolded
- Page loads without errors

---

### Phase 4: Editor Core (3 hours)

**Tasks:**
1. ✅ Implement `editor.js` state management
2. ✅ Connect to API endpoints
3. ✅ Implement CRUD operations
4. ✅ Add form validation
5. ✅ Test save/load/activate/delete

**Deliverables:**
- Prompt CRUD working
- Form validation active
- UI updates correctly
- localStorage integration

---

### Phase 5: CSV Management (2 hours)

**Tasks:**
1. ✅ Implement `csv-manager.js`
2. ✅ Add file upload UI
3. ✅ Parse and validate CSVs
4. ✅ Display current CSV info
5. ✅ Test upload/reset

**Deliverables:**
- CSV upload working
- Validation catches errors
- Default reset working
- UI shows current CSVs

---

### Phase 6: Generator Integration (2 hours)

**Tasks:**
1. ✅ Implement `generator.js` API wrapper
2. ✅ Connect test input to generator
3. ✅ Handle loading states
4. ✅ Parse and validate responses
5. ✅ Display errors gracefully

**Deliverables:**
- Generation triggers correctly
- Loading states visible
- Errors displayed
- Success path working

---

### Phase 7: Results Display (3 hours)

**Tasks:**
1. ✅ Implement `results-display.js`
2. ✅ Implement `parameter-viz.js`
3. ✅ Display reasoning prominently
4. ✅ Show all 11 selection fields
5. ✅ Render parameter bars
6. ✅ Display sample details

**Deliverables:**
- Reasoning displays beautifully
- Parameters visualized
- Sample details shown
- Scale indicators working

---

### Phase 8: Polish & Testing (2 hours)

**Tasks:**
1. ✅ Add keyboard shortcuts
2. ✅ Implement preset buttons
3. ✅ Add copy-to-clipboard
4. ✅ Error handling polish
5. ✅ Comprehensive manual testing
6. ✅ Documentation updates

**Deliverables:**
- All features polished
- Edge cases handled
- Documentation complete
- Ready for production

---

## Testing Checklist

### CRUD Operations
- [ ] Create new prompt
- [ ] Save prompt
- [ ] Load existing prompt
- [ ] Update prompt
- [ ] Activate prompt
- [ ] Delete prompt
- [ ] Auto-load last used

### CSV Management
- [ ] Upload music CSV
- [ ] Upload texture CSV
- [ ] Validate CSV structure
- [ ] Reset to defaults
- [ ] Handle malformed CSV
- [ ] Show CSV info

### Generation
- [ ] Generate with custom text
- [ ] Generate with random mind moment
- [ ] See reasoning output
- [ ] See all 11 selection fields
- [ ] Validate scale constraint
- [ ] Handle generation errors
- [ ] Show loading state

### Visualization
- [ ] Parameter bars render correctly
- [ ] Scale indicators show minor/major
- [ ] Sample details display
- [ ] Reasoning formats nicely
- [ ] Long text wraps properly

### LLM Settings
- [ ] Temperature changes
- [ ] MaxTokens changes
- [ ] Provider switching
- [ ] Model switching
- [ ] Presets apply correctly
- [ ] Settings persist on save

### Edge Cases
- [ ] Empty prompt text
- [ ] Missing CSV files
- [ ] Invalid CSV format
- [ ] LLM timeout
- [ ] Scale constraint violation
- [ ] Very long reasoning
- [ ] Unicode characters
- [ ] Network errors

---

## Spike Migration

### Files to Copy

**From:** `/web/prompt-editor/sound-engine/`  
**To:** Various locations

```bash
# CSVs → Assets
music_samples.csv           → /assets/sound-samples/music_samples.csv
texture_samples.csv         → /assets/sound-samples/texture_samples.csv

# Spec → Use in migration as default prompt
UNI_Audio_Instrument_Specification.md  → Inline in 017_sound_prompts.sql

# Spike logic → Reuse in new modules
spike/generator.js          → /src/sound/generator.js (adapted)
spike/validator.js          → /src/sound/validator.js (adapted)
```

### Files to Archive

**Move to:** `/graveyard/sound-engine-spike-2025-12-06/`

```
/web/prompt-editor/sound-engine/spike/  → /graveyard/sound-engine-spike-2025-12-06/
  ├── test.js                 # CLI tool
  ├── batch-test.js           # CLI tool
  ├── fetch-mind-moments.js   # Replaced by API
  ├── test-*.json             # Test data
  └── *.md                    # Documentation (keep for reference)

/web/prompt-editor/sound-engine/
  ├── IMPLEMENTATION_PLAN.md  # Original plan (superseded)
  ├── SPIKE_PLAN.md           # Original spike plan
  └── *.md                    # Other docs
```

**Note:** All markdown documentation is valuable reference material and should be preserved in the graveyard.

---

## Success Criteria

### MVP Requirements

**Must Have:**
- ✅ CRUD for sound prompts
- ✅ Upload/manage CSV files
- ✅ Test with custom text input
- ✅ Test with random mind moments
- ✅ Display reasoning prominently
- ✅ Display all 11 parameters
- ✅ Visualize parameters with bars
- ✅ Validate scale constraints
- ✅ Show sample details from CSV
- ✅ LLM settings controls
- ✅ Provider/model switching

**Nice to Have (Future):**
- Multi-provider support (GPT-4o, Claude)
- Batch testing UI
- Audio playback
- Export results
- Version history
- Dark mode toggle

### Quality Standards

- ✅ Follows prime directive (functional, small files)
- ✅ Uses shared styles (`editor-base.css`)
- ✅ All files under 300 lines
- ✅ Works with default CSVs
- ✅ Works with custom CSVs
- ✅ Handles errors gracefully
- ✅ 100% scale constraint compliance
- ✅ Reasoning displays correctly
- ✅ Responsive layout

---

## Timeline

**Estimated Total: 19 hours**

- Phase 1 (Setup): 2 hours
- Phase 2 (Backend): 3 hours
- Phase 3 (Frontend): 2 hours
- Phase 4 (Editor): 3 hours
- Phase 5 (CSV): 2 hours
- Phase 6 (Generator): 2 hours
- Phase 7 (Results): 3 hours
- Phase 8 (Polish): 2 hours

**Parallelization possible:**
- Frontend HTML/CSS can progress during backend work
- Visualizations can be built with mock data
- Documentation can be written throughout

---

## Key Design Decisions

### 1. CSV Storage: Database
Store full CSV content in database, not file system.

**Rationale:**
- Simpler architecture
- No file permissions issues
- Easy versioning
- Follows "server has state" principle

### 2. Generation: On-Demand
Button-triggered generation, not real-time streaming.

**Rationale:**
- Fast enough (~1.2s)
- Clearer UX
- Lower API costs
- Simpler implementation

### 3. Provider: Start with Gemini
Default to Gemini 2.0 Flash Exp only.

**Rationale:**
- Proven in spike (100% success)
- Fast and cheap
- Can add others later

### 4. Audio: No Playback in V1
Just show selections, no Web Audio synthesis.

**Rationale:**
- Focus on prompt testing
- Complex feature
- Can add later
- Visualizations sufficient

### 5. Reasoning: Prominent Display
Large, readable reasoning section at top of results.

**Rationale:**
- NEW valuable feature
- Builds trust
- Aids debugging
- Helps improve prompts

---

## References

**Spike folder:**
- `/web/prompt-editor/sound-engine/spike/`

**Existing editors:**
- `/web/prompt-editor/sigil/`
- `/web/prompt-editor/audio-percept/`

**Documentation:**
- `/prime-directive.md`
- `/docs/socket-events-reference.md`

**Backend patterns:**
- `/src/api/sigil-prompts.js`
- `/src/api/audio-prompts.js`
- `/src/db/sigil-prompts.js`

**Shared styles:**
- `/web/shared/styles/editor-base.css`
- `/web/shared/styles/base.css`

---

## Next Steps

1. Review this plan
2. Create assets folder and copy CSVs
3. Create database migration
4. Start Phase 1 (Setup & Migration)
5. Proceed through phases sequentially
6. Test thoroughly at each phase
7. Deploy when all phases complete

---

*This implementation plan provides a complete roadmap for building the Sound Engine prompt editor, following all existing project patterns and best practices.*
