# Audio Percept Implementation Notes

**Started**: Implementation in progress
**Plan**: Following `audio-percept-plan.md`

---

## Progress Log

### Step 1: Database Schema ✅
- Created `src/db/migrations/006_audio_prompts.sql`
- Mirrored `visual_prompts` table structure
- Added indexes for active prompt and updated_at
- Seeded with default prompt

### Step 2: Database Layer ✅
- Created `src/db/audio-prompts.js`
- Implemented all CRUD functions mirroring visual-prompts
- Functions: getAllAudioPrompts, getAudioPromptById, getActiveAudioPrompt, createAudioPrompt, updateAudioPrompt, activateAudioPrompt, deleteAudioPrompt

### Step 3: API Routes ✅
- Created `src/api/audio-prompts.js`
- Implemented all API endpoints mirroring visual-prompts
- Endpoints: listAudioPrompts, getActiveAudioPromptAPI, getAudioPromptAPI, saveAudioPrompt, activateAudioPromptAPI, deleteAudioPromptAPI

### Step 4: Server Integration ✅
- Added import for audioPrompts API to `server.js`
- Added static file serving for `/prompt-editor/audio-percept`
- Added all API routes with editor auth

### Step 5: Shared CSS Framework ✅
- Created `prompt-editor/shared/prompt-editor.css`
- Extracted common styles from visual-percept
- Includes: base styles, panes, form elements, buttons, controls, status, response section

### Step 6: HTML Structure ✅
- Created `prompt-editor/audio-percept/index.html`
- Left pane: prompt editor with load/save/delete buttons
- Right pane: recording controls and JSON response display
- Uses shared CSS framework

### Step 7: Core Editor Logic ✅
- Created `prompt-editor/audio-percept/editor.js` (~600 lines)
- Audio capture using MediaRecorder API
- WebSocket connection to Gemini Live API
- Interval-based audio chunk sending (2 seconds)
- Response handling and JSON display
- Prompt management (load/save/delete/activate)

### Step 8: Styling ✅
- Created `prompt-editor/audio-percept/style.css`
- Minimal overrides to shared framework
- Recording indicator animation (for future use)

---

## Implementation Notes

### Decisions Made
- Using `audio/webm` format (browser-native MediaRecorder)
- 2-second interval for audio chunks
- Mirroring visual-percept pattern closely
- Simple state management (no complex state machine)
- MediaRecorder stop/restart pattern for chunking

### Implementation Details

**Audio Capture**:
- Uses `getUserMedia({ audio: true })` with echo cancellation, noise suppression, auto gain control
- **Web Audio API** for real-time PCM conversion (not MediaRecorder)
- AudioContext with 16kHz sample rate (required by Gemini Live API)
- ScriptProcessorNode converts float32 audio to 16-bit PCM
- PCM samples buffered and sent at regular intervals (2 seconds)
- Format: `audio/pcm;rate=16000` (16-bit PCM, 16kHz, mono) per Gemini Live API spec

**WebSocket**:
- Raw WebSocket connection (mirroring visual-percept setup)
- Ephemeral token from `/api/gemini/token`
- Setup message sent on connection open
- Audio chunks sent as `realtimeInput.mediaChunks` with base64-encoded PCM data
- Format: `{ realtimeInput: { mediaChunks: [{ mimeType: 'audio/pcm;rate=16000', data: base64 }] } }`
- Continuous streaming mode (no `turnComplete` per packet)

**State Management**:
- Simple state object with updateState() function
- Tracks: ws, stream, mediaRecorder, sendInterval, prompts, connection status, listening status, audioBuffer
- Single toggle button: "START LISTENING" / "STOP LISTENING"
- Continuous streaming mode: no request-in-flight tracking needed

**Prompt Management**:
- Full CRUD operations
- Auto-slug generation from name
- localStorage for last selected prompt
- Auto-load active prompt on init

### Issues Encountered

