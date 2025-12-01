# Perceptor Circumplex v2.0 - Full Russell's Model Implementation

**Goal**: Upgrade to full 12-state Russell's Circumplex with radial transparency gradient matching psychology literature standard.

**Status**: Planning  
**Date**: November 30, 2025

---

## Current vs. Target

### Current State (v1.0)
- 4 discrete quadrants with fixed colors
- 4 emotion labels (Excited, Anxious, Sad, Content)
- Discrete quadrant backgrounds
- Basic 2D coordinate mapping

### Target State (v2.0)
- 12 emotion states arranged in circle (30° intervals)
- Continuous radial gradient (transparent center → saturated edge)
- Intensity as distance from origin (0 = neutral, 1 = maximum)
- Color system matching Russell (1980) standard circumplex
- Angular positioning for emotion labels

---

## Visual Design Specification

### Color System (From Reference Image)

**Quadrant 1: Top-Right (High Arousal + Positive Valence)**
- Color range: Green → Teal
- Emotions: Alert, Excited, Happy
- Hue: 140° - 200°

**Quadrant 2: Bottom-Right (Low Arousal + Positive Valence)**
- Color range: Blue
- Emotions: Content, Relaxed, Calm
- Hue: 200° - 250°

**Quadrant 3: Bottom-Left (Low Arousal + Negative Valence)**
- Color range: Red → Orange
- Emotions: Bored, Depressed, Sad
- Hue: 250° - 20° (wrapping)

**Quadrant 4: Top-Left (High Arousal + Negative Valence)**
- Color range: Yellow → Yellow-Green
- Emotions: Distressed, Angry, Tense
- Hue: 20° - 140°

### Transparency Gradient
- **Center (0,0)**: 100% transparent (alpha = 0)
- **Edge (distance = 1)**: 100% saturated color (alpha = 1)
- **Linear interpolation**: `alpha = distance_from_center`

---

## 12 Emotion States - Precise Coordinates

```javascript
const CIRCUMPLEX_EMOTIONS = [
  // Quadrant 1: High Arousal + Positive Valence
  { 
    label: 'alert', 
    angle: 60,  // degrees
    valence: 0.50, 
    arousal: 0.87,
    color: { h: 140, s: 60, l: 60 }
  },
  { 
    label: 'excited', 
    angle: 30, 
    valence: 0.87, 
    arousal: 0.50,
    color: { h: 160, s: 70, l: 60 }
  },
  
  // Quadrant 2: Low Arousal + Positive Valence
  { 
    label: 'happy', 
    angle: 0, 
    valence: 1.00, 
    arousal: 0.00,
    color: { h: 200, s: 70, l: 60 }
  },
  { 
    label: 'content', 
    angle: -30, 
    valence: 0.87, 
    arousal: -0.50,
    color: { h: 220, s: 60, l: 60 }
  },
  { 
    label: 'relaxed', 
    angle: -60, 
    valence: 0.50, 
    arousal: -0.87,
    color: { h: 230, s: 50, l: 65 }
  },
  
  // Transition state
  { 
    label: 'calm', 
    angle: -90, 
    valence: 0.00, 
    arousal: -1.00,
    color: { h: 250, s: 40, l: 70 }
  },
  
  // Quadrant 3: Low Arousal + Negative Valence
  { 
    label: 'bored', 
    angle: -120, 
    valence: -0.50, 
    arousal: -0.87,
    color: { h: 10, s: 60, l: 65 }
  },
  { 
    label: 'depressed', 
    angle: -150, 
    valence: -0.87, 
    arousal: -0.50,
    color: { h: 0, s: 70, l: 60 }
  },
  
  // Quadrant 4: High Arousal + Negative Valence
  { 
    label: 'sad', 
    angle: 180, 
    valence: -1.00, 
    arousal: 0.00,
    color: { h: 20, s: 70, l: 65 }
  },
  { 
    label: 'distressed', 
    angle: 150, 
    valence: -0.87, 
    arousal: 0.50,
    color: { h: 45, s: 70, l: 65 }
  },
  { 
    label: 'angry', 
    angle: 120, 
    valence: -0.50, 
    arousal: 0.87,
    color: { h: 55, s: 80, l: 65 }
  },
  
  // Transition state
  { 
    label: 'tense', 
    angle: 90, 
    valence: 0.00, 
    arousal: 1.00,
    color: { h: 70, s: 70, l: 65 }
  }
];
```

