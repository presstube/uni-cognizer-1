// Personality Forge - API Client & UI Logic

const API_BASE = '/api';

// Model lists by provider
const MODEL_LISTS = {
  gemini: [
    { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash (Experimental)' },
    { value: 'gemini-1.5-flash-002', label: 'Gemini 1.5 Flash' },
    { value: 'gemini-1.5-flash-8b', label: 'Gemini 1.5 Flash-8B' },
    { value: 'gemini-1.5-pro-002', label: 'Gemini 1.5 Pro' }
  ],
  anthropic: [
    { value: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5' },
    { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
    { value: 'claude-opus-4-20250514', label: 'Claude Opus 4' }
  ]
};

// LLM Presets
const LLM_PRESETS = {
  deterministic: { temperature: 0.3, top_p: 0.5, top_k: 20 },
  balanced: { temperature: 0.7, top_p: 0.9, top_k: 40 },
  creative: { temperature: 1.2, top_p: 0.95, top_k: 40 }
};

// State
let personalities = [];
let currentPersonality = null;
let currentId = null;

// LLM Settings State
let llmSettings = {
  provider: 'gemini',
  model: 'gemini-2.0-flash-exp',
  temperature: 0.7,
  top_p: 0.9,
  top_k: 40,
  max_tokens: 1024
};

// Mock percept presets
const PRESETS = {
  greeting: {
    visualPercepts: [
      { emoji: '👋', action: 'Person waving at UNI' }
    ],
    audioPercepts: [
      { transcript: 'Hello UNI!' }
    ]
  },
  silence: {
    visualPercepts: [
      { emoji: '🏢', action: 'Empty lobby' }
    ],
    audioPercepts: [
      { analysis: 'Silence - building ambiance only' }
    ]
  },
  conversation: {
    visualPercepts: [
      { emoji: '👥', action: 'Two people talking' },
      { emoji: '😊', action: 'Smiling faces' }
    ],
    audioPercepts: [
      { transcript: 'The event is starting soon' }
    ]
  },
  technical: {
    visualPercepts: [
      { emoji: '🔧', action: 'Maintenance crew working on HVAC' }
    ],
    audioPercepts: [
      { analysis: 'Mechanical sounds - HVAC system startup' }
    ]
  },
  custom: {
    visualPercepts: [],
    audioPercepts: []
  }
};

// DOM Elements
const personalitySelect = document.getElementById('personality-select');
const deleteBtn = document.getElementById('delete-btn');
const nameInput = document.getElementById('name');
const slugInput = document.getElementById('slug');
const promptTextarea = document.getElementById('prompt');
const charCount = document.getElementById('char-count');
const presetSelect = document.getElementById('preset-select');
const perceptsTextarea = document.getElementById('percepts');
const testBtn = document.getElementById('test-btn');
const saveBtn = document.getElementById('save-btn');
const activateBtn = document.getElementById('activate-btn');
const statusDiv = document.getElementById('status');
const resultsSection = document.getElementById('results');
const resultMoment = document.getElementById('result-moment');
const resultSigil = document.getElementById('result-sigil');
const resultLighting = document.getElementById('result-lighting');

// LLM Settings DOM Elements
const llmProviderSelect = document.getElementById('llm-provider');
const llmModelSelect = document.getElementById('llm-model');
const llmTemperatureInput = document.getElementById('llm-temperature');
const llmTopPInput = document.getElementById('llm-top-p');
const llmTopKInput = document.getElementById('llm-top-k');
const llmMaxTokensInput = document.getElementById('llm-max-tokens');

// Initialize
async function init() {
  await loadPersonalities();
  
  // Set initial preset
  loadPreset('greeting');
  
  // Initialize LLM controls
  initializeLLMControls();
  
  // Event listeners
  personalitySelect.addEventListener('change', handlePersonalityChange);
  deleteBtn.addEventListener('click', handleDelete);
  nameInput.addEventListener('input', updateSlug);
  promptTextarea.addEventListener('input', updateCharCount);
  presetSelect.addEventListener('change', handlePresetChange);
  testBtn.addEventListener('click', handleTest);
  saveBtn.addEventListener('click', handleSave);
  activateBtn.addEventListener('click', handleActivate);
  
  // LLM settings listeners
  llmProviderSelect.addEventListener('change', handleProviderChange);
  llmModelSelect.addEventListener('change', handleModelChange);
  llmTemperatureInput.addEventListener('input', handleTemperatureChange);
  llmTopPInput.addEventListener('input', handleTopPChange);
  llmTopKInput.addEventListener('input', handleTopKChange);
  llmMaxTokensInput.addEventListener('input', handleMaxTokensChange);
  
  // Preset button listeners
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => handlePreset(btn.dataset.preset));
  });
  
  updateCharCount();
  
  // Auto-load personality: check localStorage first, then active personality
  await autoLoadPersonality();
}