**Issue 1: CSS MIME Type Error** ✅ FIXED
- **Error**: `Refused to apply style from '.../shared/prompt-editor.css' because its MIME type ('text/html') is not a supported stylesheet MIME type`
- **Cause**: Shared directory not being served as static files
- **Fix**: Added `app.use('/prompt-editor/shared', express.static('prompt-editor/shared'));` to server.js

**Issue 2: API 500 Errors** 🔧 NEEDS MIGRATION

**Issue 3: Recording Approach Changed** ✅ UPDATED
- **Change**: Switched from stop/restart chunking to continuous recording with periodic sends
- **Implementation**: 
  - Single toggle button "START LISTENING" / "STOP LISTENING"
  - MediaRecorder runs continuously with `timeslice` parameter
  - Audio packets sent at regular intervals (2 seconds)
  - Let Gemini Live API handle the continuous stream

**Issue 4: WebSocket "Precondition check failed"** ✅ FIXED
- **Error**: WebSocket closes after sending audio packets with "Precondition check failed"
- **Root Cause**: Using wrong message format - was sending `clientContent.turns` with `turnComplete: true` (discrete turn-based API) instead of `realtimeInput.mediaChunks` (continuous streaming API)
- **Reference**: https://ai.google.dev/gemini-api/docs/live
- **Fix**: 
  - Changed message format from `clientContent.turns` to `realtimeInput.mediaChunks`
  - Removed `turnComplete: true` flag (not needed for streaming)
  - Removed text prompt from each audio packet (system instruction sent once in setup)
  - Removed `isRequestInFlight` flag (no need to wait for responses between audio packets in streaming mode)
  - Added minimum sample requirement (8000 samples = 0.5s) before sending
  - Improved little-endian encoding using DataView for proper PCM format
  - Audio now streams continuously without waiting for turn completion

**Issue 5: Favicon 404** ✅ FIXED
- **Error**: `GET /favicon.ico 404`
- **Fix**: Added route to return 204 (No Content) for favicon requests
- **Error**: `GET /api/audio-prompts 500 (Internal Server Error)`
- **Cause**: Database table `audio_prompts` doesn't exist (migration not run)
- **Fix**: Run database migration: `npm run migrate`
- **Note**: Added improved error logging to show actual database error details

### Testing Notes
- **TODO**: Test microphone permission flow
- **TODO**: Test audio chunk sending
- **TODO**: Test WebSocket connection and response handling
- **TODO**: Test prompt CRUD operations
- **TODO**: Test error handling (mic denied, WebSocket failures)

### Known Limitations
- No audio visualization (waveform/spectrum) - kept simple for v1
- No silence detection - sends all chunks regardless
- Fixed 2-second interval (not configurable)
- No audio playback/export

---

## Files Created/Modified

**New Files**:
- ✅ `src/db/migrations/006_audio_prompts.sql`
- ✅ `src/db/audio-prompts.js`
- ✅ `src/api/audio-prompts.js`
- ✅ `prompt-editor/shared/prompt-editor.css`
- ✅ `prompt-editor/audio-percept/index.html`
- ✅ `prompt-editor/audio-percept/editor.js`
- ✅ `prompt-editor/audio-percept/style.css`

**Modified Files**:
- ✅ `server.js` (added routes and static serving)

---

## Next Steps
1. ✅ Complete database layer
2. ✅ Complete API routes
3. ✅ Integrate with server
4. ✅ Create shared CSS
5. ✅ Build HTML structure
6. ✅ Implement editor logic
7. ✅ Add styling
8. ⏳ Test end-to-end
9. ⏳ Run database migration
10. ⏳ Verify in browser

---

## Status: Implementation Complete - Testing Required ✅

All code files created and **critical streaming bug fixed**. 

### Key Fix Applied (2024-11-21)
- **Changed from discrete turn-based API to continuous streaming API**
- Message format: `clientContent.turns` → `realtimeInput.mediaChunks`
- Removed `turnComplete: true` flag from audio packets
- Removed per-packet text prompts (system instruction in setup only)
- Removed `isRequestInFlight` flag (not needed for streaming)
- Added minimum sample buffering (0.5s) before sending
- Improved PCM encoding with proper little-endian DataView

Ready for browser testing with real microphone input.

