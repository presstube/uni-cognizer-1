# Perceptor Circumplex v2 - Simple Implementation Plan

**Goal**: Dead simple standalone page that gets valence/arousal from multimodal Gemini Live.

**Philosophy**: Let Gemini do the work. No feature extraction, no complexity.

---

## What It Does

1. Shows full-screen video feed
2. User enters API key (reused component from perceptor-remote)
3. Clicks START
4. Sends audio + video to **single** Gemini Live WebSocket
5. Gets back:
   - Audio transcript + circumplex pair `[valence, arousal]`
   - Visual description + circumplex pair `[valence, arousal]`
6. (Future) Visualizes on 2D circumplex plot

---

## File Structure

```
/web/perceptor-circumplex/
  ├── index.html          # Minimal structure
  ├── app.js              # Core logic (~150 lines)
  ├── circumplex.css      # Minimal styling
  └── README.md           # Quick start guide
```

**Total**: ~300 lines of code (vs. 1000+ in v1)

---

## UI Layout

```
┌─────────────────────────────────────────┐
│                                         │
│                                         │
│         Full-Screen Video Feed          │
│                                         │
│                                         │
│                                         │
├─────────────────────────────────────────┤
│  [API Key: _______________]             │
│  [START]                                │
└─────────────────────────────────────────┘
```

**Later**: Add circumplex viz overlay in corner after we validate responses

---

## System Prompt (Hardcoded for Now)

```javascript
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
```

---

## Implementation Steps

### Step 1: HTML Structure (~30 lines)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Perceptor Circumplex</title>
  <link rel="stylesheet" href="circumplex.css">
</head>
<body>
  <!-- Full-screen video -->
  <video id="webcam" autoplay playsinline muted></video>
  
  <!-- Control panel -->
  <div id="controls">
    <label for="api-key">API Key</label>
    <input type="text" id="api-key" placeholder="Enter Gemini API key or 'onthehouse'" />
    <button id="start-btn">START</button>
    <div id="status">⚫ Disconnected</div>
  </div>
  
  <!-- Response display (debug for now) -->
  <div id="response">
    <h3>Audio</h3>
    <p id="audio-transcript">...</p>
    <p id="audio-circumplex">Valence: -- | Arousal: --</p>
    
    <h3>Visual</h3>
    <p id="visual-description">...</p>
    <p id="visual-circumplex">Valence: -- | Arousal: --</p>
  </div>
  
  <script type="module" src="app.js"></script>
</body>
</html>
```

### Step 2: CSS (~40 lines)

```css
/* Full-screen video */
body {
  margin: 0;
  font-family: system-ui, -apple-system, sans-serif;
  background: #000;
  color: #fff;
}

#webcam {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  object-fit: cover;
  z-index: 1;
}

/* Controls overlay */
#controls {
  position: fixed;
  bottom: 20px;
  left: 20px;
  z-index: 10;
  background: rgba(0, 0, 0, 0.8);
  padding: 20px;
  border-radius: 8px;
  backdrop-filter: blur(10px);
}

#api-key {
  width: 300px;
  padding: 8px;
  margin: 8px 0;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #fff;
  border-radius: 4px;
}

#start-btn {
  padding: 10px 20px;
  background: #00d4ff;
  border: none;
  border-radius: 4px;
  color: #000;
  font-weight: bold;
  cursor: pointer;
}

#start-btn:hover {
  background: #00b8e6;
}

#status {
  margin-top: 10px;
  font-size: 14px;
}

/* Response display */
#response {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10;
  background: rgba(0, 0, 0, 0.8);
  padding: 20px;
  border-radius: 8px;
  max-width: 400px;
  backdrop-filter: blur(10px);
}

#response h3 {
  margin: 0 0 10px 0;
  font-size: 16px;
  color: #00d4ff;
}

#response p {
  margin: 5px 0;
  font-size: 14px;
  line-height: 1.4;
}
```

### Step 3: JavaScript Core (~150 lines)

```javascript
// State
const state = {
  videoStream: null,
  audioContext: null,
  audioSource: null,
  audioProcessor: null,
  ws: null,  // Single WebSocket for both audio + video
  connected: false,
  streaming: false,
  responseBuffer: '',
  apiKey: null,
  pcmBuffer: []
};