// Auto-load personality on startup
async function autoLoadPersonality() {
  // Check localStorage for last selected personality
  const lastSelectedId = localStorage.getItem('forge_last_personality');
  
  if (lastSelectedId && lastSelectedId !== 'new') {
    // Try to load the last selected personality
    const exists = personalities.find(p => p.id === lastSelectedId);
    if (exists) {
      personalitySelect.value = lastSelectedId;
      await handlePersonalityChange();
      return;
    }
  }
  
  // Fallback: load active personality
  try {
    const res = await fetch(`${API_BASE}/personalities/active`);
    if (res.ok) {
      const data = await res.json();
      const activeId = data.personality.id;
      
      personalitySelect.value = activeId;
      await handlePersonalityChange();
    }
  } catch (error) {
    console.log('No active personality found, starting with new');
  }
}

// API Functions
async function fetchPersonalities() {
  const res = await fetch(`${API_BASE}/personalities`);
  if (!res.ok) throw new Error('Failed to fetch personalities');
  const data = await res.json();
  return data.personalities;
}

async function fetchPersonality(id) {
  const res = await fetch(`${API_BASE}/personalities/${id}`);
  if (!res.ok) throw new Error('Failed to fetch personality');
  const data = await res.json();
  return data.personality;
}

async function savePersonality(personality) {
  const res = await fetch(`${API_BASE}/personalities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(personality)
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to save personality');
  }
  const data = await res.json();
  return data.personality;
}

async function activatePersonality(id) {
  const res = await fetch(`${API_BASE}/personalities/${id}/activate`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to activate personality');
  const data = await res.json();
  return data;
}

async function testPersonality(id, percepts, llmSettingsOverride = null) {
  const payload = {
    ...percepts,
    llmSettings: llmSettingsOverride  // Include LLM settings override if provided
  };
  
  const res = await fetch(`${API_BASE}/personalities/${id}/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.details || error.error || 'Test failed');
  }
  return await res.json();
}

