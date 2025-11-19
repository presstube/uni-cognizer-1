# Visual Percept Prompt Editor

Test Gemini Live API with webcam frames in real-time.

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
- **Streaming Responses**: Real-time text generation from Gemini Live API
- **Session Persistence**: Maintains context across multiple frames
- **Prompt Management**: Edit system and user prompts (save coming soon)
- **Ephemeral Tokens**: Secure authentication via cognizer-1 token endpoint

## How It Works

1. **Webcam**: Browser captures live video feed
2. **Frame Capture**: Canvas converts video frame to base64 JPEG
3. **Token**: Fetches ephemeral token from `/api/gemini/token`
4. **Live API**: Opens WebSocket connection to Gemini 2.0 Flash
5. **Send Frame**: Transmits image + prompt to API
6. **Stream Response**: Text appears character-by-character

## Requirements

- Modern browser (Chrome, Firefox, Safari, Edge)
- Webcam access
- HTTPS or localhost (for webcam API)
- Cognizer-1 server running with `GEMINI_API_KEY` set

## Default Prompts

**System Prompt**:
```
You are analyzing visual percepts from a webcam for UNI, an AI experiencing 
the world through sensors. Describe what you observe in a concise, poetic way.
Focus on: people, actions, emotions, objects, lighting, atmosphere.
Respond in 1-2 sentences.
```

**User Prompt**:
```
What is happening in this moment?
```

## Architecture

- **Pattern**: Vanilla JavaScript (no build step, no frameworks)
- **State**: Functional, immutable updates
- **API**: Gemini Live API via `@google/genai`
- **Auth**: Ephemeral tokens from cognizer-1 endpoint
- **Style**: Dark theme matching forge/sigil editors

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

