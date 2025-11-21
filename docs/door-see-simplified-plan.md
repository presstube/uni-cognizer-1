# Door/See Simplified Implementation Plan

**Project**: User-facing audio-to-sigil experience app  
**Status**: Ready for implementation  
**Estimated Time**: 2-3 hours  
**Aligned with**: Prime Directive (functional, <80 lines, minimal libraries)

---

## Philosophy

**Ship fast, extract later.**  
Create `/door/see` as a standalone app by copying needed code. Only extract shared components when we have 2+ consumers (YAGNI principle).

---

## Architecture Overview

### Goal
Create `/door/see` - a full-screen immersive audio sigil experience with minimal complexity.

### New Structure
```
/shared/                              ← NEW: Top-level shared components
├── sigil-and-phrase.js               ← Moved from prompt-editor/shared
├── sigil.standalone.js               ← Moved from prompt-editor/shared
├── typewriter.js                     ← Moved from prompt-editor/shared
└── prompt-editor.css                 ← Moved from prompt-editor/shared

/door/                                ← NEW: User-facing apps
└── see/
    ├── index.html                    ← Full-screen experience
    ├── app.js                        ← Audio capture + sigil rendering
    └── style.css                     ← Minimal black screen styling

/prompt-editor/                       ← EXISTING: Update imports only
├── audio-percept/
├── visual-percept/
└── ...
```

---

## Phase 1: Move Shared Components (30 min)

### Objectives
- Move shared components to top-level `/shared`
- Update imports in existing prompt editors
- Maintain backwards compatibility

### Tasks

#### 1.1 Create Directory and Move Files
```bash
mkdir shared
mv prompt-editor/shared/* shared/
rmdir prompt-editor/shared
```

#### 1.2 Update sigil-and-phrase.js Internal Imports
Change relative paths in `/shared/sigil-and-phrase.js`:

```javascript
// OLD (lines 1-2)
import { Sigil } from './sigil.standalone.js';
import { typewrite } from './typewriter.js';

// NEW
import { Sigil } from './sigil.standalone.js';
import { typewrite } from './typewriter.js';
```

**Note**: No change needed - relative paths still work!

#### 1.3 Update prompt-editor/visual-percept/editor.js
```javascript
// OLD (line 1)
import { SigilAndPhrase } from '../shared/sigil-and-phrase.js';

// NEW
import { SigilAndPhrase } from '../../shared/sigil-and-phrase.js';
```

#### 1.4 Update prompt-editor/audio-percept/editor.js
```javascript
// OLD (line 1)
import { SigilAndPhrase } from '../shared/sigil-and-phrase.js';

// NEW
import { SigilAndPhrase } from '../../shared/sigil-and-phrase.js';
```

#### 1.5 Test Both Editors
- Visit `/prompt-editor/visual-percept/`
- Visit `/prompt-editor/audio-percept/`
- Verify sigil rendering works

---

## Phase 2: Create /door/see App (1.5 hours)

