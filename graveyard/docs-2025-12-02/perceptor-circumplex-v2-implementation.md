# Perceptor Circumplex v2 - Implementation Log

**Started**: December 1, 2025  
**Goal**: Simple standalone multimodal circumplex perceptor

---

## Implementation Progress

### Phase 1: File Structure ✅ COMPLETE

**Started**: 2025-12-01  
**Completed**: 2025-12-01

**Tasks**:
- [x] Create `/web/perceptor-circumplex/` directory
- [x] Create `index.html` - Minimal structure (62 lines)
- [x] Create `circumplex.css` - Minimal styling (166 lines)
- [x] Create `app.js` - Core logic (415 lines)
- [x] Create `README.md` - Quick start guide
- [x] Register route in `server.js`

**Files Created**:
- `/web/perceptor-circumplex/index.html` - Full-screen video + control panel + response display
- `/web/perceptor-circumplex/circumplex.css` - Dark theme with glassmorphism panels
- `/web/perceptor-circumplex/app.js` - Complete implementation with all sections
- `/web/perceptor-circumplex/README.md` - Documentation

**Implementation Details**:

**HTML Structure**:
- Full-screen `<video>` element for webcam feed
- Control panel (bottom-left): API key input + START button + status
- Response display (top-right): Audio + Visual sections with transcript/description and circumplex values

**CSS Features**:
- Full-screen video with 70% brightness filter
- Glassmorphism panels with backdrop-filter blur
- Clean typography with system fonts
- Responsive layout
- Custom scrollbar styling for response panel

**JavaScript Architecture** (10 sections):
1. State Management - All app state in single object
2. System Prompt - Hardcoded circumplex prompt
3. Initialization - Setup on page load
4. API Key Management - localStorage + event handlers (from perceptor-remote pattern)
5. Hardware Setup - Camera/mic access + audio processing
6. WebSocket Connection - Gemini Live + ephemeral tokens
7. Streaming - Audio PCM + video JPEG every 2s
8. Response Handling - JSON parsing + UI updates
9. Utils - PCM conversion + status updates
10. Main Control - START/STOP toggle

**Key Features**:
- Single WebSocket for both audio + video (not dual like v1)
- Hardcoded system prompt (no DB dependency yet)
- API key saved to localStorage
- Ephemeral token support ("onthehouse")
- 2-second streaming interval
- Real-time UI updates
- Error handling throughout

**Notes**:
- Total ~643 lines of code (vs. 1000+ in v1)
- No acoustic feature extraction
- No complex visualizations (yet)
- Standalone - no cognizer integration (yet)

---

## Phase 2: CSS Refactoring & Shared Components ✅ COMPLETE

**Completed**: 2025-12-01

**Changes**:
- Removed custom CSS, now uses shared foundation
- Created `/web/shared/components/api-key-input/api-key-input.css` - reusable API key component
- Updated HTML to use shared CSS includes: `base.css`, `components.css`, `api-key-input.css`
- Simplified `circumplex.css` to only component-specific styles (~70 lines vs 166)
- Matches perceptor-remote visual style exactly
- Updated perceptor-remote to also use shared API key component

**Benefits**:
- Consistent styling across all perceptor pages
- Shared component for API key input (DRY)
- Uses CSS custom properties from base.css
- Easier to maintain and update

---

## Testing Checkpoints

### Checkpoint 1: Basic Page Load
- [ ] Page loads at `http://localhost:3001/perceptor-circumplex`
- [ ] Video feed displays
- [ ] Controls visible
- [ ] No console errors

### Checkpoint 2: Hardware Access
- [ ] Camera permission granted
- [ ] Microphone permission granted
- [ ] Video displays live feed
- [ ] No permission errors

### Checkpoint 3: WebSocket Connection
- [ ] API key saves to localStorage
- [ ] WebSocket connects (with BYOT)
- [ ] WebSocket connects (with "onthehouse")
- [ ] Setup message sent
- [ ] Status shows "Connected"

### Checkpoint 4: Streaming
- [ ] Audio packets sending every 2s
- [ ] Video frames sending every 2s
- [ ] Console logs confirm streaming
- [ ] No WebSocket errors

### Checkpoint 5: Responses
- [ ] JSON responses received
- [ ] Transcript appears
- [ ] Description appears
- [ ] Valence/arousal numbers appear
- [ ] Numbers in correct range (-1 to +1)

---

## Issues & Solutions

### Issue 1: WebSocket Blob Responses
**Problem**: WebSocket messages coming in as Blob objects, causing JSON.parse to fail  
**Error**: `SyntaxError: Unexpected token 'o', "[object Blob]" is not valid JSON`  
**Solution**: Check if `event.data` is a Blob and convert to text before parsing  
**Fixed**: 2025-12-01 - Added async handler with Blob detection

### Issue 2: No UI Updates Despite No Errors
**Problem**: No errors but no transcript/description/circumplex values appearing  
**Diagnosis**: Gemini was receiving media but never asked to respond  
**Solution**: Send `clientContent` with `turnComplete: true` every 6 seconds to prompt analysis  
**Fixed**: 2025-12-01 - Added `requestAnalysis()` function called every 3 frames (6s)

### Issue 3: JSON Wrapped in Markdown Code Fences
**Problem**: Gemini returns valid JSON but wrapped in ```json ... ``` fences with explanatory text  
**Example**: "Here's the output: ```json { ... } ```"  
**Solution**: Extract JSON from markdown code fences using regex, take last match if multiple  
**Fixed**: 2025-12-01 - Added JSON extraction logic before parsing

### Issue 4: Model Not Seeing Media Stream
**Problem**: Model keeps saying "I'm waiting for audio and video stream" despite media being sent  
**Root Cause**: Sending `clientContent` turns creates separate context from `realtimeInput` media chunks  
**Solution**: Remove manual turn requests entirely, enable auto-response mode with `responseMimeType: 'application/json'`  
**Pattern**: Match perceptor-remote - stream media continuously, Gemini auto-responds based on system instruction  
**Fixed**: 2025-12-01 - Enabled JSON auto-response, removed requestAnalysis() function

---

## Next Steps

After basic implementation:
1. Test with real audio/video
2. Validate response format
3. Iterate on prompt if needed
4. Add circumplex visualization
5. Polish UI

---

## Code Notes

### System Prompt (Hardcoded)
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

### Key Differences from v1
- No acoustic feature extraction
- Single WebSocket (not dual)
- Hardcoded prompt (not DB)
- Minimal UI (full-screen video)
- ~300 lines total vs. 1000+ in v1

