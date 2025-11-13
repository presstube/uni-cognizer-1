# Core Cognitive Loop Spike Plan

**Goal**: Build and validate the deliberative "brain" of the robot cognition system in isolation, focusing on whether LLM-generated emotional plans feel alive and coherent.

**Timeline**: 2-4 days

**Success Criteria**: 
- ✅ Loop runs stably on 5-second heartbeat
- ✅ Emotional plans feel coherent and interesting (not generic/flat)
- ✅ Memory retrieval improves personality consistency
- ✅ One art system adapter produces resonant outputs

---

## Prerequisites

### API Keys You'll Need
- OpenAI API key (for GPT-4o) OR xAI API key (for Grok-2)
- Optional: Gemini API key (if testing with real percepts)

### Tech Stack Setup
```bash
# Node.js project
npm init -y
npm install openai          # For GPT-4o
npm install @langchain/core @langchain/openai langgraph  # Orchestration
npm install chromadb        # Vector DB (easiest for local dev)
npm install better-sqlite3  # Timeline store (simple DB)
npm install dotenv          # Environment variables
```

### File Structure
```
/cognitive-loop-spike
  /src
    config.js              # API keys, constants
    main.js                # Entry point, 5-second loop
    percept-aggregator.js  # Pure function: aggregate percepts
    memory-manager.js      # Vector + timeline storage/retrieval
    cognitive-core.js      # Main LLM call for emotional planning
    art-adapter.js         # Translate emotional plan → art commands
    mock-percepts.js       # Test data generator
  /data
    personality.json       # Robot personality definition
    art-system-schema.json # Art system's accepted command structure
  package.json
  .env                     # API keys (gitignored)
  README.md
```

---

## Day 1: Basic Loop (No Memory)

**Objective**: Get percepts → LLM → emotional plan working in simplest form.

### 1.1 Setup Project (30 min)
```bash
mkdir cognitive-loop-spike && cd cognitive-loop-spike
npm init -y
npm install openai dotenv
touch .env
```

Add to `.env`:
```
OPENAI_API_KEY=your_key_here
```

### 1.2 Create Mock Percepts (30 min)
**File**: `src/mock-percepts.js`

```javascript
// Generate fake visual/audio percepts for testing
export function generateMockPercept() {
  const scenarios = [
    { visual: "Person enters room, waving", audio: "Hello there!" },
    { visual: "Person sits down, looking at phone", audio: null },
    { visual: "Person stands up, stretches", audio: "Sighs deeply" },
    { visual: "Room empty", audio: null },
    { visual: "Person returns with coffee", audio: "Much better" }
  ];
  
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  return {
    timestamp: new Date().toISOString(),
    type: "percept",
    visual: scenario.visual,
    audio: scenario.audio
  };
}
```

### 1.3 Build Percept Aggregator (30 min)
**File**: `src/percept-aggregator.js`

```javascript
// Pure function: collect percepts from last 5 seconds
export function aggregatePercepts(perceptBuffer, windowSeconds = 5) {
  const now = Date.now();
  const cutoff = now - (windowSeconds * 1000);
  
  const recentPercepts = perceptBuffer.filter(p => 
    new Date(p.timestamp).getTime() > cutoff
  );
  
  return {
    count: recentPercepts.length,
    percepts: recentPercepts,
    summary: recentPercepts.length > 0 
      ? recentPercepts.map(p => 
          `[${p.visual || ''}${p.audio ? ' | "' + p.audio + '"' : ''}]`
        ).join(', ')
      : "No activity detected"
  };
}
```

### 1.4 Build Cognitive Core (1-2 hours)
**File**: `src/cognitive-core.js`

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const PERSONALITY = `You are a contemplative robot artist. You experience the world 
with quiet curiosity, finding beauty in small moments. You feel emotions deeply but 
express them poetically. You are patient, observant, and occasionally playful.`;

