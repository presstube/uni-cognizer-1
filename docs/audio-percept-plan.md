# Implementation Plan: Audio Percept Prompt Editor

**Goal**: Create a minimal `/prompt-editor/audio-percept` tool that sends audio packets to Gemini Live API and displays JSON responses.

**Principle**: Keep it extremely simple for v1. Let Gemini do the heavy lifting.

---

## Overview

### Left Pane
- Prompt editor (system + user prompts)
- Load/Save/Delete buttons
- Prompt selector dropdown

### Right Pane
- JSON response display from Gemini Live
- Connection status indicator

### Core Functionality
- Capture microphone audio
- Send audio packets to Gemini Live at intervals
- Display streaming JSON responses

---

## File Structure

```
prompt-editor/
├── audio-percept/
│   ├── index.html          # Main HTML shell
│   ├── editor.js           # Main logic (~200-300 lines max)
│   └── style.css           # Styles (shared framework)
└── shared/
    └── prompt-editor.css   # Unified CSS framework (NEW)
```

**Note**: Keep `editor.js` simple. If it grows >300 lines, we'll refactor later.

---

## Implementation Steps

### Step 1: Database Schema

Create `audio_prompts` table (mirror `visual_prompts`):

**File**: `src/db/migrations/006_audio_prompts.sql`

```sql
CREATE TABLE IF NOT EXISTS audio_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  system_prompt TEXT NOT NULL,
  user_prompt TEXT NOT NULL,
  active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_audio_prompts_active 
  ON audio_prompts (active) 
  WHERE active = true;

CREATE INDEX idx_audio_prompts_updated 
  ON audio_prompts (updated_at DESC);
```

### Step 2: Database Layer

**File**: `src/db/audio-prompts.js`

Mirror `src/db/visual-prompts.js`:
- `getAllAudioPrompts()`
- `getAudioPromptById(id)`
- `getActiveAudioPrompt()`
- `createAudioPrompt(name, slug, systemPrompt, userPrompt)`
- `updateAudioPrompt(id, name, slug, systemPrompt, userPrompt)`
- `activateAudioPrompt(id)`
- `deleteAudioPrompt(id)`

### Step 3: API Routes

**File**: `src/api/audio-prompts.js`

Mirror `src/api/visual-prompts.js`:
- `GET /api/audio-prompts` - List all
- `GET /api/audio-prompts/active` - Get active
- `GET /api/audio-prompts/:id` - Get by ID
- `POST /api/audio-prompts` - Create/update
- `POST /api/audio-prompts/:id/activate` - Activate
- `DELETE /api/audio-prompts/:id` - Delete

**File**: `server.js`

Add routes:
```javascript
import * as audioPromptsAPI from './src/api/audio-prompts.js';

app.get('/api/audio-prompts', audioPromptsAPI.listAudioPrompts);
app.get('/api/audio-prompts/active', audioPromptsAPI.getActiveAudioPromptAPI);
app.get('/api/audio-prompts/:id', audioPromptsAPI.getAudioPromptAPI);
app.post('/api/audio-prompts', audioPromptsAPI.saveAudioPrompt);
app.post('/api/audio-prompts/:id/activate', audioPromptsAPI.activateAudioPromptAPI);
app.delete('/api/audio-prompts/:id', audioPromptsAPI.deleteAudioPromptAPI);
```

### Step 4: Unified CSS Framework

**File**: `prompt-editor/shared/prompt-editor.css`

Create base styles for all prompt editors:
- Two-pane layout (left/right split)
- Form elements (inputs, textareas, buttons)
- Status indicators
- Response display area
- Consistent color scheme and typography

**Design Principles**:
- Dark theme (match existing)
- Minimal, clean
- Responsive
- Reusable across all editors

### Step 5: HTML Structure

