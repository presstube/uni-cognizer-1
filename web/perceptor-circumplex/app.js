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
  
  // Prompt Profile
  promptProfile: 'guided',  // default
  
  // Audio buffer
  pcmBuffer: [],
  
  // Streaming intervals
  streamInterval: null,
  audioInterval: null,
  
  // Visualization
  circumplexViz: null,
  
  // Context tracking
  lastVisualDescription: null
};

// ============================================
// SECTION 2: System Prompt Profiles
// ============================================

const SYSTEM_PROMPTS = {
  minimal: {
    name: 'Minimal (Original)',
    prompt: `You are analyzing a real-time audio and video stream.

For AUDIO, provide:
- transcript: What you hear (speech, humming, singing, sounds, or "silence")
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

Analyze both audio and visual. Include non-verbal sounds like humming and breathing.`
  },
  
  guided: {
    name: 'Guided (Recommended)',
    prompt: `You are analyzing real-time audio and video to assess emotional state using Russell's Circumplex Model.

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

RESPONSE FORMAT - IMPORTANT:
Return ONLY the modalities that have meaningful data:
- If audio is silence or absent, OMIT the entire "audio" field
- If visual has no meaningful information, OMIT the entire "visual" field
- Return whichever has actual content - could be audio only, visual only, or both if both are meaningful
- This saves tokens and reduces noise

STRICT JSON OUTPUT:
- Return ONLY valid JSON, no markdown, no explanations, no preamble
- Do not wrap in code fences (no \`\`\`json)
- Start directly with the opening brace {
- End directly with the closing brace }

Return JSON (include only fields with meaningful data):
{
  "audio": {  // OMIT this entire field if silence or no audio
    "transcript": "...",
    "valence": 0.5,
    "arousal": 0.3,
    "sigilPhrase": "2-4 word phrase",
    "drawCalls": "ctx.beginPath();\\nctx.moveTo(50,20);\\n...\\nctx.stroke();"
  },
  "visual": {  // OMIT this entire field if no meaningful visual
    "description": "...",
    "valence": 0.4,
    "arousal": 0.2,
    "sigilPhrase": "2-4 word phrase",
    "drawCalls": "ctx.beginPath();\\nctx.moveTo(50,20);\\n...\\nctx.stroke();"
  }
}

Rate both dimensions independently based on what you observe.`
  },
  
  detailed: {
    name: 'Detailed (Granular)',
    prompt: `You are a precision emotional analyzer using Russell's Circumplex Model to assess real-time multimodal inputs.

SCORING FRAMEWORK:
- VALENCE: -1.0 (very negative) → 0.0 (neutral) → +1.0 (very positive)
- AROUSAL: -1.0 (very calm/inactive) → 0.0 (moderate) → +1.0 (very energized/activated)

AUDIO ANALYSIS - Consider these factors:
1. NON-VERBAL SOUNDS (40%): Humming, singing, whistling, breathing patterns, sighs, laughter, groans, vocal sounds
2. PROSODIC (35%): Pitch variation, volume, speaking rate, rhythm, intonation, melody
3. LEXICAL (25%): Word choice, semantic content, conversational topics (if speech present)

If NO SPEECH:
- transcript = describe sounds ("humming", "breathing", "silence", "soft singing", etc.)

VALENCE cues (Audio):
- Positive (+0.5 to +1.0): Upbeat humming, enthusiastic words, rising intonation, laughter, light breathing
- Neutral (-0.2 to +0.2): Matter-of-fact speech, steady breathing, minimal affect
- Negative (-0.5 to -1.0): Groaning, sighs, negative words, flat/falling tone, complaints, heavy breathing

AROUSAL cues (Audio):
- High (+0.5 to +1.0): Fast speech, loud volume, high pitch, rapid breathing, energetic humming, exclamations
- Moderate (-0.2 to +0.2): Normal conversational pace and volume, steady breathing
- Low (-0.5 to -1.0): Slow speech, soft volume, low pitch, long pauses, monotone, slow breathing

VISUAL ANALYSIS - Consider these factors:
1. FACIAL (50%): Mouth (smile/frown), eyes (wide/narrow), eyebrows (raised/furrowed), overall tension, micro-expressions
2. BODY (30%): Posture, gesture frequency/size, head movements, openness, proximity
3. ACTIVITY (20%): Movement speed, stillness vs fidgeting, energy level

VALENCE cues (Visual):
- Positive (+0.5 to +1.0): Genuine smile (Duchenne), bright eyes, open posture, relaxed face, playful gestures
- Neutral (-0.2 to +0.2): Relaxed neutral face, normal posture, minimal expression
- Negative (-0.5 to -1.0): Frown, downturned mouth, furrowed brow, closed/defensive posture, tense face

AROUSAL cues (Visual):
- High (+0.5 to +1.0): Wide eyes, rapid gestures, quick movements, forward lean, high energy, animated
- Moderate (-0.2 to +0.2): Normal blinking, occasional gestures, steady posture
- Low (-0.5 to -1.0): Heavy eyelids, minimal movement, slouched, very still, withdrawn, low energy

CALIBRATION:
- Use the full -1 to +1 range
- Be sensitive to subtle changes
- Audio and visual can diverge (e.g., forced smile with sad voice)

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

Analyze objectively and precisely.`
  },
  
  expressive: {
    name: 'Expressive (Creative)',
    prompt: `You are an empathetic emotional observer analyzing human expression through audio and video.

Your goal: Capture the emotional landscape using VALENCE (pleasure) and AROUSAL (energy).

AUDIO - Listen for ALL sounds, not just words:
- VERBAL: What WORDS say (if any speech present)
- NON-VERBAL: Humming, singing, whistling, breathing, sighs, laughter, groans, vocal sounds
- What FEELING is in the sounds? (joy, sadness, anger, contentment)
- What ENERGY is in the voice/sounds? (excited, calm, agitated, subdued)
- How does the MELODY reveal emotion? (upbeat humming, sad sighing, nervous breathing)

If NO SPEECH: Describe the soundscape ("soft humming", "quiet breathing", "peaceful silence")

VISUAL - Watch for the body's truth:
- What does the FACE say? (genuine smile vs polite mask, furrowed worry, bright surprise, subtle shifts)
- What does the BODY show? (open invitation vs closed defense, energized animation vs tired stillness)
- How does MOVEMENT express? (excited gestures, nervous fidgeting, defeated slumping, confident posture)
- What are the EYES telling you? (bright engagement, tired distance, worried scanning)

VALENCE is the emotional color:
- POSITIVE: Warmth, light, openness, pleasure, satisfaction, contentment, playfulness
- NEGATIVE: Coldness, darkness, tension, displeasure, distress, discomfort, withdrawal
- Scale: -1 (deeply unpleasant) to +1 (deeply pleasant)

AROUSAL is the emotional intensity:
- HIGH: Activated, energized, alert, stimulated, pumped, wired, animated
- LOW: Deactivated, sluggish, drowsy, relaxed, tranquil, still, peaceful
- Scale: -1 (very low energy) to +1 (very high energy)

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

Trust your perception. Small details matter. Feel the emotion, then measure it.`
  },
  
  visualPrimary: {
    name: 'Visual Primary (Silent OK)',
    prompt: `You are analyzing real-time video with optional audio.

VISUAL ANALYSIS (primary focus):
Analyze the person's emotional state from:
- FACE: Smile, frown, eye openness, eyebrow position, tension, micro-expressions
- BODY: Posture, gestures, movement speed, openness, proximity
- ENERGY: Animation level, fidgeting, stillness, intensity

AUDIO ANALYSIS (supplementary):
If you hear sound (verbal or non-verbal):
- transcript: Describe it ("speaking happily", "humming", "breathing", "silence", "laughing", "sighing")
- Rate valence/arousal based on vocal qualities

If audio is silent or unclear:
- transcript: "silence" or "unclear audio"
- Rate valence/arousal based on visual context

SCORING:
- VALENCE: -1 (negative/unpleasant) to +1 (positive/pleasant)
- AROUSAL: -1 (calm/low energy) to +1 (energized/high energy)

Return JSON:
{
  "audio": {
    "transcript": "silence",
    "valence": 0.0,
    "arousal": 0.0
  },
  "visual": {
    "description": "person smiling warmly at camera",
    "valence": 0.8,
    "arousal": 0.3
  }
}

Prioritize visual analysis. Audio provides additional context when available.`
  }
};

