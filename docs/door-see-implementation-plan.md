# Door/See Implementation Plan

**Project**: User-facing audio-to-sigil experience app
**Status**: Ready for implementation
**Estimated Time**: 4-5 hours

---

## Architecture Overview

### Goal
Create `/door/see` - a full-screen immersive audio sigil experience, while restructuring shared components for project-wide reuse.

### New Project Structure
```
/shared/                              ← NEW: Top-level shared components
├── components/
│   ├── sigil-and-phrase.js          ← Moved from prompt-editor/shared
│   ├── audio-live-client.js         ← NEW: Extracted from audio-percept
│   └── gemini-token-fetcher.js      ← NEW: Token management
├── lib/
│   ├── sigil.standalone.js          ← Moved from prompt-editor/shared
│   └── typewriter.js                ← Moved from prompt-editor/shared
└── styles/
    └── prompt-editor.css            ← Moved from prompt-editor/shared

/door/                                ← NEW: User-facing apps
└── see/
    ├── index.html
    ├── app.js
    └── style.css

/prompt-editor/                       ← EXISTING: Internal tools
├── audio-percept/
├── visual-percept/
└── ...
```

---

## Phase 1: Restructure Shared Components

### Objectives
- Move shared components to top-level `/shared`
- Clean import paths for both `/door` and `/prompt-editor`
- Maintain backwards compatibility

### Tasks

#### 1.1 Create Directory Structure
```bash
mkdir -p shared/components
mkdir -p shared/lib
mkdir -p shared/styles
```

#### 1.2 Move Files
```bash
# Components
mv prompt-editor/shared/sigil-and-phrase.js shared/components/

# Libraries
mv prompt-editor/shared/sigil.standalone.js shared/lib/
mv prompt-editor/shared/typewriter.js shared/lib/

# Styles
mv prompt-editor/shared/prompt-editor.css shared/styles/

# Remove old directory
rmdir prompt-editor/shared
```

#### 1.3 Update Internal Imports in sigil-and-phrase.js
```javascript
// OLD
import { Sigil } from './sigil.standalone.js';
import { typewrite } from './typewriter.js';

// NEW
import { Sigil } from '../lib/sigil.standalone.js';
import { typewrite } from '../lib/typewriter.js';
```

#### 1.4 Update Imports in visual-percept/editor.js
```javascript
// OLD
import { SigilAndPhrase } from '../shared/sigil-and-phrase.js';

// NEW
import { SigilAndPhrase } from '../../shared/components/sigil-and-phrase.js';
```

#### 1.5 Update Imports in audio-percept/editor.js
```javascript
// OLD
import { SigilAndPhrase } from '../shared/sigil-and-phrase.js';

// NEW
import { SigilAndPhrase } from '../../shared/components/sigil-and-phrase.js';
```

---

## Phase 2: Extract AudioLiveClient Component

### Objectives
- Create reusable audio capture + Gemini Live API client
- Extract ~300 lines from audio-percept/editor.js
- Event-based architecture for flexibility

### Component Design

#### API Specification
```javascript
class AudioLiveClient {
  constructor(config: {
    systemPrompt: string,
    onResponse: (data: object) => void,
    onError: (error: Error) => void,
    onStatusChange: (status: string) => void,
    packetInterval?: number  // default: 2000ms
  })
  
  async start(): Promise<void>
  stop(): void
  isListening(): boolean
  destroy(): void
}
```

#### Status Values
- `'disconnected'` - Initial state
- `'connecting'` - Fetching token, establishing WebSocket
- `'connected'` - WebSocket ready
- `'listening'` - Actively capturing and streaming audio
- `'error'` - Connection failed

#### What to Extract from audio-percept/editor.js

**Lines 36-54**: `initMicrophone()`
- getUserMedia with audio constraints
- Error handling

**Lines 59-115**: `initAudioProcessing()`
- AudioContext creation (16kHz)
- ScriptProcessorNode for PCM conversion
- Float32 → Int16 conversion

**Lines 117-194**: `startListening()`
- Audio processing initialization
- Interval-based packet sending
- PCM buffer management

**Lines 196-228**: `stopListening()`
- Cleanup logic
- Node disconnection

**Lines 242-249**: `createWebSocketUrl()`
- URL construction
- Token handling

**Lines 251-363**: `startSession()` (WebSocket logic)
- Token fetching
- WebSocket connection
- Setup message
- Message handlers

**Lines 365-427**: `sendAudioPacket()`
- PCM to base64 conversion
- realtimeInput message format

**Lines 429-482**: `handleResponse()`
- Message parsing
- Response buffering
- JSON extraction

### Implementation File Structure

