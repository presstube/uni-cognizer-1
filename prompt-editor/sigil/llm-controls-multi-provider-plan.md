# Sigil Prompt Editor: LLM Controls & Multi-Provider Support

**Created:** January 2025  
**Status:** Planning  
**Goal:** Add per-prompt LLM settings (provider, model, creativity controls) and multi-provider support (Anthropic Claude + Google Gemini)

---

## Overview

Extend the Sigil Prompt Editor to:
1. **Save LLM settings per prompt profile** - Each prompt remembers its preferred provider, model, and creativity parameters
2. **Expose creativity controls** - Temperature, top_p, top_k (Gemini), max_tokens sliders/inputs
3. **Multi-provider support** - Switch between Anthropic Claude and Google Gemini 3
4. **Provider-specific UI** - Show/hide controls based on selected provider

**Core Concept:** When you switch to a prompt profile, it loads its saved LLM settings. Adjust settings → test → save. Each prompt can have different "personality" via LLM configuration.

---

## Design Principles

1. **Settings Persist Per Prompt** - LLM configuration is part of the prompt profile, not global
2. **Immediate Testing** - Changes to settings can be tested without saving
3. **Provider Abstraction** - Clean separation between UI and provider-specific implementation
4. **Sensible Defaults** - New prompts get balanced defaults, existing prompts get defaults on migration

---

## Database Changes

### Migration: `004_add_llm_settings_to_sigil_prompts.sql`

```sql
-- Add LLM settings column to sigil_prompts
ALTER TABLE sigil_prompts 
ADD COLUMN IF NOT EXISTS llm_settings JSONB DEFAULT '{
  "provider": "anthropic",
  "model": "claude-sonnet-4-20250514",
  "temperature": 0.7,
  "top_p": 0.9,
  "max_tokens": 1024
}'::jsonb;

-- Add comment explaining the structure
COMMENT ON COLUMN sigil_prompts.llm_settings IS 
'LLM configuration for this prompt. Structure: {
  provider: "anthropic" | "gemini",
  model: string (provider-specific model name),
  temperature: number (0.0-1.0 for Anthropic, 0.0-2.0 for Gemini),
  top_p: number (0.0-1.0),
  top_k: number | null (Gemini only, 1-40),
  max_tokens: number
}';

-- Update existing rows to have default settings if NULL
UPDATE sigil_prompts 
SET llm_settings = '{
  "provider": "anthropic",
  "model": "claude-sonnet-4-20250514",
  "temperature": 0.7,
  "top_p": 0.9,
  "max_tokens": 1024
}'::jsonb
WHERE llm_settings IS NULL;
```

**Default Settings:**
- Provider: `anthropic`
- Model: `claude-sonnet-4-20250514`
- Temperature: `0.7` (balanced)
- Top_p: `0.9` (slight diversity)
- Max_tokens: `1024`
- Top_k: `null` (Gemini only, not applicable to Anthropic)

---

## Backend Architecture

### 1. Provider Abstraction Layer

**New File: `src/sigil/provider.js`**

Purpose: Adapter that wraps existing `src/providers/` system and handles sigil-specific needs (image content, prompt formatting).

**Key Challenge:** Existing providers have different signatures:
- Anthropic: `callLLM(systemPrompt, userPrompt, options)`
- Gemini: `callLLM(prompt, options)` (no separate system)
- OpenAI: `callLLM(prompt, options)`

**Solution:** Create sigil-specific wrapper that:
- Formats prompts appropriately for each provider
- Handles image content (base64) per provider's format
- Returns consistent response format