export async function generateEmotionalPlan(perceptSummary, memories = null) {
  const memoryContext = memories 
    ? `\n\nRelevant memories: ${memories}` 
    : '';
  
  const prompt = `Based on these percepts from the last 5 seconds:
${perceptSummary}${memoryContext}

What is your current emotional state? Express it as JSON with:
- emotional_state: brief descriptor (e.g., "curious", "contemplative")
- mood_vector: { valence: -1 to 1, arousal: -1 to 1, dominance: -1 to 1 }
- poetic_expression: 1-2 sentences expressing your inner state
- intent: what you feel drawn to do or express

Be genuine, nuanced, and avoid clichés.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: PERSONALITY },
      { role: 'user', content: prompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.8  // Higher for creativity
  });

  return JSON.parse(response.choices[0].message.content);
}
```

### 1.5 Build Main Loop (1 hour)
**File**: `src/main.js`

```javascript
import 'dotenv/config';
import { generateMockPercept } from './mock-percepts.js';
import { aggregatePercepts } from './percept-aggregator.js';
import { generateEmotionalPlan } from './cognitive-core.js';

const perceptBuffer = [];
let cycleCount = 0;

// Simulate percepts arriving randomly
setInterval(() => {
  if (Math.random() > 0.3) {  // 70% chance of new percept
    const percept = generateMockPercept();
    perceptBuffer.push(percept);
    console.log(`📥 Percept: ${percept.visual || percept.audio}`);
  }
}, 1000);

// Core cognitive loop (every 5 seconds)
setInterval(async () => {
  cycleCount++;
  console.log(`\n🧠 Cognitive Cycle #${cycleCount}`);
  console.log('─────────────────────────────────────');
  
  const aggregated = aggregatePercepts(perceptBuffer);
  console.log(`📊 Percepts: ${aggregated.summary}`);
  
  try {
    const emotionalPlan = await generateEmotionalPlan(aggregated.summary);
    console.log(`💭 Emotional State: ${emotionalPlan.emotional_state}`);
    console.log(`🎭 Expression: ${emotionalPlan.poetic_expression}`);
    console.log(`🎯 Intent: ${emotionalPlan.intent}`);
    console.log(`📈 Mood: valence=${emotionalPlan.mood_vector.valence}, arousal=${emotionalPlan.mood_vector.arousal}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  // Clean old percepts (keep last 30 seconds)
  const cutoff = Date.now() - 30000;
  const originalLength = perceptBuffer.length;
  perceptBuffer.splice(0, perceptBuffer.findIndex(p => 
    new Date(p.timestamp).getTime() > cutoff
  ));
  if (perceptBuffer.length !== originalLength) {
    console.log(`🗑️  Cleaned ${originalLength - perceptBuffer.length} old percepts`);
  }
  
}, 5000);

console.log('🚀 Cognitive Loop started. Press Ctrl+C to stop.\n');
```

### 1.6 Test Run (30 min)
```bash
node src/main.js
```

**Watch for**:
- Does it run without crashing?
- Do emotional states feel varied and interesting?
- Or do outputs feel generic/repetitive?

**🎯 Day 1 Success**: Loop runs, outputs JSON, you can judge initial "aliveness"

---

## Day 2: Add Memory

**Objective**: Store emotional plans as vectors, retrieve relevant memories to improve coherence.

### 2.1 Setup ChromaDB (30 min)
```bash
npm install chromadb
```

**File**: `src/memory-manager.js`

```javascript
import { ChromaClient } from 'chromadb';
import Database from 'better-sqlite3';

// Vector memory (semantic associations)
const chromaClient = new ChromaClient();
let collection;

// Timeline memory (episodic)
const timelineDb = new Database('timeline.db');
timelineDb.exec(`
  CREATE TABLE IF NOT EXISTS memories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    emotional_state TEXT,
    poetic_expression TEXT,
    mood_valence REAL,
    mood_arousal REAL
  )
`);

export async function initMemory() {
  collection = await chromaClient.createCollection({
    name: 'emotional_memories',
    metadata: { 'hnsw:space': 'cosine' }
  });
}

export async function storeMemory(emotionalPlan) {
  const timestamp = new Date().toISOString();
  const memoryText = `${emotionalPlan.emotional_state}: ${emotionalPlan.poetic_expression}`;
  
  // Store in vector DB
  await collection.add({
    ids: [timestamp],
    documents: [memoryText],
    metadatas: [{
      emotional_state: emotionalPlan.emotional_state,
      intent: emotionalPlan.intent,
      valence: emotionalPlan.mood_vector.valence,
      arousal: emotionalPlan.mood_vector.arousal
    }]
  });
  
  // Store in timeline DB
  const stmt = timelineDb.prepare(`
    INSERT INTO memories (timestamp, emotional_state, poetic_expression, mood_valence, mood_arousal)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(
    timestamp,
    emotionalPlan.emotional_state,
    emotionalPlan.poetic_expression,
    emotionalPlan.mood_vector.valence,
    emotionalPlan.mood_vector.arousal
  );
}

export async function retrieveRelevantMemories(currentSummary, limit = 3) {
  if (!collection) return null;
  
  try {
    const results = await collection.query({
      queryTexts: [currentSummary],
      nResults: limit
    });
    
    if (results.documents[0].length === 0) return null;
    
    return results.documents[0].map((doc, i) => ({
      memory: doc,
      relevance: results.distances[0][i]
    }));
  } catch (error) {
    console.warn('Memory retrieval failed:', error.message);
    return null;
  }
}

export function getRecentTimeline(minutes = 5) {
  const cutoff = new Date(Date.now() - minutes * 60000).toISOString();
  const stmt = timelineDb.prepare(`
    SELECT * FROM memories 
    WHERE timestamp > ? 
    ORDER BY timestamp DESC 
    LIMIT 10
  `);
  return stmt.all(cutoff);
}
```

### 2.2 Integrate Memory into Loop (1 hour)
Update `src/main.js`:

```javascript
import { initMemory, storeMemory, retrieveRelevantMemories } from './memory-manager.js';

// Add before setInterval loops:
await initMemory();
console.log('🧠 Memory system initialized\n');

// Inside cognitive loop, before generateEmotionalPlan:
const relevantMemories = await retrieveRelevantMemories(aggregated.summary);
const memoryContext = relevantMemories
  ? relevantMemories.map(m => m.memory).join('; ')
  : null;

if (relevantMemories) {
  console.log(`🔍 Recalled memories: ${relevantMemories.length}`);
}

const emotionalPlan = await generateEmotionalPlan(aggregated.summary, memoryContext);

// After generating plan, store it:
await storeMemory(emotionalPlan);
```

### 2.3 Add Reflection Loop (1 hour)
**File**: `src/cognitive-core.js` - add new function:

```javascript
export async function reflectOnSelf(recentMemories) {
  const memorySummary = recentMemories
    .map(m => `${m.emotional_state}: ${m.poetic_expression}`)
    .join('\n');
  
  const prompt = `Looking back at your recent emotional states:

${memorySummary}

Reflect on who you are right now. What patterns do you notice? How would you 
describe your current sense of self? Keep it to 2-3 sentences, poetic and honest.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: PERSONALITY },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7
  });

  return response.choices[0].message.content;
}
```

Update `src/main.js` to run reflection every 10 cycles:

```javascript
// Inside cognitive loop, after storing memory:
if (cycleCount % 10 === 0) {
  const recentMemories = getRecentTimeline(5);
  if (recentMemories.length > 0) {
    console.log('\n🪞 Reflection time...');
    const reflection = await reflectOnSelf(recentMemories);
    console.log(`💭 Self-reflection: ${reflection}\n`);
  }
}
```

### 2.4 Test with Memory (1 hour)
```bash
node src/main.js
```

**Watch for**:
- Do emotional states become more coherent over time?
- Does memory retrieval pull relevant associations?
- Do reflections feel insightful or generic?

**🎯 Day 2 Success**: Memory stores/retrieves, personality feels more continuous

---

## Day 3: Art System Adapter

**Objective**: Translate emotional plan → structured art commands, validate creative resonance.

### 3.1 Define Art System Schema (30 min)
**File**: `data/art-system-schema.json`

```json
{
  "description": "Visual art system accepts commands to control generative visuals",
  "parameters": {
    "color_palette": {
      "type": "array",
      "items": "hex color string",
      "length": 3-5,
      "description": "Primary colors for current emotional state"
    },
    "motion_dynamics": {
      "speed": "0.0 to 1.0 (slow to fast)",
      "turbulence": "0.0 to 1.0 (calm to chaotic)",
      "direction": "inward | outward | circular | random"
    },
    "composition": {
      "focus": "center | edges | distributed | void",
      "density": "0.0 to 1.0 (sparse to dense)",
      "scale": "0.0 to 1.0 (small to large forms)"
    },
    "transition_time": "milliseconds (how long to blend to new state)"
  }
}
```

### 3.2 Build Art Adapter (1-2 hours)
**File**: `src/art-adapter.js`

```javascript
import OpenAI from 'openai';
import fs from 'fs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const artSchema = JSON.parse(fs.readFileSync('data/art-system-schema.json', 'utf-8'));

const ADAPTER_PERSONALITY = `You are a translator between emotional states and visual art. 
You have deep knowledge of color theory, motion dynamics, and composition. You create 
nuanced, expressive art commands that capture subtle emotional qualities. Avoid clichés 
(e.g., red = anger, blue = sad). Be sophisticated and surprising.`;

export async function translateToArtCommands(emotionalPlan) {
  const prompt = `Translate this emotional state into visual art system commands:

Emotional State: ${emotionalPlan.emotional_state}
Poetic Expression: ${emotionalPlan.poetic_expression}
Intent: ${emotionalPlan.intent}
Mood: valence=${emotionalPlan.mood_vector.valence}, arousal=${emotionalPlan.mood_vector.arousal}

Art System Schema:
${JSON.stringify(artSchema, null, 2)}

Create commands that genuinely capture the nuance of this emotional state. 
Be creative with color choices, motion, and composition. Output as valid JSON 
matching the schema.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: ADAPTER_PERSONALITY },
      { role: 'user', content: prompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.9  // Very creative
  });

  return JSON.parse(response.choices[0].message.content);
}
```

### 3.3 Integrate into Loop (30 min)
Update `src/main.js`:

```javascript
import { translateToArtCommands } from './art-adapter.js';

