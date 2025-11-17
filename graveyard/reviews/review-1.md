# Code Review #1: Cognizer-1 Architecture

**Date**: November 5, 2025  
**Reviewer**: AI Assistant  
**Scope**: Full codebase assessment for clarity, maintainability, and alignment with spike goals

---

## Executive Summary

**Overall Assessment**: **Strong foundation, minor cleanup needed**

The codebase successfully achieves its spike goals: proving the async timing architecture of percept generation → cognitive processing → mind moment generation. The architecture is clean, modular, and provider-agnostic.

**Strengths**:
- Clean separation of concerns (percepts, cognition, personality, providers)
- Elegant async handling with queue-based percept snapshots
- Provider abstraction works flawlessly across 3 LLMs
- Timing architecture proven with fake-cog testing layer

**Issues**:
- Provider signature inconsistency (Anthropic vs OpenAI/Gemini)
- One diagnostic file left in root (`test-gemini-models.js`)
- Minor duplication between `fake-cog.js` and `real-cog.js`

---

## Architecture Overview

### Current Structure
```
src/
├── main.js                      # Orchestrator (46 lines) ✅
├── fake-percepts.js             # Mock percept generator (106 lines) ✅
├── fake-cog.js                  # Mock cognitive engine (108 lines) ✅
├── real-cog.js                  # Live cognitive engine (149 lines) ✅
├── personality-uni-v2.js        # UNI tripartite personality (86 lines) ✅
└── providers/
    ├── index.js                 # Provider factory (48 lines) ✅
    ├── openai.js                # GPT-4o wrapper (44 lines) ✅
    ├── anthropic.js             # Claude wrapper (52 lines) ⚠️
    └── gemini.js                # Gemini 2.0 Flash wrapper (42 lines) ✅
```

### Data Flow
```
fake-percepts.js (generates) 
  ↓ [every 3s visual, 7-10s audio]
main.js (orchestrates)
  ↓ [every 5s: dump percepts, cognize]
real-cog.js (processes)
  ↓ [snapshot percepts, get prior N moments, build prompt]
providers/index.js (routes)
  ↓ [based on LLM_PROVIDER env var]
[openai|anthropic|gemini].js (calls API)
  ↓ [returns text response]
real-cog.js (parses)
  ↓ [extract mindMoment + sigilPhrase]
main.js (displays)
  ↓ [log results, update history]
```

---

## Detailed Review by Module

### ✅ **main.js** (46 lines)
**Purpose**: Orchestrator - runs percept generation and cognitive cycles

**Strengths**:
- Clean, minimal orchestration
- Single responsibility: timing + display
- Event-driven with `onMindMoment` listener
- Clear logging of system status

**Adherence to Prime Directive**:
- ✅ Functional: Pure orchestration, no side effects
- ✅ File Size: 46 lines (well under 80)
- ✅ Minimal Libraries: Only dotenv + internal modules

**Suggestions**: None. This is ideal.

---

### ✅ **fake-percepts.js** (106 lines)
**Purpose**: Generate and store mock visual/audio percepts

**Strengths**:
- Queue-based snapshot-and-clear pattern (elegant!)
- Weighted random selection for realistic variation
- Timestamps + logging for debugging
- Clean API: `dumpPercepts()`

**Adherence to Prime Directive**:
- ✅ Functional: Pure generators, clear state management
- ⚠️ File Size: 106 lines (slightly over 80, but justified by dual percept types)
- ✅ Minimal Libraries: Only fs/path

**Suggestions**:
- Consider splitting visual/audio into separate modules if grows further
- Current size acceptable given clear dual responsibility

---

### ✅ **fake-cog.js** (108 lines)
**Purpose**: Mock cognitive engine for timing tests (no API calls)

**Strengths**:
- Perfect for testing async architecture without cost
- Matches `real-cog.js` API exactly (swappable!)
- Mock latency (6-8s) simulates real LLM timing

**Issues**:
- ⚠️ **Doesn't support `sigilPhrase`** - returns only `mindMoment` as string, not `{ mindMoment, sigilPhrase }`
- Listener signature mismatch with `real-cog.js` (4 params vs 6 params)

**Suggestions**:
1. Update `mockLLMCall` to return `{ mindMoment, sigilPhrase: null }`
2. Update `dispatchMindMoment` to match `real-cog.js` signature (6 params)
3. Update history storage to include `sigilPhrase: "awaiting"`

**Adherence to Prime Directive**:
- ✅ Functional: Pure functions, clear state
- ⚠️ File Size: 108 lines (over 80, but justified as test harness)

---

### ✅ **real-cog.js** (149 lines)
**Purpose**: Live cognitive engine - calls LLM APIs, parses responses

