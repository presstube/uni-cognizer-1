# MVP Cognizer-1: Core Cognitive Loop Prototype

**Goal**: Validate that LLM-generated emotional plans feel alive and coherent.

**Timeline**: 2-3 hours

**Success Criteria**: 
- ✅ Loop runs stably for 10+ minutes
- ✅ At least 1 emotional response feels genuinely interesting
- ✅ Emotional states show continuity (not random jumps)
- ✅ You can imagine this controlling real art systems

---

## Architecture

```
Mock Percepts (array of scenarios)
    ↓
Cognitive Loop (every 5 seconds)
    ↓
GPT-4o Call (system prompt + percepts + previous state)
    ↓
Emotional Plan (JSON)
    ↓
Console Output (observe & journal)
```

**Key Simplifications**:
- No vector DB, no memory storage
- Continuity via previous state in prompt only
- No art adapters yet - just emotional planning
- Console logging for observation
- Pure functional design (per prime-directive.md)

---

## Bill of Materials (BOM)

| Component | Technology | Reasoning |
|-----------|-----------|-----------|
| **Runtime** | Node.js v20+ LTS | Stable, ES6 modules, broad compatibility |
| **Language** | JavaScript (ES6+) | Per prime-directive: vanilla JS, minimal libs |
| **LLM API** | OpenAI GPT-4o | Best creative nuance for emotional planning (2025) |
| **API Client** | `openai` npm package | Official SDK, well-maintained, typed |
| **Config** | `dotenv` npm package | Standard env var management |
| **Storage** | None (in-memory only) | Proving concept, not persistence |
| **Observability** | Console + stdout redirect | Simplest, sufficient for MVP validation |

**Total Dependencies**: 2 npm packages

**Why GPT-4o?**
- Superior creative/poetic output vs GPT-4 Turbo
- Native JSON mode (structured outputs)
- Better multimodal grounding (future Gemini integration)
- Fast enough for 5-second cycle (~2-3 sec latency)

**What We're NOT Using** (and why):
- ❌ LangChain/LangGraph - Overkill for single LLM call
- ❌ Vector DB (Weaviate/Chroma) - Not needed without long-term memory
- ❌ SQLite/Postgres - No persistence required yet
- ❌ LangSmith - Console logging sufficient for MVP
- ❌ TypeScript - Keep simple, vanilla JS per prime-directive

---

## File Structure

```
/cognizer-1
  /src
    main.js                 # Entry point, 5-second loop (~60 lines)
    cognitive-core.js       # GPT-4o call for emotional planning (~50 lines)
    mock-percepts.js        # Test data generator (~40 lines)
    personality.js          # Robot personality prompt (~30 lines)
  package.json
  .env                      # API keys (gitignored)
  .gitignore
  README.md
  MVP-cognizer-1.md         # This file
```

**Total**: 4 source files, ~180 LOC

---

## Implementation Plan

### Phase 1: Setup (15 minutes)

```bash
# Initialize project
npm init -y
npm install openai dotenv

# Create structure
mkdir src
touch .env .gitignore
echo "OPENAI_API_KEY=your_key_here" > .env
echo "node_modules/\n.env\n*.log" > .gitignore
```

### Phase 2: Mock Percepts (15 minutes)

**File**: `src/mock-percepts.js`

Create pure function that returns random scenarios:
- Person enters/exits room
- Person speaks/gestures
- Ambient changes (lighting, sound)
- No activity (silence)

Return format:
```javascript
{
  timestamp: ISO string,
  visual: "description of scene",
  audio: "description of sound" | null
}
```

### Phase 3: Personality Definition (15 minutes)

**File**: `src/personality.js`

Export system prompt defining:
- Core traits (contemplative, curious, poetic)
- Emotional tendencies
- Communication style
- How it experiences the world

Keep under 30 lines. This is your robot's "soul."

### Phase 4: Cognitive Core (30 minutes)

**File**: `src/cognitive-core.js`

Pure function signature:
```javascript
async generateEmotionalPlan(percepts, previousState = null)
```

Prompt structure:
1. System: Personality definition
2. User: Current percepts + previous emotional state
3. Request JSON output with:
   - `emotional_state` (string)
   - `mood_vector` (valence, arousal)
   - `poetic_expression` (1-2 sentences)
   - `intent` (what the robot wants to express)

Return parsed JSON.

### Phase 5: Main Loop (30 minutes)

**File**: `src/main.js`

