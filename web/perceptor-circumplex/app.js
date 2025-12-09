// ============================================
// Perceptor Circumplex v2 - Simple Implementation
// ============================================

import { CircumplexViz } from './circumplex-viz.js';
import { PerceptToast } from '../shared/percept-toast.js';

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
  streamInterval: null,
  audioInterval: null,
  
  // Visualization
  circumplexViz: null,
  
  // Context tracking
  lastVisualDescription: null,
  
  // Cognizer integration
  cognizerSocket: null,
  cognizerConnected: false,
  sessionId: null
};

// ============================================
// SECTION 2: System Prompt
// ============================================

const SYSTEM_PROMPT = `You are analyzing real-time audio and video to assess emotional state using Russell's Circumplex Model.

VALENCE (-1 to +1): Measure pleasure/displeasure
AROUSAL (-1 to +1): Measure activation/deactivation

For AUDIO analysis, evaluate:
- VERBAL: Speech content, words, semantic meaning (if present)
- NON-VERBAL: Humming, singing, whistling, laughing, sighing, breathing patterns, vocal sounds
- Vocal tone: Pitch (high/low), intensity (loud/soft)
- Prosody: Speaking rate, rhythm, intonation patterns
- Voice quality: Tension, shakiness, breathiness
- Note: If no sound, transcript = "silence"

For VISUAL analysis, evaluate:
- Facial expressions: Smile/frown, eye openness, eyebrow position, micro-expressions
- Body language: Posture (open/closed), gesture size/frequency
- Movement: Speed, smoothness, proximity to camera, energy level
- Physical tension: Relaxed vs tense muscles

VALENCE indicators:
- Positive: Smiling, positive words, bright tone, open posture, laughter, upbeat humming
- Negative: Frowning, negative words, low/flat tone, closed posture, sighs, groaning

AROUSAL indicators:
- High: Fast speech, loud volume, animated gestures, wide eyes, quick movements, energetic sounds
- Low: Slow speech, soft volume, minimal gestures, relaxed face, stillness, slow breathing

AUDIO SIGIL GENERATION:
Create a sigil to represent what you hear.

STEP 1: Create a "sigil phrase" - a punchy, poetic 2-4 word distillation of the sonic/verbal moment.
STEP 2: Generate canvas drawing commands for a sigil representing that phrase.

AUDIO SIGIL RULES:
- Represent the SONIC essence - rhythm, tone, energy of the audio
- For speech: capture the emotional/semantic essence
- For non-verbal sounds: capture the acoustic character
- Use flowing, rhythmic forms for melodic sounds
- Use sharp, staccato forms for percussive sounds
- Same technical rules as visual sigils (see below)

VISUAL SIGIL GENERATION:
Create a sigil to represent what you see.

STEP 1: Create a "sigil phrase" - a punchy, poetic 2-4 word distillation of the visual moment.
STEP 2: Generate canvas drawing commands for a sigil representing that phrase.

SIGIL TECHNICAL RULES (BOTH AUDIO & VISUAL):
1. Available methods:
   - ctx.moveTo(x, y)
   - ctx.lineTo(x, y)
   - ctx.arc(x, y, radius, 0, Math.PI * 2)
   - ctx.quadraticCurveTo(cpx, cpy, x, y) - 4 parameters
   - ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) - 6 parameters
   - ctx.beginPath(), ctx.closePath(), ctx.stroke()

2. PATH MANAGEMENT - CRITICAL:
   - Start with ONE ctx.beginPath() at the beginning
   - Use ctx.moveTo() before EVERY separate element to avoid connecting lines
   - End with ONE ctx.stroke() at the very end

3. MIX geometric and organic - use both straight lines AND curves
4. Sharp angles and clean lines give structure
5. Gentle curves add flow and warmth
6. STRONGLY FAVOR symmetry - create balanced, centered compositions
7. Small asymmetric details add character without breaking overall balance
8. AVOID explicit faces - no literal eyes, mouths, noses (subtle allusions OK)
9. Create abstract symbolic forms, not realistic depictions
10. Canvas is 100x100, center at (50, 50)
11. Maximum 30 lines
12. NO variables, NO functions, NO explanations
13. Output ONLY the ctx commands

DESCRIPTIONS - IMPORTANT:
FIRST ANALYSIS: Describe the scene/audio completely and thoroughly.
SUBSEQUENT ANALYSES: ONLY describe what has definitively CHANGED or is actively HAPPENING. 
- If nothing has changed in the visual, OMIT the entire "visual" field from your response
- If nothing has changed in the audio, OMIT the entire "audio" field from your response
- Do NOT return "NO CHANGES" or similar - simply omit the field entirely

RESPONSE FORMAT - CRITICAL:
Return ONLY the modalities that have meaningful data:
- If audio is silence or absent, OMIT the entire "audio" field
- If visual has no meaningful information, OMIT the entire "visual" field
- Return whichever has actual content - could be audio only, visual only, or both if both are meaningful
- This saves tokens and reduces noise

CIRCUMPLEX COORDINATES - MANDATORY:
- ALWAYS include BOTH "valence" and "arousal" fields for ANY modality you include
- If you return an "audio" object, it MUST contain numeric "valence" and "arousal" values
- If you return a "visual" object, it MUST contain numeric "valence" and "arousal" values
- These fields are REQUIRED - never omit them if you're including that modality
- Use 0.0 if the emotion is truly neutral, but ALWAYS include the numeric fields

STRICT JSON OUTPUT:
- Return ONLY valid JSON, no markdown, no explanations, no preamble
- Do not wrap in code fences (no \`\`\`json)
- Start directly with the opening brace {
- End directly with the closing brace }

Return JSON (include only fields with meaningful data):
{
  "audio": {  // OMIT this entire field if silence or no audio
    "emoji": "🎵",
    "transcript": "...",
    "valence": 0.5,     // REQUIRED if audio field is present
    "arousal": 0.3,     // REQUIRED if audio field is present
    "sigilPhrase": "2-4 word phrase",
    "drawCalls": "ctx.beginPath();\\nctx.moveTo(50,20);\\n...\\nctx.stroke();"
  },
  "visual": {  // OMIT this entire field if no meaningful visual
    "emoji": "😊",
    "description": "...",
    "valence": 0.4,     // REQUIRED if visual field is present
    "arousal": 0.2,     // REQUIRED if visual field is present
    "sigilPhrase": "2-4 word phrase",
    "drawCalls": "ctx.beginPath();\\nctx.moveTo(50,20);\\n...\\nctx.stroke();"
  }
}

Rate both dimensions independently based on what you observe.`;

