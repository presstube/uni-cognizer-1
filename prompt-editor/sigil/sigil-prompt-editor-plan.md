# Sigil Prompt Editor - Implementation Plan

## Overview

A minimal web-based tool for crafting, testing, and versioning sigil generation prompts. Allows live iteration on the LLM instructions that generate sigil canvas drawing code.

**Core Concept:** Edit prompt → Test with phrase → See result → Iterate

---

## Design Principles

1. **Minimal UI** - Only essential controls, clean dark theme
2. **Live Testing** - Immediate feedback with real LLM calls
3. **Version Control** - Database-backed prompt versioning
4. **Interrupted Animation** - Thinking mode while generating, instant switch to result

---

## File Structure

```
/sigil-prompt-editor/
  ├── index.html              # Main UI (split left/right)
  ├── style.css               # Minimal dark styling
  ├── editor.js               # Client logic
  ├── sigil-prompt-editor-plan.md  # This file
  └── sigil/                  # Already exists
      ├── sigil.standalone.js
      ├── index.html          # Demo (keep for reference)
      └── README.md
```

---

## Database Schema

### New Migration: `003_sigil_prompts.sql`

```sql
-- Sigil prompt versioning
CREATE TABLE sigil_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  prompt TEXT NOT NULL,
  active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only one active prompt at a time
CREATE UNIQUE INDEX idx_sigil_prompts_active 
  ON sigil_prompts (active) 
  WHERE active = true;

-- Track updates
CREATE INDEX idx_sigil_prompts_updated ON sigil_prompts (updated_at DESC);
```

### Seed Data

Insert current production prompt as v1.0:

```sql
INSERT INTO sigil_prompts (name, slug, prompt, active) VALUES (
  'Sigil Prompt v1.0',
  'sigil-prompt-v1-0',
  'Generate JavaScript canvas drawing commands for a sigil representing "${concept}".

Match the style from the reference image. Balance geometric precision with organic fluidity.

RULES:
1. Available methods:
   - ctx.moveTo(x, y)
   - ctx.lineTo(x, y)
   - ctx.arc(x, y, radius, 0, Math.PI * 2)
   - ctx.quadraticCurveTo(cpx, cpy, x, y) - 4 parameters
   - ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) - 6 parameters
   - ctx.beginPath(), ctx.closePath(), ctx.stroke()
2. MIX geometric and organic - use both straight lines AND curves
3. Sharp angles and clean lines give structure
4. Gentle curves add flow and warmth
5. STRONGLY FAVOR symmetry - create balanced, centered compositions
6. Occasional asymmetry is welcome for visual interest (1 in 4 elements)
7. Small asymmetric details add character without breaking overall balance
8. AVOID explicit faces - no literal eyes, mouths, noses (subtle allusions OK)
9. Create abstract symbolic forms, not realistic depictions
10. Canvas is 100x100, center at (50, 50)
11. Maximum 30 lines
12. NO variables, NO functions, NO explanations
13. Output ONLY the ctx commands

Code:',
  true
);
```

---

## API Layer

### New File: `src/api/sigil-prompts.js`

Mirror the pattern from `src/api/personalities.js`:

