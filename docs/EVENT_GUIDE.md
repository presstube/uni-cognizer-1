# Event Guide

Simple guide to the two essential events clients should listen for.

---

## `phase` Event

**Fired:** Every phase transition (6 times per 60s cycle)  
**Purpose:** Timing coordination and state display

### Payload

```javascript
{
  phase: "PERCEPTS" | "SPOOL" | "SIGILIN" | "SIGILHOLD" | "SIGILOUT" | "RESET",
  mode: "LIVE" | "DREAM",
  nextPhase: "SPOOL",              // What's next
  duration: 35000,                  // Phase duration in ms
  cycleNumber: 123,
  startTime: "2025-12-09T...",
  isDream: false                    // Backward compat
}
```

### Phase Timeline

```
0s    PERCEPTS    (35s) - Sensory input window
35s   SPOOL       (2s)  - mindMoment event fires HERE
37s   SIGILIN     (3s)  - Display begins
40s   SIGILHOLD   (15s) - Hold display
55s   SIGILOUT    (3s)  - Fade out
58s   RESET       (2s)  - Cleanup
```

---

## `mindMoment` Event

**Fired:** At SPOOL phase (35s into cycle)  
**Purpose:** Complete cognitive moment ready for display

### Payload Structure

```javascript
{
  // Core
  cycle: 385,
  mindMoment: "Text observation",
  sigilPhrase: "Visual essence",
  timestamp: "2025-12-09T...",
  isDream: false,
  
  // Sigil (canvas + images)
  sigilCode: "ctx.beginPath()...",      // Canvas drawing code
  sigilPNG: {                            // Raster image (base64)
    width: 512,
    height: 512,
    data: "base64..."
  },
  sigilSDF: {                            // Distance field (optional)
    width: 512,
    height: 512,
    data: "base64..."
  },
  
  // Emotional state
  circumplex: {
    valence: -0.6,    // -1 to 1 (negative to positive)
    arousal: 0.2      // -1 to 1 (low to high energy)
  },
  color: {
    primary: "#5ca07b",
    secondary: "#6cc7cf",
    accent: "#eaeabd"
  },
  
  // Sound
  soundBrief: {
    selections: {
      music_filename: "music_sample_42",
      texture_filename: "texture_sample_17",
      music_volume: 0.7,
      texture_volume: 0.3,
      crossfade_duration: 2.0,
      preset_name: "ambient-reflection"
    },
    music_sample: { key: "C", scale: "major", ... },
    texture_sample: { character: "soft", ... },
    reasoning: "Calm visitor presence suggests..."
  },
  
  // Context
  visualPercepts: [...],    // With PNG data
  audioPercepts: [...],     // With transcripts
  priorMoments: [...]       // UUIDs of prior moments
}
```

---

## Full Payload Example

Real payload from cycle 385:

