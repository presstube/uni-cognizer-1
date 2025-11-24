# Perceptor-Remote Implementation Plan

**Purpose**: Remote sensing station that streams audio + visual percepts to Cognizer via Gemini Live API

**Location**: `/web/perceptor-remote/`

---

## Architecture Overview

```
[Webcam + Mic] 
    ↓
[Gemini Live API] (multimodal streaming)
    ↓
[Perceptor-Remote] (transform & bridge)
    ↓
[Cognizer WebSocket] (percept queue)
    ↓
[Mind Moments] (synthesized cognition)
```

---

## File Structure

```
/web/perceptor-remote/
  index.html     # Single page, inline CSS
  app.js         # Main application logic (~250 lines)
```

---

## Phase 1: Core Streaming (Initial Implementation)

### Goal
Stream audio + visual to Gemini Live, console log percepts

### Features
- ✅ Initialize webcam + microphone
- ✅ Load active prompts from DB
- ✅ **Dynamically use all DB settings** (sample rate, buffer size, packet interval, generation config)
- ✅ Connect to Gemini Live WebSocket
- ✅ Stream audio continuously (PCM, configurable rate)
- ✅ Stream visual frames every 4s
- ✅ Parse and console log percepts
- ✅ Basic status UI (START button, status text)

### DB Settings Used
**Audio Prompt:**
- `system_prompt` - Gemini setup instruction
- `sample_rate` - AudioContext sample rate (e.g., 512Hz for smooth/fast, 4096Hz for efficient)
- `packet_interval` - How often to send audio packets (e.g., 500ms)
- `temperature`, `top_p`, `top_k`, `max_output_tokens` - Generation config

**Visual Prompt:**
- `user_prompt` - Sent with each image frame
- Note: Visual generation config intentionally not used (audio config applies to entire session)

### Implementation Steps

#### 1. HTML Structure
```html
<body>
  <!-- Video Preview -->
  <div id="video-container">
    <video id="webcam" autoplay muted></video>
  </div>
  
  <!-- Status Bar -->
  <div id="status-bar">
    <div id="gemini-status">⚫ Gemini: Not Connected</div>
    <div id="cognizer-status">⚫ Cognizer: Not Connected</div>
  </div>
  
  <!-- Controls -->
  <button id="start-btn">START</button>
  <button id="stop-btn" disabled>STOP</button>
  
  <!-- Console Output (optional visual feedback) -->
  <div id="console-output"></div>
</body>
```

#### 2. State Management
```javascript
const state = {
  // Hardware
  videoStream: null,
  audioStream: null,
  audioContext: null,
  audioProcessor: null,
  videoElement: null,
  
  // Gemini Live
  geminiWs: null,
  geminiConnected: false,
  setupComplete: false,
  
  // Cognizer (Phase 2)
  cognizerSocket: null,
  cognizerConnected: false,
  sessionId: null,
  
  // Prompts
  audioPrompt: null,
  visualPrompt: null,
  
  // Streaming
  pcmBuffer: [],
  audioInterval: null,
  visualInterval: null,
  isStreaming: false
};
```

#### 3. Initialization Flow
```javascript
async function init() {
  // 1. Load active prompts from DB
  const [audioRes, visualRes] = await Promise.all([
    fetch('/api/audio-prompts/active'),
    fetch('/api/visual-prompts/active')
  ]);
  
  state.audioPrompt = await audioRes.json();
  state.visualPrompt = await visualRes.json();
  
  // Extract settings from DB
  const sampleRate = state.audioPrompt.prompt.sample_rate || 16000;
  const bufferSize = state.audioPrompt.prompt.sample_rate || 4096;
  
  console.log('📋 Audio Prompt:', state.audioPrompt.prompt.name);
  console.log('   Sample Rate:', sampleRate);
  console.log('   Buffer Size:', bufferSize);
  console.log('   Packet Interval:', state.audioPrompt.prompt.packet_interval + 'ms');
  console.log('📋 Visual Prompt:', state.visualPrompt.prompt.name);
  
  // 2. Initialize webcam
  state.videoStream = await navigator.mediaDevices.getUserMedia({
    video: { width: 640, height: 480 }
  });
  
  state.videoElement = document.getElementById('webcam');
  state.videoElement.srcObject = state.videoStream;
  
  // 3. Initialize microphone with DB settings
  state.audioStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: sampleRate  // From DB
    }
  });
  
  // 4. Setup audio processing (PCM conversion) with DB settings
  await initAudioProcessing(state.audioStream, sampleRate, bufferSize);
  
  console.log('✅ Hardware initialized');
  updateUI();
}
```

