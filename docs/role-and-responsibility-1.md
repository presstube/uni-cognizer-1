# Aggregator vs Cognizer: Roles & Responsibilities

---

## AGGREGATOR-1 (Frontend/Browser)

**"The Senses"**

### Does:
- 👁️ Run `cam` module (Gemini Live video → visual percepts)
- 🎤 Run `mic` module (Gemini Live audio → audio percepts)
- 🔐 Handle password protection
- 🌐 Manage Gemini ephemeral tokens (Vercel serverless)
- 📡 Send percepts to cognizer via WebSocket
- 🖥️ Display mind moments + sigil phrases
- 👤 Detect visitor presence (start/end sessions)
- 🎨 Future: Trigger art adapters from sigil phrases

### Doesn't:
- ❌ No cognitive processing
- ❌ No LLM calls
- ❌ No history management
- ❌ No decision-making

**Tech**: Next.js, Vercel, WebSocket client, Gemini Live SDK

---

## COGNIZER-1 (Backend/Server)

**"The Brain"**

### Does:
- 🧠 Run cognitive loop (5s cycles)
- 📥 Receive percepts via WebSocket
- 🗂️ Queue percepts (snapshot-and-clear pattern)
- 🤖 Call LLM (GPT-4o/Claude/Gemini) with percepts + history + personality
- 💭 Generate mind moments + sigil phrases
- 📚 Manage cognitive history (context depth N)
- 💾 Store/load session histories
- ⏯️ Start/stop sessions (cost control)
- 📊 Track session state (idle vs active)

### Doesn't:
- ❌ No hardware/sensor access
- ❌ No UI rendering
- ❌ No token management
- ❌ No authentication

**Tech**: Node.js, WebSocket server, OpenAI/Anthropic/Google SDKs

---

## Communication

```
[AGGREGATOR] ←→ [COGNIZER]
     ↓              ↑
  Sends:        Sends:
  - percepts    - mind moments
  - session     - sigil phrases
    start/end   - state
```

**Messages:**

Aggregator → Cognizer:
- `percept`: `{ type, data, timestamp }`
- `startSession`: `{ sessionId }`
- `endSession`: `{ sessionId }`

Cognizer → Aggregator:
- `mindMoment`: `{ cycle, mindMoment, sigilPhrase, timestamp }`
- `sessionState`: `{ active, sessionId }`

---

## Separation of Concerns

| Concern | Owner |
|---------|-------|
| Sensing | Aggregator |
| Thinking | Cognizer |
| Memory | Cognizer |
| Display | Aggregator |
| Auth | Aggregator |
| Cost Control | Cognizer |
| Art Output | Aggregator |

---

## Session Lifecycle

**1. Idle** (No Cost)
- Cognizer running, no cycles
- WebSocket listening
- No LLM calls

**2. Session Start**
```
Visitor detected → startSession(sessionId)
  ↓
- Begin percept listening
- Start cognitive cycles (5s)
- Initialize session history
```

**3. Active** ($$$ Running)
```
Percepts → Cognitive cycles → Mind moments
Cost: ~$0.02/min (~$1.20/hour)
```

**4. Session Timeout**
```
No percepts for 30s → endSession(sessionId)
  ↓
- Stop cycles
- Stop listening
- Save history
- Return to Idle
```

**5. Session Resume**
```
sessionId matches saved
  ↓
- Load prior history
- Restart cycles
- "Welcome back" via context
```

---

## Cost Impact

**Without Sessions**: $10-50/day (24/7 running)  
**With Sessions**: $1-5/day (1-5 hours visitor time)  
**Savings**: 90%

---

## Scaling

**Aggregator**: Horizontal (many visitors, free)  
**Cognizer**: Vertical (single brain, managed cost)

---

## Analogy

Aggregator = Nervous system (senses + reflexes)  
Cognizer = Prefrontal cortex (reasoning + memory)


