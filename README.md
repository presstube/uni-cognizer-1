# Cognizer-1 MVP

**Core Cognitive Loop Prototype** - A robot that thinks, feels, and expresses emotional understanding.

## Quick Start

### 1. Setup
```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and add your OpenAI API key
```

### 2. Run
```bash
npm start
```

The cognitive loop will start running, generating emotional plans every 5 seconds based on mock percepts.

## Architecture

```
Mock Percepts (scenarios)
    ↓
Cognitive Loop (every 5 seconds)
    ↓
GPT-4o (personality + percepts + previous state)
    ↓
Emotional Plan (JSON)
    ↓
Console Output
```

## What You'll See

The console displays:
- 📥 **Percepts**: Incoming observations every ~2 seconds
- 🧠 **Cognitive Cycles**: Emotional plans every 5 seconds
- 💭 **Emotional State**: Current mood descriptor
- 📈 **Mood Vector**: Valence (negative/positive) and arousal (calm/excited)
- 🎭 **Poetic Expression**: The robot's inner experience
- 🎯 **Intent**: What it wants to express

## Files

- `src/main.js` - Main cognitive loop
- `src/cognitive-core.js` - GPT-4o integration
- `src/mock-percepts.js` - Test data generator
- `src/personality.js` - Robot's identity/character

## Configuration

Edit `.env` to adjust:
- `COGNITIVE_CYCLE_MS` - How often to think (default: 5000ms)
- `PERCEPT_INTERVAL_MS` - How often percepts arrive (default: 2000ms)

## Next Steps

See `docs/MVP-cognizer-1-implementation.md` for validation checklist and observations.

See `docs/cognizer-roadmap.md` for future stages (memory, user recognition, etc).