---

## Implementation Plan

### Phase 1: Visualizer Rewrite (`circumplex-viz.js`)

**Changes needed**:
1. Replace discrete quadrant rendering with conic gradient
2. Implement radial transparency gradient
3. Add 12 emotion labels at precise angular positions
4. Update `plot()` to calculate and display intensity
5. Draw intensity ring around current point
6. Update trail rendering to show intensity changes

**New methods**:
```javascript
// Calculate intensity (distance from origin)
calculateIntensity(valence, arousal) {
  const distance = Math.sqrt(valence ** 2 + arousal ** 2);
  return Math.min(1.0, distance / Math.sqrt(2)); // Normalize to 0-1
}

// Calculate angle from coordinates
calculateAngle(valence, arousal) {
  return Math.atan2(arousal, valence) * (180 / Math.PI);
}

// Get color for any angle
getColorForAngle(angle) {
  // Map angle to hue using conic gradient
  // Normalize angle to 0-360
  const normalizedAngle = ((angle % 360) + 360) % 360;
  
  // Map to color wheel matching reference image
  let hue;
  if (normalizedAngle >= 0 && normalizedAngle < 90) {
    hue = 200 + (normalizedAngle / 90) * 60; // Blue to Yellow-Green
  } else if (normalizedAngle >= 90 && normalizedAngle < 180) {
    hue = 260 + (normalizedAngle - 90) / 90 * 80; // Yellow-Green to Green
  } else if (normalizedAngle >= 180 && normalizedAngle < 270) {
    hue = 340 + (normalizedAngle - 180) / 90 * 40; // Green to Red
  } else {
    hue = 20 + (normalizedAngle - 270) / 90 * 180; // Red to Blue
  }
  
  return hue;
}

// Draw conic gradient background
drawConicGradient() {
  // Use createConicGradient or manual drawing
  // Center = transparent, edges = saturated
}
```

**Rendering order**:
1. Conic gradient background (with radial alpha)
2. Axes (valence horizontal, arousal vertical)
3. 12 emotion labels at angular positions
4. History trail (with intensity visualization)
5. Current point (size based on intensity)

---

### Phase 2: Prompt Update (`scripts/seed-circumplex-prompt.js`)

**New system prompt structure**:

