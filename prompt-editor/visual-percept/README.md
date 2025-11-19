# 🎥 Visual Percept Prompt Editor

**Webcam → Gemini Live API → Sigil Generation**

A real-time visual analysis tool that captures webcam frames, sends them to Gemini Live API, and generates symbolic sigils representing what the AI perceives.

Part of the [cognizer-1](../README.md) project.

## Quick Start

1. **Start cognizer-1 server**:
   ```bash
   npm start
   ```

2. **Open editor**:
   ```
   http://localhost:3001/visual-percept-prompt-editor
   ```

3. **Allow webcam access** when prompted

4. **Edit prompts**, click **"SEND FRAME"**, see response!

## Features

- **Manual Frame Sending**: User controls when to analyze
- **Streaming JSON Responses**: Real-time structured data from Gemini Live API
- **Sigil Generation**: AI creates abstract symbolic sigils from visual percepts
- **Animated Display**: Sigils are drawn with smooth animation
- **Session Persistence**: Maintains context across multiple frames
- **Prompt Management**: Edit system and user prompts (save coming soon)
- **Ephemeral Tokens**: Secure authentication via cognizer-1 token endpoint
- **JSON Output**: Configured for structured, parseable responses

## How It Works

1. **Webcam**: Browser captures live video feed
2. **Frame Capture**: Canvas converts video frame to base64 JPEG
3. **Token**: Fetches ephemeral token from `/api/gemini/token`
4. **Live API**: Opens raw WebSocket connection to Gemini 2.0 Flash (v1alpha)
5. **Send Frame**: Transmits image + prompt to API
6. **Stream Response**: JSON appears character-by-character
7. **Sigil Generation**: AI creates poetic phrase + canvas drawing commands
8. **Animated Display**: Sigil draws itself on canvas with phrase below

## Requirements

- Modern browser (Chrome, Firefox, Safari, Edge)
- Webcam access
- HTTPS or localhost (for webcam API)
- Cognizer-1 server running with `GEMINI_API_KEY` set

## Default Prompts

**System Prompt** (Sigil Generation):
```
You are analyzing visual percepts from a webcam for UNI, an AI experiencing 
the world through sensors.

TASK: Create a sigil to represent what you see.

STEP 1: Create a "sigil phrase" - a punchy, poetic 2-4 word distillation of the moment.
STEP 2: Generate canvas drawing commands for a sigil representing that phrase.

Match the style from typical symbolic sigils. Balance geometric precision with organic fluidity.

RULES:
1. Available methods:
   - ctx.moveTo(x, y)
   - ctx.lineTo(x, y)
   - ctx.arc(x, y, radius, 0, Math.PI * 2)
   - ctx.quadraticCurveTo(cpx, cpy, x, y) - 4 parameters
   - ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) - 6 parameters
   - ctx.beginPath(), ctx.closePath(), ctx.stroke()

2. MIX geometric and organic - use both straight lines AND curves
3. Sharp angles and clean lines give structure
4. Gentle curves add flow and warmth
5. STRONGLY FAVOR symmetry - create balanced, centered compositions
6. Small asymmetric details add character without breaking overall balance
7. AVOID explicit faces - no literal eyes, mouths, noses (subtle allusions OK)
8. Create abstract symbolic forms, not realistic depictions
9. Canvas is 100x100, center at (50, 50)
10. Maximum 30 lines
11. NO variables, NO functions, NO explanations
12. Output ONLY the ctx commands

Always respond with valid JSON in this exact format:
{
  "sigilPhrase": "2-4 word poetic distillation",
  "drawCalls": "ctx.beginPath();\nctx.moveTo(50,20);\n..."
}
```

**User Prompt**:
```
Create a sigil for this moment.
```

**Response Example**:
```json
{
  "sigilPhrase": "FOCUSED FLOW",
  "drawCalls": "ctx.beginPath();\nctx.moveTo(50, 20);\nctx.lineTo(80, 50);\nctx.lineTo(50, 80);\nctx.lineTo(20, 50);\nctx.closePath();\nctx.stroke();\nctx.beginPath();\nctx.arc(50, 50, 15, 0, Math.PI * 2);\nctx.stroke();"
}
```

**Sigil Display**:
- 200x200px canvas with black background
- White stroke, 1.2px weight
- Smooth drawing animation (200ms draw duration)
- Phrase displayed below in green uppercase text

## Architecture

- **Pattern**: Vanilla JavaScript (no build step, no frameworks)
- **State**: Functional, immutable updates
- **API**: Gemini Live API via raw WebSocket (v1alpha endpoint)
- **Auth**: Ephemeral tokens from cognizer-1 endpoint
- **Style**: Dark theme matching forge/sigil editors
- **Output**: JSON mode (`responseMimeType: 'application/json'`)
- **Sigil**: `sigil.standalone.js` (animated canvas rendering)

## Troubleshooting

### Webcam not working
- Check browser permissions
- Ensure camera is not in use by another app
- Try different browser

### Token errors
- Verify `GEMINI_API_KEY` is set in `.env`
- Check `/api/gemini/token` endpoint returns token
- Token expires after 30 minutes (click button again to reconnect)

### No response streaming
- Check browser console for errors
- Verify Live API model is available
- Check network connection

## Future Enhancements

- [ ] Database integration (save/load prompts)
- [ ] Preset prompts dropdown
- [ ] Token auto-refresh
- [ ] Response history
- [ ] Continuous mode (auto-send frames)
- [ ] Export responses

## Files

```
visual-percept-prompt-editor/
├── index.html    # Split pane UI
├── editor.js     # Live API integration
├── style.css     # Dark theme styling
└── README.md     # This file
```

## Documentation

- [Implementation Plan](../docs/vis-prompt-editor.md)
- [Implementation Log](../docs/vis-prompt-implementation.md)
- [Gemini Live API Docs](https://ai.google.dev/gemini-api/docs/live)

---

**Status**: MVP Complete  
**Version**: 1.0  
**Date**: November 18, 2025

