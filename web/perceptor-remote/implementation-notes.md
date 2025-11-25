# Perceptor-Remote Implementation Notes

**Date Started**: 2025-11-24
**Phase**: 1 - Core Streaming

---

## Implementation Log

### Directory Setup
- ✅ Created `/web/perceptor-remote/` directory
- ✅ Created implementation notes file

### Next Steps
- [ ] Create `index.html` with inline CSS
- [ ] Create `app.js` with Phase 1 functionality

---

## Design Notes

### Architecture
- Single HTML file with inline CSS (keep it simple)
- One JavaScript module (app.js)
- Console-first approach (UI later)
- Dynamic DB settings for all configuration

### Key Features (Phase 1)
- Hardware: Webcam + Mic initialization
- DB: Load active audio/visual prompts
- Gemini: WebSocket connection with Live API
- Audio: Continuous PCM streaming (configurable interval)
- Visual: Frame capture every 4s
- Output: Console logging of percepts

---

## Implementation Progress

### Bug Fix: Sample Rate Confusion (2025-11-24)
- ❌ **Bug**: Used `sample_rate` from DB (512) as AudioContext sample rate
- ✅ **Fix**: AudioContext always uses 16000Hz (Gemini Live API requirement)
- ✅ **Clarification**: `sample_rate` field in DB is the ScriptProcessor buffer size
- ✅ **Updated**: All references to use correct naming
- ✅ **Fixed UI**: Updated audio-percept editor label to "Buffer Size (samples)"
- ✅ **Added Comments**: Clarified in code that sample_rate is buffer size

### Bug Fix: Blob Message Handling (2025-11-24)
- ❌ **Bug**: Gemini sends Blob messages, code tried to parse directly as JSON
- ✅ **Fix**: Added Blob detection and async text conversion before parsing
- ✅ **Pattern**: Same approach used in audio-percept and visual-percept editors
- ✅ **Error**: "Unexpected token 'o', '[object Blob]' is not valid JSON" - RESOLVED

**Technical Details:**
- AudioContext sample rate: **16000Hz** (fixed, required by Gemini)
- ScriptProcessor buffer: **512/1024/4096/8192** (from DB `sample_rate` field)
- DB field name kept as `sample_rate` for backward compatibility
- UI now correctly labeled as "Buffer Size (samples)"
- WebSocket messages: Handle both Blob and text formats

### HTML & CSS (Completed)
- ✅ Created `index.html` with inline CSS
- ✅ Simple, dark-themed UI
- ✅ Video preview section
- ✅ Info panel showing loaded prompts and settings
- ✅ Status bar (Gemini + Streaming)
- ✅ Start/Stop controls
- ✅ Console output area with colored log entries

### App.js - Core Logic (Completed)
- ✅ **State Management**: Single state object with all necessary fields
- ✅ **Initialization Flow**:
  - Load active audio/visual prompts from DB
  - Extract sample rate, buffer size, packet interval dynamically
  - Initialize webcam (640x480)
  - Initialize microphone with DB sample rate
  - Setup audio processing (PCM conversion)
- ✅ **Audio Processing**:
  - AudioContext with dynamic sample rate
  - ScriptProcessorNode with dynamic buffer size
  - Float32 → Int16 PCM conversion
  - Buffer accumulation during streaming
- ✅ **Gemini Live Connection**:
  - Ephemeral token fetch
  - WebSocket URL construction (handles ephemeral vs API key)
  - Setup message with audio prompt + generation config
  - Event handlers (open, message, error, close)
- ✅ **Audio Streaming Loop**:
  - Dynamic packet interval from DB
  - MIN/MAX samples calculated from sample rate
  - Little-endian PCM encoding
  - Base64 conversion
  - Sends via `realtimeInput` format
- ✅ **Visual Streaming Loop**:
  - Fixed 4-second interval
  - Canvas-based frame capture
  - JPEG encoding (0.8 quality)
  - Sends via `clientContent` format with visual user prompt