```javascript
/**
 * Sigil Provider Abstraction
 * Wraps existing provider system for sigil generation
 */

import { callLLM as anthropicCall } from '../providers/anthropic.js';
import { callLLM as geminiCall } from '../providers/gemini.js';
import { getImageContent } from './image.js';

/**
 * Get sigil provider function
 * @param {string} providerName - 'anthropic' | 'gemini'
 * @returns {Function} Provider-specific generate function
 */
export function getSigilProvider(providerName) {
  switch (providerName.toLowerCase()) {
    case 'anthropic':
      return generateWithAnthropic;
    case 'gemini':
      return generateWithGemini;
    default:
      throw new Error(`Unknown provider: ${providerName}`);
  }
}

/**
 * Generate sigil using Anthropic Claude
 */
async function generateWithAnthropic(options) {
  const {
    concept,
    promptTemplate,
    includeImage = true,
    customImageBase64 = null,
    model = 'claude-sonnet-4-20250514',
    temperature = 0.7,
    top_p = 0.9,
    max_tokens = 1024
  } = options;
  
  // Replace ${concept} placeholder
  const finalPrompt = promptTemplate.replace(/\$\{concept\}/g, concept);
  
  // Build user content with image
  const userContent = [];
  
  if (includeImage) {
    let imageContent = null;
    
    if (customImageBase64) {
      const base64Data = customImageBase64.includes(',') 
        ? customImageBase64.split(',')[1] 
        : customImageBase64;
      
      let mediaType = 'image/png';
      if (customImageBase64.includes('image/jpeg') || customImageBase64.includes('image/jpg')) {
        mediaType = 'image/jpeg';
      }
      
      imageContent = {
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: base64Data
        }
      };
    } else {
      imageContent = getImageContent();
    }
    
    if (imageContent) {
      userContent.push(imageContent);
      userContent.push({
        type: 'text',
        text: 'Here is a reference image showing 100 examples of the sigil style I want you to match. Study this carefully.'
      });
    }
  }
  
  userContent.push({
    type: 'text',
    text: finalPrompt
  });
  
  // Use Anthropic SDK directly (needs image support)
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });
  
  const message = await client.messages.create({
    model,
    max_tokens: max_tokens,
    temperature,
    top_p,
    system: 'You are a code generator specializing in minimalist geometric sigils.',
    messages: [{
      role: 'user',
      content: userContent
    }]
  });
  
  const code = message.content[0]?.text;
  return cleanCode(code);
}

/**
 * Generate sigil using Google Gemini
 */
async function generateWithGemini(options) {
  const {
    concept,
    promptTemplate,
    includeImage = true,
    customImageBase64 = null,
    model = 'models/gemini-3.0-flash',
    temperature = 0.7,
    top_p = 0.9,
    top_k = 40,
    max_tokens = 1024
  } = options;
  
  // Replace ${concept} placeholder
  const finalPrompt = promptTemplate.replace(/\$\{concept\}/g, concept);
  
  // Build prompt with image for Gemini
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  // Gemini uses Parts array
  const parts = [];
  
  if (includeImage) {
    let imageData = null;
    
    if (customImageBase64) {
      const base64Data = customImageBase64.includes(',') 
        ? customImageBase64.split(',')[1] 
        : customImageBase64;
      imageData = base64Data;
    } else {
      // Get default image and convert to base64
      const defaultImage = getImageContent();
      if (defaultImage && defaultImage.source && defaultImage.source.data) {
        imageData = defaultImage.source.data;
      }
    }
    
    if (imageData) {
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: imageData
        }
      });
      parts.push({
        text: 'Here is a reference image showing 100 examples of the sigil style I want you to match. Study this carefully.'
      });
    }
  }
  
  parts.push({
    text: finalPrompt
  });
  
  const geminiModel = genAI.getGenerativeModel({ 
    model,
    generationConfig: {
      temperature,
      topP: top_p,
      topK: top_k,
      maxOutputTokens: max_tokens
    },
    systemInstruction: 'You are a code generator specializing in minimalist geometric sigils.'
  });
  
  const result = await geminiModel.generateContent({ contents: [{ role: 'user', parts }] });
  const response = await result.response;
  const code = response.text();
  
  return cleanCode(code);
}

/**
 * Clean up generated code
 */
function cleanCode(code) {
  if (!code) {
    throw new Error('No code returned from sigil generation');
  }
  
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

### 2. Update Generator

**Modify: `src/sigil/generator.js`**

Update `generateSigilWithCustomPrompt` to use provider abstraction:

```javascript
import { getSigilProvider } from './provider.js';