```javascript
import { db } from '../db/index.js';

// List all sigil prompts
export async function listSigilPrompts(req, res) {
  const result = await db.query(
    'SELECT * FROM sigil_prompts ORDER BY updated_at DESC'
  );
  res.json({ prompts: result.rows });
}

// Get active prompt
export async function getActiveSigilPrompt(req, res) {
  const result = await db.query(
    'SELECT * FROM sigil_prompts WHERE active = true LIMIT 1'
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'No active prompt' });
  }
  res.json({ prompt: result.rows[0] });
}

// Get by ID
export async function getSigilPrompt(req, res) {
  const { id } = req.params;
  const result = await db.query(
    'SELECT * FROM sigil_prompts WHERE id = $1',
    [id]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Prompt not found' });
  }
  res.json({ prompt: result.rows[0] });
}

// Create or update
export async function saveSigilPrompt(req, res) {
  const { id, name, slug, prompt } = req.body;
  
  if (id) {
    // Update existing
    const result = await db.query(
      `UPDATE sigil_prompts 
       SET name = $1, slug = $2, prompt = $3, updated_at = NOW() 
       WHERE id = $4 
       RETURNING *`,
      [name, slug, prompt, id]
    );
    res.json({ prompt: result.rows[0] });
  } else {
    // Create new
    const result = await db.query(
      `INSERT INTO sigil_prompts (name, slug, prompt, active) 
       VALUES ($1, $2, $3, false) 
       RETURNING *`,
      [name, slug, prompt]
    );
    res.json({ prompt: result.rows[0] });
  }
}

// Activate prompt
export async function activateSigilPrompt(req, res) {
  const { id } = req.params;
  
  await db.query('BEGIN');
  try {
    // Deactivate all
    await db.query('UPDATE sigil_prompts SET active = false');
    
    // Activate this one
    const result = await db.query(
      'UPDATE sigil_prompts SET active = true WHERE id = $1 RETURNING *',
      [id]
    );
    
    await db.query('COMMIT');
    res.json({ prompt: result.rows[0] });
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
}

// Test with phrase
export async function testSigilPrompt(req, res) {
  const { id } = req.params;
  const { phrase } = req.body;
  
  // Get prompt
  const result = await db.query(
    'SELECT * FROM sigil_prompts WHERE id = $1',
    [id]
  );
  
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Prompt not found' });
  }
  
  const promptTemplate = result.rows[0].prompt;
  
  // Generate sigil with custom prompt
  const calls = await generateSigilWithCustomPrompt(phrase, promptTemplate);
  
  res.json({ calls });
}

// Delete prompt
export async function deleteSigilPrompt(req, res) {
  const { id } = req.params;
  
  // Check if active
  const check = await db.query(
    'SELECT active FROM sigil_prompts WHERE id = $1',
    [id]
  );
  
  if (check.rows.length === 0) {
    return res.status(404).json({ error: 'Prompt not found' });
  }
  
  if (check.rows[0].active) {
    return res.status(400).json({ error: 'Cannot delete active prompt' });
  }
  
  await db.query('DELETE FROM sigil_prompts WHERE id = $1', [id]);
  res.json({ success: true });
}
```

### New File: `src/db/sigil-prompts.js`

Database repository pattern:

```javascript
import { db } from './index.js';

export async function getAllSigilPrompts() {
  const result = await db.query(
    'SELECT * FROM sigil_prompts ORDER BY updated_at DESC'
  );
  return result.rows;
}

export async function getActiveSigilPrompt() {
  const result = await db.query(
    'SELECT * FROM sigil_prompts WHERE active = true LIMIT 1'
  );
  return result.rows[0] || null;
}

export async function getSigilPromptById(id) {
  const result = await db.query(
    'SELECT * FROM sigil_prompts WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

export async function createSigilPrompt(name, slug, prompt) {
  const result = await db.query(
    `INSERT INTO sigil_prompts (name, slug, prompt, active) 
     VALUES ($1, $2, $3, false) 
     RETURNING *`,
    [name, slug, prompt]
  );
  return result.rows[0];
}

export async function updateSigilPrompt(id, name, slug, prompt) {
  const result = await db.query(
    `UPDATE sigil_prompts 
     SET name = $1, slug = $2, prompt = $3, updated_at = NOW() 
     WHERE id = $4 
     RETURNING *`,
    [name, slug, prompt, id]
  );
  return result.rows[0];
}

export async function activateSigilPrompt(id) {
  await db.query('BEGIN');
  try {
    await db.query('UPDATE sigil_prompts SET active = false');
    const result = await db.query(
      'UPDATE sigil_prompts SET active = true WHERE id = $1 RETURNING *',
      [id]
    );
    await db.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
}

export async function deleteSigilPrompt(id) {
  await db.query('DELETE FROM sigil_prompts WHERE id = $1', [id]);
}
```

