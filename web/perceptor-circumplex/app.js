// ============================================
// Perceptor Circumplex v2 - Simple Implementation
// ============================================

// ============================================
// SECTION 1: State Management
// ============================================

const state = {
  // Hardware
  videoStream: null,
  audioContext: null,
  audioSource: null,
  audioProcessor: null,
  
  // WebSocket
  ws: null,
  connected: false,
  streaming: false,
  responseBuffer: '',
  
  // API Key
  apiKey: null,
  
  // Audio buffer
  pcmBuffer: [],
  
  // Streaming intervals
  streamInterval: null
};

// ============================================
// SECTION 2: System Prompt
// ============================================

const SYSTEM_PROMPT = `You are analyzing a real-time audio and video stream.

For AUDIO, provide:
- transcript: What you hear the person saying
- valence: -1 (negative) to +1 (positive) emotional tone
- arousal: -1 (calm) to +1 (energized) energy level

For VISUAL, provide:
- description: What you see the person doing
- valence: -1 (negative) to +1 (positive) emotional tone
- arousal: -1 (calm) to +1 (energized) energy level

Return JSON:
{
  "audio": {
    "transcript": "...",
    "valence": 0.5,
    "arousal": 0.3
  },
  "visual": {
    "description": "...",
    "valence": 0.4,
    "arousal": 0.2
  }
}

Keep it simple. Just give me the numbers based on what you perceive.`;

// ============================================
// SECTION 3: Initialization
// ============================================

function init() {
  console.log('🚀 Initializing Perceptor Circumplex v2...');
  loadApiKey();
  setupEventListeners();
}

// ============================================
// SECTION 4: API Key Management
// ============================================

function loadApiKey() {
  const stored = localStorage.getItem('geminiApiKey');
  const input = document.getElementById('api-key-input');
  
  if (stored) {
    input.value = stored;
    state.apiKey = stored;
    console.log('💾 Loaded API key from localStorage');
  }
}

function saveApiKey() {
  const input = document.getElementById('api-key-input');
  const value = input.value.trim();
  
  if (value) {
    localStorage.setItem('geminiApiKey', value);
    state.apiKey = value;
    console.log('💾 API key saved');
  }
}

function setupEventListeners() {
  const input = document.getElementById('api-key-input');
  const btn = document.getElementById('toggle-btn');
  
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
    if (state.streaming) {
      input.blur();
      console.warn('⚠️ Cannot change API key while streaming');
    }
  });
  
  // Toggle streaming
  btn.addEventListener('click', toggleStreaming);
}

// ============================================
// SECTION 5: Hardware Setup
// ============================================

async function startHardware() {
  try {
    console.log('🎥 Requesting camera and microphone access...');
    
    // Get video + audio
    state.videoStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user'
      },
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true
      }
    });
    
    // Display video
    const video = document.getElementById('webcam');
    video.srcObject = state.videoStream;
    console.log('✅ Video feed active');
    
    // Setup audio processing
    state.audioContext = new AudioContext({ sampleRate: 16000 });
    state.audioSource = state.audioContext.createMediaStreamSource(state.videoStream);
    state.audioProcessor = state.audioContext.createScriptProcessor(4096, 1, 1);
    
    state.audioProcessor.onaudioprocess = (event) => {
      if (!state.streaming) return;
      
      const samples = event.inputBuffer.getChannelData(0);
      const pcm = convertToPCM16(samples);
      state.pcmBuffer.push(...pcm);
    };
    
    state.audioSource.connect(state.audioProcessor);
    state.audioProcessor.connect(state.audioContext.destination);
    console.log('✅ Audio processing active');
    
  } catch (error) {
    console.error('❌ Hardware error:', error);
    alert('Failed to access camera/microphone. Please grant permissions and try again.');
    throw error;
  }
}

function stopHardware() {
  if (state.videoStream) {
    state.videoStream.getTracks().forEach(track => track.stop());
    state.videoStream = null;
  }
  
  if (state.audioContext) {
    state.audioContext.close();
    state.audioContext = null;
  }
  
  state.audioSource = null;
  state.audioProcessor = null;
  
  const video = document.getElementById('webcam');
  video.srcObject = null;
  
  console.log('🛑 Hardware stopped');
}

