/**
 * Sound Engine Prompt Editor
 * Main state management and CRUD operations
 */

import { generateSelections, getRandomMindMoment } from './generator.js';
import { displayResults, clearResults, showError } from './results-display.js';
import { handleFileUpload, getDefaultCSVs } from './csv-manager.js';

const API_BASE = '/api';

// State
let prompts = [];
let currentId = null;
let isGenerating = false;
let llmSettings = {
  provider: 'gemini',
  model: 'gemini-2.0-flash-exp',
  temperature: 0.7,
  topP: 0.95,
  topK: 40,
  maxTokens: 500
};

// Model lists per provider
const MODEL_LISTS = {
  gemini: [
    { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash (Exp)' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { value: 'gemini-1.5-flash-002', label: 'Gemini 1.5 Flash' },
    { value: 'gemini-1.5-pro-002', label: 'Gemini 1.5 Pro' }
  ],
  anthropic: [
    { value: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5' },
    { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
    { value: 'claude-opus-4', label: 'Claude Opus 4' },
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' }
  ]
};

// DOM Elements
const promptSelect = document.getElementById('prompt-select');
const nameInput = document.getElementById('name');
const slugInput = document.getElementById('slug');
const promptTextarea = document.getElementById('prompt');
const charCount = document.getElementById('char-count');
const saveBtn = document.getElementById('save-btn');
const activateBtn = document.getElementById('activate-btn');
const deleteBtn = document.getElementById('delete-btn');
const testInput = document.getElementById('test-input');
const randomBtn = document.getElementById('random-btn');
const generateBtn = document.getElementById('generate-btn');
const resultsContainer = document.getElementById('results-container');
const resetCsvBtn = document.getElementById('reset-csv-btn');
const musicCsvUpload = document.getElementById('music-csv-upload');
const textureCsvUpload = document.getElementById('texture-csv-upload');
const musicCsvName = document.getElementById('music-csv-name');
const textureCsvName = document.getElementById('texture-csv-name');
const csvStatus = document.getElementById('csv-status');

// LLM Settings DOM Elements
const llmProviderSelect = document.getElementById('llm-provider');
const llmModelSelect = document.getElementById('llm-model');
const llmTemperatureInput = document.getElementById('llm-temperature');
const llmTopPInput = document.getElementById('llm-top-p');
const llmTopKInput = document.getElementById('llm-top-k');
const llmMaxTokensInput = document.getElementById('llm-max-tokens');

// Initialize
async function init() {
  await loadPrompts();
  await autoLoadPrompt();
  await loadActiveCSVs(); // Load system-wide active CSVs
  
  // Event listeners
  promptSelect.addEventListener('change', handlePromptChange);
  nameInput.addEventListener('input', updateSlug);
  promptTextarea.addEventListener('input', updateCharCount);
  saveBtn.addEventListener('click', handleSave);
  activateBtn.addEventListener('click', handleActivate);
  deleteBtn.addEventListener('click', handleDelete);
  randomBtn.addEventListener('click', handleRandomMindMoment);
  generateBtn.addEventListener('click', handleGenerate);
  resetCsvBtn.addEventListener('click', handleResetCSV);
  musicCsvUpload.addEventListener('change', handleMusicCsvUpload);
  textureCsvUpload.addEventListener('change', handleTextureCsvUpload);
  
  // LLM settings listeners
  llmProviderSelect.addEventListener('change', handleProviderChange);
  llmModelSelect.addEventListener('change', handleModelChange);
  llmTemperatureInput.addEventListener('input', handleTemperatureChange);
  llmTopPInput.addEventListener('input', handleTopPChange);
  llmTopKInput.addEventListener('input', handleTopKChange);
  llmMaxTokensInput.addEventListener('input', handleMaxTokensChange);
  
  // Preset buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => handlePreset(btn.dataset.preset));
  });
  
  // Initialize LLM controls
  updateLLMControls();
  updateCharCount();
}

// Load all prompts from API
async function loadPrompts() {
  try {
    const response = await fetch(`${API_BASE}/sound-prompts`);
    if (!response.ok) throw new Error('Failed to load prompts');
    
    const data = await response.json();
    prompts = data.prompts;
    
    // Update dropdown
    promptSelect.innerHTML = '<option value="new">+ New Prompt</option>';
    prompts.forEach(p => {
      const option = document.createElement('option');
      option.value = p.id;
      option.textContent = p.name + (p.active ? ' ⭐' : '');
      promptSelect.appendChild(option);
    });
  } catch (error) {
    console.error('Failed to load prompts:', error);
    alert('Failed to load prompts: ' + error.message);
  }
}

// Auto-load last used or active prompt
async function autoLoadPrompt() {
  const lastUsed = localStorage.getItem('sound-prompt-last-used');
  
  if (lastUsed) {
    await loadPrompt(lastUsed);
    return;
  }
  
  // Load active prompt if no last used
  const activePrompt = prompts.find(p => p.active);
  if (activePrompt) {
    await loadPrompt(activePrompt.id);
  }
}

// Load a specific prompt
async function loadPrompt(id) {
  try {
    const response = await fetch(`${API_BASE}/sound-prompts/${id}`);
    if (!response.ok) throw new Error('Failed to load prompt');
    
    const data = await response.json();
    const prompt = data.prompt;
    
    currentId = prompt.id;
    nameInput.value = prompt.name;
    slugInput.value = prompt.slug;
    promptTextarea.value = prompt.prompt;
    
    // Load LLM settings
    if (prompt.llm_settings) {
      llmSettings = {
        provider: prompt.llm_settings.provider || 'gemini',
        model: prompt.llm_settings.model || 'gemini-2.0-flash-exp',
        temperature: prompt.llm_settings.temperature ?? 0.7,
        topP: prompt.llm_settings.topP ?? 0.95,
        topK: prompt.llm_settings.topK ?? 40,
        maxTokens: prompt.llm_settings.maxTokens ?? 500
      };
    }
    
    updateLLMControls();
    updateCharCount();
    promptSelect.value = id;
    localStorage.setItem('sound-prompt-last-used', id);
    
    updateButtons();
  } catch (error) {
    console.error('Failed to load prompt:', error);
    alert('Failed to load prompt: ' + error.message);
  }
}

// Handle prompt dropdown change
async function handlePromptChange() {
  const value = promptSelect.value;
  
  if (value === 'new') {
    currentId = null;
    nameInput.value = '';
    slugInput.value = '';
    promptTextarea.value = '';
    llmSettings = {
      provider: 'gemini',
      model: 'gemini-2.0-flash-exp',
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      maxTokens: 500
    };
    
    updateLLMControls();
    updateCharCount();
    updateButtons();
    clearResults(resultsContainer);
  } else {
    await loadPrompt(value);
  }
}

// Auto-generate slug from name
function updateSlug() {
  if (currentId) return; // Don't auto-update for existing prompts
  
  const name = nameInput.value;
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  slugInput.value = slug;
}

// Update character count
function updateCharCount() {
  const count = promptTextarea.value.length;
  charCount.textContent = count.toLocaleString();
}

// Save prompt
async function handleSave() {
  const name = nameInput.value.trim();
  const slug = slugInput.value.trim();
  const prompt = promptTextarea.value.trim();
  
  if (!name || !slug || !prompt) {
    alert('Please fill in all required fields (name, slug, prompt)');
    return;
  }
  
  try {
    saveBtn.classList.add('loading');
    saveBtn.disabled = true;
    
    const requestBody = {
      name,
      slug,
      prompt,
      llmSettings
    };
    
    if (currentId) {
      requestBody.id = currentId;
    }
    
    const response = await fetch(`${API_BASE}/sound-prompts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save');
    }
    
    const data = await response.json();
    currentId = data.prompt.id;
    
    await loadPrompts();
    promptSelect.value = currentId;
    localStorage.setItem('sound-prompt-last-used', currentId);
    
    alert('✅ Prompt saved successfully!');
    updateButtons();
  } catch (error) {
    console.error('Failed to save:', error);
    alert('Failed to save prompt: ' + error.message);
  } finally {
    saveBtn.classList.remove('loading');
    saveBtn.disabled = false;
  }
}

// Activate prompt
async function handleActivate() {
  if (!currentId) {
    alert('Please save the prompt first');
    return;
  }
  
  try {
    activateBtn.classList.add('loading');
    activateBtn.disabled = true;
    
    const response = await fetch(`${API_BASE}/sound-prompts/${currentId}/activate`, {
      method: 'POST'
    });
    
    if (!response.ok) throw new Error('Failed to activate');
    
    await loadPrompts();
    alert('✅ Prompt activated!');
  } catch (error) {
    console.error('Failed to activate:', error);
    alert('Failed to activate prompt: ' + error.message);
  } finally {
    activateBtn.classList.remove('loading');
    activateBtn.disabled = false;
  }
}

// Delete prompt
async function handleDelete() {
  if (!currentId) {
    alert('No prompt to delete');
    return;
  }
  
  if (!confirm('Are you sure you want to delete this prompt?')) {
    return;
  }
  
  try {
    deleteBtn.classList.add('loading');
    deleteBtn.disabled = true;
    
    const response = await fetch(`${API_BASE}/sound-prompts/${currentId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) throw new Error('Failed to delete');
    
    await loadPrompts();
    promptSelect.value = 'new';
    await handlePromptChange();
    
    alert('✅ Prompt deleted!');
  } catch (error) {
    console.error('Failed to delete:', error);
    alert('Failed to delete prompt: ' + error.message);
  } finally {
    deleteBtn.classList.remove('loading');
    deleteBtn.disabled = false;
  }
}

// Handle random mind moment
async function handleRandomMindMoment() {
  try {
    randomBtn.classList.add('loading');
    randomBtn.disabled = true;
    
    const text = await getRandomMindMoment();
    testInput.value = text;
  } catch (error) {
    console.error('Failed to get random mind moment:', error);
    alert('Failed to fetch mind moment: ' + error.message);
  } finally {
    randomBtn.classList.remove('loading');
    randomBtn.disabled = false;
  }
}

// Handle generation
async function handleGenerate() {
  const input = testInput.value.trim();
  
  if (!input) {
    alert('Please enter test input text');
    return;
  }
  
  const prompt = promptTextarea.value.trim();
  if (!prompt) {
    alert('Please enter a prompt');
    return;
  }
  
  try {
    isGenerating = true;
    generateBtn.classList.add('loading');
    generateBtn.disabled = true;
    clearResults(resultsContainer);
    
    // System will use active CSVs automatically
    const result = await generateSelections({
      input,
      prompt,
      llmSettings
    });
    
    displayResults(resultsContainer, result);
  } catch (error) {
    console.error('Generation failed:', error);
    showError(resultsContainer, error.message);
  } finally {
    isGenerating = false;
    generateBtn.classList.remove('loading');
    generateBtn.disabled = false;
  }
}

// Handle CSV reset
async function handleResetCSV() {
  if (!confirm('Reset to default CSV files system-wide? This will affect all prompts.')) {
    return;
  }
  
  try {
    resetCsvBtn.classList.add('loading');
    resetCsvBtn.disabled = true;
    
    // Set defaults as active
    const response = await fetch(`${API_BASE}/sound-prompts/csvs/reset-defaults`, {
      method: 'POST'
    });
    
    if (!response.ok) throw new Error('Failed to reset');
    
    // Reload active CSVs
    await loadActiveCSVs();
    
    showCsvStatus('✅ Reset to default CSV files', 'success');
  } catch (error) {
    console.error('Failed to reset CSV:', error);
    showCsvStatus('❌ Failed to reset: ' + error.message, 'error');
  } finally {
    resetCsvBtn.classList.remove('loading');
    resetCsvBtn.disabled = false;
  }
}

// Load custom CSVs from sessionStorage (on page load)
function loadCustomCSVs() {
  // Load music CSV
  const musicCSV = sessionStorage.getItem('customMusicCSV');
  const musicName = sessionStorage.getItem('customMusicCSVName');
  const musicCount = sessionStorage.getItem('customMusicCSVCount');
  const musicId = sessionStorage.getItem('customMusicCSVId');
  
  if (musicCSV && musicName && musicCount) {
    currentMusicCSV = musicCSV;
    currentMusicCsvId = musicId;
    musicCsvName.textContent = `${musicName} (custom, ${musicCount} samples)`;
  }
  
  // Load texture CSV
  const textureCSV = sessionStorage.getItem('customTextureCSV');
  const textureName = sessionStorage.getItem('customTextureCSVName');
  const textureCount = sessionStorage.getItem('customTextureCSVCount');
  const textureId = sessionStorage.getItem('customTextureCsvId');
  
  if (textureCSV && textureName && textureCount) {
    currentTextureCSV = textureCSV;
    currentTextureCsvId = textureId;
    textureCsvName.textContent = `${textureName} (custom, ${textureCount} samples)`;
  }
}

// Load CSVs for a specific prompt (from database)
async function loadPromptCSVs(musicCsvId, textureCsvId) {
  try {
    if (!musicCsvId && !textureCsvId) {
      clearCustomCSVs();
      return;
    }
    
    // Fetch CSV details from database
    const promises = [];
    if (musicCsvId) {
      promises.push(fetch(`${API_BASE}/sound-prompts/csv/${musicCsvId}`).then(r => r.json()));
    }
    if (textureCsvId) {
      promises.push(fetch(`${API_BASE}/sound-prompts/csv/${textureCsvId}`).then(r => r.json()));
    }
    
    const results = await Promise.all(promises);
    
    // Set music CSV if available
    if (musicCsvId && results[0]) {
      const musicData = results[0].csv;
      currentMusicCSV = musicData.content;
      currentMusicCsvId = musicData.id;
      
      // Count rows
      const rows = currentMusicCSV.split('\n').length - 1;
      musicCsvName.textContent = `${musicData.filename} (custom, ${rows} samples)`;
      
      // Save to sessionStorage
      sessionStorage.setItem('customMusicCSV', currentMusicCSV);
      sessionStorage.setItem('customMusicCSVName', musicData.filename);
      sessionStorage.setItem('customMusicCSVCount', rows);
      sessionStorage.setItem('customMusicCSVId', currentMusicCsvId);
    } else {
      // Clear music CSV
      currentMusicCSV = null;
      currentMusicCsvId = null;
      musicCsvName.textContent = 'music_samples.csv (default)';
      sessionStorage.removeItem('customMusicCSV');
      sessionStorage.removeItem('customMusicCSVName');
      sessionStorage.removeItem('customMusicCSVCount');
      sessionStorage.removeItem('customMusicCSVId');
    }
    
    // Set texture CSV if available
    if (textureCsvId && results[musicCsvId ? 1 : 0]) {
      const textureData = results[musicCsvId ? 1 : 0].csv;
      currentTextureCSV = textureData.content;
      currentTextureCsvId = textureData.id;
      
      // Count rows
      const rows = currentTextureCSV.split('\n').length - 1;
      textureCsvName.textContent = `${textureData.filename} (custom, ${rows} samples)`;
      
      // Save to sessionStorage
      sessionStorage.setItem('customTextureCSV', currentTextureCSV);
      sessionStorage.setItem('customTextureCSVName', textureData.filename);
      sessionStorage.setItem('customTextureCSVCount', rows);
      sessionStorage.setItem('customTextureCsvId', currentTextureCsvId);
    } else {
      // Clear texture CSV
      currentTextureCSV = null;
      currentTextureCsvId = null;
      textureCsvName.textContent = 'texture_samples.csv (default)';
      sessionStorage.removeItem('customTextureCSV');
      sessionStorage.removeItem('customTextureCSVName');
      sessionStorage.removeItem('customTextureCSVCount');
      sessionStorage.removeItem('customTextureCsvId');
    }
  } catch (error) {
    console.error('Failed to load prompt CSVs:', error);
    clearCustomCSVs();
  }
}

// Clear custom CSVs (show defaults)
function clearCustomCSVs() {
  currentMusicCSV = null;
  currentTextureCSV = null;
  currentMusicCsvId = null;
  currentTextureCsvId = null;
  
  musicCsvName.textContent = 'music_samples.csv (default)';
  textureCsvName.textContent = 'texture_samples.csv (default)';
  
  // Clear sessionStorage
  sessionStorage.removeItem('customMusicCSV');
  sessionStorage.removeItem('customMusicCSVName');
  sessionStorage.removeItem('customMusicCSVCount');
  sessionStorage.removeItem('customMusicCSVId');
  sessionStorage.removeItem('customTextureCSV');
  sessionStorage.removeItem('customTextureCSVName');
  sessionStorage.removeItem('customTextureCSVCount');
  sessionStorage.removeItem('customTextureCsvId');
}

// Handle music CSV upload
async function handleMusicCsvUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  try {
    const result = await handleFileUpload(file, 'music');
    
    // Upload sets it as active system-wide automatically
    await loadActiveCSVs();
    
    showCsvStatus(`✅ Uploaded ${file.name} with ${result.rowCount} music samples (active system-wide)`, 'success');
  } catch (error) {
    console.error('Music CSV upload failed:', error);
    showCsvStatus('❌ Upload failed: ' + error.message, 'error');
    event.target.value = '';
  }
}

// Handle texture CSV upload
async function handleTextureCsvUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  try {
    const result = await handleFileUpload(file, 'texture');
    
    // Upload sets it as active system-wide automatically
    await loadActiveCSVs();
    
    showCsvStatus(`✅ Uploaded ${file.name} with ${result.rowCount} texture samples (active system-wide)`, 'success');
  } catch (error) {
    console.error('Texture CSV upload failed:', error);
    showCsvStatus('❌ Upload failed: ' + error.message, 'error');
    event.target.value = '';
  }
}

