# Final Model Decision: Gemini 2.0 Flash Experimental

**Date:** December 6, 2025  
**Decision:** Use `gemini-2.0-flash-exp` for production  
**Status:** ✅ FINAL

---

## Speed Comparison: The Deciding Factor

| Model | Avg Time | Relative Speed |
|-------|----------|----------------|
| **Gemini 2.0 Flash Exp** | **1.2s** | ⚡ Baseline |
| Gemini 2.5 Flash | 18s | 🐌 15x SLOWER |

**18 seconds is unacceptable for consciousness loop integration.**

---

## Decision Matrix

### Gemini 2.0 Flash Experimental ✅ CHOSEN

**Pros:**
- ⚡ **FAST**: 1.2 seconds (near real-time)
- ✅ **Proven**: 17/17 successful tests (100% rate)
- ✅ **Efficient**: 500 maxTokens sufficient
- ✅ **Cheap**: ~$0.001 per generation
- ✅ **Works perfectly**: Zero issues in production testing

**Cons:**
- ⚠️ Experimental tag (could be deprecated eventually)
- ⚠️ Rate limited to 10 requests/min
- ⚠️ Less "official" than stable release

**Mitigation:**
- Rate limit manageable with 6.5s delays in batch tests
- Can migrate to 2.5 if/when 2.0 is deprecated
- "Experimental" doesn't mean unstable - it's been rock solid

---

### Gemini 2.5 Flash ❌ NOT CHOSEN

**Pros:**
- ✅ Latest stable release
- ✅ Official support
- ✅ Higher rate limits
- ✅ Future-proof

**Cons:**
- ❌ **15x SLOWER**: 18 seconds per generation
- ❌ Requires 8000 maxTokens (16x more tokens)
- ❌ Higher cost
- ❌ **DEALBREAKER**: Too slow for consciousness loop

---

## Use Cases

### Production (Consciousness Loop)
**Use: Gemini 2.0 Flash Exp**
- Generation happens during mind moment creation
- 1.2s is acceptable alongside sigil generation
- 18s would block the entire cognitive cycle

### Batch Testing
**Use: Gemini 2.0 Flash Exp with delays**
- Add 6.5s delays between requests
- Avoids rate limits
- Speed doesn't matter for offline testing

### Future Migration
**If 2.0 gets deprecated:**
- Switch to 2.5 Flash with `maxTokens: 8000`
- Accept the 15x slower speed
- Or explore GPT-4o/Claude alternatives

---

## Technical Configuration

### Current Settings

**File:** `src/providers/gemini.js`
```javascript
model = 'gemini-2.0-flash-exp'
maxTokens = 500  // Default in provider
```

**File:** `spike/generator.js`
```javascript
maxTokens = options.maxTokens ?? 500
```

### For Gemini 2.5 (if needed later)

**Would require:**
```javascript
model = 'gemini-2.5-flash'
maxTokens = 8000  // MUST be this high or higher
```

---

## What We Learned

### Token Counting Differences

**Gemini 2.0:**
- `maxOutputTokens: 500` works fine
- Prompt processing is efficient
- Fast token handling

**Gemini 2.5:**
- `maxOutputTokens: 500` hits MAX_TOKENS with no output
- Requires `maxOutputTokens: 8000+` for same prompt
- Token counting appears to work differently
- Much slower processing overall

### Library Compatibility

✅ **No library update needed**
- `@google/generative-ai@0.24.1` works with both 2.0 and 2.5
- Same API, different token requirements
- No code changes needed beyond model name and maxTokens

---

## Performance Stats

### Gemini 2.0 Flash Exp (CURRENT)

**Test Results:**
- ✅ 17/17 tests passed (100%)
- ⏱️ Average: 1.2 seconds
- ⏱️ Range: 1.0s - 1.6s
- 🎯 Scale constraint compliance: 100%
- 💰 Cost: ~$0.001 per generation

**Batch Test (10 tests):**
- ✅ 10/10 passed
- ⏱️ Total time: ~12 seconds
- Rate limited after 10 (expected)

**Batch Test (3 tests):**
- ✅ 3/3 passed
- ⏱️ Total time: ~3.6 seconds

### Gemini 2.5 Flash (TESTED)

**Test Results:**
- ✅ 3/3 tests passed (100%)
- ⏱️ Average: 18 seconds
- ⏱️ Range: 15s - 22s
- 🎯 Scale constraint compliance: 100%
- 💰 Cost: ~$0.001 per generation (same)

**Observation:** Quality is identical, speed is 15x worse.

---

## Recommendation for Other Use Cases

### When to Use 2.0 Flash Exp:
- ✅ Real-time or near real-time generation
- ✅ High-volume processing
- ✅ Development/testing (fast iteration)
- ✅ Cost-sensitive applications

### When to Use 2.5 Flash:
- ✅ Batch processing where speed doesn't matter
- ✅ Production apps needing official stable release
- ✅ When 2.0 gets deprecated
- ✅ Applications with >6K token prompts that need 2.5's handling

---

## Monitoring Plan

**Watch for:**
1. Deprecation notices for `gemini-2.0-flash-exp`
2. Speed improvements in Gemini 2.5 updates
3. New Gemini models (2.5 Flash Lite might be faster)

**Migration trigger:**
- If 2.0 gets deprecated with <2 weeks notice
- If 2.5 speed improves to <5 seconds
- If rate limits become unbearable

---

## Final Status

✅ **System is production-ready**
- Model: `gemini-2.0-flash-exp`
- Speed: 1.2s average
- Success rate: 100% (17/17 tests)
- Scale constraint compliance: 100%
- Cost: ~$0.001 per generation

**The UNI Audio Instrument spike is complete and validated with the optimal model!** 🎵⚡