// ============================================
// SECTION 6: WebSocket Connection
// ============================================

async function connectGemini() {
  try {
    // Get API key (ephemeral if "onthehouse")
    let apiKey = state.apiKey;
    
    if (apiKey === 'onthehouse') {
      console.log('🏠 Requesting ephemeral token...');
      const res = await fetch('/api/gemini/token');
      
      if (!res.ok) {
        throw new Error('Failed to get ephemeral token');
      }
      
      const data = await res.json();
      apiKey = data.token;
      console.log('✅ Ephemeral token received');
    }
    
    // Connect to Gemini Live
    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
    
    console.log('🔌 Connecting to Gemini Live...');
    state.ws = new WebSocket(wsUrl);
    
    state.ws.onopen = () => {
      console.log('✅ WebSocket connected');
      state.connected = true;
      updateStatus('🟢 Connected');
      
      // Send setup message
      sendSetup();
      
      // Start streaming
      startStreaming();
    };
    
    state.ws.onmessage = handleResponse;
    
    state.ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      updateStatus('🔴 Error');
    };
    
    state.ws.onclose = () => {
      console.log('🔌 WebSocket closed');
      state.connected = false;
      state.streaming = false;
      updateStatus('⚫ Disconnected');
    };
    
  } catch (error) {
    console.error('❌ Connection error:', error);
    alert('Failed to connect to Gemini. Check your API key and try again.');
    throw error;
  }
}

function sendSetup() {
  const setup = {
    setup: {
      model: 'models/gemini-2.0-flash-exp',
      generationConfig: {
        responseModalities: ['TEXT'],
        responseMimeType: 'application/json',  // Auto-respond in JSON
        temperature: 0.7
      },
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }]
      }
    }
  };
  
  state.ws.send(JSON.stringify(setup));
  console.log('📋 Setup message sent (JSON auto-response enabled)');
}

// ============================================
// SECTION 7: Streaming
// ============================================

function startStreaming() {
  state.streaming = true;
  
  // Send audio + video every 2 seconds
  // Gemini will auto-respond based on system instruction (no manual turns needed)
  state.streamInterval = setInterval(() => {
    if (!state.streaming || !state.connected) return;
    
    sendAudioFrame();
    sendVideoFrame();
    
  }, 2000);
  
  console.log('🎬 Streaming started (2s interval, auto-response mode)');
}

function sendAudioFrame() {
  if (state.pcmBuffer.length === 0) return;
  
  try {
    const pcmData = new Uint8Array(state.pcmBuffer);
    const base64Audio = btoa(String.fromCharCode(...pcmData));
    
    state.ws.send(JSON.stringify({
      realtimeInput: {
        mediaChunks: [{
          mimeType: 'audio/pcm;rate=16000',
          data: base64Audio
        }]
      }
    }));
    
    console.log(`📤 Sent audio frame (${state.pcmBuffer.length} bytes)`);
    state.pcmBuffer = [];
    
  } catch (error) {
    console.error('❌ Error sending audio:', error);
  }
}

function sendVideoFrame() {
  try {
    const video = document.getElementById('webcam');
    
    if (!video.videoWidth || !video.videoHeight) {
      console.warn('⚠️ Video not ready yet');
      return;
    }
    
    // Create canvas and capture frame
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, 640, 480);
    
    // Convert to blob and send
    canvas.toBlob((blob) => {
      if (!blob) return;
      
      const reader = new FileReader();
      reader.onload = () => {
        const base64Video = reader.result.split(',')[1];
        
        state.ws.send(JSON.stringify({
          realtimeInput: {
            mediaChunks: [{
              mimeType: 'image/jpeg',
              data: base64Video
            }]
          }
        }));
        
        console.log('📤 Sent video frame (640x480 JPEG)');
      };
      reader.readAsDataURL(blob);
    }, 'image/jpeg', 0.8);
    
  } catch (error) {
    console.error('❌ Error sending video:', error);
  }
}

function stopStreaming() {
  state.streaming = false;
  
  if (state.streamInterval) {
    clearInterval(state.streamInterval);
    state.streamInterval = null;
  }
  
  if (state.ws) {
    state.ws.close();
    state.ws = null;
  }
  
  console.log('🛑 Streaming stopped');
}

