import { Sigil } from './sigil.standalone.js';

// ============================================
// SECTION 1: State Management
// ============================================

const state = {
  ws: null,               // Raw WebSocket connection
  stream: null,            // MediaStream from microphone
  audioContext: null,      // Web Audio API context
  audioSource: null,       // MediaStreamAudioSourceNode
  audioProcessor: null,    // ScriptProcessorNode for PCM conversion
  sendInterval: null,      // Interval for sending audio packets
  currentPromptId: null,   // Database ID of loaded prompt (null = new)
  currentPromptSlug: null, // Slug of loaded prompt
  prompts: [],             // List of available prompts
  isConnected: false,      // Session connection status
  isListening: false,      // Listening status
  responseBuffer: '',       // Accumulated response text
  packetInterval: 2000,     // Send audio packets every 2 seconds
  pcmBuffer: [],           // Buffer for PCM audio data (Int16Array)
  setupComplete: false,    // Track if WebSocket setup is complete
  sigil: null              // Sigil instance for rendering
};

// Update state (immutable pattern)
function updateState(updates) {
  Object.assign(state, updates);
  updateUI();
}

// ============================================
// SECTION 2: Audio Capture
// ============================================

async function initMicrophone() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    
    updateState({ stream });
    console.log('✅ Microphone initialized');
    
    return stream;
  } catch (error) {
    showError('Failed to access microphone: ' + error.message);
    console.error('Microphone error:', error);
    throw error;
  }
}

// Convert audio stream to PCM format (16-bit, 16kHz, mono)
// Required by Gemini Live API: https://ai.google.dev/gemini-api/docs/live
async function initAudioProcessing(stream) {
  try {
    // Reuse existing AudioContext or create new one
    let audioContext = state.audioContext;
    if (!audioContext) {
      // Create AudioContext with 16kHz sample rate (required by Gemini)
      audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000
      });
    } else {
      // Resume if suspended
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
    }
    
    // Create source from microphone stream
    const source = audioContext.createMediaStreamSource(stream);
    
    // Create script processor for PCM conversion
    // Note: ScriptProcessorNode is deprecated but works everywhere
    // For production, consider using AudioWorklet (more complex setup)
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    
    // Process audio data
    processor.onaudioprocess = (event) => {
      if (!state.isListening) return;
      
      // Get input buffer (mono, 16kHz)
      const inputBuffer = event.inputBuffer.getChannelData(0);
      
      // Convert float32 (-1 to 1) to int16 (-32768 to 32767)
      const pcmData = new Int16Array(inputBuffer.length);
      for (let i = 0; i < inputBuffer.length; i++) {
        // Clamp to [-1, 1] and convert to int16
        const s = Math.max(-1, Math.min(1, inputBuffer[i]));
        pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      
      // Add to buffer
      state.pcmBuffer.push(...pcmData);
    };
    
    // Connect: source -> processor -> destination (silent)
    source.connect(processor);
    processor.connect(audioContext.destination);
    
    updateState({ audioContext, audioSource: source, audioProcessor: processor });
    console.log('✅ Audio processing initialized (16kHz PCM)');
    
    return { audioContext, source, processor };
    
  } catch (error) {
    console.error('Failed to initialize audio processing:', error);
    throw error;
  }
}