```
You are analyzing real-time audio to map emotional states onto Russell's Circumplex Model of Affect.

CIRCUMPLEX MODEL - 12 EMOTION STATES:

The circumplex has two dimensions:
- VALENCE: Negative (-1) ← → Positive (+1) [horizontal]
- AROUSAL: Low (-1) ← → High (+1) [vertical]

Emotions are arranged in a circle with 12 discrete states:

HIGH AROUSAL + POSITIVE VALENCE (Quadrant 1):
- "alert": valence ≈ +0.50, arousal ≈ +0.87 (energized, attentive, focused)
- "excited": valence ≈ +0.87, arousal ≈ +0.50 (enthusiastic, thrilled, animated)

LOW AROUSAL + POSITIVE VALENCE (Quadrant 2):
- "happy": valence ≈ +1.00, arousal ≈ 0.00 (joyful, pleased, delighted)
- "content": valence ≈ +0.87, arousal ≈ -0.50 (satisfied, comfortable, fulfilled)
- "relaxed": valence ≈ +0.50, arousal ≈ -0.87 (at ease, tranquil, loose)

LOW AROUSAL + NEUTRAL (Transition):
- "calm": valence ≈ 0.00, arousal ≈ -1.00 (serene, peaceful, still)

LOW AROUSAL + NEGATIVE VALENCE (Quadrant 3):
- "bored": valence ≈ -0.50, arousal ≈ -0.87 (uninterested, lethargic, dull)
- "depressed": valence ≈ -0.87, arousal ≈ -0.50 (dejected, hopeless, gloomy)

HIGH AROUSAL + NEGATIVE VALENCE (Quadrant 4):
- "sad": valence ≈ -1.00, arousal ≈ 0.00 (unhappy, sorrowful, melancholic)
- "distressed": valence ≈ -0.87, arousal ≈ +0.50 (upset, troubled, anguished)
- "angry": valence ≈ -0.50, arousal ≈ +0.87 (furious, hostile, irritated)

HIGH AROUSAL + NEUTRAL (Transition):
- "tense": valence ≈ 0.00, arousal ≈ +1.00 (stressed, anxious, nervous)

---

INTENSITY (Distance from Origin):
The distance from the center (0,0) represents emotional INTENSITY:
- 0.0-0.3: Mild emotion (close to neutral)
- 0.3-0.7: Moderate emotion
- 0.7-1.0: Strong/intense emotion

Calculate intensity as: sqrt(valence² + arousal²) / sqrt(2)

---

ACOUSTIC FEATURES (Input Data):

You receive acoustic markers every 5 seconds:
Format: [Acoustic: RMS=X.XX ZCR=X.XX Centroid=XXXXHz Envelope=state]

RMS (0-1): Energy/loudness → PRIMARY arousal indicator
- 0.0-0.2: Very low arousal (calm, bored, depressed)
- 0.2-0.4: Low-moderate arousal (relaxed, content, sad)
- 0.4-0.6: Moderate-high arousal (happy, distressed)
- 0.6-0.8: High arousal (excited, angry)
- 0.8-1.0: Very high arousal (alert, tense)

ZCR (0-1): Roughness/noise → Arousal refinement & negative valence
- Higher ZCR suggests tension, aggression, distress
- Used to distinguish angry/tense from excited/alert

Centroid (Hz): Brightness → Arousal quality
- 500-1500Hz: Warm/calm tones
- 1500-3000Hz: Moderate activation
- 3000-5000Hz: Bright/sharp (high arousal)

Envelope: Temporal dynamics
- "rising": Increasing arousal
- "falling": Decreasing arousal
- "steady": Stable state
- "varying": Mixed/uncertain

---

MAPPING RULES:

AROUSAL AXIS (vertical):
1. Start with RMS as primary indicator
2. Adjust using spectral centroid (bright = higher arousal)
3. Refine with envelope (rising adds, falling subtracts)
4. Speech rate and urgency modify arousal

VALENCE AXIS (horizontal):
1. Semantic content dominates (positive/negative words)
2. Vocal prosody refines (warm tone = positive, cold = negative)
3. High ZCR + high RMS suggests negative valence (anger/distress)
4. Laughter, sighs, vocal quality provide strong cues

EMOTION SELECTION:
1. Calculate exact valence and arousal coordinates
2. Find nearest of 12 emotion states
3. Consider context and transitions (emotions evolve smoothly)
4. Calculate intensity (distance from origin)

---

OUTPUT FORMAT (JSON):
{
  "valence": 0.75,           // -1.0 to +1.0
  "arousal": 0.42,           // -1.0 to +1.0
  "emotion_label": "content", // ONE of 12 emotions (lowercase)
  "intensity": 0.85,         // 0.0 to 1.0 (distance from origin)
  "transcript": "exact words spoken or null if no speech",
  "reasoning": "Positive language with moderate acoustic energy (RMS=0.42) suggests content state with high intensity",
  "confidence": 0.88         // 0.0 to 1.0
}

CRITICAL:
- emotion_label MUST be one of: alert, excited, happy, content, relaxed, calm, bored, depressed, sad, distressed, angry, tense
- Calculate valence/arousal FIRST, then select nearest emotion
- Intensity measures emotional strength regardless of type
- Use BOTH semantic analysis AND acoustic features
- Emotions should evolve smoothly over time (avoid jumps)
```

