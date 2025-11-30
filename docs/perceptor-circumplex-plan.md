# Perceptor Circumplex - Implementation Plan

**Goal**: Create an audio-only perceptor that extracts circumplex emotional coordinates (valence/arousal) from real-time audio using Gemini Live API + acoustic feature analysis.

**Status**: Planning  
**Date**: November 30, 2025

---

## Overview

### Architecture

```
[Microphone] 
    ↓
[Web Audio API]
    ↓
[Acoustic Feature Extraction] ← RMS, ZCR, Spectral Centroid
    ↓
[Gemini Live WebSocket]
    ├─► Audio Stream (realtimeInput.mediaChunks)
    └─► Acoustic Context (clientContent.turns - every 5s)
    ↓
[JSON Response]
    {
      valence: -1 to 1,
      arousal: -1 to 1,
      transcript: "...",
      emotion_label: "excited|calm|anxious|sad",
      reasoning: "..."
    }
    ↓
[Circumplex Visualizer]
```

---

## Phase 1: Page Structure

### 1.1 Create New Page

**Location**: `/web/perceptor-circumplex/`

**Files to create**:
- `index.html` - Main UI
- `app.js` - Application logic
- `circumplex.css` - Styling
- `acoustic-analyzer.js` - Feature extraction module
- `circumplex-viz.js` - Visualization component

**Based on**: `/web/perceptor-remote/` (audio-only subset)

### 1.2 Page Layout

```
┌─────────────────────────────────────┐
│  Perceptor Circumplex               │
│  Audio Emotion Analysis             │
├─────────────────────────────────────┤
│                                     │
│   [🎤 START LISTENING]              │
│   Status: ⚫ Disconnected           │
│                                     │
├──────────────┬──────────────────────┤
│              │                      │
│  Circumplex  │   Live Response      │
│  Visualizer  │                      │
│              │   Transcript: "..."  │
│   (2D Plot)  │   Valence: 0.75     │
│              │   Arousal: 0.42     │
│      •       │   Emotion: "content" │
│              │                      │
│              │   Reasoning: "..."   │
│              │                      │
├──────────────┴──────────────────────┤
│  Acoustic Features (Debug)          │
│  RMS: 0.42  ZCR: 0.15  Cent: 2300Hz│
└─────────────────────────────────────┘
```

---

## Phase 2: Acoustic Feature Extraction

### 2.1 Features to Extract

**Module**: `acoustic-analyzer.js`

**Features**:

```javascript
class AcousticAnalyzer {
  constructor(audioContext, sampleRate = 16000) {
    this.audioContext = audioContext;
    this.sampleRate = sampleRate;
    this.analysisBuffer = [];
  }
  
  // Arousal indicators
  calculateRMS(samples) {
    // Root Mean Square - volume/energy
    // Range: 0-1 (normalized)
    // High RMS = high arousal
  }
  
  calculateZCR(samples) {
    // Zero Crossing Rate - roughness/noise
    // Range: 0-1 (normalized)
    // High ZCR = tension/roughness
  }
  
  calculateSpectralCentroid(samples) {
    // Spectral brightness
    // Range: Hz (typically 500-4000)
    // High centroid = bright/sharp = arousal
  }
  
  calculateTemporalEnvelope(samples) {
    // Dynamics over time window
    // "rising" | "falling" | "steady" | "varying"
  }
  
  analyze(pcmBuffer) {
    return {
      rms: this.calculateRMS(pcmBuffer),
      zcr: this.calculateZCR(pcmBuffer),
      centroid: this.calculateSpectralCentroid(pcmBuffer),
      envelope: this.calculateTemporalEnvelope(pcmBuffer),
      timestamp: Date.now()
    };
  }
}
```

### 2.2 Analysis Loop

```javascript
// In audio processor callback:
processor.onaudioprocess = (event) => {
  const samples = event.inputBuffer.getChannelData(0);
  
  // Extract acoustic features
  const features = acousticAnalyzer.analyze(samples);
  
  // Store for batching
  acousticFeatureBuffer.push(features);
  
  // Convert to PCM for Gemini
  const pcmData = convertToPCM(samples);
  pcmBuffer.push(...pcmData);
};
```

---

## Phase 3: Gemini Live Integration