async function startListening() {
  if (state.isListening) return;
  
  if (!state.stream) {
    showError('Microphone not initialized');
    return;
  }
  
  try {
    // Always reinitialize audio processing on start
    // (This ensures clean state even if previously disconnected)
    if (!state.audioContext) {
      await initAudioProcessing(state.stream);
    } else {
      // Resume audio context if suspended
      if (state.audioContext.state === 'suspended') {
        await state.audioContext.resume();
      }
      
      // Always recreate audio processing nodes on restart
      // (They were nulled out in stopListening to ensure clean restart)
      await initAudioProcessing(state.stream);
    }
    
    // Clear PCM buffer
    state.pcmBuffer = [];
    updateState({ isListening: true });
    
    // Send packets at regular intervals (only if we have data and are ready)
    state.sendInterval = setInterval(() => {
      // Require MINIMUM 8000 samples (0.5 seconds at 16kHz) before sending
      const MIN_SAMPLES = 8000;
      
      // Only send if we have enough PCM data and setup is complete
      if (state.pcmBuffer.length >= MIN_SAMPLES && state.setupComplete) {
        // Send up to 2 seconds worth (32000 samples at 16kHz)
        const samplesToSend = Math.min(state.pcmBuffer.length, 32000);
        const pcmChunk = state.pcmBuffer.slice(0, samplesToSend);
        
        // Convert Int16Array to base64 using proper little-endian encoding
        const pcmBuffer = new Int16Array(pcmChunk);
        const arrayBuffer = new ArrayBuffer(pcmBuffer.length * 2);
        const dataView = new DataView(arrayBuffer);
        
        // Write as little-endian 16-bit integers (required by Gemini)
        for (let i = 0; i < pcmBuffer.length; i++) {
          dataView.setInt16(i * 2, pcmBuffer[i], true); // true = little-endian
        }
        
        // Convert to base64
        const uint8Array = new Uint8Array(arrayBuffer);
        const base64PCM = btoa(String.fromCharCode.apply(null, Array.from(uint8Array)));
        
        sendAudioPacket(base64PCM);
        
        // Remove sent samples from buffer
        state.pcmBuffer = state.pcmBuffer.slice(samplesToSend);
        return;
      }
      
      // If we have data but can't send, log why
      if (state.pcmBuffer.length > 0) {
        if (state.pcmBuffer.length < MIN_SAMPLES) {
          console.log(`⏳ Buffering audio (${state.pcmBuffer.length}/${MIN_SAMPLES} samples)`);
        } else if (!state.setupComplete) {
          console.log('⏳ Waiting for setup to complete before sending');
        }
      }
    }, state.packetInterval);
    
    console.log('✅ Started listening');
    updateStatus('🔴 Listening...');
    
  } catch (error) {
    console.error('Failed to start listening:', error);
    showError('Failed to start listening: ' + error.message);
  }
}

function stopListening() {
  if (!state.isListening) return;
  
  console.log('⏹ Stopping listening...');
  
  // Clear send interval
  if (state.sendInterval) {
    clearInterval(state.sendInterval);
    state.sendInterval = null;
  }
  
  // Disconnect and clear audio processing nodes
  if (state.audioProcessor) {
    state.audioProcessor.disconnect();
    state.audioProcessor.onaudioprocess = null; // Remove event handler
  }
  if (state.audioSource) {
    state.audioSource.disconnect();
  }
  
  // Clear buffer
  state.pcmBuffer = [];
  
  // Update state - clear processor and source so they get recreated on restart
  updateState({ 
    isListening: false,
    audioProcessor: null,
    audioSource: null
  });
  
  console.log('⏹ Stopped listening');
  updateStatus(state.isConnected ? '🟢 Connected' : '⚫ Disconnected');
}

function toggleListening() {
  if (state.isListening) {
    stopListening();
  } else {
    startListening();
  }
}

// ============================================
// SECTION 3: WebSocket Connection
// ============================================

const WS_BASE = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService';

function createWebSocketUrl(token) {
  const isEphemeralToken = token.startsWith('auth_tokens/');
  const endpoint = isEphemeralToken ? 'BidiGenerateContentConstrained' : 'BidiGenerateContent';
  const param = isEphemeralToken ? 'access_token' : 'key';
  return `${WS_BASE}.${endpoint}?${param}=${token}`;
}

