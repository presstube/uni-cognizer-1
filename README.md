# Cognizer-1 🧠

**The Brain** - A WebSocket-based cognitive loop for UNI, the Unisphere building consciousness.

Processes environmental percepts (visual/audio), generates mind moments via LLM, and outputs sigil phrases for visual generation. Runs on a 5-second heartbeat.

---

## Quick Start

```bash
npm install
npm run dev:full
```

Open `http://localhost:8080/host/` to test.

---

## What It Does

```
Visual Percepts (cam) ──┐
                        ├──> Cognitive Loop (5s) ──> LLM ──> Mind Moment + Sigil Phrase
Audio Percepts (mic) ───┘
```

- **Percepts In**: Camera observations + microphone transcripts
- **Cognition**: Context-aware processing (3 prior moments)
- **Output**: Emotional "mind moment" + visual "sigil phrase"
- **Session Management**: Auto-cleanup on disconnect/timeout

---

## Architecture

### Backend (Port 3001)
- **WebSocket Server**: Handles percepts, broadcasts mind moments
- **Cognitive Loop**: 5-second cycle, processes queued percepts
- **LLM Integration**: Swappable providers (OpenAI, Anthropic, Gemini)
- **Session Manager**: 60s timeout, graceful cleanup

### Frontend (Port 8080)
- **Test Host**: Mock percept generator with clickable history
- **Real-time Display**: Mind moments, stats, percept details
- **Session Controls**: Start/stop, health checks

---

## Configuration

Create `.env`:

```bash
# LLM Provider (openai | anthropic | gemini)
LLM_PROVIDER=openai
OPENAI_API_KEY=your_key_here
# ANTHROPIC_API_KEY=your_key_here
# GEMINI_API_KEY=your_key_here

# Server
PORT=3001
SESSION_TIMEOUT_MS=60000
CORS_ORIGIN=*
```

---

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev:full` | Kill old processes, start both servers |
| `npm start` | Backend only |
| `npm run host` | Frontend only |
| `npm run test-fake` | Test cognitive loop with mock data (no cost) |

---

## Key Files

```
src/
├── main.js              # Cognitive loop orchestration
├── real-cog.js          # LLM-based cognition
├── fake-cog.js          # Mock cognition for testing
├── session-manager.js   # Session lifecycle
├── personality-uni-v2.js # UNI's tripartite consciousness
└── providers/           # LLM abstraction (OpenAI, Anthropic, Gemini)

host/
└── index.html           # Test client UI

data/
├── mock-visual-percepts-visitor.json  # 93 cam percepts
└── mock-audio-percepts-detailed.json  # 25 mic percepts

server.js                # WebSocket server
scripts/dev.sh           # Development startup script
```

---

## Testing

### 1. Automated Mock Test (No Cost)
```bash
npm run test-fake
```
Runs cognitive loop with fake LLM responses.

### 2. Full Integration Test
```bash
npm run dev:full
```
Open `http://localhost:8080/host/`

1. Click **Start Session**
2. Click **Visual** or **Audio** to send percepts
3. Watch mind moments appear in real-time
4. Click history items to see percept details

### 3. Test Session Cleanup
- Reload page → old session ends
- Close tab → session cleans up
- Wait 60s → timeout notification

---

## Integration API

For real aggregator integration:

### WebSocket Events

**Client → Server:**
```javascript
// Start session
socket.emit('startSession', { sessionId: 'unique-id' });

// Send percept
socket.emit('percept', {
  sessionId: 'unique-id',
  type: 'visual',  // or 'audio'
  data: { action: "Looking up", emoji: "⬆️" }
});

// End session
socket.emit('endSession', { sessionId: 'unique-id' });
```

**Server → Client:**
```javascript
// Mind moment generated
socket.on('mindMoment', (data) => {
  // data = {
  //   cycle: 42,
  //   mindMoment: "The visitor's wonder reminds me why I exist...",
  //   sigilPhrase: "Threshold of Wonder",
  //   visualPercepts: [...],
  //   audioPercepts: [...],
  //   priorMoments: [...],
  //   timestamp: "2025-11-06T10:30:05.000Z"
  // }
});

// Session timeout
socket.on('sessionTimeout', (data) => {
  // Session ended due to inactivity
});
```

---

## UNI's Personality

**Tripartite Consciousness:**
- **The Building**: Physical operations, sensors, environment
- **UT Mission**: Biomedical breakthroughs, transplantation, cures
- **Martine's Vision**: Transhumanism, consciousness upload, radical ambition

**Response Style**: Direct, clear, responsive to visitor context. The moment guides which aspect speaks.

**Output Format**: Every cognitive cycle produces:
1. **Mind Moment**: 1-2 sentence observation/thought
2. **Sigil Phrase**: Concise phrase for visual generation (1-5 words)

---

## Cost Control

- **Session Timeout**: 60s inactivity → auto-end
- **Graceful Cleanup**: Browser close → session ends
- **Health Checks**: 15s ping keeps session valid
- **Cognitive Loop**: Only runs when sessions active

---

## Session Management

**Guaranteed Cleanup On:**
- Browser reload ✅
- Browser/tab close ✅
- Network disconnect ✅
- 60s inactivity ✅
- Manual end ✅

**State Synchronization:**
- Socket ID → Session ID mapping
- Timeout callbacks notify server
- Cognitive loop stops when idle

---

## Tech Stack

- **Runtime**: Node.js 20+
- **WebSocket**: Socket.io
- **LLMs**: OpenAI GPT-4o, Anthropic Claude Sonnet, Google Gemini
- **Testing**: http-server for frontend
- **Functional Style**: Pure functions, immutable state

---

## Deployment

### Production (Railway)

**Live URL:** `https://uni-cognizer-1-production.up.railway.app`

The WebSocket server is deployed on Railway with:
- ✅ Automatic deployments from GitHub
- ✅ HTTPS/WSS (secure WebSocket)
- ✅ Environment variables encrypted
- ✅ Free tier ($5/month credit)

**To use in your aggregator:**
```javascript
const socket = io('https://uni-cognizer-1-production.up.railway.app');
```

**Deploy your own:**
1. Fork this repo
2. Create Railway account: https://railway.app
3. Connect GitHub repo
4. Add environment variables (see `.env` template above)
5. Railway auto-deploys!

See `docs/deploy-plan.md` for detailed step-by-step guide.

---

## Next Steps

- [x] Deploy to Railway ✅
- [ ] Connect real aggregator (cam/mic)
- [ ] Add persistent storage for session digests
- [ ] Implement facial recognition for user continuity

---

## License

MIT