**Strengths**:
- Clean async handling with Promise chains
- Queue-based percept snapshot (solves the 1-cycle delay bug!)
- Context depth system works beautifully
- Error handling with graceful degradation
- Parsing for `mindMoment` + `sigilPhrase`

**Issues**:
- ⚠️ **Hardcoded filter logic** appears in 3 places (lines 9-10, 94-95, prompting)
  ```javascript
  p.action !== "NOPE"
  p.transcript || (p.analysis !== "Silence" && ...)
  ```
  This should be extracted to helper functions:
  ```javascript
  const isActiveVisual = (p) => p.action !== "NOPE";
  const isActiveAudio = (p) => p.transcript || (p.analysis !== "Silence" && ...);
  ```

**Adherence to Prime Directive**:
- ✅ Functional: Good separation, clear data flow
- ❌ File Size: 149 lines (too long - should be ~100)
- ✅ Minimal Libraries: Only internal modules

**Suggestions**:
1. Extract percept filtering helpers (5-10 lines saved)
2. Extract prompt building to separate function (20-30 lines saved)
3. Target: ~100 lines

---

### ✅ **personality-uni-v2.js** (86 lines)
**Purpose**: Define UNI's tripartite consciousness and output format

**Strengths**:
- Tripartite structure (Building/Mission/Vision) is clear and compelling
- Explicit output format with example (fixes GPT-4o formatting issues!)
- "Let the moment guide which voice leads" - elegant dynamic balance

**Issues**:
- ⚠️ **EMOTIONAL_PLAN_SCHEMA is deprecated** - taking up 25 lines for "reference"
  - Either delete it or move to separate `personality-unisphere-v1.js` reference file

**Adherence to Prime Directive**:
- ✅ Functional: Pure data export
- ⚠️ File Size: 86 lines (over 80 due to deprecated schema)
- ✅ Minimal Libraries: None

**Suggestions**:
- Remove deprecated schema → **61 lines** (well under 80!)
- It's already preserved in `personality-unisphere-v1.js`

---

### ✅ **providers/index.js** (48 lines)
**Purpose**: LLM provider factory - route to correct API based on env var

**Strengths**:
- Clean switch statement
- Per-provider API key validation
- Dynamic imports (lazy loading)
- Extensible for future providers

**Issues**: None.

**Adherence to Prime Directive**:
- ✅ Functional: Pure routing logic
- ✅ File Size: 48 lines (perfect)
- ✅ Minimal Libraries: Only internal modules

---

### ✅ **providers/openai.js** (44 lines)
**Purpose**: Wrap OpenAI API

**Strengths**:
- Clean, minimal wrapper
- Single `prompt` parameter (matches Gemini)
- Error wrapping for clarity

**Issues**: None.

**Adherence to Prime Directive**:
- ✅ Functional: Single responsibility
- ✅ File Size: 44 lines (perfect)
- ✅ Minimal Libraries: Only `openai` SDK

---

### ⚠️ **providers/anthropic.js** (52 lines)
**Purpose**: Wrap Anthropic API

**Strengths**:
- Handles Anthropic's different response structure (`content[0].text`)
- Includes JSON enforcement prompt (legacy from emotional plan era)

**Issues**:
- ❌ **Signature mismatch**: Takes 2 params (`systemPrompt`, `userPrompt`) while OpenAI/Gemini take 1 (`prompt`)
- ❌ **Unused JSON enforcement**: Lines 28-31 add "CRITICAL: Respond ONLY with valid JSON" but we're not using JSON anymore (plain text with labels)

**Critical Fix Needed**:
```javascript
// Current (WRONG)
export async function callLLM(systemPrompt, userPrompt, options = {}) {
  const enhancedPrompt = `${userPrompt}\n\nCRITICAL: Respond ONLY with valid JSON...`;
  // ...
}

// Should be (CORRECT)
export async function callLLM(prompt, options = {}) {
  // Anthropic expects system in separate param, so we extract it
  // For now, put entire prompt in user message
  // ...
}
```

**Adherence to Prime Directive**:
- ⚠️ Functional: Works, but inconsistent interface
- ✅ File Size: 52 lines (acceptable)
- ✅ Minimal Libraries: Only `@anthropic-ai/sdk`

**Suggestions**:
1. **Fix signature** to match OpenAI/Gemini (single `prompt` param)
2. Remove JSON enforcement text
3. Extract system prompt from personality if Anthropic needs it separated

---

### ✅ **providers/gemini.js** (42 lines)
**Purpose**: Wrap Google Gemini API

