# Unity Integration - Cognizer-1

**Server**: `https://uni-cognizer-1.onrender.com/`  
**Protocol**: Socket.io WebSocket

---

## Connection

**Package**: https://github.com/itisnajim/SocketIOUnity

```csharp
socket = new SocketIOUnity(new Uri("https://uni-cognizer-1.onrender.com/"));
socket.On("sigil", OnSigil);
socket.On("mindMoment", OnMindMoment);
socket.On("perceptReceived", OnPerceptReceived);
socket.Connect();
```

---

## Events

### `perceptReceived` Event

**Payload**:

```json
{
  "type": "visual" | "audio",
  "data": {
    "description": "A red cube",
    "image": "data:image/png;base64,...",
    "timestamp": "2025-11-29T..."
  },
  "timestamp": "2025-11-29T..."
}
```

**Handler**:

```csharp
void OnPerceptReceived(SocketIOResponse response)
{
    var data = response.GetValue<JObject>();
    string type = data["type"].Value<string>(); // "visual" or "audio"
    var perceptData = data["data"];
    
    if (type == "visual")
    {
        string description = perceptData["description"].Value<string>();
        string imageData = perceptData["image"]?.Value<string>(); // Optional
        // Display or process visual percept
    }
    else if (type == "audio")
    {
        string transcript = perceptData["transcript"]?.Value<string>();
        // Display or process audio percept
    }
}
```

### `sigil` Event

**Payload**:
```json
{
  "cycle": 42,
  "sigilPhrase": "Threshold of Wonder",
  "sigilCode": "ctx.beginPath(); ...",
  "sdf": {
    "width": 256,
    "height": 256,
    "data": "base64-encoded PNG"
  }
}
```

**Handler**:

```csharp
void OnSigil(SocketIOResponse response)
{
    var data = response.GetValue<JObject>();
    string phrase = data["sigilPhrase"].Value<string>();
    var sdf = data["sdf"];
    
    // 1. Display phrase
    phraseText.text = phrase;
    
    // 2. Load SDF texture
    byte[] pngBytes = Convert.FromBase64String(sdf["data"].Value<string>());
    Texture2D tex = new Texture2D(256, 256, TextureFormat.R8, false);
    tex.LoadImage(pngBytes);
    tex.filterMode = FilterMode.Bilinear;
    
    // 3. Apply to UI or shader
    sdfDisplay.texture = tex;
    sdfMaterial.SetTexture("_SDFTex", tex);
}
```

### `mindMoment` Event

**Payload**:

```json
{
  "cycle": 42,
  "mindMoment": "Text observation...",
  "sigilPhrase": "Threshold of Wonder",
  "kinetic": { "pattern": "HAPPY_BOUNCE" },
  "lighting": { 
    "color": "0x00ffff",
    "pattern": "SMOOTH_WAVES",
    "speed": 1.0
  }
}
```

**Handler**:

```csharp
void OnMindMoment(SocketIOResponse response)
{
    var data = response.GetValue<JObject>();
    
    mindMomentText.text = data["mindMoment"].Value<string>();
    
    // Kinetic
    string pattern = data["kinetic"]["pattern"].Value<string>();
    // IDLE, HAPPY_BOUNCE, SLOW_SWAY, JIGGLE, PULSE
    
    // Lighting
    string hexColor = data["lighting"]["color"].Value<string>(); // "0xRRGGBB"
    string lightPattern = data["lighting"]["pattern"].Value<string>();
    float speed = data["lighting"]["speed"].Value<float>();
}
```

---

## Hex Color Parsing

```csharp
Color HexToColor(string hex)
{
    hex = hex.Replace("0x", "");
    int r = Convert.ToInt32(hex.Substring(0, 2), 16);
    int g = Convert.ToInt32(hex.Substring(2, 2), 16);
    int b = Convert.ToInt32(hex.Substring(4, 2), 16);
    return new Color(r / 255f, g / 255f, b / 255f);
}
```

---

## Event Timing

| Event | When | What |
|-------|------|------|
| `perceptReceived` | When sent | Visual or audio percept from any client |
| `cycleStarted` | Every 5-20s | Cycle begins |
| `cognitiveState` | State change | AGGREGATING → COGNIZING → VISUALIZING |
| `mindMoment` | +1-2s | Text, kinetic, lighting |
| `sigil` | +3-5s | Phrase, code, SDF texture |
| `cycleCompleted` | End | Summary |

---

## SDF Texture Details

- **Format**: Base64-encoded PNG
- **Size**: 256×256 grayscale
- **Scale**: 0.75x (padded to prevent gradient cutoff)
- **Value**: 0.5 = edge, >0.5 = inside, <0.5 = outside
- **Use**: `TextureFormat.R8`, `FilterMode.Bilinear`

---

## Kinetic Patterns

`IDLE` | `HAPPY_BOUNCE` | `SLOW_SWAY` | `JIGGLE` | `PULSE`

---

## Lighting Patterns

`SMOOTH_WAVES` | `CIRCULAR_PULSE` | `HECTIC_NOISE` | `STATIC`