/**
 * Generate sigil with custom prompt template and LLM settings
 * @param {string} concept - The concept phrase
 * @param {string} promptTemplate - Custom prompt with ${concept} placeholder
 * @param {boolean} includeImage - Whether to include reference image
 * @param {string|null} customImageBase64 - Custom image as base64 data URL
 * @param {Object|null} llmSettings - LLM configuration (provider, model, temperature, etc.)
 * @returns {Promise<string>} Generated canvas drawing code
 */
export async function generateSigilWithCustomPrompt(
  concept, 
  promptTemplate, 
  includeImage = true, 
  customImageBase64 = null,
  llmSettings = null
) {
  if (!concept || !concept.trim()) {
    throw new Error('Concept is required for sigil generation');
  }
  
  if (!promptTemplate || !promptTemplate.trim()) {
    throw new Error('Prompt template is required');
  }
  
  // Extract settings or use defaults
  const settings = llmSettings || {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    temperature: 0.7,
    top_p: 0.9,
    max_tokens: 1024
  };
  
  // Get provider function
  const generateFn = getSigilProvider(settings.provider);
  
  // Generate with provider-specific options
  return await generateFn({
    concept,
    promptTemplate,
    includeImage,
    customImageBase64,
    model: settings.model,
    temperature: settings.temperature,
    top_p: settings.top_p,
    top_k: settings.top_k, // Gemini only, ignored by Anthropic
    max_tokens: settings.max_tokens
  });
}
```

### 3. Update Database Layer

**Modify: `src/db/sigil-prompts.js`**

Update `createSigilPrompt` and `updateSigilPrompt` to handle `llmSettings`:

```javascript
/**
 * Create a new sigil prompt
 * @param {string} name - Prompt name
 * @param {string} slug - URL-safe slug
 * @param {string} prompt - Prompt template text
 * @param {Object|null} llmSettings - LLM configuration (optional)
 * @returns {Promise<Object>} Created prompt
 */
export async function createSigilPrompt(name, slug, prompt, llmSettings = null) {
  const pool = getPool();
  
  // Default LLM settings if not provided
  const defaultSettings = {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    temperature: 0.7,
    top_p: 0.9,
    max_tokens: 1024
  };
  
  const settings = llmSettings || defaultSettings;
  
  const result = await pool.query(
    `INSERT INTO sigil_prompts (name, slug, prompt, llm_settings, active) 
     VALUES ($1, $2, $3, $4, false) 
     RETURNING *`,
    [name, slug, prompt, JSON.stringify(settings)]
  );
  return result.rows[0];
}

/**
 * Update existing sigil prompt
 * @param {string} id - Prompt UUID
 * @param {string} name - Prompt name
 * @param {string} slug - URL-safe slug
 * @param {string} prompt - Prompt template text
 * @param {Object|null} llmSettings - LLM configuration (null = keep existing)
 * @returns {Promise<Object>} Updated prompt
 */
export async function updateSigilPrompt(id, name, slug, prompt, llmSettings = null) {
  const pool = getPool();
  
  // If llmSettings provided, update it; otherwise keep existing
  const updates = [name, slug, prompt];
  let query = `UPDATE sigil_prompts 
     SET name = $1, slug = $2, prompt = $3`;
  
  if (llmSettings !== null) {
    updates.push(JSON.stringify(llmSettings));
    query += `, llm_settings = $4`;
  }
  
  updates.push(id);
  query += `, updated_at = NOW() WHERE id = $${updates.length} RETURNING *`;
  
  const result = await pool.query(query, updates);
  return result.rows[0];
}
```

### 4. Update API Layer

**Modify: `src/api/sigil-prompts.js`**

Update `saveSigilPrompt` and `testCurrentPrompt`:

```javascript
/**
 * POST /api/sigil-prompts
 * Create or update a sigil prompt
 */