// After generating emotional plan:
const artCommands = await translateToArtCommands(emotionalPlan);
console.log(`🎨 Art Commands:`, JSON.stringify(artCommands, null, 2));
```

### 3.4 Evaluate Creative Output (2-3 hours)
Run the system and **actively journal**:

```bash
node src/main.js > output.log
```

Create a notebook (physical or digital) with two columns:
- **Resonant moments**: When art commands feel genuinely expressive
- **Flat moments**: When output feels generic or predictable

**Questions to ask**:
- Do color palettes match the emotional nuance?
- Are motion dynamics surprising but appropriate?
- Would this create interesting art or boring art?
- Does it capture subtlety or just obvious mappings?

**🎯 Day 3 Success**: Adapter produces structured JSON, you have data on creative quality

---

## Day 4: Iterate & Polish

**Objective**: Fix flat outputs, tune prompts, add temporal dynamics.

### 4.1 Add Temporal Dynamics (1 hour)
**File**: `src/main.js` - track previous mood:

```javascript
let previousMood = null;

// Inside cognitive loop, before generateEmotionalPlan:
const emotionalPlan = await generateEmotionalPlan(
  aggregated.summary, 
  memoryContext,
  previousMood  // Pass previous mood
);

// After generating plan, carry over 20%:
if (previousMood) {
  emotionalPlan.mood_vector.valence = 
    0.8 * emotionalPlan.mood_vector.valence + 0.2 * previousMood.valence;
  emotionalPlan.mood_vector.arousal = 
    0.8 * emotionalPlan.mood_vector.arousal + 0.2 * previousMood.arousal;
}

