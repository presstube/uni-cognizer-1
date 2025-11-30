# Perceptor Circumplex

**Audio-only emotion analysis using the circumplex model**

Real-time mapping of audio to emotional coordinates (valence × arousal) using Gemini Live API + acoustic feature extraction.

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

4. **Click "START LISTENING"**

---

## What It Does

### Audio Analysis
- Captures microphone audio (16kHz PCM)
- Streams to Gemini Live API every 2 seconds
- Extracts acoustic features every frame:
  - **RMS**: Volume/energy (primary arousal indicator)
  - **ZCR**: Zero-crossing rate (roughness/tension)
  - **Spectral Centroid**: Brightness (arousal refinement)
  - **Temporal Envelope**: Dynamics (rising/falling/steady/varying)

### Circumplex Mapping
- Sends acoustic metadata to Gemini every 5 seconds
- LLM combines:
  - Semantic analysis (speech content, tone) → **Valence**
  - Acoustic features + vocal energy → **Arousal**
- Returns JSON with valence/arousal coordinates

### Visualization
- 2D canvas plot (400×400px)
- Quadrants: Excited, Anxious, Sad, Content
- Live position with trail showing trajectory
- Emotion label + numeric coordinates

---

## UI Layout

```
┌─────────────────────────────────────┐
│  Control Panel    Response Display  │
│  (top-left)       (top-right)       │
│                                     │
│       Circumplex Visualizer         │
│            (center)                 │
│                                     │
│  Debug Panel                        │
│  (bottom-left)                      │
└─────────────────────────────────────┘
```

**Control Panel**: API key, start/stop, status  
**Visualizer**: 2D emotion plot with trail  
**Response**: Latest transcript, reasoning, confidence  
**Debug**: Live acoustic features (RMS, ZCR, centroid, envelope)

---

## Architecture

### Modules

- **`app.js`**: Main application (audio capture, Gemini Live, UI)
- **`acoustic-analyzer.js`**: Feature extraction algorithms
- **`circumplex-viz.js`**: Canvas-based 2D visualization
- **`index.html`**: Page structure
- **`circumplex.css`**: Styling

### Data Flow

```
[Mic] → [Web Audio API]
          ↓
    [Acoustic Analyzer]
          ↓
    RMS, ZCR, Centroid, Envelope
          ↓
    ┌─────────────┐
    │  Every 2s:  │ Audio packets → [Gemini Live]
    │  Every 5s:  │ Acoustic context (text) → [Gemini Live]
    └─────────────┘
          ↓
    JSON Response
    { valence, arousal, transcript, emotion_label, reasoning }
          ↓
    [Circumplex Viz] + [UI Update]
```

---

## System Prompt

**Required**: Create a circumplex-aware system prompt in the Audio Prompt Editor

Key elements:
1. Explain circumplex model (valence/arousal dimensions)
2. Map acoustic features to arousal
3. Map semantic content to valence
4. Request JSON output with coordinates

Example structure:
```json
{
  "valence": 0.75,
  "arousal": 0.42,
  "transcript": "I'm feeling good!",
  "emotion_label": "content",
  "reasoning": "Positive words with calm delivery",
  "confidence": 0.85
}
```

---

## Testing Checklist

- [ ] Page loads
- [ ] API key saves to localStorage
- [ ] Microphone permission granted
- [ ] Audio capture works
- [ ] Debug panel shows live acoustic features
- [ ] WebSocket connects
- [ ] Audio packets send every 2s
- [ ] Acoustic metadata sends every 5s
- [ ] Responses parse as JSON
- [ ] Visualizer plots coordinates
- [ ] Trail shows trajectory
- [ ] Emotion label updates
- [ ] Works with both BYOT and ephemeral tokens

---

## Dependencies

- Web Audio API (ScriptProcessorNode)
- Canvas API
- WebSocket
- Gemini Live API (gemini-2.0-flash-exp)

No external npm packages in client code.

---

## Future Enhancements

- Calibration system (user baseline)
- Emotion timeline graph
- Export trajectory data
- Advanced features (pitch, MFCC, speaking rate)
- Multi-speaker detection
- Volatility metrics

---

**Status**: Phase 1 complete - Ready for initial testing  
**Date**: November 30, 2025
