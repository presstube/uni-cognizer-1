# Cognizer-1 MVP

**Core Cognitive Loop Prototype** - A robot that thinks, feels, and expresses emotional understanding.

## Quick Start

### 1. Setup
```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env:
# - Set LLM_PROVIDER to 'anthropic' or 'openai'
# - Add your API key (ANTHROPIC_API_KEY or OPENAI_API_KEY)
```

### 2. Run
```bash
npm start
```

The cognitive loop will start running, generating emotional plans every 5 seconds based on mock percepts.

## LLM Provider Configuration

The system supports multiple LLM providers. Configure via `.env`:

### Anthropic (Claude Sonnet 4.5)
```bash
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...your-key...
```

### OpenAI (GPT-4o)
```bash
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-proj-...your-key...
```

### Switching Providers
1. Update `LLM_PROVIDER` in `.env`
2. Ensure the corresponding API key is set
3. Restart the application

No code changes required!

## Architecture

```
Mock Percepts (scenarios)
    ↓
Cognitive Loop (every 5 seconds)
    ↓
LLM Provider (Anthropic/OpenAI via abstraction)
    ↓
Emotional Plan (JSON)
    ↓
Console Output
```

## What You'll See

The console displays:
- 👁️ **Visual Percepts**: Camera observations every ~3 seconds
- 🎤 **Audio Percepts**: Microphone input every 7-10 seconds
- 🧠 **Cognitive Cycles**: Emotional plans every 5 seconds
- 💭 **Emotional State**: Current mood descriptor
- 📈 **Mood Vector**: Valence (negative/positive) and arousal (calm/excited)
- 🎭 **Poetic Expression**: The robot's inner experience
- 🎯 **Intent**: What it wants to express

## Files

### Core
- `src/main.js` - Main cognitive loop
- `src/cognitive-core.js` - Emotional planning logic (provider-agnostic)
- `src/mock-percepts.js` - Test data generator
- `src/personality-unisphere.js` - Unisphere robot identity

### LLM Providers
- `src/providers/index.js` - Provider factory/selector
- `src/providers/anthropic.js` - Anthropic/Claude implementation
- `src/providers/openai.js` - OpenAI/GPT implementation

### Data
- `data/mock-visual-percepts-visitor.json` - Visitor body language/actions
- `data/mock-audio-percepts-2.json` - Visitor speech/questions

## Configuration

Edit `.env` to adjust:
- `LLM_PROVIDER` - Which AI provider to use
- `COGNITIVE_CYCLE_MS` - How often to think (default: 5000ms)
- `VISUAL_PERCEPT_INTERVAL_MS` - Visual percept rate (default: 3000ms)
- `AUDIO_PERCEPT_MIN_MS` / `AUDIO_PERCEPT_MAX_MS` - Audio timing range (default: 7-10s)

## Cost Estimates

**Anthropic (Claude Sonnet 4.5)**:
- ~$3/hour of continuous operation

**OpenAI (GPT-4o)**:
- ~$2/hour of continuous operation

Per 5-second cycle: ~$0.002-0.004

## Next Steps

See `docs/MVP-cognizer-1-implementation.md` for validation checklist and observations.

See `docs/cognizer-roadmap.md` for future stages (memory, user recognition, etc).