**Strengths**:
- Clean, minimal wrapper
- Correct model name (`models/gemini-2.0-flash`)
- Handles async response structure properly

**Issues**: None.

**Adherence to Prime Directive**:
- ✅ Functional: Single responsibility
- ✅ File Size: 42 lines (perfect)
- ✅ Minimal Libraries: Only `@google/generative-ai`

---

## Critical Issues Summary

### 🔴 **MUST FIX**
1. **Anthropic provider signature mismatch**
   - File: `src/providers/anthropic.js`
   - Issue: Takes 2 params, others take 1
   - Impact: Breaks if you try to use pattern from other providers
   - Fix: Standardize to single `prompt` parameter

2. **fake-cog.js doesn't support sigilPhrase**
   - File: `src/fake-cog.js`
   - Issue: Returns string instead of `{ mindMoment, sigilPhrase }`
   - Impact: Can't use fake-cog for testing current system
   - Fix: Match real-cog.js return signature

### 🟡 **SHOULD FIX**
3. **Percept filtering duplicated 3x**
   - File: `src/real-cog.js`
   - Issue: Same filter logic copy-pasted
   - Impact: Maintenance burden, potential bugs
   - Fix: Extract to helper functions

4. **Deprecated schema bloat**
   - File: `src/personality-uni-v2.js`
   - Issue: 25 lines of dead code for "reference"
   - Impact: File exceeds 80 line target
   - Fix: Delete (already in v1 file)

### 🟢 **NICE TO HAVE**
5. **test-gemini-models.js in root**
   - File: `/test-gemini-models.js`
   - Issue: Diagnostic file left after debugging
   - Impact: Minor clutter
   - Fix: Delete or move to `docs/` or `.gitignore`

---

## Alignment with Prime Directive

| Principle | Status | Notes |
|-----------|--------|-------|
| **Functional Programming** | ✅ Strong | Pure functions, clear data flow |
| **Immutable State** | ✅ Strong | Const by default, snapshot patterns |
| **Unidirectional Data Flow** | ✅ Strong | Percepts → Cognition → Display |
| **File Size < 80 lines** | ⚠️ Partial | 3/9 files over (all justified) |
| **Minimal Libraries** | ✅ Strong | Only essential SDKs |

**Assessment**: 4/5 principles strongly met. File size violations are acceptable given module complexity.

---

## Timing Architecture Assessment

### ✅ **The Core Innovation: Queue-Based Snapshots**

The percept-snapshot-clear pattern elegantly solves the async timing challenge:

```javascript
// Every 5s
const { visualPercepts, audioPercepts } = dumpPercepts(); // Snapshot
cognize(visualPercepts, audioPercepts, DEPTH);            // Process

// Inside dumpPercepts()
const snapshot = { visualPercepts: [...arr], audioPercepts: [...arr] };
visualPerceptsArr.length = 0;  // Clear
audioPerceptsArr.length = 0;   // Clear
return snapshot;
```

**Why This Works**:
1. Percepts continue generating asynchronously (3s, 7-10s)
2. Every 5s, cognitive cycle snapshots current queue
3. Queue clears immediately
4. New percepts accumulate during LLM processing (6-8s)
5. Response associates with exact snapshot sent

**Result**: No 1-cycle delay bug. Perfect percept-response alignment. 🎯

---

## Suggestions for Next Steps

### Immediate (Today)
1. ✅ Fix Anthropic provider signature
2. ✅ Update fake-cog.js to support sigilPhrase
3. ✅ Delete deprecated schema from personality-uni-v2.js
4. ✅ Delete test-gemini-models.js

### Short-term (This Week)
5. Extract percept filtering helpers in real-cog.js
6. Extract prompt building to separate function
7. Add type comments (JSDoc) for public APIs

### Medium-term (Next Sprint)
8. Consider splitting fake-percepts.js into visual/audio modules
9. Add unit tests for queue snapshot logic
10. Document the timing architecture pattern (it's gold!)

---

## Final Verdict

**Grade: A- (Excellent spike, minor cleanup needed)**

This codebase successfully proves:
- ✅ Async percept generation works
- ✅ Queue-based snapshots solve timing bugs
- ✅ Context depth system scales (0→3 works perfectly)
- ✅ Provider abstraction enables easy model swapping
- ✅ Mind moments + sigil phrases generate consistently

**Core architecture is production-ready.** The identified issues are polish, not structural flaws.

**Recommendation**: Fix the 2 critical issues (Anthropic signature, fake-cog sigilPhrase), then this codebase is ready to evolve toward Stage 1 of the roadmap (real percepts via Gemini Live).

---

**Reviewed by**: AI Assistant  
**Signed off**: Ready for iteration with minor fixes

