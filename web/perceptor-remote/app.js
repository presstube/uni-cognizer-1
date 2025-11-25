// ============================================
// Perceptor Remote - Minimal Immersive UI
// ============================================

import { PerceptToast, injectPerceptToastStyles } from '../shared/percept-toast.js';
import { Sigil } from '../shared/sigil.standalone.js';

// Inject toast styles on load
injectPerceptToastStyles();

// ============================================
// SECTION 1: State Management
// ============================================

const state = {
  // Hardware
  videoStream: null,
  audioStream: null,
  audioContext: null,
  audioProcessor: null,
  audioSource: null,
  videoElement: null,
  
  // Gemini Live - AUDIO WebSocket
  audioWs: null,
  audioConnected: false,
  audioSetupComplete: false,
  audioResponseBuffer: '',
  
  // Gemini Live - VISUAL WebSocket
  visualWs: null,
  visualConnected: false,
  visualSetupComplete: false,
  visualResponseBuffer: '',
  
  // Prompts
  audioPrompt: null,
  visualPrompt: null,
  
  // Streaming
  pcmBuffer: [],
  audioInterval: null,
  visualInterval: null,
  isStreaming: false,
  
  // Audio amplitude tracking
  currentAmplitude: 0,
  audioOverlay: null,
  
  // Sigil carousel
  sigilDrawCallsHistory: [],
  sigilCarousel: null,
  sigilCarouselCanvas: null,
  sigilCarouselIndex: 0,
  sigilCarouselInterval: null,
  
  // API Key management
  apiKey: null,
  useHouseKey: false
};

// ============================================
// SECTION 2: Initialization
// ============================================

// API Key Management
function loadApiKey() {
  const stored = localStorage.getItem('geminiApiKey');
  const input = document.getElementById('api-key-input');
  
  if (stored) {
    input.value = stored;
    state.apiKey = stored;
    state.useHouseKey = stored === 'onthehouse';
    
    // Bold console logging
    if (state.useHouseKey) {
      console.log('%c🏠 RUNNING ON THE HOUSE 🏠', 'font-weight: bold; font-size: 14px; color: #00ff00; background: #000; padding: 4px 8px;');
    } else {
      console.log('%c🔑 RUNNING WITH USER KEY 🔑', 'font-weight: bold; font-size: 14px; color: #00d4ff; background: #000; padding: 4px 8px;');
    }
  } else {
    // No default - leave empty
    state.apiKey = null;
    state.useHouseKey = false;
  }
}

function saveApiKey() {
  const input = document.getElementById('api-key-input');
  const value = input.value.trim();
  
  if (value) {
    localStorage.setItem('geminiApiKey', value);
    state.apiKey = value;
    state.useHouseKey = value === 'onthehouse';
    
    // Bold console logging
    if (state.useHouseKey) {
      console.log('%c💾 Saved: ON THE HOUSE', 'font-weight: bold; font-size: 12px; color: #00ff00;');
    } else {
      console.log('%c💾 Saved: USER KEY', 'font-weight: bold; font-size: 12px; color: #00d4ff;');
    }
  }
}

function setupApiKeyInput() {
  const input = document.getElementById('api-key-input');
  
  // Save on blur
  input.addEventListener('blur', saveApiKey);
  
  // Save on Enter
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      saveApiKey();
      input.blur();
    }
  });
  
  // Disable input while streaming
  input.addEventListener('focus', () => {
    if (state.isStreaming) {
      input.blur();
      console.warn('⚠️ Cannot change API key while streaming');
    }
  });
}