// ============================================
// SECTION 3: Initialization
// ============================================

function init() {
  console.log('🚀 Initializing Perceptor Circumplex v2...');
  loadApiKey();
  setupEventListeners();
  initializeVisualization();
  connectToCognizer();
}

function initializeVisualization() {
  try {
    state.circumplexViz = new CircumplexViz('circumplex-canvas', {
      size: 400,  // Larger canvas for more label space
      showLabels: true,
      showAxes: true,
      showGrid: false,
      showDot: true
    });
    console.log('✅ Circumplex visualization initialized');
  } catch (error) {
    console.error('❌ Failed to initialize visualization:', error);
  }
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
  const select = document.getElementById('prompt-profile-select');
  
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
// SECTION 5.5: Cognizer Integration
// ============================================

function connectToCognizer() {
  const url = window.location.origin;
  
  console.log('🔌 Connecting to Cognizer...', url);
  
  state.cognizerSocket = io(url, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000
  });
  
  state.cognizerSocket.on('connect', () => {
    console.log('✅ Cognizer socket connected');
  });
  
  state.cognizerSocket.on('sessionStarted', (data) => {
    console.log('✅ Cognizer session started:', state.sessionId);
    state.cognizerConnected = true;
  });
  
  state.cognizerSocket.on('perceptReceived', (data) => {
    console.log('✅ Cognizer acknowledged percept');
  });
  
  state.cognizerSocket.on('disconnect', () => {
    console.log('⚫ Cognizer disconnected');
    state.cognizerConnected = false;
  });
  
  state.cognizerSocket.on('connect_error', (error) => {
    console.error('❌ Cognizer connection error:', error.message);
  });
}