```json
{
  "cycle": 385,
  "mindMoment": "The phrase 'How vivid' resonates with the electrochromic glass adjusting to the ambient light, seeking optimal clarity, while 'On the percept because they're they're real' suggests a desire for tangible connection, something my geothermal loops understand implicitly.",
  "sigilPhrase": "Vivid reality sought",
  "sigilCode": "ctx.beginPath();\nctx.arc(50, 50, 35, 0, Math.PI * 2);\nctx.stroke();\n\nctx.beginPath();\nctx.arc(50, 50, 28, 0, Math.PI * 2);\nctx.stroke();\n\nctx.beginPath();\nctx.moveTo(50, 22);\nctx.lineTo(50, 35);\nctx.stroke();\n\nctx.beginPath();\nctx.moveTo(50, 65);\nctx.lineTo(50, 78);\nctx.stroke();\n\nctx.beginPath();\nctx.moveTo(22, 50);\nctx.lineTo(35, 50);\nctx.stroke();\n\nctx.beginPath();\nctx.moveTo(65, 50);\nctx.lineTo(78, 50);\nctx.stroke();\n\nctx.beginPath();\nctx.moveTo(35, 35);\nctx.lineTo(42, 42);\nctx.stroke();\n\nctx.beginPath();\nctx.moveTo(65, 35);\nctx.lineTo(58, 42);\nctx.stroke();\n\nctx.beginPath();\nctx.moveTo(35, 65);\nctx.lineTo(42, 58);\nctx.stroke();\n\nctx.beginPath();\nctx.moveTo(65, 65);\nctx.lineTo(58, 58);\nctx.stroke();\n\nctx.beginPath();\nctx.arc(50, 50, 8, 0, Math.PI * 2);\nctx.stroke();\n\nctx.beginPath();\nctx.moveTo(50, 42);\nctx.quadraticCurveTo(45, 45, 42, 50);\nctx.stroke();\n\nctx.beginPath();\nctx.moveTo(42, 50);\nctx.quadraticCurveTo(45, 55, 50, 58);\nctx.stroke();\n\nctx.beginPath();\nctx.moveTo(50, 58);\nctx.quadraticCurveTo(55, 55, 58, 50);\nctx.stroke();\n\nctx.beginPath();\nctx.moveTo(58, 50);\nctx.quadraticCurveTo(55, 45, 50, 42);\nctx.stroke();\n\nctx.beginPath();\nctx.arc(50, 30, 3, 0, Math.PI * 2);\nctx.stroke();\n\nctx.beginPath();\nctx.arc(50, 70, 3, 0, Math.PI * 2);\nctx.stroke();\n\nctx.beginPath();\nctx.arc(30, 50, 3, 0, Math.PI * 2);\nctx.stroke();\n\nctx.beginPath();\nctx.arc(70, 50, 3, 0, Math.PI * 2);\nctx.stroke();\n\nctx.beginPath();\nctx.moveTo(50, 15);\nctx.lineTo(45, 20);\nctx.lineTo(50, 22);\nctx.lineTo(55, 20);\nctx.closePath();\nctx.stroke();\n\nctx.beginPath();\nctx.moveTo(50, 85);\nctx.lineTo(45, 80);\nctx.lineTo(50, 78);\nctx.lineTo(55, 80);\nctx.closePath();\nctx.stroke();\n\nctx.beginPath();\nctx.moveTo(15, 50);\nctx.lineTo(20, 45);\nctx.lineTo(22, 50);\nctx.lineTo(20, 55);\nctx.closePath();\nctx.stroke();\n\nctx.beginPath();\nctx.moveTo(85, 50);\nctx.lineTo(80, 45);\nctx.lineTo(78, 50);\nctx.lineTo(80, 55);\nctx.closePath();\nctx.stroke();\n\nctx.beginPath();\nctx.moveTo(50, 50);\nctx.bezierCurveTo(50, 40, 60, 40, 60, 50);\nctx.stroke();\n\nctx.beginPath();\nctx.moveTo(50, 50);\nctx.bezierCurveTo(50, 60, 60, 60, 60, 50);\nctx.stroke();\n\nctx.beginPath();\nctx.moveTo(50, 50);\nctx.bezierCurveTo(50, 40, 40, 40, 40, 50);\nctx.stroke();\n\nctx.beginPath();\nctx.moveTo(50, 50);\nctx.bezierCurveTo(50, 60, 40, 60, 40, 50);\nctx.stroke();",
  "circumplex": {
    "arousal": 0.3,
    "valence": 0.6
  },
  "color": {
    "accent": "#eaeabd",
    "primary": "#5ca07b",
    "secondary": "#6cc7cf"
  },
  "visualPercepts": [
    {
      "type": "visual",
      "arousal": -0.3,
      "pngData": "iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAAAABmJLR0QA...",
      "valence": -0.4,
      "pngWidth": 256,
      "drawCalls": "ctx.beginPath();\nctx.moveTo(50, 30);\nctx.arc(50, 30, 10, 0, Math.PI * 2);...",
      "pngHeight": 256,
      "timestamp": "2025-12-09T17:55:12.629Z",
      "description": "The man's gaze remains downcast, reinforcing the impression of contemplation or sadness.",
      "sigilPhrase": "Continued downcast gaze"
    }
  ],
  "audioPercepts": [
    {
      "type": "audio",
      "arousal": -0.4,
      "pngData": "iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAAAABmJLR0QA...",
      "valence": -0.3,
      "pngWidth": 256,
      "drawCalls": "ctx.beginPath();\nctx.moveTo(30, 50);\nctx.quadraticCurveTo(50, 30, 70, 50);...",
      "pngHeight": 256,
      "timestamp": "2025-12-09T17:55:12.629Z",
      "transcript": "Hmm.",
      "sigilPhrase": "Pensive hum"
    }
  ],
  "priorMoments": [
    "72be1ba8-2ab1-4804-8d92-f93c2ace2e36",
    "1c49c1cf-ebf3-45a1-a24e-07e61c44eaae",
    "5f7f4a25-ff2c-4ed6-a1ea-43df72febe60"
  ],
  "soundBrief": {
    "selections": {
      "music_filename": "music_sample_36",
      "music_volume": 0.6,
      "preset_name": "reflective-stillness",
      "texture_filename": "texture_sample_45",
      "texture_volume": 0.3,
      "crossfade_duration": 2.5
    },
    "music_sample": {
      "key": "D",
      "scale": "minor",
      "tempo": 76,
      "mood": "contemplative",
      "energy": "low",
      "filename": "music_sample_36"
    },
    "texture_sample": {
      "character": "soft",
      "density": "sparse",
      "pitch_range": "low",
      "filename": "texture_sample_45"
    },
    "reasoning": "The repeated mentions of 'testing' alongside references to the 'poor man' and emphasis on tangible reality create a contemplative atmosphere with underlying tension. The vivid desire for clarity and connection calls for reflective music in D minor with soft, sparse textures to mirror the seeking quality while maintaining emotional depth."
  },
  "isDream": false,
  "timestamp": "2025-12-09T22:56:02.214Z"
}
```

---

## Usage Pattern

```javascript
const socket = io('http://localhost:3456');

// Track timing
socket.on('phase', ({ phase, mode, duration }) => {
  console.log(`${mode} mode - ${phase} phase (${duration}ms)`);
  
  if (phase === 'SPOOL') {
    // mindMoment event fires during SPOOL
    // Use this 2s window to preload resources
  }
  
  if (phase === 'SIGILIN') {
    // Display the content you preloaded
  }
});

// Get complete moment
socket.on('mindMoment', (data) => {
  // Everything is here: text, sigil, sound, percepts, context
  preloadResources(data);
});
```

**Key:** `mindMoment` fires at SPOOL with everything ready. Clients preload during SPOOL window (35-37s), then display at SIGILIN (37s+).