async function startSession() {
  if (state.ws && state.ws.readyState === WebSocket.OPEN && state.setupComplete) {
    console.log('WebSocket already active and ready');
    return;
  }
  
  // Close existing connection if any
  if (state.ws) {
    state.ws.close();
    updateState({ ws: null, setupComplete: false });
  }
  
  try {
    // Get ephemeral token
    const tokenRes = await fetch('/api/gemini/token');
    if (!tokenRes.ok) {
      throw new Error(`Token fetch failed: ${tokenRes.status}`);
    }
    const { token } = await tokenRes.json();
    console.log('✅ Got ephemeral token');
    
    // Create raw WebSocket connection
    const url = createWebSocketUrl(token);
    const ws = new WebSocket(url);
    
    ws.onopen = () => {
      console.log('✅ WebSocket connection opened');
      
      // Send setup message
      const systemPrompt = document.getElementById('system-prompt').value;
      const setupMessage = {
        setup: {
          model: 'models/gemini-2.0-flash-exp',
          generationConfig: {
            responseModalities: ['TEXT'],
            responseMimeType: 'application/json'
          },
          systemInstruction: {
            parts: [{
              text: systemPrompt || 'You are analyzing audio percepts.'
            }]
          }
        }
      };
      
      console.log('📤 Sending setup message');
      ws.send(JSON.stringify(setupMessage));
    };
    
    ws.onmessage = async (event) => {
      try {
        const data = event.data instanceof Blob 
          ? JSON.parse(await event.data.text())
          : JSON.parse(event.data);
        
        handleResponse(data);
      } catch (error) {
        console.error('❌ Error parsing message:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      showError('WebSocket error');
    };
    
    ws.onclose = async (event) => {
      console.log('WebSocket closed:', event.reason);
      updateState({ isConnected: false, ws: null, setupComplete: false });
      
      // If we're still listening, try to reconnect
      if (state.isListening) {
        console.log('🔄 Attempting to reconnect...');
        updateStatus('🟡 Reconnecting...');
        try {
          // Wait before reconnecting
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Check if we're still listening (user might have stopped)
          if (!state.isListening) {
            console.log('Stopped listening during reconnect, aborting');
            return;
          }
          
          await startSession();
          
          // Wait for setup to complete
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Double-check we're still listening (user might have stopped during reconnect)
          if (!state.isListening) {
            console.log('Stopped listening during reconnect, aborting');
            return;
          }
          
          if (state.ws && state.ws.readyState === WebSocket.OPEN && state.setupComplete) {
            console.log('✅ Reconnected and ready');
            updateStatus('🔴 Listening...');
          } else if (state.ws && state.ws.readyState === WebSocket.OPEN) {
            // Setup not complete yet, wait a bit more
            await new Promise(resolve => setTimeout(resolve, 1000));
            if (state.setupComplete && state.isListening) {
              console.log('✅ Reconnected and ready (delayed)');
              updateStatus('🔴 Listening...');
            } else {
              console.warn('Reconnection incomplete, will retry on next close');
            }
          } else {
            console.warn('Reconnection failed, will retry on next close');
          }
        } catch (error) {
          console.error('Reconnection failed:', error);
          updateStatus('⚫ Disconnected');
          showError('Connection lost. Please stop and restart listening.');
        }
      } else {
        updateStatus('⚫ Disconnected');
      }
    };
    
    updateState({ ws });
    
  } catch (error) {
    console.error('Failed to start session:', error);
    showError('Failed to start session: ' + error.message);
  }
}

function sendAudioPacket(base64PCM) {
  // Ensure session exists and is ready
  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) {
    console.warn('WebSocket not ready, skipping packet');
    return;
  }
  
  // Don't send if setup isn't complete yet
  if (!state.setupComplete) {
    console.log('⏳ Setup not complete, skipping packet');
    return;
  }
  
  // Validate PCM data
  if (!base64PCM || base64PCM.length === 0) {
    console.warn('Empty PCM data, skipping packet');
    return;
  }
  
  try {
    // Build message using realtimeInput format (for continuous audio streaming)
    // Reference: https://ai.google.dev/gemini-api/docs/live
    const message = {
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: "audio/pcm;rate=16000",
            data: base64PCM
          }
        ]
      }
    };
    
    const estimatedSamples = Math.floor(base64PCM.length * 0.75 / 2);
    const estimatedDuration = (estimatedSamples / 16000).toFixed(2);
    
    console.log('📤 Sending audio packet (PCM, 16kHz)');
    console.log(`   - Base64 length: ${base64PCM.length} bytes`);
    console.log(`   - Estimated samples: ~${estimatedSamples}`);
    console.log(`   - Estimated duration: ~${estimatedDuration}s`);
    
    state.ws.send(JSON.stringify(message));
    updateStatus('🔴 Listening...');
    
  } catch (error) {
    console.error('Failed to send audio packet:', error);
    showError('Failed to send audio: ' + error.message);
  }
}

function handleResponse(message) {
  // Handle streaming response from Live API
  console.log('📥 Message received:', message);
  
  // Skip setup messages
  if (message.setupComplete) {
    console.log('Setup complete, ready to stream audio');
    updateState({ isConnected: true, setupComplete: true });
    updateStatus(state.isListening ? '🔴 Listening...' : '🟢 Connected');
    return;
  }
  
  // Handle server content (responses to audio)
  if (message.serverContent) {
    const content = message.serverContent;
    
    // Extract text from response
    if (content.modelTurn && content.modelTurn.parts) {
      for (const part of content.modelTurn.parts) {
        if (part.text) {
          state.responseBuffer += part.text;
          updateResponseDisplay();
        }
      }
    }
    
    // Check if turn is complete
    if (content.turnComplete) {
      console.log('✅ Turn complete');
      updateStatus(state.isListening ? '🔴 Listening...' : '🟢 Connected');
      
      // Try to parse and display JSON
      try {
        let jsonText = state.responseBuffer.trim();
        
        // Remove markdown code fences if present
        if (jsonText.startsWith('```')) {
          jsonText = jsonText.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
        }
        
        const json = JSON.parse(jsonText);
        updateResponseDisplay(JSON.stringify(json, null, 2));
        
        // Render sigil if present
        if (json.sigilPhrase && json.sigilDrawCalls) {
          renderSigil(json.sigilPhrase, json.sigilDrawCalls);
        }
        
        // Clear buffer for next response
        state.responseBuffer = '';
      } catch (error) {
        // Display raw text if not JSON
        console.log('Response not JSON, displaying as text');
      }
    }
  }
}