**File**: `prompt-editor/audio-percept/index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🎤 Audio Percept Prompt Editor</title>
  <link rel="stylesheet" href="../shared/prompt-editor.css">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <!-- Left Pane: Prompts -->
  <div class="left-pane">
    <div class="row">
      <label>Load Prompt</label>
      <select id="prompt-select">
        <option value="new">+ New Prompt</option>
      </select>
    </div>

    <div class="row">
      <div class="col">
        <div class="inline-field">
          <label>Name</label>
          <input type="text" id="name" placeholder="Audio Analysis v1.0" maxlength="200">
        </div>
      </div>
      <div class="col">
        <div class="inline-field">
          <label>Slug</label>
          <input type="text" id="slug" placeholder="audio-analysis-v1-0" maxlength="100">
        </div>
      </div>
    </div>

    <div class="actions">
      <button id="save-btn" class="btn-secondary">💾 Save</button>
      <button id="activate-btn" class="btn-success">✓ Set Active</button>
      <button id="delete-btn" class="btn-danger">Delete</button>
    </div>

    <label>System Prompt <span id="system-char-count">0 chars</span></label>
    <textarea id="system-prompt" placeholder="You are analyzing audio percepts..."></textarea>

    <label>User Prompt <span id="user-char-count">0 chars</span></label>
    <textarea id="user-prompt" placeholder="What do you hear?"></textarea>
  </div>

  <!-- Right Pane: Response -->
  <div class="right-pane">
    <div class="controls">
      <button id="start-btn" class="btn-primary">🎤 Start Recording</button>
      <button id="stop-btn" class="btn-danger" disabled>⏹ Stop</button>
      <div id="status" class="status">⚫ Disconnected</div>
    </div>

    <div class="response-section">
      <label>JSON Response</label>
      <div id="response-text" class="response-text"></div>
    </div>
  </div>

  <script type="module" src="editor.js"></script>
</body>
</html>
```

### Step 6: Audio Capture & WebSocket Logic

**File**: `prompt-editor/audio-percept/editor.js`

**Key Functions**:

1. **Audio Capture**:
   ```javascript
   async function initMicrophone() {
     const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
     const mediaRecorder = new MediaRecorder(stream, {
       mimeType: 'audio/webm'
     });
     return mediaRecorder;
   }
   ```

2. **WebSocket Connection** (mirror visual-percept):
   ```javascript
   const WS_BASE = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService';
   
   async function startSession() {
     const tokenRes = await fetch('/api/gemini/token');
     const { token } = await tokenRes.json();
     const url = createWebSocketUrl(token);
     const ws = new WebSocket(url);
     
     ws.onopen = () => {
       // Send setup message
       ws.send(JSON.stringify({
         setup: {
           model: 'models/gemini-2.0-flash-exp',
           generationConfig: {
             responseModalities: ['TEXT'],
             responseMimeType: 'application/json'
           },
           systemInstruction: {
             parts: [{ text: systemPrompt }]
           }
         }
       }));
     };
   }
   ```

3. **Send Audio Chunks**:
   ```javascript
   function sendAudioChunk(audioBlob) {
     // Convert blob to base64
     const reader = new FileReader();
     reader.onloadend = () => {
       const base64Audio = reader.result.split(',')[1];
       
       const message = {
         clientContent: {
           turns: [{
             role: 'user',
             parts: [
               {
                 inlineData: {
                   mimeType: 'audio/webm',
                   data: base64Audio
                 }
               },
               {
                 text: userPrompt
               }
             ]
           }],
           turnComplete: true
         }
       };
       
       ws.send(JSON.stringify(message));
     };
     reader.readAsDataURL(audioBlob);
   }
   ```

4. **Interval-Based Sending**:
   ```javascript
   let recordingInterval;
   
   function startRecording() {
     mediaRecorder.start();
     
     recordingInterval = setInterval(() => {
       mediaRecorder.stop();
       mediaRecorder.start(); // Start new chunk
     }, 2000); // Send every 2 seconds
     
     mediaRecorder.ondataavailable = (event) => {
       if (event.data.size > 0) {
         sendAudioChunk(event.data);
       }
     };
   }
   ```

5. **Response Handling** (mirror visual-percept):
   ```javascript
   function handleResponse(message) {
     if (message.serverContent?.modelTurn?.parts) {
       for (const part of message.serverContent.modelTurn.parts) {
         if (part.text) {
           state.responseBuffer += part.text;
           updateResponseDisplay();
         }
       }
     }
     
     if (message.serverContent?.turnComplete) {
       // Parse and display final JSON
       try {
         const json = JSON.parse(state.responseBuffer);
         updateResponseDisplay(json);
       } catch (e) {
         // Display raw text
       }
     }
   }
   ```