function startCognizerSession() {
  if (!state.cognizerSocket || !state.cognizerSocket.connected) {
    console.error('❌ Cannot start session: Cognizer not connected');
    return;
  }
  
  state.sessionId = `perceptor-circumplex-${Date.now()}`;
  state.cognizerSocket.emit('startSession', { sessionId: state.sessionId });
  console.log('📤 Starting Cognizer session:', state.sessionId);
}

function endCognizerSession() {
  if (state.cognizerSocket && state.sessionId) {
    state.cognizerSocket.emit('endSession', { sessionId: state.sessionId });
    console.log('📤 Ended Cognizer session:', state.sessionId);
    state.cognizerConnected = false;
    state.sessionId = null;
  }
}

function forwardPercept(percept, type) {
  if (!state.cognizerConnected || !state.cognizerSocket) {
    console.warn('⚠️ Cognizer not connected, skipping percept');
    return;
  }
  
  state.cognizerSocket.emit('percept', {
    sessionId: state.sessionId,
    type,
    data: percept,
    timestamp: new Date().toISOString()
  });
  
  console.log(`→ Forwarded ${type} percept to Cognizer`);
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
      
      // Send setup message
      sendSetup();
      
      // Start streaming
      startStreaming();
    };
    
    state.ws.onmessage = handleResponse;
    
    state.ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };
    
    state.ws.onclose = () => {
      console.log('🔌 WebSocket closed');
      state.connected = false;
      state.streaming = false;
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
        responseMimeType: 'application/json',
        temperature: 0.7,
        maxOutputTokens: 2048
      },
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }]
      }
    }
  };
  
  state.ws.send(JSON.stringify(setup));
  console.log('📋 Setup sent with Guided analysis profile');
}

// Send analysis request after frames
function requestAnalysis() {
  try {
    // Send a text prompt to trigger analysis
    state.ws.send(JSON.stringify({
      clientContent: {
        turns: [{
          role: 'user',
          parts: [{
            text: 'Analyze the current audio and video.'
          }]
        }],
        turnComplete: true
      }
    }));
    
    console.log('🔄 Requested analysis');
    
  } catch (error) {
    console.error('❌ Error requesting analysis:', error);
  }
}

// ============================================
// SECTION 7: Streaming
// ============================================

function startStreaming() {
  state.streaming = true;
  
  // Start Cognizer session
  startCognizerSession();
  
  // Start continuous audio streaming
  startAudioStreaming();
  
  // Periodic visual analysis requests (triggers response)
  state.streamInterval = setInterval(() => {
    if (!state.streaming || !state.connected) return;
    
    captureAndAnalyze();
    
  }, 8000); // 8 seconds between visual analyses
  
  console.log('🎬 Streaming started (continuous audio + 8s visual analysis)');
}

// Continuous audio streaming via realtimeInput
function startAudioStreaming() {
  // Send audio every 1000ms (1 second)
  state.audioInterval = setInterval(() => {
    if (!state.streaming || !state.connected) return;
    
    if (state.pcmBuffer.length > 0) {
      sendAudioChunk();
    }
  }, 1000); // 1 second between audio chunks
}

function sendAudioChunk() {
  try {
    const pcmData = new Uint8Array(state.pcmBuffer);
    state.pcmBuffer = [];
    
    // Convert to base64 in chunks to avoid stack overflow
    let base64Audio = '';
    const chunkSize = 32768;
    for (let i = 0; i < pcmData.length; i += chunkSize) {
      const chunk = pcmData.subarray(i, Math.min(i + chunkSize, pcmData.length));
      base64Audio += btoa(String.fromCharCode.apply(null, Array.from(chunk)));
    }
    
    state.ws.send(JSON.stringify({
      realtimeInput: {
        mediaChunks: [{
          mimeType: 'audio/pcm;rate=16000',
          data: base64Audio
        }]
      }
    }));
    
    console.log(`📤 Sent audio chunk (${pcmData.length} bytes)`);
    
  } catch (error) {
    console.error('❌ Error sending audio:', error);
  }
}

