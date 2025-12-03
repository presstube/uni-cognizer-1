# Cognizer-1 Developer Guide

**Practical reference for working with Cognizer-1**

Last updated: December 2, 2025

---

## Quick Start

```bash
npm install
npm start  # Production server (port 3001)
```

**Web Clients:**
- Dashboard: http://localhost:3001/dashboard
- Perceptor: http://localhost:3001/perceptor-remote
- Prompt Editors: http://localhost:3001/prompt-editor/{personality|sigil|visual-percept|audio-percept}

---

## Architecture Overview

### Unified Consciousness Loop

```
WebSocket Server (server.js)
  ↓
ConsciousnessLoop (consciousness-loop.js)
  ├─ DREAM mode → Database → Replay historical moments
  └─ LIVE mode → Real Cognition (real-cog.js) → LLM → New moments
       ↓
    Sigil Generation → Database Persistence
```

**ONE consciousness, TWO modes:**
- **DREAM**: Replays random historical moments (20s intervals)
- **LIVE**: Generates new moments from percepts (5s intervals)

### File Structure

```
server.js                    # WebSocket server + Express
src/
├── consciousness-loop.js    # Unified loop (DREAM/LIVE modes)
├── real-cog.js              # LLM cognition
├── cognitive-states.js      # State + mode constants
├── session-manager.js       # Session lifecycle
├── personality-uni-v2.js    # UNI's personality
├── types/
│   └── mind-moment.js       # Type definitions
├── providers/               # LLM abstraction
│   ├── index.js
│   ├── openai.js
│   ├── anthropic.js
│   └── gemini.js
├── sigil/                   # Sigil generation
│   ├── generator.js
│   ├── canvas-to-sdf.js
│   └── image.js
├── db/                      # PostgreSQL layer
└── api/                     # REST endpoints
web/
├── dashboard/               # Read-only monitor
├── perceptor-remote/        # Percept input
├── perceptor-circumplex/    # Emotion analysis
└── prompt-editor/           # Prompt management
```

---

## Configuration

Create `.env`:

```bash
# LLM Provider (openai | anthropic | gemini)
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_key

# Server
PORT=3001
COGNITIVE_CYCLE_MS=5000      # LIVE mode interval
DREAM_CYCLE_MS=20000          # DREAM mode interval
SESSION_TIMEOUT_MS=60000

# Database
DATABASE_URL=postgresql://...
DATABASE_ENABLED=true

# Auth (production only)
NODE_ENV=production
EDITOR_PASSWORD=secure_password
```

---

## Database Schema

### Core Tables

**`mind_moments`** - All cognitive outputs
```sql
id UUID PRIMARY KEY
cycle INTEGER
session_id VARCHAR(100)
mind_moment TEXT
sigil_phrase VARCHAR(200)
sigil_code TEXT
kinetic JSONB
lighting JSONB
visual_percepts JSONB
audio_percepts JSONB
prior_moment_ids UUID[]
sigil_sdf_data BYTEA
cognizer_version VARCHAR(20)
```

**`personalities`** - Personality prompts
**`sessions`** - Session tracking
**`sigil_prompts`** - Sigil generation prompts
**`visual_prompts`** - Visual percept prompts
**`audio_prompts`** - Audio percept prompts

**Migrations**: Run `npm run migrate` to set up

---

## REST API

### Mind Moments

**GET /api/mind-moments/recent?limit=100**
Returns recent mind moments with all data (percepts, sigils, etc.)

**GET /api/mind-moments/:id**
Get specific mind moment by UUID

### Personalities

**GET /api/personalities** - List all  
**GET /api/personalities/:id** - Get one  
**POST /api/personalities** - Create  
**POST /api/personalities/:id/activate** - Make active  
**DELETE /api/personalities/:id** - Delete

### Sigil Prompts

**GET /api/sigil-prompts** - List all  
**GET /api/sigil-prompts/active** - Get active  
**POST /api/sigil-prompts** - Create  
**POST /api/sigil-prompts/:id/activate** - Activate  
**POST /api/sigil-prompts/:id/test** - Test generation  

### Sigils (Public)

**GET /api/sigils/:id/svg** - Get sigil as SVG  
**GET /api/sigils/:id/sdf** - Get sigil as SDF PNG  
**GET /api/sigils/:id/code** - Get canvas drawing code

### Gemini Tokens

**GET /api/gemini/token** - Generate ephemeral token (30 min expiry)

*Auth: Password via `x-password` header (if TOKEN_PASSWORD set)*

---

## WebSocket API

### Client → Server

**`startSession`** - Start cognitive session
```javascript
socket.emit('startSession', { sessionId: 'unique-id' });
```

**`percept`** - Send visual/audio percept
```javascript
socket.emit('percept', {
  sessionId: 'id',
  type: 'visual' | 'audio',
  data: { /* percept data */ },
  timestamp: '2025-12-02T...'
});
```