export async function saveSigilPrompt(req, res) {
  try {
    const { id, name, slug, prompt, llmSettings } = req.body;
    
    if (!name || !slug || !prompt) {
      return res.status(400).json({ error: 'Name, slug, and prompt are required' });
    }
    
    // Validate llmSettings if provided
    if (llmSettings) {
      if (!['anthropic', 'gemini'].includes(llmSettings.provider)) {
        return res.status(400).json({ error: 'Invalid provider' });
      }
      // Validate ranges
      if (llmSettings.temperature !== undefined) {
        const maxTemp = llmSettings.provider === 'gemini' ? 2.0 : 1.0;
        if (llmSettings.temperature < 0 || llmSettings.temperature > maxTemp) {
          return res.status(400).json({ error: `Temperature must be 0-${maxTemp}` });
        }
      }
    }
    
    let savedPrompt;
    
    if (id) {
      savedPrompt = await updateSigilPrompt(id, name, slug, prompt, llmSettings);
      if (!savedPrompt) {
        return res.status(404).json({ error: 'Prompt not found' });
      }
    } else {
      savedPrompt = await createSigilPrompt(name, slug, prompt, llmSettings);
    }
    
    res.json({ prompt: savedPrompt });
  } catch (error) {
    console.error('[API] Error saving sigil prompt:', error);
    
    if (error.code === '23505') {
      return res.status(400).json({ error: 'A prompt with this slug already exists' });
    }
    
    res.status(500).json({ error: 'Failed to save prompt' });
  }
}

/**
 * POST /api/sigil-prompts/test-current
 * Test with current prompt (not saved version)
 */
export async function testCurrentPrompt(req, res) {
  try {
    const { phrase, prompt, includeImage, customImage, llmSettings } = req.body;
    
    if (!phrase || !phrase.trim()) {
      return res.status(400).json({ error: 'Phrase is required' });
    }
    
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    const imageStatus = includeImage !== false 
      ? (customImage ? 'with custom image' : 'with default image')
      : 'without image';
    const provider = llmSettings?.provider || 'anthropic';
    console.log(`[Sigil] Testing ${provider} ${imageStatus} - phrase: "${phrase}"`);
    
    // Generate sigil with LLM settings
    const calls = await generateSigilWithCustomPrompt(
      phrase, 
      prompt, 
      includeImage !== false,
      customImage || null,
      llmSettings || null
    );
    
    res.json({ calls });
  } catch (error) {
    console.error('[API] Error testing current prompt:', error);
    res.status(500).json({ 
      error: 'Failed to generate sigil',
      details: error.message 
    });
  }
}
```

---

## Frontend Changes

### 1. State Management

**Modify: `prompt-editor/sigil/editor.js`**

Add LLM settings state and management:

```javascript
// State
let prompts = [];
let currentPrompt = null;
let currentId = null;
let sigil = null;
let customImageData = null;
let llmSettings = {
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
  temperature: 0.7,
  top_p: 0.9,
  max_tokens: 1024,
  top_k: null  // Gemini only
};

// Model lists per provider
const MODEL_LISTS = {
  anthropic: [
    { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
    { value: 'claude-opus-4', label: 'Claude Opus 4' },
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' }
  ],
  gemini: [
    { value: 'models/gemini-3.0-flash', label: 'Gemini 3.0 Flash' },
    { value: 'models/gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash' },
    { value: 'models/gemini-1.5-pro', label: 'Gemini 1.5 Pro' }
  ]
};

// DOM Elements (add new ones)
const llmProviderSelect = document.getElementById('llm-provider');
const llmModelSelect = document.getElementById('llm-model');
const llmTemperatureSlider = document.getElementById('llm-temperature');
const llmTopPSlider = document.getElementById('llm-top-p');
const llmTopKSlider = document.getElementById('llm-top-k');
const llmMaxTokensInput = document.getElementById('llm-max-tokens');
const tempValueSpan = document.getElementById('temp-value');
const topPValueSpan = document.getElementById('topp-value');
const topKValueSpan = document.getElementById('topk-value');
```

### 2. Load Settings on Prompt Change

**Update `handlePromptChange`:**

```javascript
async function handlePromptChange() {
  const value = promptSelect.value;
  
  localStorage.setItem('sigil_prompt_editor_last', value);
  
  if (value === 'new') {
    clearForm();
    resetLLMSettings();
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
      
      // Load LLM settings from prompt
      if (currentPrompt.llm_settings) {
        llmSettings = { ...llmSettings, ...currentPrompt.llm_settings };
        updateLLMControls();
      } else {
        resetLLMSettings();
      }
      
      activateBtn.disabled = currentPrompt.active;
      
    } catch (error) {
      console.error('Failed to load prompt:', error);
      alert(`Error: ${error.message}`);
    }
  }
}