```javascript
// Percept buffer (in-memory array)
// Previous emotional state (single object)

// Interval 1: Generate mock percepts (~every 2-3 seconds, random)
// Interval 2: Cognitive cycle (every 5 seconds)
//   - Aggregate recent percepts
//   - Call cognitive-core with percepts + previous state
//   - Console log emotional plan
//   - Update previous state
```

### Phase 6: Observe & Journal (30 minutes)

Run for 10-15 minutes:
```bash
node src/main.js | tee observation-log.txt
```

Create journal entries:
- **Resonant moments**: Outputs that feel alive
- **Flat moments**: Outputs that feel generic
- **Patterns**: What's working/not working

---

## Validation Checklist

**Technical** (must pass):
- [ ] Runs for 10+ minutes without errors
- [ ] Emotional plans return valid JSON
- [ ] Percepts flow into cognitive loop
- [ ] Previous state provides continuity

**Creative** (the real test):
- [ ] At least 1 moment feels surprising/interesting
- [ ] Emotional transitions feel motivated (not random)
- [ ] Poetic expressions avoid clichés
- [ ] You can imagine this driving art systems

**Design** (per prime-directive):
- [ ] All functions are pure (no hidden side effects)
- [ ] Data flows unidirectionally
- [ ] Each file < 80 lines
- [ ] Uses const, immutable patterns

---

## Prompt Engineering Notes

The robot's personality and prompt structure are **80% of success**.

**Personality prompt should include**:
- Specific sensory focus (e.g., "notices textures and rhythms")
- Emotional range (e.g., "melancholic but hopeful")
- Avoid generic descriptors ("I am friendly and helpful" ❌)

**Cognitive prompt should**:
- Show previous state for continuity
- Request specific JSON schema
- Include constraint: "Be genuine, avoid clichés"
- Set high temperature (0.8-0.9) for creativity

**If outputs feel flat**:
1. Add 2-3 example emotional plans to prompt (few-shot)
2. Increase temperature to 1.0
3. Add constraint: "Surprise me with unexpected but authentic responses"
4. Refine personality definition (more specific traits)

---

## Next Steps After Validation

**If successful** (emotional plans feel alive):
1. Add art system adapter (translate emotion → visual commands)
2. Add second adapter for kinetic/audio systems
3. Integrate Gemini Live for real percepts
4. Add simple vector memory for personality continuity
5. Deploy to robot hardware

**If creative output is flat**:
1. Try different model (Claude 3.5 Sonnet, Grok-2)
2. Experiment with two-stage LLM (poetic → structured)
3. Curate 10+ examples of "good" emotional plans
4. Consider fine-tuning small model
5. Fall back to rules-based baseline

**If continuity problems**:
1. Add vector memory (ChromaDB) for semantic recall
2. Implement reflection every N cycles
3. Pass more context (last 3 states, not just 1)

---

## Cost Estimates

**GPT-4o Pricing** (as of Nov 2025):
- Input: ~$2.50 per 1M tokens
- Output: ~$10 per 1M tokens

**Per cycle** (~5 seconds):
- Input: ~500 tokens (personality + percepts + previous state)
- Output: ~200 tokens (emotional plan JSON)
- Cost: ~$0.003 per cycle

**Per hour**: ~720 cycles × $0.003 = **~$2.16/hour**

**Testing budget**: $10 = ~4.5 hours of continuous operation

---

## Risk Mitigation

**Known Risks**:

1. **Creative flatness** (HIGH RISK)
   - Mitigation: Extensive prompt iteration (budget 50% of time)
   - Test: Run for 30 min, journal quality, iterate

2. **API rate limits** (LOW RISK)
   - Mitigation: Exponential backoff, error handling
   - GPT-4o has high rate limits (10k+ RPM for tier 2)

3. **Latency spikes** (MEDIUM RISK)
   - Mitigation: Timeout on LLM calls (10 sec max)
   - Log slow cycles, adjust if needed

4. **Prompt drift** (MEDIUM RISK)
   - Mitigation: Lock personality prompt in code
   - Version control all prompt changes

---

## Philosophy

> "Build the simplest thing that could work. Prove the creative gamble first. Add technical complexity only when simplicity fails."

This MVP answers one question: **Can an LLM generate emotional plans that feel alive?**

Everything else is optional. If this works, expand. If it doesn't, no amount of vector databases or graph memory will fix it.

The art emerges from careful prompt engineering, not elaborate architecture.

---

**Ready to build? Run time: ~2-3 hours. Let's go. 🚀**