```javascript
// /shared/components/audio-live-client.js

import { GeminiTokenFetcher } from './gemini-token-fetcher.js';

export class AudioLiveClient {
  constructor(config) { /* ... */ }
  
  // === Public API ===
  async start() { /* ... */ }
  stop() { /* ... */ }
  isListening() { /* ... */ }
  destroy() { /* ... */ }
  
  // === Private Methods ===
  async _initMicrophone() { /* ... */ }
  async _initAudioProcessing(stream) { /* ... */ }
  async _startSession() { /* ... */ }
  _sendAudioPacket(base64PCM) { /* ... */ }
  _handleResponse(message) { /* ... */ }
  _createWebSocketUrl(token) { /* ... */ }
  _emitStatus(status) { /* ... */ }
}
```

---

## Phase 3: Create GeminiTokenFetcher

### Objectives
- Simple token management
- Shared by visual and audio clients
- Caching optional (for future)

### Implementation

```javascript
// /shared/components/gemini-token-fetcher.js

export class GeminiTokenFetcher {
  static async fetchToken() {
    try {
      const res = await fetch('/api/gemini/token');
      if (!res.ok) {
        throw new Error(`Token fetch failed: ${res.status}`);
      }
      const { token } = await res.json();
      return token;
    } catch (error) {
      console.error('Failed to fetch Gemini token:', error);
      throw error;
    }
  }
}
```

---

## Phase 4: Update audio-percept to Use AudioLiveClient

### Objectives
- Replace ~300 lines of audio logic with component
- Simplify to just UI and prompt management
- Maintain all existing functionality

### Changes to audio-percept/editor.js

**Remove** (Lines 36-482):
- All audio capture logic
- All WebSocket logic
- All PCM conversion logic

**Add**:
```javascript
import { AudioLiveClient } from '../../shared/components/audio-live-client.js';

// In state
audioClient: null  // Replace audioContext, audioSource, etc.

// In init()
state.audioClient = new AudioLiveClient({
  systemPrompt: '', // Set from prompt
  onResponse: (data) => {
    if (data.sigilPhrase && data.sigilDrawCalls) {
      state.sigilAndPhrase.render({
        phrase: data.sigilPhrase,
        drawCalls: data.sigilDrawCalls
      });
    }
  },
  onError: (error) => showError(error.message),
  onStatusChange: (status) => updateStatus(status)
});

// In toggle button handler
if (state.audioClient.isListening()) {
  state.audioClient.stop();
} else {
  await state.audioClient.start();
}
```

**Result**: ~600 lines → ~300 lines

---

## Phase 5: Create /door/see App

### Objectives
- Full-screen immersive experience
- Auto-loads active audio prompt
- Click-to-start (browser policy compliant)
- Minimal UI (just sigil + subtle prompt)

### Design Decisions (Recommendations)

✅ **Sigil Size**: 300px (leaves breathing room)
✅ **Interaction**: Require click to start (respects browser policies)
✅ **Error Handling**: Subtle message at bottom
✅ **Server**: Same server/port (simpler deployment)

### File Implementations

#### /door/see/index.html
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>see</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="sigil"></div>
  <div id="start-prompt">click to start</div>
  <div id="error-message"></div>
  <script type="module" src="app.js"></script>
</body>
</html>
```

#### /door/see/style.css
```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  width: 100vw;
  height: 100vh;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: pointer;
}

body.started {
  cursor: default;
}

#sigil {
  width: 300px;
  height: 300px;
}

#start-prompt {
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  color: #333;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  text-align: center;
  transition: opacity 0.3s;
}

#start-prompt.hidden {
  opacity: 0;
  pointer-events: none;
}

#error-message {
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  color: #ff4444;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  text-align: center;
  opacity: 0;
  transition: opacity 0.3s;
}

#error-message.visible {
  opacity: 1;
}
```

#### /door/see/app.js
```javascript
import { SigilAndPhrase } from '../../shared/components/sigil-and-phrase.js';
import { AudioLiveClient } from '../../shared/components/audio-live-client.js';