function resetLLMSettings() {
  llmSettings = {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    temperature: 0.7,
    top_p: 0.9,
    max_tokens: 1024,
    top_k: null
  };
  updateLLMControls();
}

function updateLLMControls() {
  // Update provider dropdown
  llmProviderSelect.value = llmSettings.provider;
  
  // Update model dropdown based on provider
  updateModelList();
  
  // Update sliders/inputs
  llmTemperatureSlider.value = llmSettings.temperature;
  llmTopPSlider.value = llmSettings.top_p;
  llmMaxTokensInput.value = llmSettings.max_tokens;
  
  // Update value displays
  tempValueSpan.textContent = llmSettings.temperature.toFixed(1);
  topPValueSpan.textContent = llmSettings.top_p.toFixed(2);
  
  // Show/hide top_k (Gemini only)
  const topKGroup = document.getElementById('top-k-group');
  if (llmSettings.provider === 'gemini') {
    topKGroup.style.display = 'block';
    llmTopKSlider.value = llmSettings.top_k || 40;
    topKValueSpan.textContent = llmSettings.top_k || 40;
  } else {
    topKGroup.style.display = 'none';
  }
  
  // Update temperature max based on provider
  const maxTemp = llmSettings.provider === 'gemini' ? 2.0 : 1.0;
  llmTemperatureSlider.max = maxTemp;
}