### Step 7: Prompt Management

Mirror visual-percept editor:
- Load prompts from API
- Save/update prompts
- Delete prompts
- Activate prompts
- Auto-slug generation from name

### Step 8: Styling

**File**: `prompt-editor/audio-percept/style.css`

Minimal overrides/extensions to shared framework:
- Audio-specific visualizations (if any)
- Recording indicator styles

---

## Gemini Live API Audio Format

Based on visual-percept implementation and Gemini Live docs:

**Audio MIME Types**:
- `audio/webm` (preferred, browser-native)
- `audio/mp3`
- `audio/wav`

**Message Format**:
```javascript
{
  clientContent: {
    turns: [{
      role: 'user',
      parts: [
        {
          inlineData: {
            mimeType: 'audio/webm',
            data: base64AudioString
          }
        },
        {
          text: "What do you hear in this audio?"
        }
      ]
    }],
    turnComplete: true
  }
}
```

**Response Format** (same as visual):
```javascript
{
  serverContent: {
    modelTurn: {
      parts: [{ text: "..." }]
    },
    turnComplete: true
  }
}
```

---

## Default Prompt

**System Prompt**:
```
You are analyzing audio percepts from a microphone for UNI, an AI experiencing the world through sensors.

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
}
```

**User Prompt**:
```
Analyze this audio chunk and return the JSON percept.
```

---

## Testing Checklist

- [ ] Microphone permission request works
- [ ] Audio capture starts/stops correctly
- [ ] Audio chunks sent at intervals
- [ ] WebSocket connection establishes
- [ ] Setup message sent correctly
- [ ] Audio data formatted correctly (base64, mimeType)
- [ ] Responses stream and display
- [ ] JSON parsing works
- [ ] Prompt CRUD operations work
- [ ] Active prompt selection works
- [ ] Error handling for connection failures
- [ ] Error handling for audio capture failures

---

## Future Enhancements (Post-v1)

- Audio waveform visualization
- Volume level indicator
- Silence detection (skip sending empty chunks)
- Frequency analysis visualization
- Multiple audio source selection
- Recording quality settings
- Playback of captured audio
- Export audio chunks

---

## Notes

1. **Simplicity First**: This is v1. Don't over-engineer. We can refactor later.

2. **Gemini Does Heavy Lifting**: We're just capturing and sending. Let Gemini analyze.

3. **Mirror Visual Pattern**: Follow visual-percept editor structure closely for consistency.

4. **Shared CSS**: Create unified framework now, apply to visual-percept later.

5. **Audio Format**: Use `audio/webm` - it's browser-native and works well with MediaRecorder.

6. **Interval Timing**: Start with 2-second intervals. Adjust based on testing.

7. **Error Handling**: Basic error messages. Don't overcomplicate.

8. **State Management**: Keep it simple. One state object, update functions.

---

## File Checklist

**New Files**:
- [ ] `src/db/migrations/006_audio_prompts.sql`
- [ ] `src/db/audio-prompts.js`
- [ ] `src/api/audio-prompts.js`
- [ ] `prompt-editor/shared/prompt-editor.css`
- [ ] `prompt-editor/audio-percept/index.html`
- [ ] `prompt-editor/audio-percept/editor.js`
- [ ] `prompt-editor/audio-percept/style.css`

**Modified Files**:
- [ ] `server.js` (add routes)
- [ ] `src/db/migrate.js` (run migration)

---

## Implementation Order

1. Database schema + migration
2. Database layer (`src/db/audio-prompts.js`)
3. API routes (`src/api/audio-prompts.js`)
4. Server routes (`server.js`)
5. Shared CSS framework (`prompt-editor/shared/prompt-editor.css`)
6. HTML structure (`index.html`)
7. Core editor logic (`editor.js`)
8. Styling (`style.css`)
9. Testing
10. Documentation updates

---

**Status**: Ready for implementation
**Estimated Time**: 4-6 hours
**Complexity**: Low-Medium (mirroring existing patterns)

