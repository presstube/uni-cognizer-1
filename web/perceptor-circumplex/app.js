// ============================================
// Perceptor Circumplex - Audio Emotion Analysis
// ============================================

import { AcousticAnalyzer, averageAcousticFeatures } from './acoustic-analyzer.js';
import { CircumplexVisualizer } from './circumplex-viz.js';

// ============================================
// SECTION 1: State Management
// ============================================

const state = {
  // Hardware
  audioStream: null,
  audioContext: null,
  audioProcessor: null,
  audioSource: null,
  
  // Gemini Live WebSocket
  ws: null,
  connected: false,
  setupComplete: false,
  responseBuffer: '',
  
  // Prompt
  audioPrompt: null,
  
  // Streaming
  pcmBuffer: [],
  audioInterval: null,
  acousticInterval: null,
  isListening: false,
  
  // Acoustic analysis
  acousticAnalyzer: null,
  acousticFeatureBuffer: [],
  currentFeatures: null,
  
  // Visualization
  circumplexViz: null,
  
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
    
    if (state.useHouseKey) {
      console.log('%c🏠 RUNNING ON THE HOUSE 🏠', 'font-weight: bold; font-size: 14px; color: #00ff00; background: #000; padding: 4px 8px;');
    } else {
      console.log('%c🔑 RUNNING WITH USER KEY 🔑', 'font-weight: bold; font-size: 14px; color: #00d4ff; background: #000; padding: 4px 8px;');
    }
  } else {
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
    
    if (state.useHouseKey) {
      console.log('%c💾 Saved: ON THE HOUSE', 'font-weight: bold; font-size: 12px; color: #00ff00;');
    } else {
      console.log('%c💾 Saved: USER KEY', 'font-weight: bold; font-size: 12px; color: #00d4ff;');
    }
  }
}

function setupApiKeyInput() {
  const input = document.getElementById('api-key-input');
  
  input.addEventListener('blur', saveApiKey);
  
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      saveApiKey();
      input.blur();
    }
  });
  
  input.addEventListener('focus', () => {
    if (state.isListening) {
      input.blur();
      console.warn('⚠️ Cannot change API key while listening');
    }
  });
}