// ============================================
// SECTION 8: Response Handling
// ============================================

async function handleResponse(event) {
  try {
    // Handle Blob responses (convert to text first)
    let messageText;
    if (event.data instanceof Blob) {
      messageText = await event.data.text();
    } else {
      messageText = event.data;
    }
    
    const data = JSON.parse(messageText);
    
    // Debug: Log all incoming messages
    console.log('📨 WebSocket message:', data);
    
    if (data.serverContent?.turnComplete) {
      console.log('✅ Turn complete. Accumulated buffer:', state.responseBuffer);
      
      // Extract JSON from markdown code fences if present
      let jsonText = state.responseBuffer;
      
      // Match ```json ... ``` blocks (take the last one if multiple)
      const jsonMatches = jsonText.match(/```json\s*([\s\S]*?)\s*```/g);
      if (jsonMatches && jsonMatches.length > 0) {
        // Take the last JSON block
        const lastMatch = jsonMatches[jsonMatches.length - 1];
        jsonText = lastMatch.replace(/```json\s*|\s*```/g, '').trim();
        console.log('📦 Extracted JSON from markdown:', jsonText);
      }
      
      // Parse accumulated response
      try {
        const response = JSON.parse(jsonText);
        console.log('🎤 Circumplex Response:', response);
        
        updateUI(response);
        
      } catch (e) {
        console.warn('⚠️ Invalid JSON response. Buffer contents:', state.responseBuffer);
        console.warn('Extracted text:', jsonText);
        console.warn('Parse error:', e.message);
      }
      
      // Clear buffer for next turn
      state.responseBuffer = '';
      
    } else if (data.serverContent?.modelTurn) {
      // Accumulate streaming response
      data.serverContent.modelTurn.parts.forEach(part => {
        if (part.text) {
          console.log('📝 Accumulating text:', part.text);
          state.responseBuffer += part.text;
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error handling response:', error);
  }
}

function updateUI(response) {
  // Update audio
  if (response.audio) {
    document.getElementById('audio-transcript').textContent = 
      response.audio.transcript || 'No speech detected';
    
    document.getElementById('audio-valence').textContent = 
      typeof response.audio.valence === 'number' 
        ? response.audio.valence.toFixed(2) 
        : '--';
    
    document.getElementById('audio-arousal').textContent = 
      typeof response.audio.arousal === 'number' 
        ? response.audio.arousal.toFixed(2) 
        : '--';
  }
  
  // Update visual
  if (response.visual) {
    document.getElementById('visual-description').textContent = 
      response.visual.description || 'Nothing detected';
    
    document.getElementById('visual-valence').textContent = 
      typeof response.visual.valence === 'number' 
        ? response.visual.valence.toFixed(2) 
        : '--';
    
    document.getElementById('visual-arousal').textContent = 
      typeof response.visual.arousal === 'number' 
        ? response.visual.arousal.toFixed(2) 
        : '--';
  }
}

// ============================================
// SECTION 9: Utils
// ============================================

function convertToPCM16(samples) {
  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return Array.from(new Uint8Array(pcm.buffer));
}

function updateStatus(text) {
  document.getElementById('status').textContent = text;
}

// ============================================
// SECTION 10: Main Control
// ============================================

async function toggleStreaming() {
  const btn = document.getElementById('start-btn');
  
  if (!state.streaming) {
    // Validate API key
    if (!state.apiKey) {
      alert('Please enter an API key');
      return;
    }
    
    try {      
      btn.textContent = 'STARTING...';
      btn.disabled = true;
      
      await startHardware();
      await connectGemini();
      
      btn.textContent = 'STOP';
      btn.disabled = false;
      btn.classList.add('active');
      
    } catch (error) {
      // Reset on error
      stopHardware();
      stopStreaming();
      btn.textContent = 'START';
      btn.disabled = false;
      btn.classList.remove('active');
    }
    
  } else {
    // Stop streaming
    btn.textContent = 'STOPPING...';
    btn.disabled = true;
    
    stopStreaming();
    stopHardware();
    
    btn.textContent = 'START';
    btn.disabled = false;
    btn.classList.remove('active');
  }
}

// ============================================
// Initialize on page load
// ============================================

init();