// ============================================
// SECTION 4: Sigil Rendering
// ============================================

function renderSigil(phrase, drawCalls) {
  try {
    console.log('🎨 Rendering sigil:', phrase);
    
    // Validate inputs
    if (!drawCalls || typeof drawCalls !== 'string') {
      throw new Error(`Invalid drawCalls: expected string, got ${typeof drawCalls}`);
    }
    
    // Fix orphaned lines: Ensure moveTo before arc() calls
    // This prevents unwanted connecting lines to arc starting points
    const fixedDrawCalls = drawCalls.replace(
      /ctx\.arc\(/g,
      (match, offset) => {
        // Look back to see if there's a moveTo before this arc
        const before = drawCalls.substring(Math.max(0, offset - 50), offset);
        const hasRecentMoveTo = /moveTo\([^)]+\)\s*$/.test(before.trim());
        
        // If no recent moveTo, we need to get the arc's center coords and add a moveTo
        // This is a bit hacky but prevents connecting lines
        return hasRecentMoveTo ? match : `ctx.moveTo(arguments[0], arguments[1]);${match}`;
      }
    );
    
    // Update phrase display
    const phraseElement = document.getElementById('sigil-phrase');
    if (phraseElement) {
      phraseElement.textContent = phrase;
    }
    
    // Note: drawSigil expects an object with a 'calls' property
    if (state.sigil) {
      state.sigil.drawSigil({ calls: fixedDrawCalls });
    }
  } catch (error) {
    console.error('Failed to render sigil:', error);
    showError('Failed to render sigil: ' + error.message);
  }
}

// ============================================
// SECTION 5: UI Updates
// ============================================

function updateUI() {
  // Update connection status
  if (!state.isListening) {
    updateStatus(state.isConnected ? '🟢 Connected' : '⚫ Disconnected');
  }
  
  // Update toggle button
  const toggleBtn = document.getElementById('toggle-btn');
  if (toggleBtn) {
    if (state.isListening) {
      toggleBtn.textContent = '⏹ STOP LISTENING';
      toggleBtn.className = 'btn-danger';
    } else {
      toggleBtn.textContent = '🎤 START LISTENING';
      toggleBtn.className = 'btn-primary';
    }
  }
  
  // Update activate button state
  const activateBtn = document.getElementById('activate-btn');
  const promptSelect = document.getElementById('prompt-select');
  
  if (activateBtn) {
    if (state.currentPromptId === null) {
      activateBtn.disabled = true;
    } else {
      const current = state.prompts.find(p => p.id === state.currentPromptId);
      activateBtn.disabled = current ? current.active : true;
    }
  }
}

function updateStatus(text) {
  const statusEl = document.getElementById('status');
  if (statusEl) {
    statusEl.textContent = text;
    statusEl.className = 'status ' + (
      text.includes('🟢') ? 'status-connected' :
      text.includes('🟡') ? 'status-processing' :
      text.includes('🔴') ? 'status-processing' :
      'status-disconnected'
    );
  }
}

function updateResponseDisplay(formattedText = null) {
  const responseEl = document.getElementById('response-text');
  if (responseEl) {
    responseEl.textContent = formattedText || state.responseBuffer;
    // Auto-scroll to bottom
    responseEl.scrollTop = responseEl.scrollHeight;
  }
}

function showError(message) {
  const errorEl = document.getElementById('error');
  if (errorEl) {
    errorEl.textContent = '❌ ' + message;
    errorEl.classList.remove('hidden');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      errorEl.classList.add('hidden');
    }, 5000);
  }
}

function showSuccess(message) {
  const successEl = document.getElementById('success');
  if (successEl) {
    successEl.textContent = message;
    successEl.classList.remove('hidden');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      successEl.classList.add('hidden');
    }, 5000);
  }
}