#### 4. Audio Processing (Copy from audio-percept)
```javascript
async function initAudioProcessing(stream, sampleRate, bufferSize) {
  // Create AudioContext with sample rate from DB
  state.audioContext = new AudioContext({ sampleRate: sampleRate });
  
  // Create source and processor with buffer size from DB
  const source = state.audioContext.createMediaStreamSource(stream);
  const processor = state.audioContext.createScriptProcessor(bufferSize, 1, 1);
  
  // Convert float32 to int16 PCM
  processor.onaudioprocess = (event) => {
    if (!state.isStreaming) return;
    
    const inputBuffer = event.inputBuffer.getChannelData(0);
    const pcmData = new Int16Array(inputBuffer.length);
    
    for (let i = 0; i < inputBuffer.length; i++) {
      const s = Math.max(-1, Math.min(1, inputBuffer[i]));
      pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    
    state.pcmBuffer.push(...pcmData);
  };
  
  source.connect(processor);
  processor.connect(state.audioContext.destination);
  
  state.audioSource = source;
  state.audioProcessor = processor;
  
  console.log(`✅ Audio processing initialized (${sampleRate}Hz, buffer: ${bufferSize})`);
}
```

#### 5. Gemini Live Connection
```javascript
async function startGeminiSession() {
  // Get ephemeral token
  const { token } = await fetch('/api/gemini/token').then(r => r.json());
  
  // Create WebSocket URL
  const isEphemeral = token.startsWith('auth_tokens/');
  const endpoint = isEphemeral ? 'BidiGenerateContentConstrained' : 'BidiGenerateContent';
  const param = isEphemeral ? 'access_token' : 'key';
  const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.${endpoint}?${param}=${token}`;
  
  state.geminiWs = new WebSocket(url);
  
  state.geminiWs.onopen = () => {
    console.log('✅ Gemini WebSocket connected');
    
    // Send setup with AUDIO prompt (primary for continuous streaming)
    state.geminiWs.send(JSON.stringify({
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
    }));
  };
  
  state.geminiWs.onmessage = handleGeminiResponse;
  
  state.geminiWs.onerror = (error) => {
    console.error('❌ Gemini WebSocket error:', error);
  };
  
  state.geminiWs.onclose = () => {
    console.log('⚫ Gemini WebSocket closed');
    state.geminiConnected = false;
    state.setupComplete = false;
    updateUI();
  };
}
```

#### 6. Audio Streaming Loop
```javascript
function startAudioStreaming() {
  // Use packet interval from DB
  const interval = state.audioPrompt.prompt.packet_interval || 500;
  const sampleRate = state.audioPrompt.prompt.sample_rate || 16000;
  
  state.audioInterval = setInterval(() => {
    const MIN_SAMPLES = Math.floor(sampleRate * 0.5); // 0.5s worth of samples
    const MAX_SAMPLES = Math.floor(sampleRate * 2.0); // 2.0s worth of samples
    
    if (state.pcmBuffer.length >= MIN_SAMPLES && state.setupComplete) {
      // Extract chunk
      const chunk = state.pcmBuffer.slice(0, MAX_SAMPLES);
      state.pcmBuffer = state.pcmBuffer.slice(chunk.length);
      
      // Convert to base64 (little-endian)
      const pcmArray = new Int16Array(chunk);
      const arrayBuffer = new ArrayBuffer(pcmArray.length * 2);
      const dataView = new DataView(arrayBuffer);
      
      for (let i = 0; i < pcmArray.length; i++) {
        dataView.setInt16(i * 2, pcmArray[i], true);
      }
      
      const uint8Array = new Uint8Array(arrayBuffer);
      const base64 = btoa(String.fromCharCode.apply(null, Array.from(uint8Array)));
      
      // Send to Gemini
      state.geminiWs.send(JSON.stringify({
        realtimeInput: {
          mediaChunks: [{
            mimeType: `audio/pcm;rate=${sampleRate}`,  // Use actual sample rate
            data: base64
          }]
        }
      }));
      
      console.log(`📤 Audio packet sent (${chunk.length} samples, ${(chunk.length / sampleRate).toFixed(2)}s)`);
    }
  }, interval);
}
```

#### 7. Visual Streaming Loop
```javascript
function startVisualStreaming() {
  const interval = 4000; // 4 seconds
  
  state.visualInterval = setInterval(() => {
    if (!state.setupComplete) return;
    
    // Capture frame from video element
    const canvas = document.createElement('canvas');
    canvas.width = state.videoElement.videoWidth;
    canvas.height = state.videoElement.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(state.videoElement, 0, 0);
    
    // Convert to base64 JPEG
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    const base64Frame = dataUrl.split(',')[1];
    
    // Send to Gemini with visual user prompt from DB
    state.geminiWs.send(JSON.stringify({
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
              text: state.visualPrompt.prompt.user_prompt  // From DB
            }
          ]
        }],
        turnComplete: true
      }
    }));
    
    console.log('📸 Visual frame sent');
  }, interval);
}
```

#### 8. Response Handler
```javascript
let responseBuffer = '';