### 3.1 Dual-Stream Pattern

**Audio stream** (continuous, every 2s):
```javascript
ws.send(JSON.stringify({
  realtimeInput: {
    mediaChunks: [{
      mimeType: "audio/pcm;rate=16000",
      data: base64PCM
    }]
  }
}));
```

**Acoustic context** (batched, every 5s):
```javascript
// Average features over 5-second window
const avgFeatures = averageAcousticFeatures(acousticFeatureBuffer);

ws.send(JSON.stringify({
  clientContent: {
    turns: [{
      role: 'user',
      parts: [{
        text: `[Acoustic: RMS=${avgFeatures.rms.toFixed(2)} ZCR=${avgFeatures.zcr.toFixed(2)} Centroid=${avgFeatures.centroid.toFixed(0)}Hz Envelope=${avgFeatures.envelope}]`
      }]
    }],
    turnComplete: true
  }
}));

// Clear buffer
acousticFeatureBuffer = [];
```

### 3.2 Timing Strategy

```
Time:  0s    2s    4s    5s    6s    8s    10s
       │     │     │     │     │     │     │
Audio: ●─────●─────●─────●─────●─────●─────●
       │           │           │           │
Acoustic:          ▲           ▲           ▲
               (avg 0-5s)  (avg 5-10s)
```

**Why 5s batching?**
- Prevents overwhelming model with metadata
- Gives meaningful acoustic averages
- Aligns with typical emotional state duration
- Reduces API overhead

---

## Phase 4: Prompt Engineering

### 4.1 System Prompt (Draft)

**To be saved in**: Audio Prompt Editor as "Circumplex Emotion Mapping v1.0"

```
You are analyzing real-time audio to map emotional states onto the circumplex model.

CIRCUMPLEX MODEL:
- VALENCE: Negative (-1) ← → Positive (+1)
  Determined by: Speech content, vocal tone, semantic sentiment
  
- AROUSAL: Calm (-1) ← → Excited (+1)
  Determined by: Acoustic energy, speaking rate, vocal intensity

INPUTS YOU RECEIVE:

1. AUDIO STREAM (continuous):
   - Speech content (words, meaning)
   - Vocal prosody (tone, pitch, rhythm)
   - Emotional cues (sighs, laughter, pauses)

2. ACOUSTIC MARKERS (every 5 seconds):
   Format: [Acoustic: RMS=X.XX ZCR=X.XX Centroid=XXXXHz Envelope=state]
   
   - RMS (0-1): Energy/loudness → PRIMARY arousal indicator
     0.0-0.3 = low energy (calm)
     0.3-0.6 = moderate energy
     0.6-1.0 = high energy (excited)
   
   - ZCR (0-1): Roughness/noise texture → arousal refinement
     Higher = more tension/activation
   
   - Centroid (Hz): Spectral brightness → arousal quality
     500-1500Hz = warm/calm
     1500-3000Hz = moderate
     3000-5000Hz = bright/sharp/activated
   
   - Envelope: Temporal dynamics (rising|falling|steady|varying)

TASK:
Synthesize semantic analysis (from audio) with acoustic data (from markers) 
to produce precise circumplex coordinates.

MAPPING GUIDELINES:

VALENCE (semantic focus):
- Positive words, laughter, warm tone → +0.5 to +1.0
- Neutral content, matter-of-fact → -0.2 to +0.2
- Negative words, sighs, cold tone → -1.0 to -0.5
- Let acoustic features REFINE but not dominate valence

AROUSAL (acoustic + semantic):
- High RMS (>0.6) + fast speech + urgent tone → +0.7 to +1.0
- Moderate RMS (0.3-0.6) + normal pace → 0.0 to +0.5
- Low RMS (<0.3) + slow/calm speech → -1.0 to 0.0
- Bright centroid (>3000Hz) + high ZCR → increase arousal
- Use envelope to catch rising excitement or falling calm

EMOTION LABELS (derived from coordinates):
- High arousal + Positive valence = "excited", "elated", "energized"
- High arousal + Negative valence = "anxious", "tense", "stressed"
- Low arousal + Positive valence = "content", "peaceful", "relaxed"
- Low arousal + Negative valence = "sad", "bored", "depressed"

OUTPUT FORMAT (JSON):
{
  "valence": 0.75,
  "arousal": 0.42,
  "transcript": "exact words spoken or null if no speech",
  "emotion_label": "content",
  "reasoning": "Positive language (valence +0.75) with moderate RMS (0.42) and calm delivery indicates contentment with moderate engagement",
  "confidence": 0.85
}

CRITICAL:
- Use BOTH audio semantics AND acoustic markers
- Explain your reasoning (reference specific RMS/ZCR values)
- Update coordinates frequently as emotion shifts
- If no speech, analyze ambient sound emotional quality
```