### Modified: `src/sigil/generator.js`

Add function to use custom prompt:

```javascript
/**
 * Generate sigil with custom prompt template
 * @param {string} concept - The concept phrase
 * @param {string} promptTemplate - Custom prompt with ${concept} placeholder
 * @returns {Promise<string>} Generated canvas drawing code
 */
export async function generateSigilWithCustomPrompt(concept, promptTemplate) {
  if (!concept || !concept.trim()) {
    throw new Error('Concept is required for sigil generation');
  }
  
  if (!promptTemplate || !promptTemplate.trim()) {
    throw new Error('Prompt template is required');
  }
  
  // Replace ${concept} placeholder
  const finalPrompt = promptTemplate.replace(/\$\{concept\}/g, concept);
  
  const imageContent = getImageContent();
  const userContent = [];
  
  if (imageContent) {
    userContent.push(imageContent);
    userContent.push({
      type: 'text',
      text: 'Here is a reference image showing 100 examples of the sigil style I want you to match. Study this carefully.'
    });
  }
  
  userContent.push({
    type: 'text',
    text: finalPrompt
  });
  
  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: 'You are a code generator specializing in minimalist geometric sigils.',
    messages: [{
      role: 'user',
      content: userContent
    }]
  });
  
  const code = message.content[0]?.text;
  
  if (!code) {
    throw new Error('No code returned from sigil generation');
  }
  
  // Clean up the code (same as generateSigil)
  let cleanCode = code.trim();
  
  if (cleanCode.startsWith('```')) {
    cleanCode = cleanCode.replace(/```(?:javascript|js)?\n?/g, '').replace(/```\s*$/g, '').trim();
  }
  
  if (!cleanCode.includes('ctx.')) {
    console.warn('[Sigil] Generated code does not contain canvas operations');
    throw new Error('Generated code does not contain valid canvas operations');
  }
  
  return cleanCode;
}
```

### Server Route Registration: `server.js`

Add routes for sigil prompt editor:

```javascript
import * as sigilPrompts from './src/api/sigil-prompts.js';

// Sigil Prompt Editor API
app.get('/api/sigil-prompts', sigilPrompts.listSigilPrompts);
app.get('/api/sigil-prompts/active', sigilPrompts.getActiveSigilPrompt);
app.get('/api/sigil-prompts/:id', sigilPrompts.getSigilPrompt);
app.post('/api/sigil-prompts', sigilPrompts.saveSigilPrompt);
app.post('/api/sigil-prompts/:id/activate', sigilPrompts.activateSigilPrompt);
app.post('/api/sigil-prompts/:id/test', sigilPrompts.testSigilPrompt);
app.delete('/api/sigil-prompts/:id', sigilPrompts.deleteSigilPrompt);

// Serve sigil prompt editor
app.use('/sigil-prompt-editor', express.static('sigil-prompt-editor'));
```

---

## Frontend Components

### `index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>⬡ Sigil Prompt Editor</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <!-- Left Pane: Editor -->
  <div class="left-pane">
    <select id="prompt-select">
      <option value="new">+ New Prompt</option>
    </select>
    
    <div class="inline-fields">
      <input type="text" id="name" placeholder="Sigil Prompt v1.0" maxlength="200">
      <input type="text" id="slug" placeholder="sigil-prompt-v1-0" maxlength="100">
    </div>
    
    <div class="actions">
      <button id="save-btn" class="btn-secondary">💾 Save</button>
      <button id="activate-btn" class="btn-success">✓ Set Active</button>
    </div>
    
    <label>Prompt Template <span class="hint">Use ${concept} for phrase</span></label>
    <textarea id="prompt" placeholder="Generate JavaScript canvas drawing commands for a sigil representing &quot;${concept}&quot;..."></textarea>
    
    <div class="ref-status">
      <span class="ref-indicator">Ref: sigil-grid-original.png ✓</span>
    </div>
  </div>

  <!-- Right Pane: Viewer -->
  <div class="right-pane">
    <div class="canvas-wrapper">
      <canvas id="sigil-canvas"></canvas>
    </div>
    
    <div class="phrase-input">
      <label>Sigil Phrase</label>
      <input type="text" 
             id="phrase" 
             placeholder="Enter phrase and press ⏎ to generate..."
             autocomplete="off">
    </div>
  </div>

  <script type="module" src="editor.js"></script>