// Show CSV status message
function showCsvStatus(message, type) {
  csvStatus.textContent = message;
  csvStatus.className = `csv-status ${type}`;
  
  // Auto-hide success messages after 5 seconds
  if (type === 'success') {
    setTimeout(() => {
      csvStatus.classList.add('hidden');
    }, 5000);
  }
}

// Load active CSVs (system-wide)
async function loadActiveCSVs() {
  try {
    const response = await fetch(`${API_BASE}/sound-prompts/csvs/active`);
    if (!response.ok) throw new Error('Failed to load active CSVs');
    
    const csvs = await response.json();
    
    // Update UI
    if (csvs.music) {
      const rows = csvs.music.content.split('\n').length - 1;
      const label = csvs.music.is_default ? '(default)' : `(custom, ${rows} samples)`;
      musicCsvName.textContent = `${csvs.music.filename} ${label}`;
    }
    
    if (csvs.texture) {
      const rows = csvs.texture.content.split('\n').length - 1;
      const label = csvs.texture.is_default ? '(default)' : `(custom, ${rows} samples)`;
      textureCsvName.textContent = `${csvs.texture.filename} ${label}`;
    }
  } catch (error) {
    console.error('Failed to load active CSVs:', error);
  }
}

// LLM Settings Handlers
function handleProviderChange() {
  llmSettings.provider = llmProviderSelect.value;
  
  // Update model list
  const models = MODEL_LISTS[llmSettings.provider];
  llmModelSelect.innerHTML = '';
  models.forEach(m => {
    const option = document.createElement('option');
    option.value = m.value;
    option.textContent = m.label;
    llmModelSelect.appendChild(option);
  });
  
  // Select first model
  llmSettings.model = models[0].value;
  llmModelSelect.value = llmSettings.model;
  
  // Update visibility of Top P/K
  updateTopPKVisibility();
}