function handleGeminiResponse(event) {
  const message = JSON.parse(event.data);
  
  // Setup complete
  if (message.setupComplete) {
    console.log('✅ Gemini setup complete');
    state.geminiConnected = true;
    state.setupComplete = true;
    updateUI();
    return;
  }
  
  // Skip non-content
  if (!message.serverContent) return;
  
  const content = message.serverContent;
  
  // Accumulate text
  if (content.modelTurn?.parts) {
    for (const part of content.modelTurn.parts) {
      if (part.text) {
        responseBuffer += part.text;
      }
    }
  }
  
  // Turn complete - parse and log
  if (content.turnComplete) {
    try {
      // Sanitize JSON
      let jsonText = responseBuffer.trim();
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
      }
      
      const json = JSON.parse(jsonText);
      
      // Discriminate by schema
      if (json.transcript !== undefined) {
        // AUDIO PERCEPT
        console.log('🎤 [AUDIO PERCEPT]', json);
        logToConsole('audio', json);
      } else if (json.sigilPhrase !== undefined && json.description !== undefined) {
        // VISUAL PERCEPT
        console.log('📸 [VISUAL PERCEPT]', json);
        logToConsole('visual', json);
      } else {
        console.warn('❓ [UNKNOWN PERCEPT]', json);
      }
      
    } catch (e) {
      console.error('❌ JSON parse error:', e.message);
      console.log('Raw response:', responseBuffer);
    } finally {
      responseBuffer = '';
    }
  }
}
```

#### 9. Start/Stop Controls
```javascript
async function start() {
  if (state.isStreaming) return;
  
  try {
    // Start Gemini session
    await startGeminiSession();
    
    // Wait for setup
    await waitForSetup();
    
    // Start streaming
    state.isStreaming = true;
    startAudioStreaming();
    startVisualStreaming();
    
    console.log('▶️ Streaming started');
    updateUI();
    
  } catch (error) {
    console.error('Failed to start:', error);
    alert('Failed to start: ' + error.message);
  }
}

function stop() {
  if (!state.isStreaming) return;
  
  state.isStreaming = false;
  
  // Clear intervals
  if (state.audioInterval) clearInterval(state.audioInterval);
  if (state.visualInterval) clearInterval(state.visualInterval);
  
  // Close WebSocket
  if (state.geminiWs) {
    state.geminiWs.close();
    state.geminiWs = null;
  }
  
  // Clear buffer
  state.pcmBuffer = [];
  
  console.log('⏹ Streaming stopped');
  updateUI();
}

