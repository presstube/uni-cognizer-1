import { SigilAndPhrase } from '../../shared/sigil-and-phrase.js';

// ============================================
// State Management (functional with closure)
// ============================================

let state = {
  ws: null,
  stream: null,
  audioContext: null,
  audioSource: null,
  audioProcessor: null,
  sendInterval: null,
  isListening: false,
  setupComplete: false,
  pcmBuffer: [],
  responseBuffer: '',
  systemPrompt: '',
  sigil: null,
  packetInterval: 500,
  currentAmplitude: 0,
  smoothedAmplitude: 0,
  rafId: null
};

// ============================================
// Audio Capture (copied from audio-percept/editor.js)
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
    
    state = { ...state, stream };
    console.log('✅ Microphone initialized');
    
    return stream;
  } catch (error) {
    console.error('Microphone error:', error);
    throw error;
  }
}

async function initAudioProcessing(stream) {
  try {
    let audioContext = state.audioContext;
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000
      });
    } else {
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
    }
    
    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(512, 1, 1);
    
    processor.onaudioprocess = (event) => {
      if (!state.isListening) return;
      
      const inputBuffer = event.inputBuffer.getChannelData(0);
      
      // Calculate amplitude (RMS - Root Mean Square)
      let sum = 0;
      for (let i = 0; i < inputBuffer.length; i++) {
        sum += inputBuffer[i] * inputBuffer[i];
      }
      const rms = Math.sqrt(sum / inputBuffer.length);
      
      // Normalize to 0.0 - 1.0 range
      // Typical loud speech RMS is around 0.05-0.1, so we boost by 10x
      const normalizedAmplitude = Math.min(1.0, rms * 10.0);
      state.currentAmplitude = normalizedAmplitude;
      
      // Note: Visual update handled by RAF loop, not here
      
      // Convert to PCM for sending
      const pcmData = new Int16Array(inputBuffer.length);
      for (let i = 0; i < inputBuffer.length; i++) {
        const s = Math.max(-1, Math.min(1, inputBuffer[i]));
        pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      
      state.pcmBuffer.push(...pcmData);
    };
    
    source.connect(processor);
    processor.connect(audioContext.destination);
    
    state = { ...state, audioContext, audioSource: source, audioProcessor: processor };
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
    throw new Error('Microphone not initialized');
  }
  
  try {
    if (!state.audioContext) {
      await initAudioProcessing(state.stream);
    } else {
      if (state.audioContext.state === 'suspended') {
        await state.audioContext.resume();
      }
      await initAudioProcessing(state.stream);
    }
    
    state.pcmBuffer = [];
    state = { ...state, isListening: true };
    
    // Start smooth glow animation loop
    startGlowAnimation();
    
    state.sendInterval = setInterval(() => {
      const MIN_SAMPLES = 4000;  // 0.25 seconds @ 16kHz (faster responses)
      
      if (state.pcmBuffer.length >= MIN_SAMPLES && state.setupComplete) {
        const samplesToSend = Math.min(state.pcmBuffer.length, 32000);
        const pcmChunk = state.pcmBuffer.slice(0, samplesToSend);
        
        const pcmBuffer = new Int16Array(pcmChunk);
        const arrayBuffer = new ArrayBuffer(pcmBuffer.length * 2);
        const dataView = new DataView(arrayBuffer);
        
        for (let i = 0; i < pcmBuffer.length; i++) {
          dataView.setInt16(i * 2, pcmBuffer[i], true);
        }
        
        const uint8Array = new Uint8Array(arrayBuffer);
        const base64PCM = btoa(String.fromCharCode.apply(null, Array.from(uint8Array)));
        
        sendAudioPacket(base64PCM);
        state.pcmBuffer = state.pcmBuffer.slice(samplesToSend);
        return;
      }
      
      if (state.pcmBuffer.length > 0 && state.pcmBuffer.length < MIN_SAMPLES) {
        console.log(`⏳ Buffering audio (${state.pcmBuffer.length}/${MIN_SAMPLES} samples)`);
      }
    }, state.packetInterval);
    
    console.log('✅ Started listening');
    
  } catch (error) {
    console.error('Failed to start listening:', error);
    throw error;
  }
}