### 4.2 Prompt Loading

**API endpoint**: `GET /api/audio-prompts/active` or `GET /api/audio-prompts/by-slug/circumplex-v1`

```javascript
async function loadCircumplexPrompt() {
  const res = await fetch('/api/audio-prompts/by-slug/circumplex-v1');
  const { prompt } = await res.json();
  
  return {
    systemPrompt: prompt.system_prompt,
    temperature: prompt.temperature,
    topP: prompt.top_p,
    topK: prompt.top_k,
    maxTokens: prompt.max_output_tokens
  };
}
```

**Note**: Need to add slug-based lookup endpoint to API if not exists.

---

## Phase 5: Circumplex Visualizer

### 5.1 Component Structure

**File**: `circumplex-viz.js`

```javascript
class CircumplexVisualizer {
  constructor(container, options = {}) {
    this.container = container;
    this.width = options.width || 400;
    this.height = options.height || 400;
    this.history = [];
    this.maxHistory = options.maxHistory || 50;
    
    this.init();
  }
  
  init() {
    // Create canvas
    // Draw axes (valence horizontal, arousal vertical)
    // Draw quadrant labels
    // Draw emotion region boundaries
  }
  
  plot(valence, arousal, emotion_label) {
    // Add to history
    // Draw point with trail
    // Update emotion label display
    // Animate transition
  }
  
  drawAxes() {
    // Valence: -1 (left) to +1 (right)
    // Arousal: -1 (bottom) to +1 (top)
    // Center crosshairs at (0, 0)
  }
  
  drawQuadrants() {
    // Q1 (top-right): Excited/Alert - yellow/orange
    // Q2 (top-left): Tense/Anxious - red
    // Q3 (bottom-left): Sad/Depressed - blue
    // Q4 (bottom-right): Calm/Content - green
  }
  
  drawTrail() {
    // Show last N points with fading opacity
    // Line connecting points shows trajectory
  }
}
```

### 5.2 Visual Design

```
        Arousal (+1)
             │
    Anxious  │  Excited
      (red)  │  (orange)
             │
─────────────┼─────────────► Valence
   Negative  │  Positive
             │
       Sad   │  Content
     (blue)  │  (green)
             │
          (-1)
```

**Features**:
- Live dot showing current position
- Fading trail showing emotional trajectory
- Quadrant color coding
- Emotion label below plot
- Coordinate display (numeric)

---

## Phase 6: Response Handling

### 6.1 Stream Processing

```javascript
ws.onmessage = async (event) => {
  const data = JSON.parse(event.data);
  
  if (data.serverContent?.turnComplete) {
    try {
      // Parse accumulated JSON response
      const response = JSON.parse(responseBuffer);
      
      // Update visualizer
      circumplexViz.plot(
        response.valence,
        response.arousal,
        response.emotion_label
      );
      
      // Update UI displays
      updateTranscript(response.transcript);
      updateCoordinates(response.valence, response.arousal);
      updateReasoning(response.reasoning);
      
      // Clear buffer
      responseBuffer = '';
      
    } catch (e) {
      console.warn('Invalid JSON response:', responseBuffer);
    }
  } else if (data.serverContent?.modelTurn) {
    // Accumulate streaming response
    data.serverContent.modelTurn.parts.forEach(part => {
      if (part.text) {
        responseBuffer += part.text;
      }
    });
  }
};
```

---

## Phase 7: Implementation Checklist

### 7.1 File Creation
- [ ] Create `/web/perceptor-circumplex/` directory
- [ ] Create `index.html` (based on perceptor-remote)
- [ ] Create `app.js` (audio-only version)
- [ ] Create `circumplex.css` (styling)
- [ ] Create `acoustic-analyzer.js` (feature extraction)
- [ ] Create `circumplex-viz.js` (visualization component)