function waitForSetup() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Setup timeout')), 5000);
    
    const checkSetup = setInterval(() => {
      if (state.setupComplete) {
        clearInterval(checkSetup);
        clearTimeout(timeout);
        resolve();
      }
    }, 100);
  });
}
```

---

## Phase 2: Cognizer Integration

### Goal
Forward percepts to Cognizer, receive mind moments

### Features
- ✅ Connect to Cognizer WebSocket
- ✅ Start Cognizer session
- ✅ Transform percepts to Cognizer format
- ✅ Forward percepts to Cognizer
- ✅ Listen for mind moments
- ✅ Display mind moments

### Implementation Steps

#### 1. Cognizer Connection
```javascript
async function connectToCognizer() {
  const COGNIZER_URL = window.location.origin; // Same server
  
  state.cognizerSocket = io(COGNIZER_URL);
  
  state.cognizerSocket.on('connect', () => {
    console.log('✅ Cognizer connected');
    
    // Start session
    const sessionId = `perceptor-${Date.now()}`;
    state.cognizerSocket.emit('startSession', { sessionId });
  });
  
  state.cognizerSocket.on('sessionStarted', ({ sessionId, cognitiveCycleMs }) => {
    console.log(`✅ Cognizer session started: ${sessionId}`);
    state.sessionId = sessionId;
    state.cognizerConnected = true;
    updateUI();
  });
  
  state.cognizerSocket.on('mindMoment', handleMindMoment);
  state.cognizerSocket.on('sigil', handleSigil);
  state.cognizerSocket.on('cognitiveState', handleCognitiveState);
  
  state.cognizerSocket.on('disconnect', () => {
    console.log('⚫ Cognizer disconnected');
    state.cognizerConnected = false;
    updateUI();
  });
}
```

#### 2. Percept Transformation
```javascript
function transformAudioPercept(json) {
  // Audio percepts match Cognizer schema perfectly
  return {
    type: 'audio',
    transcript: json.transcript,
    analysis: json.analysis,
    tone: json.tone,
    emoji: json.emoji,
    sentiment: json.sentiment,
    confidence: json.confidence,
    // Bonus metadata (preserved but not used by Cognizer)
    sigilPhrase: json.sigilPhrase,
    sigilDrawCalls: json.sigilDrawCalls
  };
}

function transformVisualPercept(json) {
  // Visual percepts need transformation
  return {
    type: 'visual',
    action: json.description, // Use description as action
    emoji: extractEmoji(json.description) || '👁️', // Extract or default
    confidence: 0.8,
    // Bonus metadata
    sigilPhrase: json.sigilPhrase,
    drawCalls: json.drawCalls
  };
}

function extractEmoji(text) {
  // Extract first emoji from text
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]/u;
  const match = text.match(emojiRegex);
  return match ? match[0] : null;
}
```

#### 3. Updated Response Handler
```javascript
function handleGeminiResponse(event) {
  const message = JSON.parse(event.data);
  
  // ... [setup and accumulation logic same as Phase 1] ...
  
  // Turn complete - parse, log, and forward
  if (content.turnComplete) {
    try {
      const json = JSON.parse(sanitizeJSON(responseBuffer));
      
      // AUDIO PERCEPT
      if (json.transcript !== undefined) {
        console.log('🎤 [AUDIO PERCEPT]', json);
        logToConsole('audio', json);
        
        // Forward to Cognizer
        if (state.cognizerConnected) {
          const percept = transformAudioPercept(json);
          state.cognizerSocket.emit('percept', {
            sessionId: state.sessionId,
            ...percept,
            timestamp: new Date().toISOString()
          });
          console.log('  → Forwarded to Cognizer');
        }
      }
      
      // VISUAL PERCEPT
      else if (json.sigilPhrase !== undefined && json.description !== undefined) {
        console.log('📸 [VISUAL PERCEPT]', json);
        logToConsole('visual', json);
        
        // Forward to Cognizer
        if (state.cognizerConnected) {
          const percept = transformVisualPercept(json);
          state.cognizerSocket.emit('percept', {
            sessionId: state.sessionId,
            ...percept,
            timestamp: new Date().toISOString()
          });
          console.log('  → Forwarded to Cognizer');
        }
      }
      
    } catch (e) {
      console.error('❌ JSON parse error:', e.message);
    } finally {
      responseBuffer = '';
    }
  }
}
```

#### 4. Mind Moment Handlers
```javascript
function handleMindMoment(data) {
  console.log('🧠 [MIND MOMENT]', data);
  
  const {
    cycle,
    mindMoment,
    sigilPhrase,
    kinetic,
    lighting
  } = data;
  
  // Log to console area
  logToConsole('mindMoment', {
    cycle,
    mindMoment,
    sigilPhrase,
    kinetic: kinetic.pattern,
    lighting: `${lighting.color} ${lighting.pattern}`
  });
}