async function init() {
  try {
    console.log('🚀 Initializing Perceptor Remote...');
    
    // 0. Load API key from localStorage
    loadApiKey();
    setupApiKeyInput();
    
    // 1. Load active prompts from DB
    const [audioRes, visualRes] = await Promise.all([
      fetch('/api/audio-prompts/active'),
      fetch('/api/visual-prompts/active')
    ]);
    
    if (!audioRes.ok || !visualRes.ok) {
      throw new Error('Failed to load prompts from database');
    }
    
    state.audioPrompt = await audioRes.json();
    state.visualPrompt = await visualRes.json();
    
    console.log('📋 Loaded prompts:', {
      audio: state.audioPrompt.prompt.name,
      visual: state.visualPrompt.prompt.name
    });
    
    // 2. Initialize webcam
    state.videoStream = await navigator.mediaDevices.getUserMedia({
      video: { 
        width: { ideal: 1920 }, 
        height: { ideal: 1080 },
        facingMode: 'user'
      }
    });
    
    state.videoElement = document.getElementById('webcam');
    state.videoElement.srcObject = state.videoStream;
    
    // Wait for video to be ready
    await new Promise((resolve) => {
      state.videoElement.onloadedmetadata = () => {
        state.videoElement.play().then(resolve);
      };
    });
    
    console.log('✅ Webcam initialized');
    
    // 3. Initialize microphone (16kHz for Gemini Live API)
    const audioSampleRate = 16000;
    const bufferSize = state.audioPrompt.prompt.sample_rate || 4096;
    
    state.audioStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: audioSampleRate
      }
    });
    
    // 4. Setup audio processing (PCM conversion)
    await initAudioProcessing(state.audioStream, audioSampleRate, bufferSize);
    
    // 5. Get reference to audio overlay
    state.audioOverlay = document.getElementById('audio-overlay');
    
    // 6. Initialize sigil carousel
    initSigilCarousel();
    
    console.log('✅ Microphone initialized');
    console.log('✅ Ready to start');
    
  } catch (error) {
    console.error('❌ Initialization failed:', error);
    alert('Failed to initialize: ' + error.message);
  }
}

// ============================================
// SECTION 3: Audio Processing
// ============================================

// Initialize sigil carousel
function initSigilCarousel() {
  state.sigilCarouselCanvas = document.getElementById('sigil-carousel-canvas');
  
  if (state.sigilCarouselCanvas) {
    state.sigilCarousel = new Sigil({
      canvas: state.sigilCarouselCanvas,
      canvasSize: 100,
      scale: 1.0,
      sigilAlphaCoordSize: 100,
      lineColor: '#ffffff',
      lineWeight: 2.0, // Fatter lines
      drawDuration: 0, // Animate transitions between sigils
      undrawDuration: 0 // Quick undraw before next sigil
    });
    
    console.log('✅ Sigil carousel initialized');
  }
}

// Add sigil to history and start carousel if needed
function addSigilToCarousel(drawCalls) {
  if (!drawCalls) return;
  
  state.sigilDrawCallsHistory.push(drawCalls);
  console.log(`📦 Sigil added to carousel (${state.sigilDrawCallsHistory.length} total)`);
  
  // Start carousel if not already running
  if (!state.sigilCarouselInterval && state.sigilDrawCallsHistory.length > 0) {
    startSigilCarousel();
  }
}

// Start cycling through sigils
function startSigilCarousel() {
  if (state.sigilCarouselInterval) return;
  
  // Draw first sigil immediately
  drawCurrentSigil();
  
  // Cycle every 100ms
  state.sigilCarouselInterval = setInterval(() => {
    if (state.sigilDrawCallsHistory.length === 0) {
      stopSigilCarousel();
      return;
    }
    
    state.sigilCarouselIndex = (state.sigilCarouselIndex + 1) % state.sigilDrawCallsHistory.length;
    drawCurrentSigil();
  }, 100);
  
  console.log('🔄 Sigil carousel started');
}

// Stop carousel
function stopSigilCarousel() {
  if (state.sigilCarouselInterval) {
    clearInterval(state.sigilCarouselInterval);
    state.sigilCarouselInterval = null;
    console.log('⏸️ Sigil carousel stopped');
  }
}

