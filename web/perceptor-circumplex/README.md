# Perceptor Circumplex v2

**Simple standalone multimodal circumplex perceptor**

Real-time emotional analysis using Russell's Circumplex Model (valence × arousal) from audio + video via Gemini Live.

---

## Quick Start

1. **Start server**:
   ```bash
   npm start
   ```

2. **Navigate to**:
   ```
   http://localhost:3001/perceptor-circumplex
   ```

3. **Enter API key**:
   - Your own Gemini API key, OR
   - "onthehouse" to use ephemeral tokens

4. **Click START**

---

## What It Does

### Multimodal Input
- Captures **audio** (16kHz PCM) from microphone
- Captures **video** (640x480 JPEG) from webcam
- Sends both streams to single Gemini Live WebSocket

### Circumplex Output
Returns two coordinate pairs:
- **Audio**: `[valence, arousal]` based on speech + vocal tone
- **Visual**: `[valence, arousal]` based on facial expressions + body language

### Coordinates
- **Valence**: -1 (negative) to +1 (positive)
- **Arousal**: -1 (calm) to +1 (energized)

---

## UI Layout

- **Full-screen video** - Live camera feed
- **Control panel** (bottom-left) - API key + START button
- **Response display** (top-right) - Transcript, description, circumplex values

---

## Technical Details

### Architecture
- ~400 lines of code (HTML + CSS + JS)
- No external dependencies (vanilla JS)
- Single WebSocket connection
- Hardcoded system prompt (no DB dependency)
- Streaming every 2 seconds

### Key Simplifications
- No acoustic feature extraction (Gemini handles it)
- No dual WebSocket pattern (single connection)
- No database integration (standalone)
- No complex visualizations (coming later)

---

## Testing Checklist

- [ ] Page loads with video feed
- [ ] API key saves to localStorage
- [ ] Camera/mic permissions granted
- [ ] WebSocket connects
- [ ] Audio/video streaming every 2s
- [ ] JSON responses received
- [ ] Transcript updates
- [ ] Description updates
- [ ] Valence/arousal values in range (-1 to +1)

---

## Next Steps

After validation:
1. Add 2D circumplex visualization
2. Combine audio + visual into single coordinate
3. Connect to cognizer (send as percepts)
4. Move prompt to database
5. Add trajectory trail

---

## Development

**Implementation log**: `docs/perceptor-circumplex-v2-implementation.md`

**Plan**: `docs/perceptor-circumplex-v2-simple.md`

---

**Status**: Phase 1 complete - Ready for initial testing  
**Date**: December 1, 2025