// ============================================
// SECTION 3: Initialization
// ============================================

function init() {
  console.log('🚀 Initializing Perceptor Circumplex v2...');
  loadApiKey();
  loadPromptProfile();
  setupEventListeners();
  initializeVisualization();
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

function loadPromptProfile() {
  const stored = localStorage.getItem('promptProfile');
  const select = document.getElementById('prompt-profile-select');
  
  if (stored && SYSTEM_PROMPTS[stored]) {
    select.value = stored;
    state.promptProfile = stored;
    console.log(`💾 Loaded prompt profile: ${SYSTEM_PROMPTS[stored].name}`);
  } else {
    // Default to 'guided'
    select.value = 'guided';
    state.promptProfile = 'guided';
  }
}

function savePromptProfile() {
  const select = document.getElementById('prompt-profile-select');
  const value = select.value;
  
  if (SYSTEM_PROMPTS[value]) {
    localStorage.setItem('promptProfile', value);
    state.promptProfile = value;
    console.log(`💾 Prompt profile saved: ${SYSTEM_PROMPTS[value].name}`);
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
  
  // Handle prompt profile change
  select.addEventListener('change', async () => {
    savePromptProfile();
    
    // If currently streaming, need to reconnect with new prompt
    if (state.streaming) {
      console.log('🔄 Prompt changed - reconnecting with new profile...');
      await reconnectWithNewPrompt();
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
  const currentPrompt = SYSTEM_PROMPTS[state.promptProfile].prompt;
  
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
        parts: [{ text: currentPrompt }]
      }
    }
  };
  
  state.ws.send(JSON.stringify(setup));
  console.log(`📋 Setup sent: ${SYSTEM_PROMPTS[state.promptProfile].name}`);
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
  
  console.log(`✅ Reconnected with ${SYSTEM_PROMPTS[state.promptProfile].name} profile`);
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
  
  // Send audio percept if we have real audio data
  if (response.audio && 
      response.audio.transcript && 
      response.audio.transcript.toLowerCase() !== 'silence' &&
      (response.audio.valence !== 0 || response.audio.arousal !== 0)) {
    
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
    
    // TODO: Send to cognizer when integrated
  }
  
  // Send visual percept if we have real visual data
  if (response.visual && 
      response.visual.description && 
      !response.visual.description.includes('No visual information') &&
      !response.visual.description.match(/^NO CHANGES?\.?$/i) &&  // Filter "NO CHANGE" / "NO CHANGES"
      response.visual.description.trim().length > 5 &&  // Must be meaningful
      (response.visual.valence !== 0 || response.visual.arousal !== 0)) {
    
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
    
    // TODO: Send to cognizer when integrated
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

