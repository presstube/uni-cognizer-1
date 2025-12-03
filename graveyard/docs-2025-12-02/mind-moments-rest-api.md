# Mind Moments REST API

**Base URL**: `https://uni-cognizer-1.onrender.com`

Read-only API. No authentication required.

---

## Endpoints

### GET /api/mind-moments/recent

Get recent mind moments (default: 100, use `?limit=N` to change).

**Returns**:
```json
{
  "moments": [
    {
      "id": "uuid",
      "cycle": 138,
      "mind_moment": "A visitor gazes thoughtfully at the interface.",
      "sigil_phrase": "contemplative presence",
      "sigil_code": "ctx.arc(128,128,60,0,Math.PI*2);",
      "kinetic": { "pattern": "SLOW_SWAY", "duration": 4000 },
      "lighting": { "color": "#4A90E2", "pattern": "SMOOTH_WAVES" },
      "visual_percepts": [
        {
          "action": "Leaning in to look closely",
          "emoji": "🧐",
          "weight": 1.0
        },
        {
          "action": "Arms crossed, contemplating",
          "emoji": "🤔",
          "weight": 1.0
        }
      ],
      "audio_percepts": [
        {
          "transcript": "How do you learn? Like, over time, do you get better at predicting what people need?",
          "analysis": "Fundamental question about AI nature - learning versus programming, intelligence versus automation.",
          "tone": "Philosophical, direct",
          "emoji": "🧠",
          "sentiment": "curious",
          "confidence": 0.9,
          "weight": 0.8
        }
      ],
      "prior_moment_ids": ["uuid1", "uuid2"],
      "created_at": "2025-11-30T12:35:01.234Z"
    }
  ]
}
```

---

### GET /api/mind-moments/all

Get all mind moments.

**Returns**:
```json
{
  "moments": [/* same structure as /recent */],
  "total": 1234
}
```

---

### GET /api/mind-moments/:id

Get a specific mind moment by UUID.

**Returns**:
```json
{
  "moment": {/* same structure as /recent items */}
}
```

---

### GET /api/sigils/:momentId/svg

Download sigil as SVG image.

**Returns**: Raw SVG XML (Content-Type: `image/svg+xml`)

---

### GET /api/sigils/:momentId/sdf

Get sigil SDF as JSON.

**Returns**:
```json
{
  "width": 256,
  "height": 256,
  "data": "iVBORw0KGgo..." // base64-encoded PNG
}
```

---

### GET /api/sigils/:momentId/sdf/raw

Download sigil SDF as PNG image.

**Returns**: Raw PNG binary (Content-Type: `image/png`)

---

### GET /api/sigils/:momentId/all

Get all sigil format metadata.

**Returns**:
```json
{
  "id": "uuid",
  "cycle": 138,
  "sigilPhrase": "contemplative presence",
  "sigilCode": "ctx.arc(...);",
  "sigilSVG": "<svg>...</svg>",
  "sdf": {
    "width": 256,
    "height": 256,
    "available": true
  }
}
```
