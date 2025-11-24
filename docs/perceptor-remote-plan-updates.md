# Perceptor-Remote Plan Updates

**Date**: 2025-11-24

## Summary of Changes

Updated the perceptor-remote implementation plan to use **fully dynamic DB settings** instead of hardcoded values.

---

## Key Changes

### 1. Dynamic Sample Rate
**Before**: Hardcoded to 16000Hz
**After**: Loaded from `state.audioPrompt.prompt.sample_rate`

```javascript
// Extract from DB
const sampleRate = state.audioPrompt.prompt.sample_rate || 16000;

// Used in getUserMedia
audio: {
  sampleRate: sampleRate  // From DB
}

// Used in AudioContext
state.audioContext = new AudioContext({ sampleRate: sampleRate });
```

### 2. Dynamic Buffer Size
**Before**: Hardcoded to 4096
**After**: Loaded from `state.audioPrompt.prompt.sample_rate` field

```javascript
const bufferSize = state.audioPrompt.prompt.sample_rate || 4096;
const processor = state.audioContext.createScriptProcessor(bufferSize, 1, 1);
```

### 3. Dynamic Audio Packet Calculations
**Before**: Hardcoded MIN_SAMPLES = 8000, MAX_SAMPLES = 32000
**After**: Calculated based on actual sample rate

```javascript
const MIN_SAMPLES = Math.floor(sampleRate * 0.5); // 0.5s worth
const MAX_SAMPLES = Math.floor(sampleRate * 2.0); // 2.0s worth
```

### 4. Dynamic MIME Type
**Before**: Hardcoded `audio/pcm;rate=16000`
**After**: Uses actual sample rate

```javascript
mimeType: `audio/pcm;rate=${sampleRate}`
```

### 5. Visual User Prompt
**Before**: Mentioned but not explicit in code
**After**: Clearly shown in visual streaming code

```javascript
{
  text: state.visualPrompt.prompt.user_prompt  // From DB
}
```

---

## DB Settings Now Used

### Audio Prompt (all fields)
✅ `system_prompt` - System instruction for Gemini
✅ `sample_rate` - AudioContext and getUserMedia sample rate
✅ `sample_rate` - Also used for ScriptProcessor buffer size
✅ `packet_interval` - Interval between audio packet sends
✅ `temperature` - Generation config
✅ `top_p` - Generation config
✅ `top_k` - Generation config
✅ `max_output_tokens` - Generation config

### Visual Prompt
✅ `user_prompt` - Sent with each image frame
❌ `system_prompt` - Not used (audio's system prompt used for entire session)
❌ Generation config - Not used (audio's config used for entire session)

---

## Benefits

1. **Flexibility**: Change audio behavior by updating DB, no code changes
2. **Testing**: Easy to test different sample rates and intervals
3. **Optimization**: Can tune performance per-deployment
4. **Correctness**: MIN/MAX samples now accurate for any sample rate

---

## Example Configurations

### High Quality, Fast Response (Current Active)
```
sample_rate: 512
buffer_size: 512 (same value used)
packet_interval: 500ms
temperature: 0.0 (deterministic)
```

### Efficient, Lower CPU
```
sample_rate: 4096
buffer_size: 4096
packet_interval: 2000ms
temperature: 0.8
```

---

## Migration Notes

No migration needed - changes are in the plan only, not yet implemented.

When implementing, ensure:
1. DB prompt loaded BEFORE audio initialization
2. Sample rate passed to all audio functions
3. Buffer calculations use actual sample rate
4. MIME type includes correct rate

---

## Testing Checklist

When implementing, verify:
- [ ] Different sample rates work (512, 1024, 4096, 16000)
- [ ] Buffer sizes match sample rates
- [ ] Audio packets have correct duration
- [ ] MIME type reflects actual sample rate
- [ ] Visual user prompt appears in requests
- [ ] Changes to DB prompt reflect immediately on restart

---

**Status**: Plan updated, ready for implementation ✅

