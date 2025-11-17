// Personality Forge - API Client & UI Logic

const API_BASE = '/api';

// State
let personalities = [];
let currentPersonality = null;
let currentId = null;

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
const resultKinetic = document.getElementById('result-kinetic');
const resultLighting = document.getElementById('result-lighting');

// Initialize
async function init() {
  await loadPersonalities();
  
  // Set initial preset
  loadPreset('greeting');
  
  // Event listeners
  personalitySelect.addEventListener('change', handlePersonalityChange);
  deleteBtn.addEventListener('click', handleDelete);
  nameInput.addEventListener('input', updateSlug);
  promptTextarea.addEventListener('input', updateCharCount);
  presetSelect.addEventListener('change', handlePresetChange);
  testBtn.addEventListener('click', handleTest);
  saveBtn.addEventListener('click', handleSave);
  activateBtn.addEventListener('click', handleActivate);
  
  updateCharCount();
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

async function testPersonality(id, percepts) {
  const res = await fetch(`${API_BASE}/personalities/${id}/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(percepts)
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
  
  if (value === 'new') {
    clearForm();
    currentId = null;
    currentPersonality = null;
    deleteBtn.disabled = true;
    activateBtn.disabled = true;
  } else {
    try {
      currentPersonality = await fetchPersonality(value);
      currentId = value;
      
      nameInput.value = currentPersonality.name;
      slugInput.value = currentPersonality.slug;
      promptTextarea.value = currentPersonality.prompt;
      updateCharCount();
      
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
  // Auto-generate slug from name if slug is empty
  if (!slugInput.value) {
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
    
    // Test
    const result = await testPersonality(currentId, percepts);
    
    // Display results
    resultMoment.textContent = result.mindMoment;
    resultSigil.textContent = result.sigilPhrase || '(none)';
    resultKinetic.textContent = result.kinetic?.pattern || '(none)';
    resultLighting.textContent = `${result.lighting?.color} - ${result.lighting?.pattern} (speed: ${result.lighting?.speed})`;
    
    resultsSection.classList.remove('hidden');
    
    showStatus('success', '✅ Test complete! Results shown below.');
    
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
      prompt
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

// Start
init();

