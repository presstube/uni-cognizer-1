# Visual Percept Prompt Editor - Implementation Plan

**Date**: November 18, 2025  
**Status**: Implementation Plan  
**Purpose**: Create a prompt editor for testing Gemini Live API with webcam frames

---

## Overview

Build a split-pane editor at `/visual-percept-prompt-editor` that allows users to:
1. Edit system and user prompts
2. View live webcam feed
3. Manually send frames to Gemini Live API on button click
4. See streaming responses in real-time

### Key Design Decision: Manual Frame Sending

**Pattern**: Hybrid approach combining Live API benefits with user control
- **WebSocket session**: Open once, keep alive between frames
- **Manual trigger**: User clicks button to send frame
- **Streaming response**: Text appears in real-time as generated
- **Session context**: Maintains conversation history across frames

**Benefits**:
- ✅ User control over when to analyze
- ✅ Lower API costs (not continuous streaming)
- ✅ Perfect for prompt testing/iteration
- ✅ Streaming responses feel responsive
- ✅ Session persistence keeps context

---

## Architecture

### Technology Stack

**API**: [Gemini Live API](https://ai.google.dev/gemini-api/docs/live#javascript)
- WebSocket-based streaming
- Supports audio, video, and text
- Ephemeral token authentication

**Package**: `@google/genai` (already installed)
- `ai.live.connect()` for WebSocket session
- `sendRealtimeInput()` for sending frames
- Callbacks for streaming responses

**Authentication**: Cognizer-1's `/api/gemini/token` endpoint
- Generates ephemeral tokens
- 30-minute expiry
- Client-side usage safe

**Frontend**: Vanilla JavaScript (match existing patterns)
- No React/Vue/build step
- Functional programming
- Under 80 lines per function

---

## File Structure

```
visual-percept-prompt-editor/
├── index.html          (~180 lines - split pane layout)
├── editor.js           (~300 lines - modular functions)
├── style.css           (~180 lines - grid layout)
└── README.md           (~50 lines - usage guide)
```

**Pattern**: Mirrors `sigil-prompt-editor/` and `forge/` structure

---

## UI Layout

```
┌─────────────────────────────────────────────────────────────────┐
│              🎥 Visual Percept Prompt Editor                    │
├──────────────────────────────────┬──────────────────────────────┤
│  LEFT PANE (50%)                 │  RIGHT PANE (50%)            │
│                                  │                              │
│  ┌────────────────────────────┐ │  ┌────────────────────────┐ │
│  │ Load Prompt [Dropdown ▼]  │ │  │                        │ │
│  └────────────────────────────┘ │  │   📹 Live Webcam       │ │
│                                  │  │   640x480              │ │
│  ┌──────────┬─────────────────┐ │  │                        │ │
│  │ Name     │ Slug            │ │  │   <video autoplay>     │ │
│  └──────────┴─────────────────┘ │  │                        │ │
│                                  │  └────────────────────────┘ │
│  [💾 Save] [✓ Set Active]      │                              │
│                                  │  [ 📸 SEND FRAME ]          │
│  ┌────────────────────────────┐ │  Status: ⚫ Disconnected    │
│  │ System Prompt              │ │                              │
│  │ (textarea, 200-300ch)      │ │  ┌────────────────────────┐ │
│  │                            │ │  │ Response:              │ │
│  │ You are analyzing...       │ │  │ (streaming text)       │ │
│  └────────────────────────────┘ │  │                        │ │
│                                  │  │ The person is...       │ │
│  ┌────────────────────────────┐ │  │                        │ │
│  │ User Prompt                │ │  └────────────────────────┘ │
│  │ (textarea, 100-150ch)      │ │                              │
│  │                            │ │  [Clear Response]            │
│  │ What do you see?           │ │                              │
│  └────────────────────────────┘ │                              │
└──────────────────────────────────┴──────────────────────────────┘
```

---

## Implementation Details

### Phase 1: HTML Structure (~180 lines)

**File**: `visual-percept-prompt-editor/index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🎥 Visual Percept Prompt Editor</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <!-- Left Pane: Prompts -->
  <div class="left-pane">
    <!-- Load Prompt -->
    <div class="row">
      <label>Load Prompt</label>
      <select id="prompt-select">
        <option value="new">+ New Prompt</option>
      </select>
    </div>

    <!-- Name & Slug -->
    <div class="row">
      <div class="col">
        <div class="inline-field">
          <label>Name</label>
          <input type="text" id="name" placeholder="Visual Analysis v1.0" maxlength="200">
        </div>
      </div>
      <div class="col">
        <div class="inline-field">
          <label>Slug</label>
          <input type="text" id="slug" placeholder="visual-analysis-v1-0" maxlength="100">
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="actions">
      <button id="save-btn" class="btn-secondary">💾 Save</button>
      <button id="activate-btn" class="btn-success">✓ Set Active</button>
      <button id="delete-btn" class="btn-danger">Delete</button>
    </div>

    <!-- System Prompt -->
    <label>System Prompt <span id="system-char-count">0 chars</span></label>
    <textarea id="system-prompt" 
              placeholder="You are analyzing visual percepts from a webcam..."></textarea>

    <!-- User Prompt -->
    <label>User Prompt <span id="user-char-count">0 chars</span></label>
    <textarea id="user-prompt" 
              placeholder="What do you see in this frame?"></textarea>
  </div>

  <!-- Right Pane: Webcam + Response -->
  <div class="right-pane">
    <h2 class="pane-title">Live Preview</h2>
    
    <!-- Webcam -->
    <div class="video-wrapper">
      <video id="webcam" autoplay playsinline muted></video>
    </div>
    
    <!-- Controls -->
    <div class="controls">
      <button id="capture-btn" class="btn-primary">📸 SEND FRAME</button>
      <div id="status" class="status">⚫ Disconnected</div>
    </div>
    
    <!-- Status Messages -->
    <div id="error" class="error hidden"></div>
    
    <!-- Response -->
    <div id="response-container">
      <div class="response-header">
        <label>Response</label>
        <button id="clear-response-btn" class="btn-small">Clear</button>
      </div>
      <div id="response-text" class="response-text"></div>
    </div>
  </div>

  <script type="module" src="editor.js"></script>
</body>
</html>
```

**Key Elements**:
- Split pane layout (CSS Grid)
- Form controls mirror existing editors
- Video element for webcam display
- Response area for streaming text
- Status indicator for connection state

---

### Phase 2: JavaScript Implementation (~300 lines)

**File**: `visual-percept-prompt-editor/editor.js`

#### Module Structure (Functional, <80 lines per section)

```javascript
// ============================================
// SECTION 1: State Management (~40 lines)
// ============================================

import { GoogleGenAI } from '@google/genai';

// Application state
const state = {
  session: null,           // Live API session
  stream: null,            // MediaStream from webcam
  videoElement: null,      // Video element reference
  currentPromptId: null,   // Database ID of loaded prompt
  isConnected: false,      // Session connection status
  responseBuffer: '',      // Accumulated response text
};

// Update state (immutable pattern)
function updateState(updates) {
  Object.assign(state, updates);
  updateUI();
}

// ============================================
// SECTION 2: Webcam Management (~60 lines)
// ============================================

async function initWebcam() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { 
        width: { ideal: 640 }, 
        height: { ideal: 480 },
        facingMode: 'user'
      },
      audio: false
    });
    
    const video = document.getElementById('webcam');
    video.srcObject = stream;
    
    // Wait for video to be ready
    await new Promise((resolve) => {
      video.onloadedmetadata = () => {
        video.play().then(resolve);
      };
    });
    
    updateState({ stream, videoElement: video });
    console.log('✅ Webcam initialized');
    
  } catch (error) {
    showError('Failed to access webcam: ' + error.message);
    console.error('Webcam error:', error);
  }
}

function captureFrame() {
  if (!state.videoElement) {
    throw new Error('Video element not initialized');
  }
  
  const video = state.videoElement;
  
  // Check if video is ready
  if (video.readyState < 2 || !video.videoWidth) {
    throw new Error('Video not ready');
  }
  
  // Create canvas and capture frame
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0);
  
  // Convert to base64 JPEG
  const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
  const base64Data = dataUrl.split(',')[1];
  
  return base64Data;
}

// ============================================
// SECTION 3: Live API Session (~80 lines)
// ============================================

async function startSession() {
  if (state.session) {
    console.log('Session already active');
    return;
  }
  
  try {
    // Get ephemeral token from cognizer-1 endpoint
    const tokenRes = await fetch('/api/gemini/token');
    if (!tokenRes.ok) {
      throw new Error(`Token fetch failed: ${tokenRes.status}`);
    }
    const { token } = await tokenRes.json();
    
    console.log('✅ Got ephemeral token');
    
    // Create Live API client
    const ai = new GoogleGenAI({ apiKey: token });
    
    // Get prompts
    const systemPrompt = document.getElementById('system-prompt').value;
    
    // Connect to Live API
    const session = await ai.live.connect({
      model: 'gemini-2.0-flash-exp',
      config: {
        responseModalities: ['TEXT'],
        systemInstruction: systemPrompt || 'You are analyzing visual percepts.'
      },
      callbacks: {
        onopen: () => {
          console.log('✅ Live API session opened');
          updateState({ isConnected: true });
          updateStatus('🟢 Connected');
        },
        onmessage: (message) => {
          handleResponse(message);
        },
        onerror: (error) => {
          console.error('❌ Session error:', error);
          showError('Session error: ' + error.message);
        },
        onclose: (event) => {
          console.log('Session closed:', event.reason);
          updateState({ isConnected: false, session: null });
          updateStatus('⚫ Disconnected');
        }
      }
    });
    
    updateState({ session });
    console.log('✅ Live API session created');
    
  } catch (error) {
    console.error('Failed to start session:', error);
    showError('Failed to start session: ' + error.message);
  }
}

async function sendFrame() {
  try {
    // Ensure session exists
    if (!state.session) {
      await startSession();
    }
    
    // Capture frame
    const base64Frame = captureFrame();
    console.log('📸 Captured frame');
    
    // Get user prompt
    const userPrompt = document.getElementById('user-prompt').value 
      || 'What do you see in this frame?';
    
    // Clear previous response
    state.responseBuffer = '';
    updateResponseDisplay();
    
    // Send to Live API
    await state.session.sendRealtimeInput({
      image: {
        data: base64Frame,
        mimeType: 'image/jpeg'
      },
      text: userPrompt
    });
    
    console.log('✅ Frame sent to Live API');
    updateStatus('🟡 Processing...');
    
  } catch (error) {
    console.error('Failed to send frame:', error);
    showError('Failed to send frame: ' + error.message);
  }
}

function handleResponse(message) {
  // Handle streaming response from Live API
  console.log('📥 Message received:', message);
  
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
      updateStatus('🟢 Connected');
    }
  }
}

// ============================================
// SECTION 4: UI Updates (~50 lines)
// ============================================

function updateUI() {
  // Update connection status
  updateStatus(state.isConnected ? '🟢 Connected' : '⚫ Disconnected');
  
  // Enable/disable capture button
  const captureBtn = document.getElementById('capture-btn');
  captureBtn.disabled = !state.videoElement;
}

function updateStatus(text) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = text;
  statusEl.className = 'status ' + (
    text.includes('🟢') ? 'status-connected' :
    text.includes('🟡') ? 'status-processing' :
    'status-disconnected'
  );
}

function updateResponseDisplay() {
  const responseEl = document.getElementById('response-text');
  responseEl.textContent = state.responseBuffer;
  
  // Auto-scroll to bottom
  responseEl.scrollTop = responseEl.scrollHeight;
}

function showError(message) {
  const errorEl = document.getElementById('error');
  errorEl.textContent = '❌ ' + message;
  errorEl.classList.remove('hidden');
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    errorEl.classList.add('hidden');
  }, 5000);
}

// Character counters
function updateCharCount(textareaId, counterId) {
  const textarea = document.getElementById(textareaId);
  const counter = document.getElementById(counterId);
  counter.textContent = `${textarea.value.length} chars`;
}

// ============================================
// SECTION 5: Event Handlers (~40 lines)
// ============================================

// Capture button
document.getElementById('capture-btn').addEventListener('click', async () => {
  const btn = document.getElementById('capture-btn');
  btn.disabled = true;
  btn.textContent = '⏳ Sending...';
  
  try {
    await sendFrame();
  } finally {
    btn.disabled = false;
    btn.textContent = '📸 SEND FRAME';
  }
});

// Clear response button
document.getElementById('clear-response-btn').addEventListener('click', () => {
  state.responseBuffer = '';
  updateResponseDisplay();
});

// Character counters
document.getElementById('system-prompt').addEventListener('input', () => {
  updateCharCount('system-prompt', 'system-char-count');
});

document.getElementById('user-prompt').addEventListener('input', () => {
  updateCharCount('user-prompt', 'user-char-count');
});

// ============================================
// SECTION 6: Initialization (~30 lines)
// ============================================

async function init() {
  console.log('🚀 Initializing Visual Percept Prompt Editor');
  
  // Initialize webcam
  await initWebcam();
  
  // Load default prompts
  loadDefaultPrompts();
  
  // Update UI
  updateUI();
  
  console.log('✅ Editor ready');
}

function loadDefaultPrompts() {
  document.getElementById('system-prompt').value = 
    `You are analyzing visual percepts from a webcam for UNI, an AI experiencing the world through sensors.
Describe what you observe in a concise, poetic way.
Focus on: people, actions, emotions, objects, lighting, atmosphere.
Respond in 1-2 sentences.`;
  
  document.getElementById('user-prompt').value = 
    'What is happening in this moment?';
  
  updateCharCount('system-prompt', 'system-char-count');
  updateCharCount('user-prompt', 'user-char-count');
}

// Start application
init().catch(error => {
  console.error('Initialization failed:', error);
  showError('Failed to initialize: ' + error.message);
});
```

**Key Patterns**:
- ✅ Functional programming (no classes)
- ✅ Modular sections (<80 lines each)
- ✅ Pure functions where possible
- ✅ Immutable state updates
- ✅ Error handling throughout

---

### Phase 3: CSS Styling (~180 lines)

**File**: `visual-percept-prompt-editor/style.css`

```css
/* Base Styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #1a1a1a;
  color: #e0e0e0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  padding: 20px;
  height: 100vh;
  overflow: hidden;
}

/* Panes */
.left-pane,
.right-pane {
  display: flex;
  flex-direction: column;
  gap: 15px;
  overflow-y: auto;
  padding: 20px;
  background: #2a2a2a;
  border-radius: 12px;
  border: 1px solid #3a3a3a;
}

.pane-title {
  margin: 0 0 15px 0;
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
}

/* Form Elements */
.row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.col {
  flex: 1;
}

.inline-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

label {
  font-size: 12px;
  font-weight: 600;
  color: #b0b0b0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

input[type="text"],
select,
textarea {
  padding: 10px;
  background: #1a1a1a;
  border: 1px solid #3a3a3a;
  border-radius: 6px;
  color: #e0e0e0;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 13px;
}

input[type="text"]:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: #4CAF50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.1);
}

textarea {
  resize: vertical;
  min-height: 100px;
}

#system-prompt {
  min-height: 200px;
}

#user-prompt {
  min-height: 100px;
}

/* Buttons */
.actions {
  display: flex;
  gap: 10px;
}

button {
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #4CAF50;
  color: white;
  width: 100%;
  padding: 15px;
  font-size: 16px;
}

.btn-primary:hover:not(:disabled) {
  background: #45a049;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(76, 175, 80, 0.3);
}

.btn-secondary {
  background: #2196F3;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #1976D2;
}

.btn-success {
  background: #4CAF50;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: #45a049;
}

.btn-danger {
  background: #f44336;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #da190b;
}

.btn-small {
  padding: 5px 10px;
  font-size: 12px;
  background: #3a3a3a;
  color: #e0e0e0;
}

.btn-small:hover {
  background: #4a4a4a;
}

/* Webcam */
.video-wrapper {
  position: relative;
  width: 100%;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  aspect-ratio: 4/3;
}

#webcam {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Controls */
.controls {
  display: flex;
  align-items: center;
  gap: 15px;
}

/* Status */
.status {
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
}

.status-connected {
  background: rgba(76, 175, 80, 0.2);
  color: #4CAF50;
  border: 1px solid rgba(76, 175, 80, 0.3);
}

.status-processing {
  background: rgba(255, 193, 7, 0.2);
  color: #FFC107;
  border: 1px solid rgba(255, 193, 7, 0.3);
}

.status-disconnected {
  background: rgba(158, 158, 158, 0.2);
  color: #9e9e9e;
  border: 1px solid rgba(158, 158, 158, 0.3);
}

/* Error */
.error {
  padding: 12px;
  background: rgba(244, 67, 54, 0.2);
  border: 1px solid rgba(244, 67, 54, 0.3);
  border-radius: 6px;
  color: #f44336;
  font-size: 13px;
}

.error.hidden {
  display: none;
}

/* Response */
#response-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-height: 200px;
}

.response-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.response-text {
  flex: 1;
  padding: 15px;
  background: #1a1a1a;
  border: 1px solid #3a3a3a;
  border-radius: 6px;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-y: auto;
  color: #e0e0e0;
}

.response-text:empty:before {
  content: 'Response will appear here...';
  color: #666;
  font-style: italic;
}

/* Character Counter */
label span {
  float: right;
  font-size: 11px;
  color: #666;
  text-transform: none;
  letter-spacing: 0;
}

/* Scrollbar Styling */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #1a1a1a;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: #3a3a3a;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #4a4a4a;
}
```

**Design System**:
- Dark theme (matches existing editors)
- Grid layout (50/50 split)
- Responsive elements
- Consistent spacing
- Smooth transitions

---

## Database Integration (Phase 4 - Optional)

### Schema (Mirror sigil_prompts pattern)

```sql
CREATE TABLE visual_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  system_prompt TEXT NOT NULL,
  user_prompt TEXT NOT NULL,
  active BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_visual_prompts_active ON visual_prompts(active);
CREATE INDEX idx_visual_prompts_slug ON visual_prompts(slug);
```

### API Endpoints

```javascript
// src/api/visual-prompts.js (~200 lines, mirror sigil-prompts.js)

GET    /api/visual-prompts           // List all
GET    /api/visual-prompts/active    // Get active
GET    /api/visual-prompts/:id       // Get by ID
POST   /api/visual-prompts           // Create
POST   /api/visual-prompts/:id/activate  // Set active
DELETE /api/visual-prompts/:id       // Delete
```

**Status**: Optional for MVP, add later if needed

---

## Testing Strategy

### Local Testing

**Step 1: Test Webcam**
```bash
# Open in browser
open http://localhost:3001/visual-percept-prompt-editor

# Check:
- Webcam feed displays
- Video element shows live feed
- No console errors
```

**Step 2: Test Token Endpoint**
```javascript
// Browser console
fetch('/api/gemini/token')
  .then(r => r.json())
  .then(console.log);

// Should return: { token: "...", expiresAt: "..." }
```

**Step 3: Test Frame Capture**
```javascript
// Click SEND FRAME button
// Check:
- Session connects (status: 🟢 Connected)
- Frame captured (console log)
- Response streams in (text appears)
- No errors
```

**Step 4: Test Manual Mode**
```bash
# Click SEND FRAME multiple times
# Check:
- Session stays connected
- Each frame generates new response
- Responses don't interfere with each other
```

### Integration Testing

1. **Token Expiry**: Wait 30 minutes, send frame → should reconnect
2. **Webcam Permission Denied**: Deny permission → should show error
3. **Network Failure**: Disconnect internet → should show error
4. **Session Timeout**: Leave idle → should handle gracefully
5. **Rapid Clicks**: Click button repeatedly → should queue properly

---

## Security Considerations

### Ephemeral Tokens

**Current Implementation**:
```javascript
const tokenRes = await fetch('/api/gemini/token');
const { token } = await tokenRes.json();
```

**Production Enhancement**:
```javascript
// Add password if TOKEN_PASSWORD is set
const tokenRes = await fetch('/api/gemini/token', {
  headers: {
    'x-password': getCognizerPassword() // From env or config
  }
});
```

### Token Refresh

**Problem**: Tokens expire after 30 minutes

**Solution**: Detect expiry and refresh
```javascript
function handleSessionError(error) {
  if (error.message.includes('expired') || error.message.includes('401')) {
    // Token expired - refresh session
    state.session = null;
    startSession();
  }
}
```

---

## Server Configuration

### Mount Editor in server.js

```javascript
// server.js (add after line 48)

// Serve Visual Percept Prompt Editor
app.use('/visual-percept-prompt-editor', express.static('visual-percept-prompt-editor'));
```

**Location**: After sigil-prompt-editor mounting

---

## Default Prompts

### Preset 1: General Description
```
System: You are analyzing visual percepts from a webcam for UNI, an AI experiencing the world through sensors. Describe what you observe in a concise, poetic way. Focus on: people, actions, emotions, objects, lighting, atmosphere. Respond in 1-2 sentences.

User: What is happening in this moment?
```

### Preset 2: Emotion Detection
```
System: You are an emotion analysis system. Analyze facial expressions, body language, and environmental cues to identify the emotional tone of the scene.

User: What emotions are present in this frame?
```

### Preset 3: Action Recognition
```
System: You are analyzing video frames for action recognition. Identify and describe any actions or movements taking place.

User: What actions are being performed?
```

### Preset 4: Technical Analysis
```
System: You are a technical visual analyzer. Describe the scene in terms of composition, lighting, objects, colors, and spatial relationships.

User: Provide a technical analysis of this frame.
```

---

## Implementation Phases

### Phase 1: Core Functionality (MVP) - 3 hours
- [x] HTML structure
- [x] CSS styling
- [x] Webcam initialization
- [x] Frame capture
- [x] Live API session
- [x] Manual frame sending
- [x] Streaming response display

### Phase 2: UI Polish - 1 hour
- [ ] Character counters
- [ ] Loading states
- [ ] Error handling
- [ ] Status indicators
- [ ] Response clearing

### Phase 3: Prompt Management - 2 hours
- [ ] Save/load prompts (localStorage)
- [ ] Preset prompts dropdown
- [ ] Slug auto-generation
- [ ] Form validation

### Phase 4: Database Integration - 3 hours
- [ ] Create visual_prompts table
- [ ] CRUD API endpoints
- [ ] Load from database
- [ ] Set active prompt

### Phase 5: Advanced Features - 2 hours
- [ ] Token refresh on expiry
- [ ] Session reconnection
- [ ] Response history
- [ ] Export responses

**Total Estimated Time**: 11 hours

---

## Success Metrics

### Technical Goals
- [ ] Webcam feed displays at 30fps
- [ ] Frame capture < 100ms
- [ ] Session connects < 2s
- [ ] Response streaming < 3s latency
- [ ] No memory leaks (test 100 frames)

### User Experience Goals
- [ ] One-click frame sending
- [ ] Immediate visual feedback
- [ ] Clear error messages
- [ ] Responsive UI (no lag)
- [ ] Intuitive prompt editing

---

## Known Limitations

1. **Image Format**: Using JPEG (may need to test PNG for quality)
2. **Frame Size**: 640x480 (may need higher res option)
3. **Token Expiry**: 30-minute limit (needs refresh logic)
4. **Browser Compatibility**: Requires modern browser with getUserMedia
5. **HTTPS Required**: Webcam access needs secure context (localhost OK)

---

## Dependencies

### Already Installed
- ✅ `@google/genai` (for Live API)
- ✅ Express server
- ✅ Token endpoint (`/api/gemini/token`)

### Browser APIs (No Install)
- ✅ `navigator.mediaDevices.getUserMedia` (webcam)
- ✅ `<canvas>` (frame capture)
- ✅ `fetch` (API calls)
- ✅ WebSocket (via `@google/genai`)

### No New Dependencies Required! 🎉

---

## Documentation

### README.md

```markdown
# Visual Percept Prompt Editor

Test Gemini Live API with webcam frames in real-time.

## Quick Start

1. Start cognizer-1 server:
   ```bash
   npm start
   ```

2. Open editor:
   ```
   http://localhost:3001/visual-percept-prompt-editor
   ```

3. Allow webcam access when prompted

4. Edit prompts, click "SEND FRAME", see response!

## Features

- **Manual Frame Sending**: User controls when to analyze
- **Streaming Responses**: Real-time text generation
- **Session Persistence**: Maintains context across frames
- **Prompt Management**: Save and load custom prompts

## Requirements

- Modern browser (Chrome, Firefox, Safari, Edge)
- Webcam access
- HTTPS or localhost (for webcam API)
```

---

## Deployment

### Server Changes
1. Mount static directory in `server.js`
2. Ensure `/api/gemini/token` endpoint is accessible
3. Set `TOKEN_PASSWORD` in production (recommended)

### No Build Step Required
- Pure vanilla JS (no transpilation)
- Static files served directly
- Works immediately on deployment

---

## Future Enhancements

### Phase 6: Advanced Features (Future)
- [ ] Continuous mode toggle (auto-send frames)
- [ ] Frame rate control (1fps, 0.5fps, manual)
- [ ] Response history (save past interactions)
- [ ] Comparison mode (side-by-side frames)
- [ ] Video recording (save video with responses)
- [ ] Multi-model support (switch Gemini versions)
- [ ] Batch processing (analyze multiple frames)
- [ ] Export results (JSON, CSV, Markdown)

---

## Open Questions

1. **Image Format**: Does Live API prefer JPEG or PNG for image input?
2. **Optimal Quality**: What JPEG quality (0.8 current) balances size/quality?
3. **Frame Size**: Is 640x480 sufficient or test higher resolutions?
4. **Session Duration**: How long can sessions stay open?
5. **Rate Limiting**: Are there limits on frames per minute?

**Action**: Test and document findings during implementation

---

## Prime Directive Compliance

✅ **Functional Programming**: Pure functions, no classes  
✅ **Immutable State**: State updates via Object.assign  
✅ **Unidirectional Flow**: User action → Capture → Send → Receive  
✅ **File Size**: Each section <80 lines  
✅ **Minimal Libraries**: Zero new dependencies  
✅ **Dumb Client**: Stateless, event-driven (session is ephemeral)

---

## References

- [Gemini Live API Documentation](https://ai.google.dev/gemini-api/docs/live#javascript)
- [Ephemeral Tokens Guide](https://ai.google.dev/gemini-api/docs/ephemeral-tokens)
- Cognizer-1 Token Endpoint: `/docs/ephemeral-token-implementation.md`
- Pattern Reference: `sigil-prompt-editor/` structure

---

**Status**: Ready for implementation  
**Complexity**: Medium  
**Risk**: Low (well-documented API, proven patterns)  
**Approval**: Awaiting user confirmation

---

**Author**: AI Assistant  
**Date**: November 18, 2025  
**Version**: 1.0