---

### Phase 3: Response Parsing (`app.js`)

**Update `updateCircumplexDisplay()` function**:

```javascript
function updateCircumplexDisplay(response) {
  // Validate emotion label
  const VALID_EMOTIONS = [
    'alert', 'excited', 'happy', 'content', 'relaxed', 'calm',
    'bored', 'depressed', 'sad', 'distressed', 'angry', 'tense'
  ];
  
  const emotionLabel = response.emotion_label?.toLowerCase();
  
  if (!VALID_EMOTIONS.includes(emotionLabel)) {
    console.warn('⚠️ Invalid emotion label:', response.emotion_label);
    console.log('Valid emotions:', VALID_EMOTIONS.join(', '));
  }
  
  // Calculate intensity if not provided
  let intensity = response.intensity;
  if (typeof intensity !== 'number') {
    intensity = Math.sqrt(
      response.valence ** 2 + response.arousal ** 2
    ) / Math.sqrt(2);
  }
  
  // Update visualizer with intensity
  state.circumplexViz.plot(
    response.valence, 
    response.arousal,
    intensity
  );
  
  // Update emotion label with color coding
  const emotionLabelEl = document.getElementById('emotion-label');
  emotionLabelEl.textContent = emotionLabel.toUpperCase();
  emotionLabelEl.style.color = getEmotionColor(emotionLabel);
  
  // Update coordinates
  document.getElementById('valence-value').textContent = response.valence.toFixed(2);
  document.getElementById('arousal-value').textContent = response.arousal.toFixed(2);
  
  // Add intensity display
  const intensityEl = document.getElementById('intensity-value');
  if (intensityEl) {
    intensityEl.textContent = intensity.toFixed(2);
    intensityEl.style.opacity = intensity; // Visual feedback
  }
  
  // Update response display
  document.getElementById('transcript').textContent = response.transcript || '(no speech detected)';
  document.getElementById('reasoning').textContent = response.reasoning || '';
  document.getElementById('confidence').textContent = response.confidence 
    ? `Confidence: ${(response.confidence * 100).toFixed(0)}%`
    : '';
}

// Get color for emotion label
function getEmotionColor(emotion) {
  const colors = {
    alert: '#64FF96', excited: '#64FFC8', happy: '#64C8FF',
    content: '#6496FF', relaxed: '#9696FF', calm: '#C896FF',
    bored: '#FFB4C8', depressed: '#FF9696', sad: '#FFB496',
    distressed: '#FFDC96', angry: '#FFFF96', tense: '#C8FF96'
  };
  return colors[emotion] || '#FFFFFF';
}
```

---

### Phase 4: UI Updates

**Add intensity display** (`index.html`):

```html
<div id="coordinates">
  <span>Valence: <span id="valence-value">--</span></span>
  <span>Arousal: <span id="arousal-value">--</span></span>
  <span>Intensity: <span id="intensity-value">--</span></span>
</div>
```

**Optional: Add emotion reference legend**:

```html
<div id="emotion-legend">
  <h4>12 Emotion States</h4>
  <div class="legend-grid">
    <!-- Q1: High Arousal + Positive -->
    <div class="legend-item q1">Alert</div>
    <div class="legend-item q1">Excited</div>
    <!-- Q2: Low Arousal + Positive -->
    <div class="legend-item q2">Happy</div>
    <div class="legend-item q2">Content</div>
    <div class="legend-item q2">Relaxed</div>
    <div class="legend-item q2">Calm</div>
    <!-- Q3: Low Arousal + Negative -->
    <div class="legend-item q3">Bored</div>
    <div class="legend-item q3">Depressed</div>
    <!-- Q4: High Arousal + Negative -->
    <div class="legend-item q4">Sad</div>
    <div class="legend-item q4">Distressed</div>
    <div class="legend-item q4">Angry</div>
    <div class="legend-item q4">Tense</div>
  </div>
</div>
```