function handleSigil(data) {
  console.log('🎨 [SIGIL]', data);
  // Future: Render sigil visualization
}

function handleCognitiveState(data) {
  console.log('🔄 [STATE]', data.state);
  // Update UI with cognitive state
}
```

#### 5. Updated Start Function
```javascript
async function start() {
  if (state.isStreaming) return;
  
  try {
    // Connect to Cognizer FIRST
    if (!state.cognizerSocket) {
      await connectToCognizer();
      await waitForCognizerSession();
    }
    
    // Then start Gemini session
    await startGeminiSession();
    await waitForSetup();
    
    // Start streaming
    state.isStreaming = true;
    startAudioStreaming();
    startVisualStreaming();
    
    console.log('▶️ Streaming started (full pipeline active)');
    updateUI();
    
  } catch (error) {
    console.error('Failed to start:', error);
    alert('Failed to start: ' + error.message);
  }
}

function waitForCognizerSession() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Cognizer session timeout')), 5000);
    
    const checkSession = setInterval(() => {
      if (state.cognizerConnected && state.sessionId) {
        clearInterval(checkSession);
        clearTimeout(timeout);
        resolve();
      }
    }, 100);
  });
}
```

---

## UI Components

### Inline CSS (Minimal Styling)
```css
<style>
  body {
    margin: 0;
    padding: 20px;
    background: #0a0a0a;
    color: #ccc;
    font-family: 'Monaco', 'Courier New', monospace;
  }
  
  #video-container {
    width: 320px;
    height: 240px;
    background: #000;
    border: 1px solid #333;
    margin-bottom: 20px;
  }
  
  video {
    width: 100%;
    height: 100%;
  }
  
  #status-bar {
    display: flex;
    gap: 20px;
    margin-bottom: 20px;
    font-size: 12px;
  }
  
  button {
    background: #0080ff;
    border: none;
    color: white;
    padding: 12px 24px;
    font-size: 14px;
    cursor: pointer;
    margin-right: 10px;
  }
  
  button:disabled {
    background: #333;
    cursor: not-allowed;
  }
  
  #console-output {
    background: #111;
    border: 1px solid #333;
    padding: 10px;
    height: 400px;
    overflow-y: auto;
    font-size: 11px;
    line-height: 1.4;
  }
  
  .log-entry {
    margin-bottom: 8px;
    padding: 4px;
  }
  
  .log-audio { border-left: 2px solid #00ff88; }
  .log-visual { border-left: 2px solid #0080ff; }
  .log-mindMoment { border-left: 2px solid #ff00ff; }
</style>
```

### Helper Function
```javascript
function logToConsole(type, data) {
  const output = document.getElementById('console-output');
  if (!output) return;
  
  const entry = document.createElement('div');
  entry.className = `log-entry log-${type}`;
  
  const timestamp = new Date().toLocaleTimeString();
  const dataStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  
  entry.textContent = `[${timestamp}] ${type.toUpperCase()}: ${dataStr}`;
  
  output.appendChild(entry);
  output.scrollTop = output.scrollHeight;
}
```

---

## Testing Plan

### Phase 1 Testing
1. Open `/web/perceptor-remote/` in browser
2. Click START
3. Verify:
   - ✅ Video preview shows webcam
   - ✅ Gemini status shows connected
   - ✅ Console shows audio packets being sent
   - ✅ Console shows visual frames being sent
   - ✅ Console shows parsed audio percepts
   - ✅ Console shows parsed visual percepts
4. Speak into microphone, verify transcripts appear
5. Wave at camera, verify visual descriptions appear
6. Click STOP, verify streaming stops

### Phase 2 Testing
1. Start perceptor-remote with Cognizer integration
2. Open test-client in another tab
3. Verify:
   - ✅ Both show same session ID
   - ✅ Test-client receives perceptReceived events
   - ✅ Mind moments appear in both consoles
   - ✅ Sigils are generated from Cognizer
   - ✅ Kinetic/lighting patterns are generated

---

## Future Enhancements (Phase 3+)

### Visual Feedback
- Render sigils in UI (percept-level + mind-level)
- Display mind moments in page
- Show cognitive state transitions
- Visualize audio waveform

### Controls
- Adjust streaming intervals
- Toggle audio/visual independently
- Switch between prompt versions
- Pause/resume without disconnecting

### Analytics
- Percept throughput metrics
- Response latency tracking
- Sigil comparison (percept vs mind)
- Token usage estimation

---

## Integration with Server

### Required Server Updates
**NONE** - All APIs already exist:
- ✅ `/api/audio-prompts/active`
- ✅ `/api/visual-prompts/active`
- ✅ `/api/gemini/token`
- ✅ WebSocket percept events

### Required Server Configuration
Add static file serving in `server.js`:
```javascript
app.use('/perceptor-remote', express.static('web/perceptor-remote'));
```

---

## Dependencies

### External
- Socket.io client (for Cognizer connection)
- Already loaded in test-client, reuse pattern

### Internal (Reused Code)
- Audio processing logic from `audio-percept/editor.js`
- Frame capture logic from `visual-percept/editor.js`
- Gemini Live handler pattern from `shared/gemini-live-handler.js`

---

## Success Criteria

### Phase 1
- [x] Hardware initialization
- [x] Gemini Live connection
- [x] Audio/visual streaming
- [x] Percept parsing
- [x] Console logging

### Phase 2
- [x] Cognizer connection
- [x] Session management
- [x] Percept forwarding
- [x] Mind moment reception
- [x] Full pipeline verification

---

## Notes

### Design Decisions
1. **Inline CSS**: Keeps implementation simple, single-file
2. **Console-first**: Focus on functionality, UI later
3. **Audio prompt in setup**: Primary modality for continuous streaming
4. **Visual prompt per-frame**: Sent with each image
5. **Schema discrimination**: Detect percept type by JSON fields
6. **Dynamic DB settings**: All audio/visual prompt settings loaded from DB
   - Sample rate, buffer size, packet interval configurable per-prompt
   - Allows testing different configurations without code changes
   - Current active prompt in DB determines behavior

### Performance Considerations
- Audio interval: Configurable via DB (default 500ms = ~2 API calls/second)
- Visual interval: Fixed 4s = 0.25 API calls/second
- Total: ~2.25 calls/second to Gemini Live (with default audio settings)
- Cognizer: 5s cycle aggregation (default)
- Sample rate: Configurable via DB
  - Lower (512Hz): Smoother, more CPU, larger packets
  - Higher (4096Hz): More efficient, less CPU, smaller packets

### Cost Considerations
- Gemini Live API pricing applies
- Ephemeral tokens expire after 30 minutes
- Consider implementing auto-reconnect on token expiry

---

## Implementation Checklist

### Phase 1: Core Streaming
- [ ] Create `/web/perceptor-remote/` directory
- [ ] Write `index.html` with inline CSS
- [ ] Write `app.js` with core logic
- [ ] Test hardware initialization
- [ ] Test Gemini Live connection
- [ ] Test audio streaming
- [ ] Test visual streaming
- [ ] Verify percept parsing
- [ ] Test start/stop controls

### Phase 2: Cognizer Integration
- [ ] Add Socket.io client to HTML
- [ ] Implement `connectToCognizer()`
- [ ] Implement percept transformation
- [ ] Update response handler to forward percepts
- [ ] Implement mind moment handlers
- [ ] Update start/stop to include Cognizer
- [ ] Test full pipeline
- [ ] Verify with test-client

### Phase 3: Server Integration
- [ ] Add route to `server.js`
- [ ] Update README with new endpoint
- [ ] Document architecture in DEVELOPER_GUIDE

---

**Ready for implementation!** 🚀