// Character counters
function updateCharCount(textareaId, counterId) {
  const textarea = document.getElementById(textareaId);
  const counter = document.getElementById(counterId);
  if (textarea && counter) {
    counter.textContent = `${textarea.value.length} chars`;
  }
}

// Update slug from name
function updateSlug() {
  const nameInput = document.getElementById('name');
  const slugInput = document.getElementById('slug');
  
  if (nameInput && slugInput) {
    // Only auto-update if we're creating new or slug is empty
    if (state.currentPromptId === null || !slugInput.value) {
      const slug = nameInput.value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      slugInput.value = slug;
    }
  }
}

// ============================================
// SECTION 6: Prompt Management
// ============================================

async function loadPrompts() {
  try {
    const res = await fetch('/api/audio-prompts');
    if (res.ok) {
      const data = await res.json();
      state.prompts = data.prompts;
      
      const select = document.getElementById('prompt-select');
      if (!select) return;
      
      const currentVal = select.value;
      
      // Clear and rebuild
      select.innerHTML = '<option value="new">+ New Prompt</option>';
      
      state.prompts.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.name} ${p.active ? '⭐' : ''}`;
        select.appendChild(opt);
      });
      
      // Restore selection if still exists
      if (currentVal !== 'new' && state.prompts.find(p => p.id === currentVal)) {
        select.value = currentVal;
      }
    }
  } catch (error) {
    console.error('Failed to load prompts:', error);
  }
}

function loadDefaultPrompts() {
  const systemPromptEl = document.getElementById('system-prompt');
  const userPromptEl = document.getElementById('user-prompt');
  
  if (systemPromptEl) {
    systemPromptEl.value = `You are analyzing audio percepts from a microphone for UNI, an AI experiencing the world through sensors.

TASK: Analyze the audio and create a structured percept.

Listen for:
- Speech content (transcripts)
- Environmental sounds
- Tone, emotion, sentiment
- Background noise patterns
- Silence vs. activity

Always respond with valid JSON in this exact format:
{
  "transcript": "exact words spoken, or null if no speech",
  "analysis": "description of what you hear",
  "tone": "emotional tone detected",
  "emoji": "relevant emoji",
  "sentiment": "positive|negative|neutral|curious|emotional",
  "confidence": 0.0-1.0
}`;
  }
  
  if (userPromptEl) {
    userPromptEl.value = 'Analyze this audio chunk and return the JSON percept.';
  }
  
  updateCharCount('system-prompt', 'system-char-count');
  updateCharCount('user-prompt', 'user-char-count');
}

// ============================================
// SECTION 7: Event Handlers
// ============================================

// Toggle listening button
document.getElementById('toggle-btn').addEventListener('click', async () => {
  try {
    if (!state.isListening) {
      // Starting listening
      // Initialize microphone if needed
      if (!state.stream) {
        await initMicrophone();
      }
      
      // Start session if needed
      if (!state.ws || state.ws.readyState !== WebSocket.OPEN) {
        await startSession();
        // Wait for setup
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      startListening();
    } else {
      // Stopping listening
      stopListening();
    }
  } catch (error) {
    showError('Failed to toggle listening: ' + error.message);
  }
});

// Prompt select change
document.getElementById('prompt-select').addEventListener('change', async (e) => {
  const id = e.target.value;
  
  // Save last selected ID
  localStorage.setItem('audio_prompt_editor_last', id);
  
  if (id === 'new') {
    // Reset to empty form
    updateState({ currentPromptId: null, currentPromptSlug: null });
    document.getElementById('name').value = '';
    document.getElementById('slug').value = '';
    document.getElementById('system-prompt').value = '';
    document.getElementById('user-prompt').value = '';
    loadDefaultPrompts();
  } else {
    // Load from API
    try {
      const res = await fetch(`/api/audio-prompts/${id}`);
      if (!res.ok) throw new Error('Failed to load prompt');
      const { prompt } = await res.json();
      
      updateState({ currentPromptId: prompt.id, currentPromptSlug: prompt.slug });
      
      document.getElementById('name').value = prompt.name;
      document.getElementById('slug').value = prompt.slug;
      document.getElementById('system-prompt').value = prompt.system_prompt;
      document.getElementById('user-prompt').value = prompt.user_prompt;
      
      // Re-initialize WebSocket with new system prompt
      if (state.ws) {
        state.ws.close();
        updateState({ ws: null, isConnected: false });
      }
      
    } catch (error) {
      showError(error.message);
    }
  }
  
  updateCharCount('system-prompt', 'system-char-count');
  updateCharCount('user-prompt', 'user-char-count');
  updateUI();
});

// Save button
document.getElementById('save-btn').addEventListener('click', async () => {
  const name = document.getElementById('name').value.trim();
  const slug = document.getElementById('slug').value.trim();
  const systemPrompt = document.getElementById('system-prompt').value.trim();
  const userPrompt = document.getElementById('user-prompt').value.trim();
  
  if (!name || !slug || !systemPrompt || !userPrompt) {
    showError('All fields are required');
    return;
  }
  
  const btn = document.getElementById('save-btn');
  btn.textContent = 'Saving...';
  btn.disabled = true;
  
  try {
    const res = await fetch('/api/audio-prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: state.currentPromptId,
        name,
        slug,
        systemPrompt,
        userPrompt
      })
    });
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Save failed');
    }
    
    const { prompt } = await res.json();
    updateState({ currentPromptId: prompt.id, currentPromptSlug: prompt.slug });
    
    // Refresh list
    await loadPrompts();
    
    // Select the saved prompt
    document.getElementById('prompt-select').value = prompt.id;
    localStorage.setItem('audio_prompt_editor_last', prompt.id);
    
    showSuccess('✅ Saved successfully');
    
  } catch (error) {
    showError(error.message);
  } finally {
    btn.textContent = '💾 Save';
    btn.disabled = false;
  }
});

// Activate button
document.getElementById('activate-btn').addEventListener('click', async () => {
  if (!state.currentPromptId) return;
  
  if (!confirm('Set this as the active prompt for the system?')) return;
  
  const btn = document.getElementById('activate-btn');
  btn.textContent = 'Activating...';
  btn.disabled = true;
  
  try {
    const res = await fetch(`/api/audio-prompts/${state.currentPromptId}/activate`, {
      method: 'POST'
    });
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Activation failed');
    }
    
    await loadPrompts();
    showSuccess('✅ Prompt activated!');
    
  } catch (error) {
    showError(error.message);
  } finally {
    btn.textContent = '✓ Set Active';
    updateUI();
  }
});

// Delete button
document.getElementById('delete-btn').addEventListener('click', async () => {
  if (!state.currentPromptId) return;
  
  if (!confirm('Are you sure you want to delete this prompt?')) return;
  
  try {
    const res = await fetch(`/api/audio-prompts/${state.currentPromptId}`, {
      method: 'DELETE'
    });
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Delete failed');
    }
    
    // Reset to new
    document.getElementById('prompt-select').value = 'new';
    document.getElementById('prompt-select').dispatchEvent(new Event('change'));
    
    await loadPrompts();
    showSuccess('✅ Prompt deleted');
    
  } catch (error) {
    showError(error.message);
  }
});

// Character counters
document.getElementById('system-prompt').addEventListener('input', () => {
  updateCharCount('system-prompt', 'system-char-count');
});

document.getElementById('user-prompt').addEventListener('input', () => {
  updateCharCount('user-prompt', 'user-char-count');
});

// Name input - auto slug
document.getElementById('name').addEventListener('input', updateSlug);

// ============================================
// SECTION 8: Initialization
// ============================================

async function init() {
  console.log('🚀 Initializing Audio Percept Prompt Editor');
  
  // Initialize sigil
  state.sigil = new Sigil({
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
  
  // Start with "awaiting sigil..." message
  const phraseElement = document.getElementById('sigil-phrase');
  phraseElement.textContent = 'awaiting sigil...';
  state.sigil.thinkingVaried();
  
  // Load prompts from DB
  await loadPrompts();
  
  // Auto-load logic
  const lastId = localStorage.getItem('audio_prompt_editor_last');
  
  if (lastId && lastId !== 'new') {
    // Try to load last used
    const select = document.getElementById('prompt-select');
    select.value = lastId;
    select.dispatchEvent(new Event('change'));
  } else {
    // Try to find active
    try {
      const res = await fetch('/api/audio-prompts/active');
      if (res.ok) {
        const { prompt } = await res.json();
        const select = document.getElementById('prompt-select');
        select.value = prompt.id;
        select.dispatchEvent(new Event('change'));
      } else {
        // Fallback to default
        loadDefaultPrompts();
      }
    } catch (e) {
      loadDefaultPrompts();
    }
  }
  
  // Update UI
  updateUI();
  
  console.log('✅ Editor ready');
}

// Start application
init().catch(error => {
  console.error('Initialization failed:', error);
  showError('Failed to initialize: ' + error.message);
});