// Draw the current sigil in carousel
function drawCurrentSigil() {
  if (!state.sigilCarousel || state.sigilDrawCallsHistory.length === 0) return;
  
    const calls = state.sigilDrawCallsHistory[state.sigilCarouselIndex];
//   console.log(`🎨 Drawing sigil ${state.sigilCarouselIndex + 1}/${state.sigilDrawCallsHistory.length}:`, drawCalls);
  state.sigilCarousel.drawSigil({ calls });
}

// Update audio overlay opacity based on amplitude
function updateAudioOverlay(amplitude) {
  if (state.audioOverlay) {
    state.currentAmplitude = amplitude;
    state.audioOverlay.style.opacity = amplitude;
  }
}

async function initAudioProcessing(stream, audioSampleRate, bufferSize) {
  try {
    // Create AudioContext with 16kHz (required by Gemini Live API)
    state.audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: audioSampleRate
    });
    
    // Create source and processor
    const source = state.audioContext.createMediaStreamSource(stream);
    const processor = state.audioContext.createScriptProcessor(bufferSize, 1, 1);
    
    // Convert float32 to int16 PCM and track amplitude
    processor.onaudioprocess = (event) => {
      const inputBuffer = event.inputBuffer.getChannelData(0);
      
      // Calculate RMS amplitude for this buffer (always runs)
      let sumSquares = 0;
      for (let i = 0; i < inputBuffer.length; i++) {
        const s = Math.max(-1, Math.min(1, inputBuffer[i]));
        sumSquares += s * s;
      }
      
      // Normalize amplitude to 0.0-1.0 range
      const rms = Math.sqrt(sumSquares / inputBuffer.length);
      const normalizedAmplitude = Math.min(1.0, rms * 3); // Multiply by 3 for more sensitivity
      
      // Update overlay opacity (always runs)
      updateAudioOverlay(normalizedAmplitude);
      
      // Only buffer PCM data when streaming to Gemini
      if (state.isStreaming) {
        const pcmData = new Int16Array(inputBuffer.length);
        for (let i = 0; i < inputBuffer.length; i++) {
          const s = Math.max(-1, Math.min(1, inputBuffer[i]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        state.pcmBuffer.push(...pcmData);
      }
    };
    
    source.connect(processor);
    processor.connect(state.audioContext.destination);
    
    state.audioSource = source;
    state.audioProcessor = processor;
    
    console.log(`✅ Audio processing initialized (${audioSampleRate}Hz, buffer: ${bufferSize})`);
    
  } catch (error) {
    console.error('❌ Failed to initialize audio processing:', error);
    throw error;
  }
}

// ============================================
// SECTION 4: Gemini Live Connections (Dual WebSockets)
// ============================================

function createWebSocketUrl(token) {
  const isEphemeral = token.startsWith('auth_tokens/');
  const endpoint = isEphemeral ? 'BidiGenerateContentConstrained' : 'BidiGenerateContent';
  const param = isEphemeral ? 'access_token' : 'key';
  return `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.${endpoint}?${param}=${token}`;
}

async function startAudioSession() {
  try {
    console.log('🔌 Connecting to Gemini Live API (Audio)...');
    
    if (!state.apiKey) {
      throw new Error('No API key provided. Enter a Gemini API key or "onthehouse"');
    }
    
    let token;
    
    if (state.useHouseKey) {
      // Use ephemeral token endpoint
      console.log('🏠 Using house key for audio...');
      const tokenRes = await fetch('/api/gemini/token');
      if (!tokenRes.ok) throw new Error(`Token fetch failed: ${tokenRes.status}`);
      const data = await tokenRes.json();
      token = data.token;
    } else {
      // Use user's API key directly
      console.log('🔑 Using user key for audio...');
      token = state.apiKey;
    }
    
    const url = createWebSocketUrl(token);
    state.audioWs = new WebSocket(url);
    
    state.audioWs.onopen = () => {
      console.log('✅ Audio WebSocket connected');
      
      const setupMessage = {
        setup: {
          model: 'models/gemini-2.0-flash-exp',
          generationConfig: {
            responseModalities: ['TEXT'],
            responseMimeType: 'application/json',
            temperature: state.audioPrompt.prompt.temperature,
            topP: state.audioPrompt.prompt.top_p,
            topK: state.audioPrompt.prompt.top_k,
            maxOutputTokens: state.audioPrompt.prompt.max_output_tokens
          },
          systemInstruction: {
            parts: [{ text: state.audioPrompt.prompt.system_prompt }]
          }
        }
      };
      
      state.audioWs.send(JSON.stringify(setupMessage));
    };
    
    state.audioWs.onmessage = async (event) => {
      try {
        const data = event.data instanceof Blob 
          ? JSON.parse(await event.data.text())
          : JSON.parse(event.data);
        
        handleAudioResponse(data);
      } catch (error) {
        console.error('❌ Error parsing audio message:', error);
      }
    };
    
    state.audioWs.onerror = (error) => {
      console.error('❌ Audio WebSocket error:', error);
    };
    
    state.audioWs.onclose = () => {
      console.log('⚫ Audio WebSocket closed');
      state.audioConnected = false;
      state.audioSetupComplete = false;
    };
    
  } catch (error) {
    console.error('❌ Failed to start audio session:', error);
    throw error;
  }
}

async function startVisualSession() {
  try {
    console.log('🔌 Connecting to Gemini Live API (Visual)...');
    
    if (!state.apiKey) {
      throw new Error('No API key provided. Enter a Gemini API key or "onthehouse"');
    }
    
    let token;
    
    if (state.useHouseKey) {
      // Use ephemeral token endpoint
      console.log('🏠 Using house key for visual...');
      const tokenRes = await fetch('/api/gemini/token');
      if (!tokenRes.ok) throw new Error(`Token fetch failed: ${tokenRes.status}`);
      const data = await tokenRes.json();
      token = data.token;
    } else {
      // Use user's API key directly
      console.log('🔑 Using user key for visual...');
      token = state.apiKey;
    }
    
    const url = createWebSocketUrl(token);
    state.visualWs = new WebSocket(url);
    
    state.visualWs.onopen = () => {
      console.log('✅ Visual WebSocket connected');
      
      const setupMessage = {
        setup: {
          model: 'models/gemini-2.0-flash-exp',
          generationConfig: {
            responseModalities: ['TEXT'],
            responseMimeType: 'application/json',
            temperature: state.visualPrompt.prompt.temperature,
            topP: state.visualPrompt.prompt.top_p,
            topK: state.visualPrompt.prompt.top_k,
            maxOutputTokens: state.visualPrompt.prompt.max_output_tokens
          },
          systemInstruction: {
            parts: [{ text: state.visualPrompt.prompt.system_prompt }]
          }
        }
      };
      
      state.visualWs.send(JSON.stringify(setupMessage));
    };
    
    state.visualWs.onmessage = async (event) => {
      try {
        const data = event.data instanceof Blob 
          ? JSON.parse(await event.data.text())
          : JSON.parse(event.data);
        
        handleVisualResponse(data);
      } catch (error) {
        console.error('❌ Error parsing visual message:', error);
      }
    };
    
    state.visualWs.onerror = (error) => {
      console.error('❌ Visual WebSocket error:', error);
    };
    
    state.visualWs.onclose = () => {
      console.log('⚫ Visual WebSocket closed');
      state.visualConnected = false;
      state.visualSetupComplete = false;
    };
    
  } catch (error) {
    console.error('❌ Failed to start visual session:', error);
    throw error;
  }
}

// ============================================
// SECTION 5: Response Handling (Dual Handlers)
// ============================================

function handleAudioResponse(message) {
  if (message.setupComplete) {
    console.log('✅ Audio setup complete');
    state.audioConnected = true;
    state.audioSetupComplete = true;
    return;
  }
  
  if (message.serverContent) {
    const content = message.serverContent;
    
    if (content.modelTurn?.parts) {
      for (const part of content.modelTurn.parts) {
        if (part.text) {
          state.audioResponseBuffer += part.text;
        }
      }
    }
    
    if (content.turnComplete) {
      try {
        let jsonText = state.audioResponseBuffer.trim();
        if (jsonText.startsWith('```')) {
          jsonText = jsonText.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
        }
        
        const json = JSON.parse(jsonText);
        
        // Filter silence
        if (json.action && json.action.toLowerCase().includes('silence')) {
          console.log('🔇 Filtered silence');
        } else {
          console.log('🎤 Audio Percept:', json);
          createPerceptToast(json, 'audio');
          
          // Add sigil to carousel
          const drawCalls = json.sigilDrawCalls || json.drawCalls;
          if (drawCalls) {
            addSigilToCarousel(drawCalls);
          }
        }
        
      } catch (error) {
        // Silently skip parse errors - they're rare and non-critical
        // The next valid percept will work fine
      }
      
      // Always clear buffer on turnComplete
      state.audioResponseBuffer = '';
    }
  }
}

function handleVisualResponse(message) {
  if (message.setupComplete) {
    console.log('✅ Visual setup complete');
    state.visualConnected = true;
    state.visualSetupComplete = true;
    return;
  }
  
  if (message.serverContent) {
    const content = message.serverContent;
    
    if (content.modelTurn?.parts) {
      for (const part of content.modelTurn.parts) {
        if (part.text) {
          state.visualResponseBuffer += part.text;
        }
      }
    }
    
    if (content.turnComplete) {
      try {
        let jsonText = state.visualResponseBuffer.trim();
        if (jsonText.startsWith('```')) {
          jsonText = jsonText.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
        }
        
        const json = JSON.parse(jsonText);
        
        console.log('👁️ Visual Percept:', json);
        createPerceptToast(json, 'visual');
        
        // Add sigil to carousel
        const drawCalls = json.drawCalls || json.sigilDrawCalls;
        if (drawCalls) {
          addSigilToCarousel(drawCalls);
        }
        
      } catch (error) {
        // Silently skip parse errors - they're rare and non-critical
        // The next valid percept will work fine
      }
      
      // Always clear buffer on turnComplete
      state.visualResponseBuffer = '';
    }
  }
}

// ============================================
// SECTION 6: Toast Creation
// ============================================

function createPerceptToast(percept, type) {
  const container = document.getElementById('toast-container');
  const toast = new PerceptToast(percept, type);
  const element = toast.create();
  
  // Prepend (new toasts push down old ones)
  container.prepend(element);
}

// ============================================
// SECTION 7: Streaming Functions (Dual Channels)
// ============================================

function startAudioStreaming() {
  const interval = state.audioPrompt.prompt.packet_interval || 500;
  const audioSampleRate = 16000;
  
  console.log(`🎤 Starting audio streaming (${interval}ms intervals)`);
  
  state.audioInterval = setInterval(() => {
    const MIN_SAMPLES = Math.floor(audioSampleRate * 0.5);
    const MAX_SAMPLES = Math.floor(audioSampleRate * 2.0);
    
    if (state.pcmBuffer.length >= MIN_SAMPLES && state.audioSetupComplete) {
      const chunk = state.pcmBuffer.slice(0, MAX_SAMPLES);
      state.pcmBuffer = state.pcmBuffer.slice(chunk.length);
      
      const pcmArray = new Int16Array(chunk);
      const arrayBuffer = new ArrayBuffer(pcmArray.length * 2);
      const dataView = new DataView(arrayBuffer);
      
      for (let i = 0; i < pcmArray.length; i++) {
        dataView.setInt16(i * 2, pcmArray[i], true);
      }
      
      const uint8Array = new Uint8Array(arrayBuffer);
      const base64 = btoa(String.fromCharCode.apply(null, Array.from(uint8Array)));
      
      if (state.audioWs && state.audioWs.readyState === WebSocket.OPEN) {
        state.audioWs.send(JSON.stringify({
          realtimeInput: {
            mediaChunks: [{
              mimeType: `audio/pcm;rate=${audioSampleRate}`,
              data: base64
            }]
          }
        }));
      }
    }
  }, interval);
}

function startVisualStreaming() {
  const interval = 4000;
  
  console.log('👁️ Starting visual streaming (4000ms intervals)');
  
  state.visualInterval = setInterval(async () => {
    if (!state.visualSetupComplete) return;
    
    // Flash to color with brightness boost (like camera flash)
    state.videoElement.classList.add('flash-color');
    
    // Hold for 100ms
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const canvas = document.createElement('canvas');
    canvas.width = state.videoElement.videoWidth;
    canvas.height = state.videoElement.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(state.videoElement, 0, 0);
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    const base64Frame = dataUrl.split(',')[1];
    
    // Remove flash - will fade back to grayscale (300ms transition)
    state.videoElement.classList.remove('flash-color');
    
    if (state.visualWs && state.visualWs.readyState === WebSocket.OPEN) {
      state.visualWs.send(JSON.stringify({
        clientContent: {
          turns: [{
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: base64Frame
                }
              },
              {
                text: state.visualPrompt.prompt.user_prompt
              }
            ]
          }],
          turnComplete: true
        }
      }));
      
      console.log('📸 Frame captured (with camera flash)');
    }
  }, interval);
}