function stopListening() {
  if (!state.isListening) return;
  
  console.log('⏹ Stopping listening...');
  
  if (state.sendInterval) {
    clearInterval(state.sendInterval);
    state.sendInterval = null;
  }
  
  if (state.audioProcessor) {
    state.audioProcessor.disconnect();
    state.audioProcessor.onaudioprocess = null;
  }
  if (state.audioSource) {
    state.audioSource.disconnect();
  }
  
  // Stop smooth glow animation loop
  stopGlowAnimation();
  
  state.pcmBuffer = [];
  state = { 
    ...state, 
    isListening: false,
    audioProcessor: null,
    audioSource: null
  };
  
  console.log('⏹ Stopped listening');
}

// ============================================
// WebSocket Connection (copied from audio-percept/editor.js)
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
  
  if (state.ws) {
    state.ws.close();
    state = { ...state, ws: null, setupComplete: false };
  }
  
  try {
    const tokenRes = await fetch('/api/gemini/token');
    if (!tokenRes.ok) {
      throw new Error(`Token fetch failed: ${tokenRes.status}`);
    }
    const { token } = await tokenRes.json();
    console.log('✅ Got ephemeral token');
    
    const url = createWebSocketUrl(token);
    const ws = new WebSocket(url);
    
    ws.onopen = () => {
      console.log('✅ WebSocket connection opened');
      
      const setupMessage = {
        setup: {
          model: 'models/gemini-2.0-flash-exp',
          generationConfig: {
            responseModalities: ['TEXT'],
            responseMimeType: 'application/json'
          },
          systemInstruction: {
            parts: [{
              text: state.systemPrompt || 'You are analyzing audio percepts.'
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
      state = { ...state, isConnected: false, ws: null, setupComplete: false };
      
      if (state.isListening) {
        console.log('🔄 Attempting to reconnect...');
        try {
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          if (!state.isListening) {
            console.log('Stopped listening during reconnect, aborting');
            return;
          }
          
          await startSession();
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          if (state.ws && state.ws.readyState === WebSocket.OPEN && state.setupComplete) {
            console.log('✅ Reconnected and ready');
          }
        } catch (error) {
          console.error('Reconnection failed:', error);
          showError('Connection lost. Please refresh and try again.');
        }
      }
    };
    
    state = { ...state, ws };
    
  } catch (error) {
    console.error('Failed to start session:', error);
    throw error;
  }
}

function sendAudioPacket(base64PCM) {
  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) {
    console.warn('WebSocket not ready, skipping packet');
    return;
  }
  
  if (!state.setupComplete) {
    console.log('⏳ Setup not complete, skipping packet');
    return;
  }
  
  if (!base64PCM || base64PCM.length === 0) {
    console.warn('Empty PCM data, skipping packet');
    return;
  }
  
  try {
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
    
    console.log(`📤 Sending audio packet (~${estimatedDuration}s)`);
    
    state.ws.send(JSON.stringify(message));
    
  } catch (error) {
    console.error('Failed to send audio packet:', error);
    showError('Failed to send audio: ' + error.message);
  }
}

function handleResponse(message) {
  console.log('📥 Message received:', message);
  
  if (message.setupComplete) {
    console.log('Setup complete, ready to stream audio');
    state = { ...state, isConnected: true, setupComplete: true };
    return;
  }
  
  if (message.serverContent) {
    const content = message.serverContent;
    
    if (content.modelTurn && content.modelTurn.parts) {
      for (const part of content.modelTurn.parts) {
        if (part.text) {
          state.responseBuffer += part.text;
        }
      }
    }
    
    if (content.turnComplete) {
      console.log('✅ Turn complete');
      
      try {
        let jsonText = state.responseBuffer.trim();
        
        if (jsonText.startsWith('```')) {
          jsonText = jsonText.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
        }
        
        const json = JSON.parse(jsonText);
        console.log('✅ Parsed JSON response:', json);
        
        if (json.sigilPhrase && json.sigilDrawCalls) {
          state.sigil.render({
            phrase: json.sigilPhrase,
            drawCalls: json.sigilDrawCalls
          });
        } else {
          console.warn('⚠️ JSON missing sigilPhrase or sigilDrawCalls:', json);
        }
        
        state.responseBuffer = '';
      } catch (error) {
        console.error('❌ Failed to parse response as JSON:', error);
        console.log('Raw response:', state.responseBuffer);
        console.log('This likely means the audio prompt needs to be configured to return sigil data.');
      }
    }
  }
}

// ============================================
// Smooth Glow Animation (60fps via RAF)
// ============================================

function startGlowAnimation() {
  const smoothingFactor = 0.15; // Lower = smoother (0.15 is very smooth)
  
  function animate() {
    // Exponentially smooth toward target amplitude
    state.smoothedAmplitude += (state.currentAmplitude - state.smoothedAmplitude) * smoothingFactor;
    
    // Update visual at 60fps
    const glowEl = document.getElementById('audio-glow');
    if (glowEl) {
      glowEl.style.opacity = state.smoothedAmplitude;
    }
    
    // Continue if still listening
    if (state.isListening) {
      state.rafId = requestAnimationFrame(animate);
    }
  }
  
  animate();
}

function stopGlowAnimation() {
  if (state.rafId) {
    cancelAnimationFrame(state.rafId);
    state.rafId = null;
  }
  
  // Fade out glow
  const glowEl = document.getElementById('audio-glow');
  if (glowEl) {
    glowEl.style.opacity = 0;
  }
  
  // Reset smoothed amplitude
  state.smoothedAmplitude = 0;
}

// ============================================
// UI Helpers
// ============================================

function showError(msg) {
  const errorEl = document.getElementById('error-message');
  if (errorEl) {
    errorEl.textContent = msg;
    errorEl.classList.add('visible');
    
    setTimeout(() => {
      errorEl.classList.remove('visible');
    }, 5000);
  }
}

function hideStartPrompt() {
  const startPrompt = document.getElementById('start-prompt');
  if (startPrompt) {
    startPrompt.classList.add('hidden');
  }
}

// ============================================
// Application Initialization
// ============================================

async function init() {
  const startPrompt = document.getElementById('start-prompt');
  const errorMessage = document.getElementById('error-message');
  
  try {
    // Load active audio prompt
    const res = await fetch('/api/audio-prompts/active');
    if (!res.ok) {
      throw new Error('Failed to load audio prompt');
    }
    const { prompt } = await res.json();
    
    // Initialize sigil renderer (300px for full-screen, transparent background)
    const sigil = new SigilAndPhrase({ 
      container: '#sigil',
      canvasSize: 300,
      backgroundColor: 'transparent'
    });
    
    // Store in state
    state = {
      ...state,
      systemPrompt: prompt.system_prompt,
      sigil: sigil
    };
    
    console.log('✅ Initialized with prompt:', prompt.name);
    
    // Start on click
    document.body.addEventListener('click', async () => {
      if (!state.isListening) {
        try {
          errorMessage.classList.remove('visible');
          startPrompt.textContent = 'starting...';
          
          await initMicrophone();
          await startSession();
          await new Promise(resolve => setTimeout(resolve, 1000));
          await startListening();
          
          hideStartPrompt();
          document.body.classList.add('started');
          
        } catch (error) {
          console.error('Failed to start:', error);
          errorMessage.textContent = error.message.includes('denied') 
            ? 'microphone access denied' 
            : 'failed to start';
          errorMessage.classList.add('visible');
          startPrompt.textContent = 'click to retry';
          startPrompt.classList.remove('hidden');
        }
      }
    });
    
  } catch (error) {
    console.error('Initialization failed:', error);
    errorMessage.textContent = 'failed to initialize';
    errorMessage.classList.add('visible');
  }
}

// Start app
init();