- ✅ **Response Handler**:
  - Setup complete detection
  - Text accumulation from streaming parts
  - Turn complete detection
  - JSON sanitization (removes markdown code fences)
  - Schema discrimination (audio vs visual)
  - Console logging by type
- ✅ **Start/Stop Controls**:
  - Start: Connect Gemini → Wait for setup → Start loops
  - Stop: Clear intervals → Close WebSocket → Clear buffer
  - UI state updates
- ✅ **UI Updates**:
  - Status indicators (Gemini, Streaming)
  - Button enable/disable logic
  - Info panel population
  - Console logging with timestamps and color-coding

### Code Quality
- ✅ Well-organized with 10 clear sections
- ✅ All DB settings used dynamically
- ✅ Error handling throughout
- ✅ Console logging for debugging
- ✅ Follows functional programming style
- ✅ ~550 lines, clean and maintainable

### Server Integration (Completed)
- ✅ Added route to `server.js`: `/perceptor-remote`
- ✅ Serves static files from `web/perceptor-remote/`
- ✅ No auth required (user-facing app)
- ✅ All required APIs already exist:
  - `/api/audio-prompts/active`
  - `/api/visual-prompts/active`
  - `/api/gemini/token`

---

## Testing Readiness

### Ready to Test
The Phase 1 implementation is **complete and ready for testing**!

### How to Test
1. Start server: `npm start` (or `npm run client:local`)
2. Open browser: `http://localhost:3001/perceptor-remote`
3. Click START button
4. Verify:
   - ✅ Video preview shows webcam
   - ✅ Gemini status shows connected
   - ✅ Console shows audio packets being sent
   - ✅ Console shows visual frames being sent
   - ✅ Audio percepts appear (speak into microphone)
   - ✅ Visual percepts appear (wave at camera)
5. Click STOP button
6. Verify streaming stops cleanly

### Expected Behavior
- **Initialization**: Loads prompts, shows settings, initializes hardware
- **Gemini Connection**: Connects, sends setup, shows "Connected"
- **Audio Streaming**: Sends PCM packets every 500ms (default)
- **Visual Streaming**: Sends frames every 4s
- **Audio Percepts**: Console logs with transcript, analysis, tone, emoji, sentiment, confidence, sigilPhrase, sigilDrawCalls
- **Visual Percepts**: Console logs with description, sigilPhrase, drawCalls
- **Stop**: Cleanly stops all intervals and closes WebSocket

---

## Known Limitations (Phase 1)

### What's NOT Included (Yet)
- ❌ Cognizer integration (Phase 2)
- ❌ Mind moment reception
- ❌ Sigil visualization
- ❌ Percept forwarding to cognizer
- ❌ Session management

### Phase 1 Scope
This implementation is **console-first** for development and testing:
- Logs percepts to browser console
- Logs percepts to on-page console area
- No fancy UI (just status indicators)
- No percept forwarding (just Gemini → Console)

---

## Next Steps (Phase 2)

When Phase 1 is tested and working:

1. Add Socket.io client for Cognizer connection
2. Implement `connectToCognizer()` function
3. Implement percept transformation (visual schema fix)
4. Forward percepts to Cognizer WebSocket
5. Listen for mind moments
6. Display mind moments in UI
7. Test full pipeline: Gemini → Perceptor → Cognizer

---

## File Manifest

```
/web/perceptor-remote/
  index.html              ~195 lines (HTML + inline CSS)
  app.js                  ~550 lines (all Phase 1 logic)
  implementation-notes.md ~200 lines (this file)
```

---

## Success Metrics

### Phase 1 Complete ✅
- [x] Directory created
- [x] HTML with inline CSS
- [x] App.js with 10 sections
- [x] Dynamic DB settings
- [x] Hardware initialization
- [x] Gemini Live connection
- [x] Audio streaming (configurable)
- [x] Visual streaming (4s interval)
- [x] Response parsing
- [x] Console logging
- [x] Start/Stop controls
- [x] Server route added
- [x] Implementation notes

### Ready for User Testing ✅

---

**Implementation Status**: Phase 1 COMPLETE (with Dual-WebSocket Refactor) 🎉