// Initialize
async function init() {
  loadApiKey();
  setupEventListeners();
}

// API Key Management (from perceptor-remote)
function loadApiKey() {
  const stored = localStorage.getItem('geminiApiKey');
  const input = document.getElementById('api-key');
  
  if (stored) {
    input.value = stored;
    state.apiKey = stored;
  }
}

function saveApiKey() {
  const input = document.getElementById('api-key');
  const value = input.value.trim();
  
  if (value) {
    localStorage.setItem('geminiApiKey', value);
    state.apiKey = value;
    console.log('💾 API key saved');
  }
}

function setupEventListeners() {
  const input = document.getElementById('api-key');
  const btn = document.getElementById('start-btn');
  
  input.addEventListener('blur', saveApiKey);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      saveApiKey();
      input.blur();
    }
  });
  
  btn.addEventListener('click', toggleStreaming);
}

// Hardware Setup
async function startHardware() {
  try {
    // Get video + audio
    state.videoStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 720 },
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
    
    // Setup audio processing
    state.audioContext = new AudioContext({ sampleRate: 16000 });
    state.audioSource = state.audioContext.createMediaStreamSource(state.videoStream);
    state.audioProcessor = state.audioContext.createScriptProcessor(4096, 1, 1);
    
    state.audioProcessor.onaudioprocess = (event) => {
      const samples = event.inputBuffer.getChannelData(0);
      const pcm = convertToPCM16(samples);
      state.pcmBuffer.push(...pcm);
    };
    
    state.audioSource.connect(state.audioProcessor);
    state.audioProcessor.connect(state.audioContext.destination);
    
    console.log('✅ Hardware ready');
    
  } catch (error) {
    console.error('❌ Hardware error:', error);
    alert('Failed to access camera/microphone');
  }
}

// WebSocket Connection
async function connectGemini() {
  try {
    // Get API key (ephemeral if "onthehouse")
    let apiKey = state.apiKey;
    
    if (apiKey === 'onthehouse') {
      const res = await fetch('/api/gemini/token');
      const data = await res.json();
      apiKey = data.token;
      console.log('🏠 Using ephemeral token');
    }
    
    // Connect to Gemini Live
    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
    
    state.ws = new WebSocket(wsUrl);
    
    state.ws.onopen = () => {
      console.log('🔌 WebSocket connected');
      state.connected = true;
      updateStatus('🟢 Connected');
      
      // Send setup message with system prompt
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
      updateStatus('⚫ Disconnected');
    };
    
  } catch (error) {
    console.error('❌ Connection error:', error);
  }
}

// Send Setup Message
function sendSetup() {
  const setup = {
    setup: {
      model: 'models/gemini-2.0-flash-exp',
      generationConfig: {
        responseModalities: 'text',
        temperature: 0.7
      },
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }]
      }
    }
  };
  
  state.ws.send(JSON.stringify(setup));
  console.log('📋 Setup sent');
}

// Streaming
function startStreaming() {
  state.streaming = true;
  
  // Send audio + video every 2 seconds
  setInterval(() => {
    if (!state.streaming || !state.connected) return;
    
    // Send audio PCM
    if (state.pcmBuffer.length > 0) {
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
      
      state.pcmBuffer = [];
    }
    
    // Send video frame
    const video = document.getElementById('webcam');
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, 640, 480);
    
    canvas.toBlob((blob) => {
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
      };
      reader.readAsDataURL(blob);
    }, 'image/jpeg', 0.8);
    
  }, 2000);
  
  console.log('🎬 Streaming started');
}

// Handle Responses
function handleResponse(event) {
  const data = JSON.parse(event.data);
  
  if (data.serverContent?.turnComplete) {
    try {
      const response = JSON.parse(state.responseBuffer);
      console.log('🎤 Response:', response);
      
      // Update UI
      if (response.audio) {
        document.getElementById('audio-transcript').textContent = response.audio.transcript;
        document.getElementById('audio-circumplex').textContent = 
          `Valence: ${response.audio.valence.toFixed(2)} | Arousal: ${response.audio.arousal.toFixed(2)}`;
      }
      
      if (response.visual) {
        document.getElementById('visual-description').textContent = response.visual.description;
        document.getElementById('visual-circumplex').textContent = 
          `Valence: ${response.visual.valence.toFixed(2)} | Arousal: ${response.visual.arousal.toFixed(2)}`;
      }
      
      state.responseBuffer = '';
      
    } catch (e) {
      console.warn('⚠️ Invalid JSON:', state.responseBuffer);
    }
  } else if (data.serverContent?.modelTurn) {
    // Accumulate response
    data.serverContent.modelTurn.parts.forEach(part => {
      if (part.text) {
        state.responseBuffer += part.text;
      }
    });
  }
}

