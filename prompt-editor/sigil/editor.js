import { Sigil } from './sigil/sigil.standalone.js';

const API_BASE = '/api';

// State
let prompts = [];
let currentPrompt = null;
let currentId = null;
let sigil = null;
let customImageData = null;

// DOM Elements
const promptSelect = document.getElementById('prompt-select');
const nameInput = document.getElementById('name');
const slugInput = document.getElementById('slug');
const promptTextarea = document.getElementById('prompt');
const saveBtn = document.getElementById('save-btn');
const activateBtn = document.getElementById('activate-btn');
const phraseInput = document.getElementById('phrase');
const includeImageCheckbox = document.getElementById('include-image');
const imageFileInput = document.getElementById('image-file');
const refImage = document.getElementById('ref-image');
const resetImageBtn = document.getElementById('reset-image');

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
  imageFileInput.addEventListener('change', handleImageUpload);
  resetImageBtn.addEventListener('click', handleResetImage);
  
  // Initialize reset button visibility
  resetImageBtn.classList.add('hidden');
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
    
    // Preview it
    refImage.src = base64;
    resetImageBtn.classList.remove('hidden');
    
    console.log('✅ Custom image loaded:', file.name, `(${(file.size / 1024).toFixed(1)}KB)`);
  } catch (error) {
    console.error('Failed to load image:', error);
    alert('Failed to load image');
    imageFileInput.value = '';
  }
}

// Reset to default image
function handleResetImage() {
  customImageData = null;
  refImage.src = '/assets/sigil-grid-original.png';
  resetImageBtn.classList.add('hidden');
  imageFileInput.value = '';
  console.log('↺ Reset to default image');
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
    
    alert('✅ Prompt activated!\n\nRestart the server to load the new prompt.');
    
  } catch (error) {
    console.error('Activation failed:', error);
    alert(`Error: ${error.message}`);
  } finally {
    activateBtn.classList.remove('loading');
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
      body: JSON.stringify({ phrase, prompt, includeImage, customImage: customImageData })
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || error.details || 'Generation failed');
    }
    
    const data = await res.json();
    
    console.log('✅ Sigil generated successfully');
    console.log('📊 Canvas code length:', data.calls.length, 'characters\n');
    
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