### 7.2 Backend Support
- [ ] Add `GET /api/audio-prompts/by-slug/:slug` endpoint
- [ ] Or ensure prompt can be loaded by name/slug

### 7.3 Prompt Creation
- [ ] Open Audio Prompt Editor
- [ ] Create new prompt: "Circumplex Emotion Mapping v1.0"
- [ ] Slug: `circumplex-v1`
- [ ] Paste system prompt (from Phase 4)
- [ ] Save to database
- [ ] Test with sample audio

### 7.4 Core Features
- [ ] Microphone initialization (16kHz PCM)
- [ ] Audio processing loop (ScriptProcessorNode or AudioWorklet)
- [ ] Acoustic feature extraction (RMS, ZCR, centroid)
- [ ] Audio packet sending (every 2s)
- [ ] Acoustic metadata sending (every 5s)
- [ ] WebSocket connection to Gemini Live
- [ ] Ephemeral token fetching
- [ ] Setup message with circumplex prompt
- [ ] Response streaming and parsing
- [ ] JSON validation

### 7.5 Visualization
- [ ] Canvas-based circumplex plot
- [ ] Axes and quadrant rendering
- [ ] Live point plotting
- [ ] Trail/history visualization
- [ ] Emotion label display
- [ ] Coordinate display (numeric)
- [ ] Smooth animations

### 7.6 UI/UX
- [ ] Start/Stop listening toggle
- [ ] Connection status indicator
- [ ] Transcript display
- [ ] Valence/Arousal numeric display
- [ ] Emotion label display
- [ ] Reasoning display
- [ ] Acoustic features debug panel
- [ ] Error handling and messages

### 7.7 Testing
- [ ] Test with various emotional speech samples
- [ ] Test with silence (ambient sound analysis)
- [ ] Test with music
- [ ] Test acoustic feature accuracy
- [ ] Test coordinate mapping accuracy
- [ ] Test visualization smoothness
- [ ] Test reconnection on disconnect

---

## Phase 8: Future Enhancements

### 8.1 Features to Consider Later
- Export emotional trajectory as CSV/JSON
- Emotion timeline graph (valence/arousal over time)
- Dominant emotion statistics
- Acoustic feature visualization (waveform, spectrum)
- Multi-speaker detection
- Emotional volatility metrics
- Integration with cognizer-1 cognitive loop
- Save/replay sessions

### 8.2 Advanced Acoustic Features
- Mel-frequency cepstral coefficients (MFCC)
- Pitch tracking (F0)
- Voice quality metrics (jitter, shimmer)
- Speaking rate detection
- Pause/silence pattern analysis

---

## Technical Notes

### Dependencies
- No new npm packages needed (use Web Audio API)
- Reuse existing Gemini Live WebSocket pattern
- Reuse existing token endpoint

### Browser Compatibility
- Requires: WebSocket, Web Audio API, Canvas
- Chrome/Edge/Firefox/Safari all supported
- HTTPS required for microphone access (or localhost)

### Performance
- Audio processing: ~4096 samples every ~256ms (at 16kHz)
- Feature extraction: <10ms per buffer
- API calls: Audio every 2s, metadata every 5s
- Visualization: 60fps canvas rendering

---

## Open Questions

1. **Prompt iteration**: How many iterations to refine circumplex accuracy?
2. **Acoustic feature weighting**: Which features most predictive? RMS dominant?
3. **Response frequency**: Should we request updates every 5s or wait for turn complete?
4. **Calibration**: User-specific baseline? (e.g., some speak louder naturally)
5. **Validation**: How to validate circumplex accuracy? Ground truth dataset?

---

## Next Steps

1. Review this plan
2. Create file structure
3. Implement acoustic analyzer module (most critical)
4. Create basic UI shell
5. Test audio capture + feature extraction
6. Integrate Gemini Live
7. Craft and refine system prompt
8. Build visualizer
9. Iterate on accuracy

**Estimated Time**: 1-2 days for MVP, 3-5 days for polished version

---

**Status**: Ready for implementation  
**Awaiting**: Approval to proceed