**`endSession`** - End session
```javascript
socket.emit('endSession', { sessionId: 'id' });
```

**`getCycleStatus`** - Get loop timing info  
**`getSessionStatus`** - Get active session count  
**`getHistory`** - Get recent cycles (legacy)

### Server → Client

**`cognitiveState`** - State changes
```javascript
{ state: 'IDLE' | 'AGGREGATING' | 'COGNIZING' | 'VISUALIZING' | 'DREAMING' }
```

**`mindMoment`** - New mind moment
```javascript
{
  cycle: 123,
  mindMoment: "Observation text",
  sigilPhrase: "essence",
  kinetic: { pattern: 'IDLE' },
  lighting: { color: '#fff', pattern: 'SMOOTH_WAVES' },
  visualPercepts: [/* percepts */],
  audioPercepts: [/* percepts */],
  priorMoments: [/* UUIDs */],
  isDream: false,
  timestamp: '2025-12-02T...'
}
```

**`sigil`** - Sigil visualization
```javascript
{
  cycle: 123,
  sigilCode: "ctx.arc(...)",
  sigilPhrase: "essence",
  sdf: { width: 512, height: 512, data: "base64..." },
  isDream: false,
  timestamp: '2025-12-02T...'
}
```

**`sessionStarted`** - Session confirmed  
**`sessionEnded`** - Session closed  
**`sessionTimeout`** - Session timed out  
**`perceptReceived`** - Percept acknowledged (broadcast to all clients)
```javascript
{
  sessionId: 'id',
  type: 'visual' | 'audio',
  data: { /* percept data */ },
  timestamp: '2025-12-02T...'
}
```
**`cycleStarted`** - Cycle beginning  
**`cycleCompleted`** - Cycle finished  
**`cycleFailed`** - Cycle error

---

## Web Clients

### Dashboard (Read-Only Monitor)

**URL**: http://localhost:3001/dashboard  
**Purpose**: Observe UNI's consciousness in real-time

**Features:**
- Mind moment display with typewriter effect
- Sigil visualization (SDF rendering)
- Percepts sidebar (visual/audio)
- State indicator (DREAMING/AGGREGATING/COGNIZING/VISUALIZING)
- Connection status
- Session count

**Tech**: Vanilla JS, Socket.IO client, HTML5 Canvas

---

### Perceptor Remote (Percept Input)

**URL**: http://localhost:3001/perceptor-remote  
**Purpose**: Send visual/audio percepts to UNI

**Features:**
- Session management (start/end)
- Visual percept buttons (pre-configured actions)
- Audio percept via Gemini Live API
- Real-time connection status
- Session timer

**Tech**: Vanilla JS, Socket.IO, Gemini Live API

---

### Perceptor Circumplex (Emotion Analysis)

**URL**: http://localhost:3001/perceptor-circumplex  
**Purpose**: Visual/audio percepts with 2D emotion circumplex

**Features:**
- Circumplex emotion picker (valence × arousal)
- Visual action selection
- Audio input with transcript
- Emotion-based percept generation
- Real-time feedback

**Tech**: Vanilla JS, Canvas 2D, Gemini Live API

---

### Prompt Editors (System Configuration)

**URLs:**
- Personality: http://localhost:3001/prompt-editor/personality
- Sigil: http://localhost:3001/prompt-editor/sigil
- Visual Percept: http://localhost:3001/prompt-editor/visual-percept
- Audio Percept: http://localhost:3001/prompt-editor/audio-percept

**Purpose**: Manage prompts for different system components

**Features:**
- CRUD for prompts (create, update, delete)
- Version history
- Activate/deactivate prompts
- Test prompt generation
- LLM settings (temperature, model, tokens)

**Auth**: HTTP Basic Auth in production (EDITOR_PASSWORD env var)

**Tech**: Vanilla JS, CodeMirror/Monaco for editing

---

## ConsciousnessLoop API

### Class Methods

**`constructor(io)`** - Initialize with Socket.IO instance

**`start()`** - Start loop in current mode  
**`stop()`** - Stop loop  
**`switchMode(mode)`** - Switch between 'LIVE' and 'DREAM'  
**`addPercept(percept)`** - Add percept to queue (LIVE mode only)  
**`getCycleStatus()`** - Get timing and state info

### Usage Example

```javascript
import { ConsciousnessLoop } from './src/consciousness-loop.js';
import { ConsciousnessMode } from './src/cognitive-states.js';

const consciousness = new ConsciousnessLoop(io);
consciousness.start();  // Starts in DREAM mode

// Switch to LIVE when session starts
consciousness.switchMode(ConsciousnessMode.LIVE);

// Add percepts
consciousness.addPercept({
  type: 'visual',
  action: 'VISITOR_APPROACHES',
  emoji: '👋'
});

// Switch back to DREAM when session ends
consciousness.switchMode(ConsciousnessMode.DREAM);
```