function handleModelChange() {
  llmSettings.model = llmModelSelect.value;
}

function handleTemperatureChange() {
  llmSettings.temperature = parseFloat(llmTemperatureInput.value);
}

function handleTopPChange() {
  llmSettings.topP = parseFloat(llmTopPInput.value);
}

function handleTopKChange() {
  llmSettings.topK = parseInt(llmTopKInput.value);
}

function handleMaxTokensChange() {
  llmSettings.maxTokens = parseInt(llmMaxTokensInput.value);
}

// Handle presets
function handlePreset(preset) {
  switch (preset) {
    case 'deterministic':
      llmSettings.temperature = 0.1;
      llmSettings.topP = 0.9;
      llmSettings.topK = 40;
      break;
    case 'balanced':
      llmSettings.temperature = 0.7;
      llmSettings.topP = 0.95;
      llmSettings.topK = 40;
      break;
    case 'creative':
      llmSettings.temperature = 0.9;
      llmSettings.topP = 0.98;
      llmSettings.topK = 60;
      break;
  }
  
  updateLLMControls();
}

// Update LLM controls from state
function updateLLMControls() {
  llmProviderSelect.value = llmSettings.provider;
  
  // Update model list
  const models = MODEL_LISTS[llmSettings.provider];
  llmModelSelect.innerHTML = '';
  models.forEach(m => {
    const option = document.createElement('option');
    option.value = m.value;
    option.textContent = m.label;
    llmModelSelect.appendChild(option);
  });
  llmModelSelect.value = llmSettings.model;
  
  llmTemperatureInput.value = llmSettings.temperature;
  llmTopPInput.value = llmSettings.topP;
  llmTopKInput.value = llmSettings.topK;
  llmMaxTokensInput.value = llmSettings.maxTokens;
  
  updateTopPKVisibility();
}

// Update Top P/K visibility based on provider
function updateTopPKVisibility() {
  const topPGroup = document.getElementById('top-p-group');
  const topKGroup = document.getElementById('top-k-group');
  
  if (llmSettings.provider === 'gemini') {
    topPGroup.style.display = 'block';
    topKGroup.style.display = 'block';
  } else {
    topPGroup.style.display = 'block';
    topKGroup.style.display = 'none';
  }
}

// Update button states
function updateButtons() {
  deleteBtn.disabled = !currentId;
  activateBtn.disabled = !currentId;
}

// Initialize on load
init();