async function deletePersonality(id) {
  const res = await fetch(`${API_BASE}/personalities/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to delete');
  }
  return await res.json();
}

// UI Functions
async function loadPersonalities() {
  try {
    personalities = await fetchPersonalities();
    
    // Clear select
    personalitySelect.innerHTML = '<option value="new">+ New Personality</option>';
    
    // Add personalities
    personalities.forEach(p => {
      const option = document.createElement('option');
      option.value = p.id;
      option.textContent = `${p.name}${p.active ? ' ⭐' : ''}`;
      personalitySelect.appendChild(option);
    });
    
  } catch (error) {
    showStatus('error', `Failed to load personalities: ${error.message}`);
  }
}

async function handlePersonalityChange() {
  const value = personalitySelect.value;
  
  // Save to localStorage
  localStorage.setItem('forge_last_personality', value);
  
  if (value === 'new') {
    clearForm();
    currentId = null;
    currentPersonality = null;
    deleteBtn.disabled = true;
    activateBtn.disabled = true;
    // Reset to defaults
    resetLLMSettings();
  } else {
    try {
      currentPersonality = await fetchPersonality(value);
      currentId = value;
      
      nameInput.value = currentPersonality.name;
      slugInput.value = currentPersonality.slug;
      promptTextarea.value = currentPersonality.prompt;
      updateCharCount();
      
      // Load LLM settings
      loadLLMSettings(currentPersonality);
      
      deleteBtn.disabled = currentPersonality.active;
      activateBtn.disabled = currentPersonality.active;
      
      hideResults();
      
    } catch (error) {
      showStatus('error', `Failed to load personality: ${error.message}`);
    }
  }
}

function clearForm() {
  nameInput.value = '';
  slugInput.value = '';
  promptTextarea.value = '';
  updateCharCount();
  hideResults();
}

function updateSlug() {
  // Auto-generate slug from name only for new personalities
  // (when currentId is null and slug is empty or matches auto-generated pattern)
  if (!currentId || !slugInput.value) {
    const slug = nameInput.value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    slugInput.value = slug;
  }
}

function updateCharCount() {
  const count = promptTextarea.value.length;
  charCount.textContent = `${count} characters`;
}

function loadPreset(presetName) {
  const preset = PRESETS[presetName];
  perceptsTextarea.value = JSON.stringify(preset, null, 2);
}

function handlePresetChange() {
  loadPreset(presetSelect.value);
}

async function handleTest() {
  if (!currentId && !promptTextarea.value) {
    showStatus('error', 'Please save the personality first or load an existing one');
    return;
  }
  
  // If new personality, save it first
  if (!currentId) {
    const saved = await handleSave(true);
    if (!saved) return;
  }
  
  try {
    setLoading(testBtn, true);
    hideResults();
    
    // Parse percepts
    const percepts = JSON.parse(perceptsTextarea.value);
    
    // Test with current UI settings (not saved settings)
    const result = await testPersonality(currentId, percepts, llmSettings);
    
    // Display results
    resultMoment.textContent = result.mindMoment;
    resultSigil.textContent = result.sigilPhrase || '(none)';
    resultLighting.textContent = `${result.lighting?.color} - ${result.lighting?.pattern} (speed: ${result.lighting?.speed})`;
    
    resultsSection.classList.remove('hidden');
    
  } catch (error) {
    showStatus('error', `Test failed: ${error.message}`);
  } finally {
    setLoading(testBtn, false);
  }
}

async function handleSave(silent = false) {
  const name = nameInput.value.trim();
  const slug = slugInput.value.trim();
  const prompt = promptTextarea.value.trim();
  
  if (!name || !slug || !prompt) {
    showStatus('error', 'Please fill in all fields');
    return false;
  }
  
  try {
    setLoading(saveBtn, true);
    
    const personality = {
      id: currentId,
      name,
      slug,
      prompt,
      ...llmSettings
    };
    
    const saved = await savePersonality(personality);
    currentId = saved.id;
    currentPersonality = saved;
    
    // Reload list
    await loadPersonalities();
    
    // Select the saved one
    personalitySelect.value = saved.id;
    
    deleteBtn.disabled = saved.active;
    activateBtn.disabled = saved.active;
    
    if (!silent) {
      showStatus('success', `✅ Saved: ${saved.name}`);
    }
    
    return true;
    
  } catch (error) {
    showStatus('error', `Save failed: ${error.message}`);
    return false;
  } finally {
    setLoading(saveBtn, false);
  }
}

async function handleActivate() {
  if (!currentId) {
    showStatus('error', 'Please save the personality first');
    return;
  }
  
  if (!confirm('Activate this personality? This will deactivate all others.\n\nNote: You must restart the server to load the new personality.')) {
    return;
  }
  
  try {
    setLoading(activateBtn, true);
    
    await activatePersonality(currentId);
    
    // Reload list
    await loadPersonalities();
    
    // Select the activated one
    personalitySelect.value = currentId;
    
    activateBtn.disabled = true;
    deleteBtn.disabled = true;
    
    showStatus('success', '✅ Personality activated! Restart the server to load it:\n\nnpm start');
    
  } catch (error) {
    showStatus('error', `Activation failed: ${error.message}`);
  } finally {
    setLoading(activateBtn, false);
  }
}

async function handleDelete() {
  if (!currentId) return;
  
  if (!confirm(`Delete "${currentPersonality.name}"?\n\nThis cannot be undone.`)) {
    return;
  }
  
  try {
    setLoading(deleteBtn, true);
    
    await deletePersonality(currentId);
    
    // Reload list
    await loadPersonalities();
    
    // Reset to new
    personalitySelect.value = 'new';
    handlePersonalityChange();
    
    showStatus('success', '✅ Personality deleted');
    
  } catch (error) {
    showStatus('error', `Delete failed: ${error.message}`);
  } finally {
    setLoading(deleteBtn, false);
  }
}

function showStatus(type, message) {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.classList.remove('hidden');
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    statusDiv.classList.add('hidden');
  }, 5000);
}

function hideResults() {
  resultsSection.classList.add('hidden');
}

function setLoading(button, loading) {
  if (loading) {
    button.classList.add('loading');
    button.disabled = true;
  } else {
    button.classList.remove('loading');
    button.disabled = false;
  }
}

// LLM Control Functions
function initializeLLMControls() {
  // Populate provider dropdown
  llmProviderSelect.innerHTML = '';
  Object.keys(MODEL_LISTS).forEach(provider => {
    const option = document.createElement('option');
    option.value = provider;
    option.textContent = provider.charAt(0).toUpperCase() + provider.slice(1);
    llmProviderSelect.appendChild(option);
  });
  
  // Set initial values
  updateLLMControls();
}

function updateLLMControls() {
  // Update provider dropdown
  llmProviderSelect.value = llmSettings.provider;
  
  // Update model dropdown based on provider
  updateModelList();
  
  // Update inputs
  llmTemperatureInput.value = llmSettings.temperature;
  llmTopPInput.value = llmSettings.top_p;
  llmTopKInput.value = llmSettings.top_k;
  llmMaxTokensInput.value = llmSettings.max_tokens;
  
  // Show/hide controls based on provider
  const topKGroup = document.getElementById('top-k-group');
  const topPGroup = document.getElementById('top-p-group');
  
  if (llmSettings.provider === 'gemini') {
    // Gemini: Show both top_p and top_k
    topPGroup.style.display = 'flex';
    topKGroup.style.display = 'flex';
  } else {
    // Anthropic: Hide top_p and top_k (only uses temperature)
    topPGroup.style.display = 'none';
    topKGroup.style.display = 'none';
  }
  
  // Update temperature max based on provider
  const maxTemp = llmSettings.provider === 'gemini' ? 2.0 : 1.0;
  llmTemperatureInput.max = maxTemp;
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

function handleProviderChange() {
  llmSettings.provider = llmProviderSelect.value;
  
  // Reset model to first in list for new provider
  const models = MODEL_LISTS[llmSettings.provider] || [];
  if (models.length > 0) {
    llmSettings.model = models[0].value;
  }
  
  // Clamp temperature based on new provider
  if (llmSettings.provider === 'anthropic' && llmSettings.temperature > 1) {
    llmSettings.temperature = 1;
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
  let temp = parseFloat(llmTemperatureInput.value);
  
  // Clamp temperature based on provider
  if (llmSettings.provider === 'anthropic') {
    temp = Math.max(0, Math.min(1, temp)); // Anthropic: 0-1
  } else if (llmSettings.provider === 'gemini') {
    temp = Math.max(0, Math.min(2, temp)); // Gemini: 0-2
  }
  
  llmSettings.temperature = temp;
  llmTemperatureInput.value = temp; // Update UI to show clamped value
}

function handleTopPChange() {
  llmSettings.top_p = parseFloat(llmTopPInput.value);
}

function handleTopKChange() {
  llmSettings.top_k = parseInt(llmTopKInput.value, 10);
}

function handleMaxTokensChange() {
  llmSettings.max_tokens = parseInt(llmMaxTokensInput.value, 10);
}

function handlePreset(presetName) {
  const preset = LLM_PRESETS[presetName];
  if (preset) {
    llmSettings.temperature = preset.temperature;
    llmSettings.top_p = preset.top_p;
    llmSettings.top_k = preset.top_k;
    updateLLMControls();
  }
}

function loadLLMSettings(personality) {
  // Load LLM settings from personality, with fallback to defaults
  llmSettings = {
    provider: personality.provider || 'gemini',
    model: personality.model || 'gemini-2.0-flash-exp',
    temperature: personality.temperature || 0.7,
    top_p: personality.top_p || 0.9,
    top_k: personality.top_k || 40,
    max_tokens: personality.max_tokens || 1024
  };
  updateLLMControls();
}

function resetLLMSettings() {
  llmSettings = {
    provider: 'gemini',
    model: 'gemini-2.0-flash-exp',
    temperature: 0.7,
    top_p: 0.9,
    top_k: 40,
    max_tokens: 1024
  };
  updateLLMControls();
}

// Start
init();

