# Cognizer-1 🧠

WebSocket-based cognitive loop for UNI. Processes visual/audio percepts, generates mind moments via LLM, outputs sigil phrases and kinetic/lighting patterns.

---

## Quick Start

```bash
npm install
npm run client:fake    # Mock LLM (no cost)
# or
npm run client:local   # Real LLM (costs money)
```

Opens test client at `http://localhost:8081` connecting to local server.

---

## Commands

| Command | Purpose |
|---------|---------|
| `npm start` | Production server only |
| `npm run client:fake` | Fake server + test client (mock LLM) |
| `npm run client:local` | Real server + test client (real LLM) |
| `npm run client:render` | Test client only (connects to Render) |
| `npm run test-fake` | Standalone cognitive loop test (terminal) |
| `npm run db:query` | Query mind moments from database |
| `npm run migrate` | Run database migrations |
| `npm run db:setup` | Alias for migrate |
| `npm run version:register` | Register current version in database |
| `npm run version:check` | Check current version |

---

## Configuration

Create `.env`:

```bash
# LLM Provider (openai | anthropic | gemini)
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_key_here

# Server
PORT=3001
COGNITIVE_CYCLE_MS=20000  # Cycle interval (default: 5000ms)
SESSION_TIMEOUT_MS=60000

# Token Endpoint (optional - protects /api/gemini/token)
TOKEN_PASSWORD=your_secure_password_here

# Prompt Editors Auth (production only - HTTP Basic Auth)
NODE_ENV=production                      # Required to enable auth
EDITOR_USERNAME=admin                    # Optional (default: admin)
EDITOR_PASSWORD=your_secure_password     # Required in production

# Database (optional)
DATABASE_URL=postgresql://...
DATABASE_ENABLED=true
```

---

## Architecture

**Backend** (Port 3001):
- WebSocket server (`server.js`)
- Cognitive loop (`src/main.js` → `src/real-cog.js`)
- Database persistence (`src/db/`)
- Session management (60s timeout)

**Test Client** (`test-client/index.html`):
- Interactive UI for sending percepts
- Real-time mind moment display
- Sigil visualization
- Cognitive state indicators

**Fake Server** (`src/fake/server.js`):
- Identical API, mock LLM responses
- No API costs
- Full database support

---

## Database

PostgreSQL persistence for mind moments, sessions, and version tracking.

**Setup:**
```bash
npm run migrate
```

**Query:**
```bash
npm run db:query
```

**Features:**
- Mind moments persist across restarts
- UNI's continuous consciousness (cycle counter resumes)
- Prior context relationships (UUID arrays)
- Version tracking (all records tagged)

---

## WebSocket API

**Client → Server:**
```javascript
socket.emit('startSession', { sessionId: 'unique-id' });
socket.emit('percept', { sessionId, type: 'visual'|'audio', data: {...} });
socket.emit('endSession', { sessionId });
```

**Server → Client:**
```javascript
socket.on('mindMoment', ({ cycle, mindMoment, sigilPhrase, kinetic, lighting, ... }));
socket.on('sigil', ({ cycle, sigilCode, sigilPhrase }));
socket.on('cognitiveState', ({ state: 'AGGREGATING'|'COGNIZING'|'VISUALIZING' }));
socket.on('cycleStarted', ({ cycle, visualPercepts, audioPercepts }));
socket.on('cycleCompleted', ({ cycle, duration, ... }));
```

---

## REST API

### Gemini Token Generation

Generate ephemeral tokens for client-side Gemini API access (used by aggregator-1).

**Endpoint**: `GET /api/gemini/token`

**Headers**:
- `x-password`: Optional password (if `TOKEN_PASSWORD` env var is set)

**Response**:
```json
{
  "token": "projects/.../tokens/...",
  "expiresAt": "2025-11-18T20:30:00.000Z"
}
```

**Example**:
```bash
# Without password
curl http://localhost:3001/api/gemini/token

# With password
curl http://localhost:3001/api/gemini/token \
  -H "x-password: your_password"
```

**Use Case**: Allows aggregator-1 to use Gemini Live API without exposing API key in client code. Tokens expire in 30 minutes.

---

## Cognitive States

- **AGGREGATING**: Waiting for next cycle, collecting percepts
- **COGNIZING**: LLM processing in flight
- **VISUALIZING**: Generating sigil visualization

---

## Outputs

Every mind moment includes:
- **Mind Moment**: Text observation (1-2 sentences)
- **Sigil Phrase**: Visual essence (1-5 words)
- **Sigil Code**: Canvas drawing commands
- **Kinetic**: Movement pattern (`IDLE`, `HAPPY_BOUNCE`, `SLOW_SWAY`, `JIGGLE`)
- **Lighting**: Color, pattern, speed (`SMOOTH_WAVES`, `CIRCULAR_PULSE`, etc.)

---

## Key Files

```
server.js                  # WebSocket server
src/
├── main.js               # Cognitive loop orchestration
├── real-cog.js           # Real LLM cognition
├── fake/
│   ├── server.js         # Fake WebSocket server
│   ├── cog.js            # Mock cognition
│   └── main.js           # Standalone test runner
├── db/                   # Database layer
│   ├── index.js          # Connection pool
│   ├── migrate.js        # Migration runner
│   ├── mind-moments.js   # Repository
│   └── sessions.js       # Session tracking
├── cognitive-states.js   # State constants
├── session-manager.js    # Session lifecycle
├── personality-uni-v2.js # UNI's tripartite consciousness
├── providers/            # LLM abstraction
└── sigil/                # Sigil generation
test-client/
└── index.html            # Test client UI
```

---

## Deployment

**Production**: `https://uni-cognizer-1.onrender.com`

Deployed on Render with:
- PostgreSQL database
- Automatic migrations
- WebSocket (WSS) support

**Local → Production:**
```bash
npm run client:render  # Connects to Render
```

---

## Documentation

**Living Docs:**
- `docs/DEVELOPER_GUIDE.md` - **Practical dev reference** (API, database, deployment, Personality Prompt Editor)
- `docs/extending-cognizer.md` - **Architecture planning** (Phases 1-5 roadmap)
- `prime-directive.md` - **Coding principles**

**Historical Context:**
- `graveyard/` - Historical documentation organized by topic (phase-1, phase-2, phase-3, etc.)

---

## License

MIT
