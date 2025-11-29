import { Sigil } from './sigil/sigil.standalone.js';

const API_BASE = '/api';

// State
let prompts = [];
let currentPrompt = null;
let currentId = null;
let sigil = null;
let customImageData = null;      // Base64 for local preview (testing)
let referenceImagePath = null;   // Server-side path for saved prompts
let hasUnsavedImage = false;     // Track if image needs uploading
let llmSettings = {
  provider: 'anthropic',
  model: 'claude-sonnet-4-5-20250929',
  temperature: 0.7,
  top_p: 0.9,
  max_tokens: 1024,
  top_k: null  // Gemini only
};

// Model lists per provider
const MODEL_LISTS = {
  anthropic: [
    { value: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5' },
    { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
    { value: 'claude-opus-4', label: 'Claude Opus 4' },
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' }
  ],
  gemini: [
    { value: 'models/gemini-3-pro-preview', label: 'Gemini 3 Pro (Preview)' },
    { value: 'models/gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { value: 'models/gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash (Exp)' },
    { value: 'models/gemini-1.5-flash-002', label: 'Gemini 1.5 Flash' },
    { value: 'models/gemini-1.5-pro-002', label: 'Gemini 1.5 Pro' }
  ]
};

// DOM Elements
const promptSelect = document.getElementById('prompt-select');
const nameInput = document.getElementById('name');
const slugInput = document.getElementById('slug');
const promptTextarea = document.getElementById('prompt');
const saveBtn = document.getElementById('save-btn');
const activateBtn = document.getElementById('activate-btn');
const deleteBtn = document.getElementById('delete-btn');
const phraseInput = document.getElementById('phrase');
const includeImageCheckbox = document.getElementById('include-image');
const imageFileInput = document.getElementById('image-file');
const refImage = document.getElementById('ref-image');
const resetImageBtn = document.getElementById('reset-image');

// LLM Settings DOM Elements
const llmProviderSelect = document.getElementById('llm-provider');
const llmModelSelect = document.getElementById('llm-model');
const llmTemperatureInput = document.getElementById('llm-temperature');
const llmTopPInput = document.getElementById('llm-top-p');
const llmTopKInput = document.getElementById('llm-top-k');
const llmMaxTokensInput = document.getElementById('llm-max-tokens');

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
  deleteBtn.addEventListener('click', handleDelete);
  phraseInput.addEventListener('keydown', handlePhraseSubmit);
  imageFileInput.addEventListener('change', handleImageUpload);
  resetImageBtn.addEventListener('click', handleResetImage);
  
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
  
  // Initialize reset button visibility
  resetImageBtn.classList.add('hidden');
  
  // Initialize LLM controls
  updateLLMControls();
}

// Initialize Sigil viewer
function initSigil() {
  sigil = new Sigil({
    canvas: document.getElementById('sigil-canvas'),
    canvasSize: 300,
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
  
  // Auto-focus phrase input on load
  setTimeout(() => {
    phraseInput.focus();
  }, 100);
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
    resetLLMSettings();
    resetImageState();
    currentId = null;
    currentPrompt = null;
    activateBtn.disabled = true;
    deleteBtn.disabled = true;
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
      
      // Load image settings from prompt
      includeImageCheckbox.checked = currentPrompt.include_image !== false;
      
      if (currentPrompt.reference_image_path) {
        referenceImagePath = currentPrompt.reference_image_path;
        refImage.src = `/assets/${referenceImagePath}`;
        resetImageBtn.classList.remove('hidden');
        customImageData = null;
        hasUnsavedImage = false;
        console.log(`📷 Loaded saved reference image: ${referenceImagePath}`);
      } else {
        resetImageState();
      }
      
      activateBtn.disabled = currentPrompt.active;
      deleteBtn.disabled = false;
      
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

// Reset LLM settings to defaults
function resetLLMSettings() {
  llmSettings = {
    provider: 'anthropic',
    model: 'claude-sonnet-4-5-20250929',
    temperature: 0.7,
    top_p: 0.9,
    max_tokens: 1024,
    top_k: null
  };
  updateLLMControls();
}

// Update LLM controls UI from state
function updateLLMControls() {
  // Update provider dropdown
  llmProviderSelect.value = llmSettings.provider;
  
  // Update model dropdown based on provider
  updateModelList();
  
  // Update inputs
  llmTemperatureInput.value = llmSettings.temperature;
  llmTopPInput.value = llmSettings.top_p;
  llmMaxTokensInput.value = llmSettings.max_tokens;
  
  // Show/hide controls based on provider
  const topKGroup = document.getElementById('top-k-group');
  const topPGroup = document.getElementById('top-p-group');
  
  if (llmSettings.provider === 'gemini') {
    // Gemini: Show both top_p and top_k
    topPGroup.style.display = 'block';
    topKGroup.style.display = 'block';
    llmTopKInput.value = llmSettings.top_k || 40;
  } else {
    // Anthropic: Hide top_p and top_k (only uses temperature)
    topPGroup.style.display = 'none';
    topKGroup.style.display = 'none';
  }
  
  // Update temperature max based on provider
  const maxTemp = llmSettings.provider === 'gemini' ? 2.0 : 1.0;
  llmTemperatureInput.max = maxTemp;
}

// Update model list based on provider
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

// LLM Settings Event Handlers
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
  llmSettings.temperature = parseFloat(llmTemperatureInput.value);
}

function handleTopPChange() {
  llmSettings.top_p = parseFloat(llmTopPInput.value);
}

function handleTopKChange() {
  llmSettings.top_k = parseInt(llmTopKInput.value, 10);
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

// Helper: Convert file to base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Handle image upload
async function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  // Validate size (< 5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert('Image too large (max 5MB)');
    imageFileInput.value = '';
    return;
  }
  
  // Validate type
  if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) {
    alert('Please upload a PNG or JPEG image');
    imageFileInput.value = '';
    return;
  }
  
  try {
    // Convert to base64
    const base64 = await fileToBase64(file);
    customImageData = base64;
    hasUnsavedImage = true;
    referenceImagePath = null; // Clear server path since we have new image
    
    // Preview it
    refImage.src = base64;
    resetImageBtn.classList.remove('hidden');
    
    console.log('✅ Custom image loaded (unsaved):', file.name, `(${(file.size / 1024).toFixed(1)}KB)`);
  } catch (error) {
    console.error('Failed to load image:', error);
    alert('Failed to load image');
    imageFileInput.value = '';
  }
}

// Reset image state to defaults
function resetImageState() {
  customImageData = null;
  referenceImagePath = null;
  hasUnsavedImage = false;
  refImage.src = '/assets/sigil-grid-original.png';
  resetImageBtn.classList.add('hidden');
  imageFileInput.value = '';
  includeImageCheckbox.checked = true;
}

// Reset to default image
function handleResetImage() {
  customImageData = null;
  referenceImagePath = null;
  hasUnsavedImage = false;
  refImage.src = '/assets/sigil-grid-original.png';
  resetImageBtn.classList.add('hidden');
  imageFileInput.value = '';
  console.log('↺ Reset to default image');
}

// Upload custom image to server
async function uploadImageToServer(base64Data) {
  const res = await fetch(`${API_BASE}/sigil-prompts/upload-reference-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64Data })
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to upload image');
  }
  
  const data = await res.json();
  return data.path;
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
    saveBtn.classList.add('loading');
    
    // Upload image to server if we have unsaved custom image
    let imagePath = referenceImagePath;
    if (hasUnsavedImage && customImageData) {
      console.log('📤 Uploading custom image to server...');
      imagePath = await uploadImageToServer(customImageData);
      console.log('✅ Image uploaded:', imagePath);
      referenceImagePath = imagePath;
      hasUnsavedImage = false;
    }
    
    // Get include_image setting
    const includeImage = includeImageCheckbox.checked;
    
    const res = await fetch(`${API_BASE}/sigil-prompts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: currentId,
        name,
        slug,
        prompt,
        llmSettings,
        includeImage,
        referenceImagePath: imagePath
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
    saveBtn.classList.remove('loading');
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
    activateBtn.classList.add('loading');
    
    const res = await fetch(`${API_BASE}/sigil-prompts/${currentId}/activate`, {
      method: 'POST'
    });
    
    if (!res.ok) throw new Error('Activation failed');
    
    await loadPrompts();
    promptSelect.value = currentId;
    
    activateBtn.disabled = true;
    
    alert('✅ Prompt activated!\n\nNew settings will be used on the next cognitive cycle.');
    
  } catch (error) {
    console.error('Activation failed:', error);
    alert(`Error: ${error.message}`);
  } finally {
    activateBtn.classList.remove('loading');
  }
}

// Delete prompt
async function handleDelete() {
  if (!currentId) {
    alert('No prompt selected to delete');
    return;
  }
  
  if (!confirm('Delete this sigil prompt?\n\nThis action cannot be undone.')) {
    return;
  }
  
  try {
    deleteBtn.disabled = true;
    deleteBtn.classList.add('loading');
    
    const res = await fetch(`${API_BASE}/sigil-prompts/${currentId}`, {
      method: 'DELETE'
    });
    
    if (!res.ok) throw new Error('Delete failed');
    
    alert('✅ Prompt deleted');
    
    // Reset and reload
    await loadPrompts();
    promptSelect.value = 'new';
    handlePromptChange();
    
  } catch (error) {
    console.error('Delete failed:', error);
    alert(`Error: ${error.message}`);
  } finally {
    deleteBtn.disabled = false;
    deleteBtn.classList.remove('loading');
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
  
  // Replace ${concept} with the actual phrase for display
  const finalPrompt = prompt.replace(/\$\{concept\}/g, phrase);
  const includeImage = includeImageCheckbox.checked;
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎨 SIGIL GENERATION REQUEST');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📝 Phrase:', phrase);
  console.log('🖼️  Include reference image:', includeImage);
  console.log('🎨 Custom image:', customImageData ? 'Yes (uploaded)' : 'No (default)');
  console.log('\n🔮 Prompt sent to LLM:\n');
  console.log(finalPrompt);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    // Disable input during generation (but keep text visible)
    phraseInput.disabled = true;
    
    // Start thinking animation
    sigil.thinkingVaried();
    
    // Generate sigil with CURRENT prompt (not saved version)
    const res = await fetch(`${API_BASE}/sigil-prompts/test-current`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        phrase, 
        prompt, 
        includeImage, 
        customImage: customImageData,
        llmSettings
      })
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || error.details || 'Generation failed');
    }
    
    const data = await res.json();
    
    console.log('✅ Sigil generated successfully');
    console.log('📊 Canvas code length:', data.calls.length, 'characters\n');
    
    // Log copy-pastable JSON fragment
    const resultJson = {
      sigilPhrase: phrase,
      drawCalls: data.calls
    };
    console.log('📋 Copy-pastable JSON fragment:');
    console.log(JSON.stringify(resultJson, null, 2));
    console.log('');
    
    // Draw the result
    sigil.drawSigil({ calls: data.calls });
    
  } catch (error) {
    console.error('❌ Generation failed:', error);
    alert(`Error: ${error.message}`);
    sigil.thinking(); // Fall back to thinking
  } finally {
    // Re-enable input, refocus, and select all text for easy overwrite
    phraseInput.disabled = false;
    phraseInput.focus();
    phraseInput.select();
  }
}

// Start
init();