</body>
</html>
```

### `style.css`

Minimal dark theme, inherit forge patterns:

```css
/* Reset & Base */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: #ddd;
  background: #0a0a0a;
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* Layout: Left/Right Split */
.left-pane,
.right-pane {
  height: 100vh;
  overflow-y: auto;
  padding: 24px;
}

.left-pane {
  flex: 0 0 50%;
  border-right: 1px solid #1a1a1a;
}

.right-pane {
  flex: 0 0 50%;
  background: #050505;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 32px;
}

/* Form Elements */
select,
input[type="text"],
textarea {
  width: 100%;
  background: #111;
  border: none;
  border-radius: 4px;
  color: #fff;
  padding: 10px;
  font-size: 14px;
  font-family: inherit;
  transition: background 0.2s;
  margin-bottom: 16px;
}

select:focus,
input[type="text"]:focus,
textarea:focus {
  outline: none;
  background: #1a1a1a;
}

textarea {
  resize: vertical;
  min-height: 400px;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
}

label {
  display: block;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #888;
  margin-bottom: 6px;
}

.hint {
  float: right;
  color: #666;
  font-size: 10px;
  text-transform: none;
}

.inline-fields {
  display: flex;
  gap: 12px;
}

.inline-fields input {
  flex: 1;
}

/* Actions */
.actions {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
}

button {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.btn-secondary {
  background: #1a1a1a;
  color: #ddd;
}

.btn-secondary:hover:not(:disabled) {
  background: #252525;
}

.btn-success {
  background: #00aa44;
  color: #fff;
}

.btn-success:hover:not(:disabled) {
  background: #008833;
}

/* Reference Status */
.ref-status {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #1a1a1a;
}

.ref-indicator {
  font-size: 11px;
  color: #666;
}

/* Canvas */
.canvas-wrapper {
  position: relative;
}

#sigil-canvas {
  display: block;
  width: 200px;
  height: 200px;
  border: 2px solid #333;
  background: #000;
}

/* Phrase Input */
.phrase-input {
  width: 100%;
  max-width: 400px;
}

.phrase-input label {
  text-align: center;
  display: block;
  margin-bottom: 8px;
}

.phrase-input input {
  width: 100%;
  text-align: center;
  font-size: 16px;
  padding: 14px;
  background: #0a0a0a;
  border: 2px solid #1a1a1a;
  margin: 0;
}

.phrase-input input:focus {
  border-color: #0080ff;
  background: #0a0a0a;
}

/* Responsive */
@media (max-width: 768px) {
  body {
    flex-direction: column;
  }
  
  .left-pane,
  .right-pane {
    flex: 1 1 auto;
    width: 100%;
    height: auto;
    min-height: 50vh;
  }
  
  .left-pane {
    border-right: none;
    border-bottom: 1px solid #1a1a1a;
  }
}
```

### `editor.js`

Client-side logic:

```javascript
import { Sigil } from './sigil/sigil.standalone.js';

const API_BASE = '/api';

// State
let prompts = [];
let currentPrompt = null;
let currentId = null;
let sigil = null;