async function init() {
  const startPrompt = document.getElementById('start-prompt');
  const errorMessage = document.getElementById('error-message');
  
  try {
    // 1. Load active audio prompt from database
    const res = await fetch('/api/audio-prompts/active');
    if (!res.ok) {
      throw new Error('Failed to load audio prompt');
    }
    const { prompt } = await res.json();
    
    // 2. Initialize sigil renderer (300px for full-screen)
    const sigil = new SigilAndPhrase({ 
      container: '#sigil',
      canvasSize: 300
    });
    
    // 3. Initialize audio client
    const audioClient = new AudioLiveClient({
      systemPrompt: prompt.system_prompt,
      
      onResponse: (data) => {
        if (data.sigilPhrase && data.sigilDrawCalls) {
          sigil.render({
            phrase: data.sigilPhrase,
            drawCalls: data.sigilDrawCalls
          });
        }
      },
      
      onError: (error) => {
        console.error('Audio error:', error);
        errorMessage.textContent = error.message;
        errorMessage.classList.add('visible');
        startPrompt.textContent = 'click to retry';
        startPrompt.classList.remove('hidden');
      },
      
      onStatusChange: (status) => {
        console.log('Status:', status);
        if (status === 'listening') {
          startPrompt.classList.add('hidden');
          document.body.classList.add('started');
        }
      }
    });
    
    // 4. Start on click (respects browser autoplay policy)
    document.body.addEventListener('click', async () => {
      if (!audioClient.isListening()) {
        try {
          errorMessage.classList.remove('visible');
          startPrompt.textContent = 'starting...';
          await audioClient.start();
        } catch (error) {
          console.error('Failed to start:', error);
          errorMessage.textContent = 'microphone access denied';
          errorMessage.classList.add('visible');
          startPrompt.textContent = 'click to retry';
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
```

---

## Phase 6: Server Integration

### Objectives
- Serve `/door` apps as static files
- Maintain existing routes

### Changes to server.js

Add after existing static file serving:
```javascript
// Door apps (user-facing)
app.use('/door', express.static('door'));
```

### Access URL
`http://localhost:3001/door/see/`

---

## Implementation Checklist

### Phase 1: Restructure (30 min)
- [ ] Create `/shared` directory structure
- [ ] Move sigil-and-phrase.js
- [ ] Move sigil.standalone.js
- [ ] Move typewriter.js  
- [ ] Move prompt-editor.css
- [ ] Update sigil-and-phrase.js internal imports
- [ ] Update visual-percept imports
- [ ] Update audio-percept imports
- [ ] Test both prompt editors

### Phase 2: Extract AudioLiveClient (2 hours)
- [ ] Create `/shared/components/audio-live-client.js`
- [ ] Extract microphone initialization
- [ ] Extract audio processing (PCM conversion)
- [ ] Extract WebSocket connection logic
- [ ] Extract packet sending logic
- [ ] Extract response handling
- [ ] Add event emitter pattern
- [ ] Add status management
- [ ] Add error handling
- [ ] Test standalone

### Phase 3: GeminiTokenFetcher (15 min)
- [ ] Create `/shared/components/gemini-token-fetcher.js`
- [ ] Implement fetch logic
- [ ] Add error handling
- [ ] Use in AudioLiveClient

### Phase 4: Update audio-percept (30 min)
- [ ] Import AudioLiveClient
- [ ] Replace audio logic with component
- [ ] Update state management
- [ ] Update UI handlers
- [ ] Test all functionality
- [ ] Verify stop/start cycles
- [ ] Verify prompt switching

### Phase 5: Create /door/see (1 hour)
- [ ] Create directory structure
- [ ] Implement index.html
- [ ] Implement style.css
- [ ] Implement app.js
- [ ] Test with microphone
- [ ] Test error states
- [ ] Test on different browsers

### Phase 6: Server Integration (15 min)
- [ ] Add static serving to server.js
- [ ] Test routing
- [ ] Test with dev server

### Phase 7: Documentation (30 min)
- [ ] Update README with /door info
- [ ] Document AudioLiveClient API
- [ ] Add usage examples
- [ ] Update architecture docs

---

## Testing Plan

### Component Testing
1. **AudioLiveClient**
   - Microphone access (allow/deny)
   - WebSocket connection
   - Packet streaming
   - Response parsing
   - Error handling
   - Stop/start cycles

2. **SigilAndPhrase** (already tested)
   - Rendering
   - Typewriter
   - Container filling

### Integration Testing
1. **audio-percept**
   - All existing functionality
   - Prompt loading
   - Prompt switching
   - Stop/start
   - Response display

2. **/door/see**
   - Initial load
   - Click to start
   - Microphone permission flow
   - Sigil updates
   - Error states
   - Multiple sessions

### Browser Testing
- Chrome/Edge (Chromium)
- Firefox
- Safari (if available)

---

## Risk Assessment

### Low Risk
- Moving shared files (straightforward refactor)
- Creating /door/see structure

### Medium Risk
- Extracting AudioLiveClient (complex logic)
- Event-based architecture (needs testing)

### Mitigation
- Test audio-percept thoroughly after each change
- Keep git commits granular for easy rollback
- Test on multiple browsers

---

## Success Criteria

✅ `/shared` at top level with clean structure
✅ AudioLiveClient works standalone
✅ audio-percept simplified and functional
✅ `/door/see` loads and responds to audio
✅ All existing functionality preserved
✅ Clean, maintainable codebase

---

## Timeline

**Total Estimate**: 4-5 hours

| Phase | Task | Time |
|-------|------|------|
| 1 | Restructure /shared | 30 min |
| 2 | Extract AudioLiveClient | 2 hours |
| 3 | GeminiTokenFetcher | 15 min |
| 4 | Update audio-percept | 30 min |
| 5 | Create /door/see | 1 hour |
| 6 | Server integration | 15 min |
| 7 | Testing & docs | 30 min |

---

## Next Steps

**Status**: Plan complete, standing by for go-ahead

When ready to proceed:
1. Switch to agent mode
2. Execute phases in order
3. Test after each phase
4. Document any issues

**Ready to build! 🚀**