### Objectives
- Full-screen immersive experience
- Auto-loads active audio prompt
- Click-to-start (browser policy compliant)
- Copy audio logic from editor (don't extract yet)

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

**Strategy**: Copy audio logic from `prompt-editor/audio-percept/editor.js` (lines 36-488).

**Structure**:
```javascript
import { SigilAndPhrase } from '../../shared/sigil-and-phrase.js';

// State (functional style with closure)
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
  responseBuffer: ''
};

// Audio functions (copied from editor.js)
async function initMicrophone() { /* ... */ }
async function initAudioProcessing(stream) { /* ... */ }
async function startListening() { /* ... */ }
function stopListening() { /* ... */ }

// WebSocket functions (copied from editor.js)
function createWebSocketUrl(token) { /* ... */ }
async function startSession() { /* ... */ }
function sendAudioPacket(base64PCM) { /* ... */ }
function handleResponse(message) { /* ... */ }

// UI helpers
function showError(msg) { /* ... */ }
function hideStartPrompt() { /* ... */ }

// Initialize app
async function init() {
  const startPrompt = document.getElementById('start-prompt');
  const errorMessage = document.getElementById('error-message');
  
  try {
    // Load active audio prompt
    const res = await fetch('/api/audio-prompts/active');
    if (!res.ok) throw new Error('Failed to load audio prompt');
    const { prompt } = await res.json();
    
    // Initialize sigil renderer (300px for full-screen)
    const sigil = new SigilAndPhrase({ 
      container: '#sigil',
      canvasSize: 300
    });
    
    // Store system prompt in state
    state.systemPrompt = prompt.system_prompt;
    state.sigil = sigil;
    
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
          
          startPrompt.classList.add('hidden');
          document.body.classList.add('started');
        } catch (error) {
          console.error('Failed to start:', error);
          errorMessage.textContent = 'microphone access denied';
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
```

**Implementation Notes**:
- Copy audio capture logic (lines 36-228 from editor.js)
- Copy WebSocket logic (lines 242-488 from editor.js)
- Simplify: Remove all prompt management UI code
- Simplify: Remove status indicators, just show sigil
- Keep handleResponse logic to render sigils via `state.sigil.render()`

**Total**: ~250 lines (acceptable for now, can refactor later)

---

## Phase 3: Server Integration (15 min)

### Objectives
- Serve `/door` apps as static files
- Maintain existing routes

### Changes to server.js

Add after line 60 (after prompt-editor static serving):

```javascript
// Door apps (user-facing)
app.use('/door', express.static('door'));
```

### Access URL
`http://localhost:3001/door/see/`

---

## Implementation Checklist

### Phase 1: Move Shared Components ✓
- [ ] Create `/shared` directory
- [ ] Move files from `prompt-editor/shared/`
- [ ] Update import in `prompt-editor/visual-percept/editor.js`
- [ ] Update import in `prompt-editor/audio-percept/editor.js`
- [ ] Test visual percept editor
- [ ] Test audio percept editor

### Phase 2: Create /door/see ✓
- [ ] Create `/door/see` directory
- [ ] Create `index.html`
- [ ] Create `style.css`
- [ ] Create `app.js` (copy audio logic from editor)
- [ ] Test microphone access
- [ ] Test sigil rendering
- [ ] Test error states

### Phase 3: Server Integration ✓
- [ ] Add static serving to `server.js`
- [ ] Test route at `/door/see/`
- [ ] Test on different browsers (Chrome, Firefox, Safari)

---

## Testing Plan

### Component Testing
1. **Shared Assets**
   - Visual percept editor still works
   - Audio percept editor still works
   - Sigil rendering unchanged

2. **/door/see**
   - Initial load
   - Click to start
   - Microphone permission flow
   - Sigil updates
   - Error states (mic denied, network failure)
   - Multiple sessions

### Browser Testing
- Chrome/Edge (Chromium)
- Firefox
- Safari (if available)

### UX Testing
- Full-screen experience feels immersive
- Error messages are clear
- Click interaction is obvious
- Sigil size is appropriate (300px)

---

## Future Optimizations (NOT NOW)

Only do these if/when needed:

### If You Build More Audio Apps
- Extract `createAudioClient()` function (not class!)
- Move to `/shared/audio-client.js`
- Use in both editor and door/see

### If Files Get Too Large
- Break `app.js` into functional modules:
  - `audio-capture.js` - Pure functions for audio
  - `websocket-client.js` - Pure functions for WS
  - `app.js` - Orchestration only
- Each module <80 lines per prime directive

### If You Need Token Caching
- Add simple `fetchGeminiToken()` helper
- Move to `/shared/gemini-token.js`

---

## Success Criteria

✅ `/shared` at top level with clean structure  
✅ Both prompt editors work unchanged  
✅ `/door/see` loads and responds to audio  
✅ Full-screen experience is immersive  
✅ Error handling is clear  
✅ Code follows functional patterns from prime directive  

---

## Key Differences from Original Plan

| Original Plan | Simplified Plan | Reasoning |
|--------------|-----------------|-----------|
| 7 phases, 4-5 hours | 3 phases, 2-3 hours | Ship faster |
| Extract `AudioLiveClient` class | Copy audio code inline | YAGNI - extract when 2+ consumers |
| Extract `GeminiTokenFetcher` class | Use fetch directly | One line, no need to abstract |
| Update audio-percept editor | Leave as-is | Working code, don't touch |
| Event-based architecture | Direct callbacks | Simpler, fewer abstractions |
| ~600 line component | ~250 line app | Appropriate for single-use |

---

## Prime Directive Alignment

✅ **Functional Programming** - Using closures instead of classes  
✅ **Immutable State** - Using `const` and spread operators  
✅ **Unidirectional Data Flow** - Parent → child pattern  
⚠️ **File Size** - 250 lines (can refactor later if needed)  
✅ **Minimal Libraries** - Vanilla JS, native APIs  
✅ **Dumb Client** - Event-driven, stateless display  

---

## Timeline

**Total Estimate**: 2-3 hours

| Phase | Task | Time |
|-------|------|------|
| 1 | Move shared components | 30 min |
| 2 | Create /door/see app | 1.5 hours |
| 3 | Server integration | 15 min |
| - | Testing & refinement | 30 min |

---

## Next Steps

**Ready to implement!**

1. Switch to agent mode
2. Execute phases in order
3. Test after each phase
4. Ship and iterate

**Philosophy**: Get it working, then make it better. Perfect is the enemy of shipped.

🚀 **Let's build!**