function updateModelList() {
  llmModelSelect.innerHTML = '';
  const models = MODEL_LISTS[llmSettings.provider] || [];
  models.forEach(model => {
    const option = document.createElement('option');
    option.value = model.value;
    option.textContent = model.label;
    if (model.value === llmSettings.model) {
      option.selected = true;
    }
    llmModelSelect.appendChild(option);
  });
}
```

### 3. Save Settings

**Update `handleSave`:**

```javascript
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
    saveBtn.classList.add('loading');
    
    const res = await fetch(`${API_BASE}/sigil-prompts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: currentId,
        name,
        slug,
        prompt,
        llmSettings  // Include current settings
      })
    });
    
    // ... rest of function
  } catch (error) {
    // ... error handling
  }
}
```

### 4. Test with Settings

**Update `handlePhraseSubmit`:**

```javascript
async function handlePhraseSubmit(e) {
  if (e.key !== 'Enter') return;
  
  const phrase = phraseInput.value.trim();
  if (!phrase) return;
  
  const prompt = promptTextarea.value.trim();
  if (!prompt) {
    alert('Please enter a prompt first');
    return;
  }
  
  try {
    phraseInput.disabled = true;
    sigil.thinkingVaried();
    
    const res = await fetch(`${API_BASE}/sigil-prompts/test-current`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        phrase, 
        prompt, 
        includeImage, 
        customImage: customImageData,
        llmSettings  // Pass current settings
      })
    });
    
    // ... rest of function
  } catch (error) {
    // ... error handling
  }
}
```

### 5. UI Controls

**Add to `prompt-editor/sigil/index.html`:**

```html
<!-- LLM Settings Panel (after prompt textarea) -->
<div class="llm-settings-panel">
  <details open>
    <summary>⚙️ LLM Settings</summary>
    
    <div class="llm-controls">
      <!-- Provider Selection -->
      <div class="control-group">
        <label>Provider</label>
        <select id="llm-provider">
          <option value="anthropic">Anthropic Claude</option>
          <option value="gemini">Google Gemini</option>
        </select>
      </div>
      
      <!-- Model Selection -->
      <div class="control-group">
        <label>Model</label>
        <select id="llm-model">
          <!-- Populated dynamically -->
        </select>
      </div>
      
      <!-- Temperature -->
      <div class="control-group">
        <label>
          Temperature: <span id="temp-value">0.7</span>
          <span class="hint">Lower = deterministic, Higher = creative</span>
        </label>
        <input type="range" id="llm-temperature" min="0" max="1" step="0.1" value="0.7">
      </div>
      
      <!-- Top P -->
      <div class="control-group">
        <label>
          Top P: <span id="topp-value">0.9</span>
          <span class="hint">Diversity control</span>
        </label>
        <input type="range" id="llm-top-p" min="0" max="1" step="0.05" value="0.9">
      </div>
      
      <!-- Top K (Gemini only, hidden for Anthropic) -->
      <div class="control-group" id="top-k-group" style="display: none;">
        <label>
          Top K: <span id="topk-value">40</span>
          <span class="hint">Gemini only: token diversity</span>
        </label>
        <input type="range" id="llm-top-k" min="1" max="40" step="1" value="40">
      </div>
      
      <!-- Max Tokens -->
      <div class="control-group">
        <label>Max Tokens</label>
        <input type="number" id="llm-max-tokens" min="100" max="4096" step="100" value="1024">
      </div>
      
      <!-- Presets -->
      <div class="preset-buttons">
        <button type="button" class="preset-btn" data-preset="deterministic">Deterministic</button>
        <button type="button" class="preset-btn" data-preset="balanced">Balanced</button>
        <button type="button" class="preset-btn" data-preset="creative">Creative</button>
      </div>
    </div>
  </details>
</div>
```

**Add to `prompt-editor/sigil/style.css`:**

```css
/* LLM Settings Panel */
.llm-settings-panel {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #1a1a1a;
}

.llm-settings-panel details {
  cursor: pointer;
}

.llm-settings-panel summary {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #888;
  margin-bottom: 12px;
  user-select: none;
}

.llm-settings-panel summary:hover {
  color: #aaa;
}

.llm-controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.control-group label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #888;
  margin: 0;
}

.control-group .hint {
  float: right;
  color: #666;
  font-size: 10px;
  text-transform: none;
  font-weight: normal;
}

.control-group input[type="range"] {
  width: 100%;
  margin: 0;
}

.control-group input[type="number"] {
  width: 100%;
  margin: 0;
}

.preset-buttons {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.preset-btn {
  flex: 1;
  padding: 8px;
  background: #1a1a1a;
  color: #ddd;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.preset-btn:hover {
  background: #252525;
}
```

### 6. Event Listeners

**Add to `init()` function:**

```javascript
async function init() {
  initSigil();
  await loadPrompts();
  await autoLoadPrompt();
  
  // Existing listeners
  promptSelect.addEventListener('change', handlePromptChange);
  nameInput.addEventListener('input', updateSlug);
  saveBtn.addEventListener('click', handleSave);
  activateBtn.addEventListener('click', handleActivate);
  phraseInput.addEventListener('keydown', handlePhraseSubmit);
  imageFileInput.addEventListener('change', handleImageUpload);
  resetImageBtn.addEventListener('click', handleResetImage);
  
  // NEW: LLM settings listeners
  llmProviderSelect.addEventListener('change', handleProviderChange);
  llmModelSelect.addEventListener('change', handleModelChange);
  llmTemperatureSlider.addEventListener('input', handleTemperatureChange);
  llmTopPSlider.addEventListener('input', handleTopPChange);
  llmTopKSlider.addEventListener('input', handleTopKChange);
  llmMaxTokensInput.addEventListener('input', handleMaxTokensChange);
  
  // Preset buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => handlePreset(btn.dataset.preset));
  });
  
  resetImageBtn.classList.add('hidden');
}

function handleProviderChange() {
  llmSettings.provider = llmProviderSelect.value;
  
  // Reset model to first in list for new provider
  const models = MODEL_LISTS[llmSettings.provider] || [];
  if (models.length > 0) {
    llmSettings.model = models[0].value;
  }
  
  // Reset top_k for Gemini
  if (llmSettings.provider === 'gemini') {
    llmSettings.top_k = 40;
  } else {
    llmSettings.top_k = null;
  }
  
  updateLLMControls();
}

function handleModelChange() {
  llmSettings.model = llmModelSelect.value;
}

function handleTemperatureChange() {
  llmSettings.temperature = parseFloat(llmTemperatureSlider.value);
  tempValueSpan.textContent = llmSettings.temperature.toFixed(1);
}

function handleTopPChange() {
  llmSettings.top_p = parseFloat(llmTopPSlider.value);
  topPValueSpan.textContent = llmSettings.top_p.toFixed(2);
}

function handleTopKChange() {
  llmSettings.top_k = parseInt(llmTopKSlider.value);
  topKValueSpan.textContent = llmSettings.top_k;
}

function handleMaxTokensChange() {
  llmSettings.max_tokens = parseInt(llmMaxTokensInput.value);
}

function handlePreset(presetName) {
  const presets = {
    deterministic: {
      temperature: 0.2,
      top_p: 0.8,
      top_k: 20
    },
    balanced: {
      temperature: 0.7,
      top_p: 0.9,
      top_k: 40
    },
    creative: {
      temperature: 0.9,
      top_p: 0.95,
      top_k: 40
    }
  };
  
  const preset = presets[presetName];
  if (preset) {
    llmSettings.temperature = preset.temperature;
    llmSettings.top_p = preset.top_p;
    if (llmSettings.provider === 'gemini') {
      llmSettings.top_k = preset.top_k;
    }
    updateLLMControls();
  }
}
```

---

## Implementation Phases

### Phase 1: Database Migration
1. Create migration file `004_add_llm_settings_to_sigil_prompts.sql`
2. Run migration: `npm run migrate`
3. Verify existing prompts have default settings

### Phase 2: Provider Abstraction Layer
1. Create `src/sigil/provider.js`
2. Implement Anthropic provider function
3. Implement Gemini provider function
4. Test both providers independently

### Phase 3: Update Generator & API
1. Update `src/sigil/generator.js` to use provider abstraction
2. Update `src/db/sigil-prompts.js` to handle `llmSettings`
3. Update `src/api/sigil-prompts.js` to accept/return `llmSettings`
4. Test API endpoints with different settings

### Phase 4: Frontend UI
1. Add LLM settings panel to HTML
2. Add CSS styling
3. Add JavaScript state management
4. Add event listeners
5. Test UI controls update settings correctly

### Phase 5: Integration Testing
1. Test: Load prompt → settings load
2. Test: Change settings → test generation → verify provider used
3. Test: Save prompt → reload → settings persist
4. Test: Switch providers → UI updates correctly
5. Test: Preset buttons work
6. Test: Gemini-specific controls show/hide

### Phase 6: Polish
1. Add validation for parameter ranges
2. Add error handling for provider failures
3. Add loading states during generation
4. Add tooltips/help text
5. Test responsive design

---

## Testing Checklist

- [ ] Migration runs successfully
- [ ] Existing prompts get default settings
- [ ] Anthropic generation works with custom settings
- [ ] Gemini generation works with custom settings
- [ ] Settings load when prompt selected
- [ ] Settings save with prompt
- [ ] Provider switch updates UI correctly
- [ ] Model list updates per provider
- [ ] Top K shows/hides correctly
- [ ] Temperature max updates per provider
- [ ] Preset buttons work
- [ ] Test generation uses correct provider/settings
- [ ] Error handling for invalid settings
- [ ] Error handling for provider failures

---

## Success Criteria

✅ Each prompt profile saves its LLM settings  
✅ Switching prompts loads their saved settings  
✅ Can test with different providers without saving  
✅ UI adapts to provider (shows/hides controls)  
✅ Both Anthropic and Gemini work correctly  
✅ Settings persist across browser sessions  
✅ Preset buttons provide quick configuration  
✅ Error handling is clear and helpful  

---

## Future Enhancements (Out of Scope)

- [ ] Cost tracking per provider/model
- [ ] Usage analytics (which settings produce best results)
- [ ] A/B testing framework (compare settings side-by-side)
- [ ] Export/import settings as JSON
- [ ] Custom preset creation
- [ ] Settings templates/library
- [ ] Provider-specific advanced options

---

**Status:** Ready for implementation  
**Estimated Time:** 6-8 hours  
**Dependencies:** Server must be stopped for migration