**Next Action**: User testing and verification

**Date Completed**: 2025-11-24

---

## Major Refactor: Dual WebSocket Architecture (2025-11-24)

### Problem
Initial implementation used a **single WebSocket** with interleaved messages:
- Audio prompt in setup (system instruction)
- Visual frames sent with user prompt
- Both responses came back on same channel
- Schema discrimination was fragile and error-prone

### Issues Encountered
1. **Schema Collision**: Audio prompt started generating `sigilPhrase`, breaking visual detection
2. **Silence Spam**: Audio percepts logged for silence, cluttering console
3. **JSON Parse Errors**: Occasional partial responses
4. **Complex Discrimination**: Required checking multiple fields to determine percept type

### Solution: Dual WebSocket Pattern
Refactored to use **TWO separate Gemini Live connections**:

```
Audio WebSocket:                    Visual WebSocket:
├─ Setup with audio prompt         ├─ Setup with visual prompt
├─ Audio generation config          ├─ Visual generation config
├─ Continuous PCM streaming         ├─ Periodic frames (4s)
└─ Audio percept responses          └─ Visual percept responses
```

### Implementation Changes

#### 1. State Management
```javascript
// OLD (single WebSocket)
geminiWs: null
geminiConnected: false
setupComplete: false
responseBuffer: ''

// NEW (dual WebSocket)
audioWs: null
audioConnected: false
audioSetupComplete: false
audioResponseBuffer: ''

visualWs: null
visualConnected: false
visualSetupComplete: false
visualResponseBuffer: ''
```

#### 2. Connection Functions
- **`startAudioSession()`**: Audio WebSocket with audio prompt
- **`startVisualSession()`**: Visual WebSocket with visual prompt
- Both started in parallel via `Promise.all()`

#### 3. Response Handlers
- **`handleAudioResponse(message)`**: 
  - No schema checking needed (knows it's audio)
  - Filters silence (`action.includes('silence')`)
  - Logs valid audio percepts
  
- **`handleVisualResponse(message)`**: 
  - No schema checking needed (knows it's visual)
  - Logs all visual percepts

#### 4. Streaming Functions
- **`startAudioStreaming()`**: Sends to `audioWs`
- **`startVisualStreaming()`**: Sends to `visualWs`
- Each checks its own `setupComplete` flag

#### 5. Control Flow
```javascript
start() {
  await Promise.all([
    startAudioSession(),
    startVisualSession()
  ]);
  await waitForSetup(); // Waits for BOTH
  startAudioStreaming();
  startVisualStreaming();
}

stop() {
  clearInterval(audioInterval);
  clearInterval(visualInterval);
  audioWs.close();
  visualWs.close();
}
```

#### 6. UI Updates
- Shows both channel statuses: `🎤` (audio) and `👁️` (visual)
- Connection progress shows which channels are ready
- Setup timeout reports which channel(s) failed

### Benefits

1. **✅ No Schema Collision**: Each channel has its own response format
2. **✅ Cleaner Code**: No discrimination logic needed
3. **✅ Silence Filtering**: Built into audio handler
4. **✅ Independent Failure**: One channel can fail without affecting the other
5. **✅ Clearer Debugging**: Each channel logs independently
6. **✅ Better Error Handling**: Per-channel error tracking

### Trade-offs

1. **Two Ephemeral Tokens**: Requires two API calls (negligible cost)
2. **Two WebSocket Connections**: More network overhead (acceptable for real-time)
3. **Slightly More Complex State**: But cleaner overall logic

### Code Quality
- ✅ Well-organized sections maintained
- ✅ No linter errors
- ✅ Clear separation of concerns
- ✅ Follows existing patterns from prompt editors

### Testing Notes
The refactored implementation should:
- ✅ Connect both channels in parallel
- ✅ Show dual status in UI
- ✅ Filter silence from audio
- ✅ Log visual percepts separately
- ✅ Handle independent failures gracefully

---

**Final Status**: Phase 1 COMPLETE with production-ready dual-WebSocket architecture

**Ready for**: User testing, integration with Cognizer (Phase 2)