previousMood = { ...emotionalPlan.mood_vector };
```

### 4.2 Improve Prompts (2-3 hours)
Based on your journal from Day 3:

**If outputs are too generic**:
- Add specific examples of nuanced translations to adapter prompt
- Increase temperature further (try 1.0)
- Add constraint: "Avoid obvious color-emotion mappings"

**If emotional plans lack depth**:
- Enhance personality definition with more specific traits
- Add examples of "good" vs "bad" emotional expressions
- Chain LLMs: First generate poetic text, then structure it

**If personality drifts**:
- Strengthen reflection loops (run every 5 cycles instead of 10)
- Add consistency check: Compare current plan to recent memories
- Inject recent reflection into system prompt

### 4.3 Add Observability (1 hour)
Install LangSmith (optional but helpful):

```bash
npm install langsmith
```

Add to `.env`:
```
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your_langsmith_key
```

This lets you debug prompts and see what LLM is "thinking".

### 4.4 Stress Test (1-2 hours)
Run for extended period (30+ minutes):

```bash
node src/main.js
```

**Watch for**:
- Does personality remain coherent?
- Do emotional states evolve naturally?
- Any crashes or API errors?
- Memory performance over time?

**🎯 Day 4 Success**: System feels "alive", outputs are interesting, you're confident in approach

---

## Validation Checklist

Before considering spike complete:

**Technical**:
- [ ] Loop runs stably for 30+ minutes
- [ ] No API errors or crashes
- [ ] Memory stores and retrieves correctly
- [ ] Latency reasonable (~2-5 seconds per cycle)

**Creative** (The Real Test):
- [ ] Emotional plans feel coherent over time
- [ ] Some outputs genuinely surprise or resonate
- [ ] Personality consistency is maintained
- [ ] Art commands would produce interesting visuals
- [ ] System feels "alive" not algorithmic

**Documentation**:
- [ ] Journal has 10+ examples of resonant moments
- [ ] Identified 3+ patterns that work well
- [ ] Identified 3+ areas that need improvement
- [ ] Clear notes on prompt engineering insights

---

## Next Steps After Spike

**If successful**:
1. Port core logic into main robot project
2. Connect to real Gemini Live percepts
3. Build remaining art system adapters
4. Integrate reactive feedback path
5. Deploy and observe in real environment

**If creative output feels flat**:
1. Try different models (Grok-2, Claude 3.5 Sonnet)
2. Experiment with chained LLMs
3. Curate training examples, consider fine-tuning
4. Simplify to rules-based emotions as baseline
5. Iterate on adapter prompts extensively

**If personality drifts**:
1. Increase reflection frequency
2. Add graph-based memory (emotional causality)
3. Implement consistency scoring
4. Consider simpler personality model
5. Accept some evolution as feature, not bug

---

## Key Insights to Remember

1. **Prompt engineering is 80% of the work** - Budget time for iteration
2. **Creative quality > technical complexity** - Simple + resonant beats elaborate + flat
3. **Journal everything** - Subjective resonance is your north star
4. **Start simple, add complexity only when needed** - Don't over-engineer
5. **The art emerges from details** - Small prompt tweaks can transform output

---

## Troubleshooting

**"API rate limit errors"**:
- Add retry logic with exponential backoff
- Reduce cycle frequency (try 7-10 seconds)
- Check OpenAI billing/limits

**"Memory retrieval is slow"**:
- ChromaDB is in-memory by default (restart = data loss)
- For persistence: configure ChromaDB with persistent storage
- Limit number of stored memories (prune old ones)

**"Outputs are repetitive"**:
- Increase temperature (try 0.9-1.0)
- Add more variety to mock percepts
- Enhance personality with more specific traits
- Add explicit "avoid repeating yourself" instruction

**"Mood vectors don't make sense"**:
- Add validation: clamp values to [-1, 1]
- Provide examples in prompt of what each dimension means
- Consider removing dominance if not useful

**"Art commands are boring"**:
- This is the creative gamble - iterate on adapter prompt
- Add 5-10 examples of nuanced translations
- Try chaining: emotion → poetic description → art commands
- Consider fine-tuning if prompt engineering plateaus

---

## Resources

**APIs**:
- OpenAI: https://platform.openai.com/docs
- xAI (Grok): https://x.ai/api
- ChromaDB: https://docs.trychroma.com/

**Tools**:
- LangSmith: https://smith.langchain.com/ (prompt debugging)
- LangGraph: https://langchain-ai.github.io/langgraph/

**Inspiration**:
- Russell's dimensional model of affect (valence/arousal)
- Color theory resources for art adapter
- Examples of poetic AI (use ChatGPT/Claude for ideas)

---

**Remember**: This is an art experiment. Technical success is easy; creative resonance is the real achievement. Trust your intuition about what feels "alive." Good luck! 🚀