// ============================================
// SECTION 8: Control Functions (Dual WebSocket)
// ============================================

async function start() {
  if (state.isStreaming) return;
  
  try {
    console.log('▶️ Starting dual-WebSocket mode...');
    
    // Disable input while streaming
    document.getElementById('api-key-input').disabled = true;
    
    await Promise.all([
      startAudioSession(),
      startVisualSession()
    ]);
    
    await waitForSetup();
    
    state.isStreaming = true;
    startAudioStreaming();
    startVisualStreaming();
    
    updateUI();
    console.log('✅ Both channels streaming');
    
  } catch (error) {
    console.error('❌ Failed to start:', error);
    stop();
  }
}

function stop() {
  if (!state.isStreaming) return;
  
  console.log('⏹️ Stopping both channels...');
  
  state.isStreaming = false;
  
  if (state.audioInterval) {
    clearInterval(state.audioInterval);
    state.audioInterval = null;
  }
  if (state.visualInterval) {
    clearInterval(state.visualInterval);
    state.visualInterval = null;
  }
  
  if (state.audioWs) {
    state.audioWs.close();
    state.audioWs = null;
  }
  if (state.visualWs) {
    state.visualWs.close();
    state.visualWs = null;
  }
  
  state.pcmBuffer = [];
  state.audioConnected = false;
  state.audioSetupComplete = false;
  state.visualConnected = false;
  state.visualSetupComplete = false;
  
  // Re-enable input
  document.getElementById('api-key-input').disabled = false;
  
  updateUI();
  console.log('⏹️ Stopped');
}

function waitForSetup() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      const missing = [];
      if (!state.audioSetupComplete) missing.push('audio');
      if (!state.visualSetupComplete) missing.push('visual');
      reject(new Error(`Setup timeout (missing: ${missing.join(', ')})`));
    }, 10000);
    
    const checkSetup = setInterval(() => {
      if (state.audioSetupComplete && state.visualSetupComplete) {
        clearInterval(checkSetup);
        clearTimeout(timeout);
        resolve();
      }
    }, 100);
  });
}

// ============================================
// SECTION 9: UI Updates
// ============================================

function updateUI() {
  const btn = document.getElementById('toggle-btn');
  
  if (state.isStreaming) {
    btn.textContent = 'STOP';
    btn.classList.add('active');
  } else {
    btn.textContent = 'START';
    btn.classList.remove('active');
  }
}

function toggleStreaming() {
  if (state.isStreaming) {
    stop();
  } else {
    start();
  }
}

// ============================================
// SECTION 10: Event Listeners
// ============================================

document.getElementById('toggle-btn').addEventListener('click', toggleStreaming);

// ============================================
// SECTION 11: Initialize on Load
// ============================================

init().catch(error => {
  console.error('❌ Initialization failed:', error);
});