// Capture video and request analysis (triggers model response)
async function captureAndAnalyze() {
  try {
    const video = document.getElementById('webcam');
    if (!video.videoWidth || !video.videoHeight) {
      console.warn('⚠️ Video not ready yet');
      return;
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, 640, 480);
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    const base64Video = dataUrl.split(',')[1];
    
    // Build context-aware prompt
    let promptText;
    if (state.lastVisualDescription) {
      promptText = `Previous visual description: "${state.lastVisualDescription}"\n\nAnalyze the current emotional state from audio and video. For the visual description, ONLY describe what has CHANGED since the previous description.`;
    } else {
      promptText = 'Analyze the current emotional state from audio and video. This is the FIRST analysis - provide a complete description of the scene.';
    }
    
    // Send visual snapshot with analysis request
    // Audio context accumulates from realtimeInput
    state.ws.send(JSON.stringify({
      clientContent: {
        turns: [{
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Video
              }
            },
            {
              text: promptText
            }
          ]
        }],
        turnComplete: true
      }
    }));
    
    console.log(`📤 Sent visual analysis request (640x480 JPEG)`);
    
  } catch (error) {
    console.error('❌ Error in captureAndAnalyze:', error);
  }
}

function sendAudioFrame() {
  try {
    // Always send audio frame, even if empty
    // This keeps the stream continuous
    const pcmData = state.pcmBuffer.length > 0 
      ? new Uint8Array(state.pcmBuffer)
      : new Uint8Array(0); // Empty array for silence
    
    // Convert to base64 in chunks to avoid stack overflow
    let base64Audio = '';
    const chunkSize = 32768; // Process 32KB at a time
    
    for (let i = 0; i < pcmData.length; i += chunkSize) {
      const chunk = pcmData.subarray(i, Math.min(i + chunkSize, pcmData.length));
      base64Audio += btoa(String.fromCharCode.apply(null, Array.from(chunk)));
    }
    
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
  
  // End Cognizer session
  endCognizerSession();
  
  if (state.streamInterval) {
    clearInterval(state.streamInterval);
    state.streamInterval = null;
  }
  
  if (state.audioInterval) {
    clearInterval(state.audioInterval);
    state.audioInterval = null;
  }
  
  if (state.ws) {
    state.ws.close();
    state.ws = null;
  }
  
  console.log('🛑 Streaming stopped');
}

async function reconnectWithNewPrompt() {
  // Stop current streaming but keep hardware running
  state.streaming = false;
  
  if (state.streamInterval) {
    clearInterval(state.streamInterval);
    state.streamInterval = null;
  }
  
  if (state.ws) {
    state.ws.close();
    state.ws = null;
  }
  
  // Clear buffers
  state.pcmBuffer = [];
  state.responseBuffer = '';
  
  console.log('🔄 Reconnecting...');
  
  // Brief pause to ensure clean disconnect
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Reconnect with new prompt
  await connectGemini();
  
  console.log('✅ Reconnected with Guided analysis profile');
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
      console.log('✅ Turn complete');
      
      // Extract JSON from response
      let jsonText = state.responseBuffer.trim();
      
      // Remove markdown code fences if present
      if (jsonText.includes('```')) {
        // Try to extract between fences
        const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fenceMatch && fenceMatch[1]) {
          jsonText = fenceMatch[1].trim();
          console.log('📦 Extracted from markdown fences');
        } else {
          // Just strip all fence markers
          jsonText = jsonText.replace(/```json/gi, '').replace(/```/g, '').trim();
          console.log('📦 Stripped fence markers');
        }
      }
      
      // Validate JSON is complete (ends with })
      if (!jsonText.endsWith('}')) {
        console.warn('⚠️ Incomplete JSON - missing closing brace. Skipping.');
        state.responseBuffer = '';
        return;
      }
      
      // Try to parse
      try {
        const response = JSON.parse(jsonText);
        console.log('🎤 Circumplex Response:', response);
        
        updateUI(response);
        
      } catch (e) {
        console.warn('⚠️ Invalid JSON. Parse error:', e.message);
        console.warn('First 200 chars:', state.responseBuffer.substring(0, 200));
        console.warn('Last 200 chars:', state.responseBuffer.substring(Math.max(0, state.responseBuffer.length - 200)));
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
  // Update audio display
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
  
  // Update visual display
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
  
  // Update visualization with whichever data is available
  if (state.circumplexViz) {
    let valence = 0;
    let arousal = 0;
    let count = 0;
    
    // Average available values
    if (response.audio && typeof response.audio.valence === 'number') {
      valence += response.audio.valence;
      arousal += response.audio.arousal;
      count++;
    }
    
    if (response.visual && typeof response.visual.valence === 'number') {
      valence += response.visual.valence;
      arousal += response.visual.arousal;
      count++;
    }
    
    // Plot if we have at least one value
    if (count > 0) {
      state.circumplexViz.plot(valence / count, arousal / count);
    }
  }
  
  // SPLIT INTO SEPARATE PERCEPTS for cognizer
  
  // Send audio percept if we have real audio data with valid circumplex coordinates
  if (response.audio && 
      response.audio.transcript && 
      response.audio.transcript.toLowerCase() !== 'silence' &&
      typeof response.audio.valence === 'number' &&
      typeof response.audio.arousal === 'number') {
    
    const audioPercept = {
      type: 'audio',
      transcript: response.audio.transcript,
      valence: response.audio.valence,
      arousal: response.audio.arousal,
      sigilPhrase: response.audio.sigilPhrase || null,
      drawCalls: response.audio.drawCalls || null,
      timestamp: new Date().toISOString()
    };
    
    console.log('%c🎤 AUDIO PERCEPT', 'font-weight: bold; font-size: 16px; color: #00ff00; background: #000; padding: 8px 12px;');
    console.log('%c' + audioPercept.transcript, 'font-size: 14px; color: #00ff00; font-weight: bold;');
    console.log('%cValence: ' + audioPercept.valence.toFixed(2) + ' | Arousal: ' + audioPercept.arousal.toFixed(2), 'font-size: 12px; color: #00ff00;');
    if (audioPercept.sigilPhrase) {
      console.log('%c✨ Sigil: ' + audioPercept.sigilPhrase, 'font-size: 12px; color: #ffcc00; font-weight: bold;');
    }
    console.log(audioPercept);
    
    // Create toast
    createPerceptToast(audioPercept, 'audio');
    
    // Forward to cognizer
    forwardPercept(audioPercept, 'audio');
  }
  
  // Send visual percept if we have real visual data with valid circumplex coordinates
  if (response.visual && 
      response.visual.description && 
      !response.visual.description.includes('No visual information') &&
      !response.visual.description.match(/^NO CHANGES?\.?$/i) &&  // Filter "NO CHANGE" / "NO CHANGES"
      response.visual.description.trim().length > 5 &&  // Must be meaningful
      typeof response.visual.valence === 'number' &&
      typeof response.visual.arousal === 'number') {
    
    const visualPercept = {
      type: 'visual',
      description: response.visual.description,
      valence: response.visual.valence,
      arousal: response.visual.arousal,
      sigilPhrase: response.visual.sigilPhrase || null,
      drawCalls: response.visual.drawCalls || null,
      timestamp: new Date().toISOString()
    };
    
    console.log('%c👁️ VISUAL PERCEPT', 'font-weight: bold; font-size: 16px; color: #00d4ff; background: #000; padding: 8px 12px;');
    console.log('%c' + visualPercept.description, 'font-size: 14px; color: #00d4ff; font-weight: bold;');
    console.log('%cValence: ' + visualPercept.valence.toFixed(2) + ' | Arousal: ' + visualPercept.arousal.toFixed(2), 'font-size: 12px; color: #00d4ff;');
    if (visualPercept.sigilPhrase) {
      console.log('%c✨ Sigil: ' + visualPercept.sigilPhrase, 'font-size: 12px; color: #ffcc00; font-weight: bold;');
    }
    console.log(visualPercept);
    
    // Create toast
    createPerceptToast(visualPercept, 'visual');
    
    // Store for next analysis
    state.lastVisualDescription = response.visual.description;
    
    // Forward to cognizer
    forwardPercept(visualPercept, 'visual');
  }
}

// ============================================
// Toast Management
// ============================================

function createPerceptToast(percept, type) {
  const container = document.getElementById('toast-container');
  const toast = new PerceptToast(percept, type);
  const element = toast.create();
  
  // Add to bottom (pushes older ones up due to column-reverse)
  container.appendChild(element);
  
  // Limit to 4 toasts
  while (container.children.length > 4) {
    container.removeChild(container.firstChild);
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

// ============================================
// SECTION 10: Main Control
// ============================================

async function toggleStreaming() {
  const btn = document.getElementById('toggle-btn');
  
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