// DOM Elements
const promptSelect = document.getElementById('prompt-select');
const nameInput = document.getElementById('name');
const slugInput = document.getElementById('slug');
const promptTextarea = document.getElementById('prompt');
const saveBtn = document.getElementById('save-btn');
const activateBtn = document.getElementById('activate-btn');
const phraseInput = document.getElementById('phrase');

// Initialize
async function init() {
  initSigil();
  await loadPrompts();
  await autoLoadPrompt();
  
  // Event listeners
  promptSelect.addEventListener('change', handlePromptChange);
  nameInput.addEventListener('input', updateSlug);
  saveBtn.addEventListener('click', handleSave);
  activateBtn.addEventListener('click', handleActivate);
  phraseInput.addEventListener('keydown', handlePhraseSubmit);
}

// Initialize Sigil viewer
function initSigil() {
  sigil = new Sigil({
    canvas: document.getElementById('sigil-canvas'),
    canvasSize: 200,
    drawDuration: 200,
    undrawDuration: 300,
    thinkingShiftInterval: 100,
    thinkingVariedMin: 1000,
    thinkingVariedMax: 3000,
    scale: 1.0,
    lineColor: '#fff',
    lineWeight: 1.2
  });
  
  // Start in thinking mode
  sigil.thinking();
}

// Load all prompts
async function loadPrompts() {
  try {
    const res = await fetch(`${API_BASE}/sigil-prompts`);
    if (!res.ok) throw new Error('Failed to load prompts');
    
    const data = await res.json();
    prompts = data.prompts;
    
    // Populate select
    promptSelect.innerHTML = '<option value="new">+ New Prompt</option>';
    prompts.forEach(p => {
      const option = document.createElement('option');
      option.value = p.id;
      option.textContent = `${p.name}${p.active ? ' ⭐' : ''}`;
      promptSelect.appendChild(option);
    });
  } catch (error) {
    console.error('Failed to load prompts:', error);
    alert(`Error loading prompts: ${error.message}`);
  }
}

// Auto-load active or last selected prompt
async function autoLoadPrompt() {
  // Try localStorage first
  const lastSelected = localStorage.getItem('sigil_prompt_editor_last');
  if (lastSelected && lastSelected !== 'new') {
    const exists = prompts.find(p => p.id === lastSelected);
    if (exists) {
      promptSelect.value = lastSelected;
      await handlePromptChange();
      return;
    }
  }
  
  // Fallback to active prompt
  try {
    const res = await fetch(`${API_BASE}/sigil-prompts/active`);
    if (res.ok) {
      const data = await res.json();
      promptSelect.value = data.prompt.id;
      await handlePromptChange();
    }
  } catch (error) {
    console.log('No active prompt, starting with new');
  }
}

// Handle prompt selection change
async function handlePromptChange() {
  const value = promptSelect.value;
  
  // Save to localStorage
  localStorage.setItem('sigil_prompt_editor_last', value);
  
  if (value === 'new') {
    clearForm();
    currentId = null;
    currentPrompt = null;
    activateBtn.disabled = true;
  } else {
    try {
      const res = await fetch(`${API_BASE}/sigil-prompts/${value}`);
      if (!res.ok) throw new Error('Failed to load prompt');
      
      const data = await res.json();
      currentPrompt = data.prompt;
      currentId = value;
      
      nameInput.value = currentPrompt.name;
      slugInput.value = currentPrompt.slug;
      promptTextarea.value = currentPrompt.prompt;
      
      activateBtn.disabled = currentPrompt.active;
      
    } catch (error) {
      console.error('Failed to load prompt:', error);
      alert(`Error: ${error.message}`);
    }
  }
}

// Clear form
function clearForm() {
  nameInput.value = '';
  slugInput.value = '';
  promptTextarea.value = '';
}

// Update slug from name
function updateSlug() {
  if (!currentId || !slugInput.value) {
    const slug = nameInput.value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    slugInput.value = slug;
  }
}