// Utils
function convertToPCM16(samples) {
  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    pcm[i] = Math.max(-32768, Math.min(32767, samples[i] * 32768));
  }
  return Array.from(new Uint8Array(pcm.buffer));
}

function updateStatus(text) {
  document.getElementById('status').textContent = text;
}

async function toggleStreaming() {
  const btn = document.getElementById('start-btn');
  
  if (!state.streaming) {
    // Validate API key
    if (!state.apiKey) {
      alert('Please enter an API key');
      return;
    }
    
    btn.textContent = 'STARTING...';
    btn.disabled = true;
    
    await startHardware();
    await connectGemini();
    
    btn.textContent = 'STOP';
    btn.disabled = false;
    
  } else {
    // Stop streaming
    state.streaming = false;
    state.ws?.close();
    state.videoStream?.getTracks().forEach(t => t.stop());
    state.audioContext?.close();
    
    btn.textContent = 'START';
    updateStatus('⚫ Disconnected');
  }
}

// System Prompt
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

// Initialize on load
init();
```

---

## Key Design Decisions

### 1. **Single WebSocket**
- One connection for both audio + video
- Sends audio/pcm + image/jpeg in same stream
- Simpler than dual WebSocket setup

### 2. **Hardcoded Prompt**
- No database dependency initially
- Easy to iterate and test
- Move to DB after validation

### 3. **No Feature Extraction**
- Let Gemini figure it out
- Just send raw audio/video
- Trust the model

### 4. **Minimal UI**
- Full-screen video
- Small control panel (bottom-left)
- Debug response panel (top-right)
- Add circumplex viz later

### 5. **Reused Pattern**
- API key management from perceptor-remote
- Token handling (BYOT + "onthehouse")
- Same WebSocket pattern

---

## Testing Plan

### Phase 1: Connection
1. Load page → see video feed
2. Enter API key → saves to localStorage
3. Click START → hardware initializes
4. Check console → WebSocket connects

### Phase 2: Streaming
1. Speak into microphone
2. Move around in frame
3. Check console → packets sending every 2s
4. Verify no errors

### Phase 3: Responses
1. Check response panel updates
2. Verify transcript appears
3. Verify description appears
4. Check valence/arousal numbers (-1 to +1)
5. Test emotional variations (happy, sad, excited, calm)

### Phase 4: Validation
1. Do valence numbers match emotional tone?
2. Do arousal numbers match energy level?
3. Is audio circumplex different from visual?
4. Are responses consistent over time?

---

## Next Steps (After Validation)

1. **Add circumplex visualization** (2D canvas plot)
2. **Combine audio + visual** into single coordinate pair (weighted average?)
3. **Connect to cognizer** (send as percepts)
4. **Move prompt to database** (use audio-prompt-editor)
5. **Polish UI** (animations, better layout)
6. **Add trajectory trail** (show emotional movement over time)

---

## Success Criteria

✅ Page loads with video feed  
✅ API key persists  
✅ Single WebSocket connection  
✅ Audio + video streaming  
✅ JSON responses parse correctly  
✅ Valence/arousal numbers in range (-1 to +1)  
✅ Emotional changes reflect in numbers  
✅ No crashes or errors  

---

## Why This Will Work

1. **Simplicity**: ~300 lines total vs. 1000+ in v1
2. **Gemini is smart**: It already understands emotion from multimodal input
3. **No premature optimization**: We're not extracting features the model doesn't need
4. **Fast iteration**: Hardcoded prompt means instant testing
5. **Standalone**: No dependencies on cognizer or database initially

---

## Estimated Timeline

- **HTML/CSS**: 30 minutes
- **JavaScript core**: 1-2 hours
- **Testing/debugging**: 1 hour
- **Total**: 2-3 hours for MVP

Then we validate the concept before adding visualization or cognizer integration.

---

**Status**: Ready to implement  
**Next**: Create files and test

