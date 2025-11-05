# Fake Land Plan

## Purpose
Isolate and prove the core timing architecture for percept-to-cognition-to-response flow before integrating real LLM calls.

## Architecture

### Three Modules

**1. `fake-percepts.js`**
- Generates mock visual percepts every 3 seconds
- Generates mock audio percepts every 7-10 seconds (random)
- Stores percepts in internal queues with timestamps
- API: `dumpPercepts()` → returns `{visualPercepts[], audioPercepts[]}` and clears queues

**2. `fake-cog.js`**
- Manages cognitive cycle index internally (auto-increments)
- Stores cognitive history: `cognitiveHistory[cycleIndex]`
- API: `cognize(visualPercepts, audioPercepts)`
- Simulates LLM call with 6-8 second latency
- When response arrives, associates emotional plan with correct cycle via closure
- Logs send/receive with timestamps

**3. `main.js`**
- Simple orchestrator
- Every 5 seconds: dump percepts → send to cognize
- That's it

## Key Insight
The 6-8 second LLM latency means responses arrive AFTER the next cycle has started. This architecture ensures each response is correctly associated with its original input percepts via:
1. Snapshot & clear pattern in orchestrator
2. Closure capture of cycle index in fakeCog

## What This Proves
- Percepts arriving during LLM processing don't contaminate the current cycle
- Responses correctly associate with their input percepts
- Timing is clean and auditable via timestamps
- Architecture scales to real LLM calls

## Timeline
- **Phase 1**: Implement fake-percepts, fake-cog, main (30 min)
- **Phase 2**: Run and verify timing behavior (10 min)
- **Phase 3**: Swap fake-cog for real cognitive-core (15 min)

## Success Criteria
- Percepts flow continuously with timestamps
- Cognitive cycles process correct percept snapshots
- Responses associate with correct input percepts
- No timing drift or contamination between cycles