// Save prompt
async function handleSave() {
  const name = nameInput.value.trim();
  const slug = slugInput.value.trim();
  const prompt = promptTextarea.value.trim();
  
  if (!name || !slug || !prompt) {
    alert('Please fill in all fields');
    return;
  }
  
  try {
    saveBtn.disabled = true;
    saveBtn.textContent = '...';
    
    const res = await fetch(`${API_BASE}/sigil-prompts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: currentId,
        name,
        slug,
        prompt
      })
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Save failed');
    }
    
    const data = await res.json();
    currentId = data.prompt.id;
    currentPrompt = data.prompt;
    
    await loadPrompts();
    promptSelect.value = currentId;
    
    activateBtn.disabled = data.prompt.active;
    
    alert('✅ Saved successfully');
    
  } catch (error) {
    console.error('Save failed:', error);
    alert(`Error: ${error.message}`);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = '💾 Save';
  }
}

// Activate prompt
async function handleActivate() {
  if (!currentId) {
    alert('Please save the prompt first');
    return;
  }
  
  if (!confirm('Set this as the active sigil prompt?\n\nThis will be used by the main system for sigil generation.')) {
    return;
  }
  
  try {
    activateBtn.disabled = true;
    activateBtn.textContent = '...';
    
    const res = await fetch(`${API_BASE}/sigil-prompts/${currentId}/activate`, {
      method: 'POST'
    });
    
    if (!res.ok) throw new Error('Activation failed');
    
    await loadPrompts();
    promptSelect.value = currentId;
    
    activateBtn.disabled = true;
    
    alert('✅ Prompt activated!\n\nRestart the server to load the new prompt.');
    
  } catch (error) {
    console.error('Activation failed:', error);
    alert(`Error: ${error.message}`);
  } finally {
    activateBtn.textContent = '✓ Set Active';
  }
}

// Handle phrase submission
async function handlePhraseSubmit(e) {
  if (e.key !== 'Enter') return;
  
  const phrase = phraseInput.value.trim();
  if (!phrase) return;
  
  const prompt = promptTextarea.value.trim();
  if (!prompt) {
    alert('Please enter a prompt first');
    return;
  }
  
  // Save first if not saved
  if (!currentId) {
    const shouldSave = confirm('Save this prompt before testing?');
    if (shouldSave) {
      await handleSave();
      if (!currentId) return; // Save failed
    }
  }
  
  try {
    phraseInput.disabled = true;
    
    // Start thinking animation
    sigil.thinkingVaried();
    
    // Generate sigil
    const res = await fetch(`${API_BASE}/sigil-prompts/${currentId}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phrase })
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || error.details || 'Generation failed');
    }
    
    const data = await res.json();
    
    // Draw the result
    sigil.drawSigil({ calls: data.calls });
    
  } catch (error) {
    console.error('Generation failed:', error);
    alert(`Error: ${error.message}`);
    sigil.thinking(); // Fall back to thinking
  } finally {
    phraseInput.disabled = false;
  }
}