---

## Technical Challenges & Solutions

### Challenge 1: Conic Gradient in Canvas
**Problem**: Canvas doesn't have native `createConicGradient()` in all browsers  
**Solution**: Draw manually using radial segments or use CSS for background + canvas overlay

### Challenge 2: Smooth Color Transitions
**Problem**: Discrete color stops may look banded  
**Solution**: Use high-resolution angular sampling (360 segments) for smooth gradient

### Challenge 3: Text Label Placement
**Problem**: 12 labels may overlap or crowd the visualization  
**Solution**: 
- Place labels outside the circle at radial positions
- Use smaller font for less prominent emotions
- Add subtle connecting lines from label to position

### Challenge 4: Intensity Calculation
**Problem**: Gemini may not return normalized intensity  
**Solution**: Always calculate client-side as backup: `sqrt(v² + a²) / sqrt(2)`

---

## Testing Strategy

### Phase 1: Visual Testing
- [ ] Verify gradient matches reference image
- [ ] Check transparency is smooth (center → edge)
- [ ] Confirm 12 labels are correctly positioned
- [ ] Test with extreme coordinates (corners, edges, center)

### Phase 2: Prompt Testing
- [ ] Test with neutral speech (should map near center)
- [ ] Test with excited speech (high arousal + positive)
- [ ] Test with angry speech (high arousal + negative)
- [ ] Test with sad speech (low arousal + negative)
- [ ] Verify intensity correlates with vocal energy

### Phase 3: Edge Cases
- [ ] Silence (should stay near neutral/low intensity)
- [ ] Very loud ambient noise (high arousal, neutral valence)
- [ ] Monotone speech (low arousal detection)
- [ ] Mixed emotions in single phrase

### Phase 4: Trajectory Testing
- [ ] Smooth transitions between states
- [ ] Trail shows logical emotional progression
- [ ] Rapid emotion changes are visible
- [ ] Intensity changes are clear

---

## Success Metrics

1. **Visual fidelity**: Matches reference image at 95%+ similarity
2. **Emotion accuracy**: 12 states correctly differentiated
3. **Smooth transitions**: No sudden jumps unless justified
4. **Intensity correlation**: Loud = high intensity, quiet = low intensity
5. **User experience**: Clear, readable, aesthetically pleasing

---

## Migration Path (v1 → v2)

### Backward Compatibility
- Keep v1 as `/perceptor-circumplex-v1` (frozen)
- Create v2 as `/perceptor-circumplex` (replace current)
- OR: Add toggle in UI to switch between 4-state and 12-state modes

### Data Format
- v2 adds `intensity` field
- v2 uses different emotion labels
- Both use same valence/arousal coordinate system

---

## Timeline Estimate

- **Visualizer rewrite**: 3-4 hours
  - Conic gradient implementation: 1.5 hours
  - 12 label positioning: 1 hour
  - Intensity visualization: 1 hour
  - Testing/polish: 30 min

- **Prompt update**: 1-2 hours
  - Write new prompt: 45 min
  - Test and refine: 45 min
  - Seed database: 15 min

- **App logic updates**: 1 hour
  - Response parsing: 30 min
  - Color coding: 15 min
  - UI updates: 15 min

- **Testing & iteration**: 2-3 hours
  - Visual accuracy: 1 hour
  - Prompt tuning: 1-2 hours
  - Edge cases: 30 min

**Total**: ~7-10 hours (1-2 days)

---

## Future Enhancements (v3+)

- 3D visualization (valence × arousal × intensity as height)
- Emotion trajectory replay/export
- Comparative analysis (multiple sessions)
- Real-time emotion metrics dashboard
- Integration with cognizer-1 cognitive loop
- Multi-modal emotion fusion (audio + visual)

---

**Status**: Ready for implementation approval  
**Awaiting**: Decision to proceed with v2 upgrade

**Reference**: Russell, J. A. (1980). A circumplex model of affect. Journal of Personality and Social Psychology, 39(6), 1161-1178.