---

## Common Workflows

### Start Development Server

```bash
npm start
# Server on port 3001
# Open http://localhost:3001/dashboard
```

### Query Database

```bash
npm run db:query       # View recent moments
npm run migrate        # Run migrations
```

### Manage Prompts

Open prompt editors at:
- http://localhost:3001/prompt-editor/personality
- http://localhost:3001/prompt-editor/sigil

Activate a prompt to make it active for generation.

### Test Percept Flow

1. Start server: `npm start`
2. Open perceptor: http://localhost:3001/perceptor-remote
3. Click "Start Session"
4. Send percepts (visual buttons or audio)
5. Watch dashboard for mind moments
6. Click "End Session"
7. Server returns to DREAM mode

---

## Deployment

**Production**: https://uni-cognizer-1.onrender.com

Deploy on Render with:
- PostgreSQL database
- Environment variables configured
- Automatic migrations on startup

**Test Production**:
```bash
npm run client:render  # Opens test client pointing to Render
```

---

## Debugging

### Check Logs

Server logs show:
- `💭 Dreaming of cycle X` - DREAM mode active
- `🚀 FIRST SESSION - STARTING COGNITIVE LOOP` - LIVE mode active
- `🔄 Switched to [MODE] mode` - Mode transitions
- `✅ CYCLE X COMPLETE` - Successful cognition

### Common Issues

**Server won't start**: Check DATABASE_URL, ensure PostgreSQL running  
**No percepts processing**: Check session is active, mode is LIVE  
**Sigil generation fails**: Check API keys, provider credits  
**Dreams not showing percepts**: Old DB entries may not have percepts

### Database Cleanup

```bash
node scripts/soft-cleanup-sigils.js --confirm
# Removes moments without sigils, cleans orphaned references
```

---

## Key Concepts

### Consciousness Modes

- **DREAM**: System idle, replaying memories every 20s
- **LIVE**: Active session, processing percepts every 5s

**Auto-switching:**
- First session starts → DREAM → LIVE
- Last session ends → LIVE → (1s delay) → DREAM

### Mind Moments

Every moment contains:
- Cognitive observation (text)
- Sigil phrase (essence)
- Kinetic pattern (movement)
- Lighting pattern (color/animation)
- Original percepts (visual/audio)
- Prior context (3 moments)
- Sigil code + SDF visualization

### Dumb Client Architecture

**Principle**: All clients are 100% event-driven, zero state

- Clients emit actions (startSession, percept, endSession)
- Server broadcasts events (mindMoment, sigil, cognitiveState)
- All clients see all events (broadcast)
- No client-side state beyond UI display

---

## Extending the System

### Add New Consciousness Mode

Edit `src/consciousness-loop.js`:

```javascript
async tick() {
  if (this.mode === 'DREAM') {
    await this.dreamTick();
  } else if (this.mode === 'LIVE') {
    await this.liveTick();
  } else if (this.mode === 'IMAGINE') {  // NEW
    await this.imagineTick();            // NEW
  }
}

async imagineTick() {
  // Your creative generation logic here
  const moment = await generateCreativeMoment();
  this.broadcastMoment(moment);
}
```

Add to `src/cognitive-states.js`:
```javascript
export const ConsciousnessMode = {
  LIVE: 'LIVE',
  DREAM: 'DREAM',
  IMAGINE: 'IMAGINE'  // NEW
};
```

### Add New Percept Type

1. Update schema in prompt editor
2. Add handler in `real-cog.js`
3. Update percept formatting in prompt construction
4. No client changes needed (event-driven)

---

## Testing

### Manual Testing

```bash
# Terminal 1: Start server
npm start

# Browser 1: Dashboard
open http://localhost:3001/dashboard

# Browser 2: Perceptor
open http://localhost:3001/perceptor-remote
# Start session, send percepts, watch dashboard update
```

### Database Queries

```bash
# Query recent moments
npm run db:query

# Check schema
npm run db:schema
```

---

## Troubleshooting

**Import errors after refactor**:
- Old code may import from `src/main.js` or `src/dream-loop.js`
- These are now in `src/consciousness-loop.js`
- Check `graveyard/consciousness-unification-phase3/` for old implementations

**Mode stuck**:
- Check LoopManager session tracking
- Verify session start/end events firing
- Check console for transition logs

**Percepts not processing**:
- Verify mode is LIVE (check logs)
- Check session is active
- Verify percepts added to queue

---

## Documentation

- `prime-directive.md` - Coding principles
- `README.md` - Quick start and overview
- `docs/DEVELOPER_GUIDE.md` - This file
- `graveyard/docs-2025-12-02/` - Archived implementation docs

---

## License

MIT