// Start
init();
```

---

## Implementation Steps

### Phase 1: Database & Backend (Server must be stopped)

1. **Create migration file**
   ```bash
   touch src/db/migrations/003_sigil_prompts.sql
   ```
   
2. **Add migration SQL** (see schema above)

3. **Run migration**
   ```bash
   npm run migrate
   ```

4. **Create database repository**
   ```bash
   touch src/db/sigil-prompts.js
   ```

5. **Create API routes**
   ```bash
   touch src/api/sigil-prompts.js
   ```

6. **Modify sigil generator**
   - Add `generateSigilWithCustomPrompt()` to `src/sigil/generator.js`

7. **Register routes in server.js**
   - Add API routes
   - Add static file serving for `/sigil-prompt-editor`

### Phase 2: Frontend

1. **Create HTML structure**
   ```bash
   # File: sigil-prompt-editor/index.html
   ```

2. **Create CSS styling**
   ```bash
   # File: sigil-prompt-editor/style.css
   ```

3. **Create JavaScript logic**
   ```bash
   # File: sigil-prompt-editor/editor.js
   ```

### Phase 3: Testing

1. **Start server**
   ```bash
   npm start
   ```

2. **Navigate to tool**
   ```
   http://localhost:3001/sigil-prompt-editor
   ```

3. **Test flows:**
   - Load default prompt
   - Edit prompt text
   - Save as new version
   - Test with phrase (real LLM call)
   - Activate new prompt
   - Verify thinking animation
   - Verify draw animation

### Phase 4: Integration

1. **Modify main sigil generation** to use active prompt
   - Update `src/sigil/generator.js` to query active prompt from DB
   - Fall back to hardcoded prompt if no active one exists

2. **Update server startup** to log active prompt

---

## Testing Checklist

- [ ] Database migration runs successfully
- [ ] API endpoints return expected data
- [ ] Can load existing prompts
- [ ] Can create new prompt
- [ ] Can update existing prompt
- [ ] Can activate prompt (deactivates others)
- [ ] Cannot delete active prompt
- [ ] Phrase submission triggers thinking animation
- [ ] LLM generation returns valid canvas code
- [ ] Canvas displays generated sigil
- [ ] Error handling works (bad prompt, API failure)
- [ ] Responsive layout works on tablet/mobile

---

## Production Considerations

### Environment Variables

No new env vars needed - uses existing `ANTHROPIC_API_KEY`

### Cost Management

Each test generates a real LLM call:
- Model: Claude Sonnet 4
- Input: ~1500 tokens (prompt + reference image)
- Output: ~300 tokens (canvas code)
- Cost: ~$0.01 per test

**Recommendation:** Add rate limiting or usage tracking in future iteration

### Database Backups

Sigil prompts are versioned and valuable:
- Back up regularly with main database
- Export active prompt before major changes

### Deployment

No special deployment needs:
- Just push code and run migration
- Tool is accessible at `/sigil-prompt-editor`

---

## Future Enhancements (Out of Scope for v1)

- [ ] Delete button for prompts
- [ ] Export/import prompts as JSON
- [ ] Character count for prompt
- [ ] Display raw canvas code in UI
- [ ] Multiple reference images
- [ ] Preset test phrases
- [ ] History/undo for prompt edits
- [ ] Side-by-side comparison (old vs new prompt)
- [ ] Usage analytics (cost tracking)
- [ ] Prompt diff viewer
- [ ] Batch testing with multiple phrases

---

## File Checklist

**New Files:**
- [ ] `src/db/migrations/003_sigil_prompts.sql`
- [ ] `src/db/sigil-prompts.js`
- [ ] `src/api/sigil-prompts.js`
- [ ] `sigil-prompt-editor/index.html`
- [ ] `sigil-prompt-editor/style.css`
- [ ] `sigil-prompt-editor/editor.js`

**Modified Files:**
- [ ] `src/sigil/generator.js` (add generateSigilWithCustomPrompt)
- [ ] `server.js` (add routes, static serving)

**Existing Files (No Changes):**
- `sigil-prompt-editor/sigil/sigil.standalone.js` (already exists)
- `sigil-prompt-editor/sigil/README.md` (keep for reference)
- `sigil-prompt-editor/sigil/index.html` (keep demo)

---

## Success Criteria

✅ Tool loads and displays active prompt  
✅ Can edit and save prompts with versioning  
✅ Testing with phrase generates real sigil  
✅ Thinking animation shows during generation  
✅ Draw animation shows result smoothly  
✅ Can activate prompt for production use  
✅ Responsive design works on all screen sizes  
✅ Error handling is clear and helpful  

---

**Status:** Ready for implementation  
**Estimated Time:** 3-4 hours  
**Dependencies:** Server must be stopped for migration  