async function init() {
  try {
    console.log('🚀 Initializing Perceptor Circumplex...');
    
    // 0. Load API key from localStorage
    loadApiKey();
    setupApiKeyInput();
    
    // 1. Load circumplex prompt from DB (by slug)
    const promptRes = await fetch('/api/audio-prompts/by-slug/circumplex-v1');
    
    if (!promptRes.ok) {
      throw new Error('Failed to load circumplex prompt from database. Make sure to run: node scripts/seed-circumplex-prompt.js');
    }
    
    state.audioPrompt = await promptRes.json();
    
    console.log('📋 Loaded prompt:', state.audioPrompt.prompt.name);
    
    // 2. Initialize circumplex visualizer
    state.circumplexViz = new CircumplexVisualizer('circumplex-canvas', {
      size: 400,
      maxHistory: 50
    });
    
    console.log('✅ Circumplex visualizer initialized');
    
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
    
    // 4. Setup audio processing with acoustic analysis
    await initAudioProcessing(state.audioStream, audioSampleRate, bufferSize);
    
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

async function initAudioProcessing(stream, audioSampleRate, bufferSize) {
  try {
    // Create AudioContext with 16kHz (required by Gemini Live API)
    state.audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: audioSampleRate
    });
    
    // Initialize acoustic analyzer
    state.acousticAnalyzer = new AcousticAnalyzer(audioSampleRate);
    
    // Create source and processor
    const source = state.audioContext.createMediaStreamSource(stream);
    const processor = state.audioContext.createScriptProcessor(bufferSize, 1, 1);
    
    // Process audio: convert to PCM + extract acoustic features
    processor.onaudioprocess = (event) => {
      const inputBuffer = event.inputBuffer.getChannelData(0);
      
      // ALWAYS extract acoustic features (for debug display)
      const features = state.acousticAnalyzer.analyze(inputBuffer);
      state.currentFeatures = features;
      
      // Update debug UI
      updateDebugUI(features);
      
      // Only buffer data when listening
      if (state.isListening) {
        // Add features to buffer for batching
        state.acousticFeatureBuffer.push(features);
        
        // Convert to PCM for Gemini
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
// SECTION 4: Gemini Live Connection
// ============================================

function createWebSocketUrl(token) {
  const isEphemeral = token.startsWith('auth_tokens/');
  const endpoint = isEphemeral ? 'BidiGenerateContentConstrained' : 'BidiGenerateContent';
  const param = isEphemeral ? 'access_token' : 'key';
  return `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.${endpoint}?${param}=${token}`;
}

async function startSession() {
  try {
    console.log('🔌 Connecting to Gemini Live API...');
    
    if (!state.apiKey) {
      throw new Error('No API key provided. Please enter a Gemini API key.');
    }
    
    let token;
    
    if (state.useHouseKey) {
      console.log('🏠 Using house key...');
      const tokenRes = await fetch('/api/gemini/token');
      if (!tokenRes.ok) throw new Error(`Token fetch failed: ${tokenRes.status}`);
      const data = await tokenRes.json();
      token = data.token;
    } else {
      console.log('🔑 Using user key...');
      token = state.apiKey;
    }
    
    const url = createWebSocketUrl(token);
    state.ws = new WebSocket(url);
    
    state.ws.onopen = () => {
      console.log('✅ WebSocket connected');
      
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
      
      state.ws.send(JSON.stringify(setupMessage));
    };
    
    state.ws.onmessage = async (event) => {
      try {
        const data = event.data instanceof Blob 
          ? JSON.parse(await event.data.text())
          : JSON.parse(event.data);
        
        handleResponse(data);
      } catch (error) {
        console.error('❌ Error parsing message:', error);
      }
    };
    
    state.ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };
    
    state.ws.onclose = () => {
      console.log('⚫ WebSocket closed');
      state.connected = false;
      state.setupComplete = false;
      updateStatus('⚫ Disconnected');
    };
    
  } catch (error) {
    console.error('❌ Failed to start session:', error);
    throw error;
  }
}

// ============================================
// SECTION 5: Response Handling
// ============================================

function handleResponse(message) {
  if (message.setupComplete) {
    console.log('✅ Setup complete');
    state.connected = true;
    state.setupComplete = true;
    updateStatus('🟢 Connected');
    return;
  }
  
  if (message.serverContent) {
    const content = message.serverContent;
    
    if (content.modelTurn?.parts) {
      for (const part of content.modelTurn.parts) {
        if (part.text) {
          state.responseBuffer += part.text;
        }
      }
    }
    
    if (content.turnComplete) {
      try {
        let jsonText = state.responseBuffer.trim();
        if (jsonText.startsWith('```')) {
          jsonText = jsonText.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
        }
        
        const json = JSON.parse(jsonText);
        
        console.log('🎤 Circumplex Response:', json);
        
        // Update visualization and UI
        if (typeof json.valence === 'number' && typeof json.arousal === 'number') {
          updateCircumplexDisplay(json);
        }
        
      } catch (error) {
        console.warn('Failed to parse JSON response:', error.message);
      }
      
      // Clear buffer
      state.responseBuffer = '';
    }
  }
}

// ============================================
// SECTION 6: Streaming Functions
// ============================================

function startAudioStreaming() {
  const interval = state.audioPrompt.prompt.packet_interval || 2000;
  const audioSampleRate = 16000;
  
  console.log(`🎤 Starting audio streaming (${interval}ms intervals)`);
  
  state.audioInterval = setInterval(() => {
    const MIN_SAMPLES = Math.floor(audioSampleRate * 0.5);
    const MAX_SAMPLES = Math.floor(audioSampleRate * 2.0);
    
    if (state.pcmBuffer.length >= MIN_SAMPLES && state.setupComplete) {
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
      
      if (state.ws && state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify({
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

function startAcousticMetadataStreaming() {
  const interval = 5000; // Send acoustic context every 5 seconds
  
  console.log('📊 Starting acoustic metadata streaming (5000ms intervals)');
  
  state.acousticInterval = setInterval(() => {
    if (!state.setupComplete || state.acousticFeatureBuffer.length === 0) {
      return;
    }
    
    // Average features over the window
    const avgFeatures = averageAcousticFeatures(state.acousticFeatureBuffer);
    
    // Format for prompt
    const text = `[Acoustic: RMS=${avgFeatures.rms.toFixed(2)} ZCR=${avgFeatures.zcr.toFixed(2)} Centroid=${avgFeatures.centroid}Hz Envelope=${avgFeatures.envelope}]`;
    
    // Send as text turn
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify({
        clientContent: {
          turns: [{
            role: 'user',
            parts: [{ text }]
          }],
          turnComplete: true
        }
      }));
      
      console.log('📤 Sent acoustic context:', text);
    }
    
    // Clear buffer
    state.acousticFeatureBuffer = [];
    
  }, interval);
}

// ============================================
// SECTION 7: Control Functions
// ============================================

async function start() {
  if (state.isListening) return;
  
  try {
    console.log('▶️ Starting listening...');
    
    if (!state.apiKey) {
      alert('Please enter a Gemini API key to start.');
      return;
    }
    
    // Disable input while listening
    document.getElementById('api-key-input').disabled = true;
    
    await startSession();
    await waitForSetup();
    
    state.isListening = true;
    startAudioStreaming();
    startAcousticMetadataStreaming();
    
    updateUI();
    console.log('✅ Listening started');
    
  } catch (error) {
    console.error('❌ Failed to start:', error);
    stop();
  }
}

function stop() {
  if (!state.isListening) return;
  
  console.log('⏹️ Stopping...');
  
  state.isListening = false;
  
  if (state.audioInterval) {
    clearInterval(state.audioInterval);
    state.audioInterval = null;
  }
  
  if (state.acousticInterval) {
    clearInterval(state.acousticInterval);
    state.acousticInterval = null;
  }
  
  if (state.ws) {
    state.ws.close();
    state.ws = null;
  }
  
  state.pcmBuffer = [];
  state.acousticFeatureBuffer = [];
  state.connected = false;
  state.setupComplete = false;
  
  // Re-enable input
  document.getElementById('api-key-input').disabled = false;
  
  updateUI();
  updateStatus('⚫ Disconnected');
  console.log('⏹️ Stopped');
}

function waitForSetup() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Setup timeout'));
    }, 10000);
    
    const checkSetup = setInterval(() => {
      if (state.setupComplete) {
        clearInterval(checkSetup);
        clearTimeout(timeout);
        resolve();
      }
    }, 100);
  });
}

// ============================================
// SECTION 8: UI Updates
// ============================================

function updateUI() {
  const btn = document.getElementById('toggle-btn');
  
  if (state.isListening) {
    btn.textContent = 'STOP LISTENING';
    btn.classList.add('active');
  } else {
    btn.textContent = 'START LISTENING';
    btn.classList.remove('active');
  }
}

function updateStatus(text) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = text;
}

function updateDebugUI(features) {
  document.getElementById('rms-value').textContent = features.rms.toFixed(3);
  document.getElementById('zcr-value').textContent = features.zcr.toFixed(3);
  document.getElementById('centroid-value').textContent = features.centroid + ' Hz';
  document.getElementById('envelope-value').textContent = features.envelope;
}

function updateCircumplexDisplay(response) {
  // Update visualizer
  state.circumplexViz.plot(response.valence, response.arousal);
  
  // Update emotion label
  const emotionLabel = document.getElementById('emotion-label');
  emotionLabel.textContent = response.emotion_label || '--';
  
  // Update coordinates
  document.getElementById('valence-value').textContent = response.valence.toFixed(2);
  document.getElementById('arousal-value').textContent = response.arousal.toFixed(2);
  
  // Update response display
  document.getElementById('transcript').textContent = response.transcript || '(no speech detected)';
  document.getElementById('reasoning').textContent = response.reasoning || '';
  document.getElementById('confidence').textContent = response.confidence 
    ? `Confidence: ${(response.confidence * 100).toFixed(0)}%`
    : '';
}

function toggleListening() {
  if (state.isListening) {
    stop();
  } else {
    start();
  }
}

// ============================================
// SECTION 9: Event Listeners
// ============================================

document.getElementById('toggle-btn').addEventListener('click', toggleListening);

// ============================================
// SECTION 10: Initialize on Load
// ============================================

init().catch(error => {
  console.error('❌ Initialization failed:', error);
});
