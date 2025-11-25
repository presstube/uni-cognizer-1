# Audio Percept Editor: Buffer Size Clarification

**Date**: 2025-11-24

## Issue
The audio-percept prompt editor had a misleading UI label that said "Sample Rate" when it actually controls the **ScriptProcessor buffer size**.

## Confusion
- **Field name in DB**: `sample_rate` (historical naming)
- **Actual purpose**: Controls the buffer size for ScriptProcessorNode
- **UI label**: Said "Sample Rate" (wrong - implies Hz like 16000, 44100, etc.)
- **Actual values**: 512, 1024, 2048, 4096, 8192 (these are buffer sizes in samples, not Hz)

## Fix Implemented (Option 2)

### Changed Files

#### 1. `/web/prompt-editor/audio-percept/index.html`
**Before:**
```html
<label>Sample Rate</label>
```

**After:**
```html
<label>Buffer Size (samples)</label>
```

#### 2. `/web/prompt-editor/audio-percept/editor.js`
**Added clarifying comments:**
```javascript
// Note: sample_rate is actually the ScriptProcessor buffer size, not AudioContext sample rate
// Note: Despite field name "sample_rate", this is the ScriptProcessor buffer size (samples)
// AudioContext always uses 16kHz (required by Gemini Live API)
```

### Why Option 2 (Not a Full Rename)

✅ **No migration needed** - existing data works  
✅ **No breaking changes** - code still references `sample_rate`  
✅ **Clear to users** - UI now says what it actually is  
✅ **Easy fix** - just update the label text  
✅ **DB comment already correct** - just UI was wrong  

## Technical Clarification

### Two Different Concepts

**AudioContext Sample Rate** (always 16000Hz):
- Actual audio sampling frequency
- How many samples per second
- Must be 16000Hz for Gemini Live API
- Set when creating AudioContext: `new AudioContext({ sampleRate: 16000 })`

**ScriptProcessor Buffer Size** (512/1024/4096/8192):
- How many samples to process at once
- Larger = more efficient, less CPU, higher latency
- Smaller = smoother updates, more CPU, lower latency
- Set when creating processor: `createScriptProcessor(4096, 1, 1)`

### Current Understanding

```javascript
// CORRECT:
const audioContext = new AudioContext({ sampleRate: 16000 });  // Always 16kHz
const bufferSize = prompt.sample_rate;  // Actually buffer size: 512, 4096, etc.
const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);

// WRONG (what perceptor-remote initially did):
const audioContext = new AudioContext({ sampleRate: 512 });  // ERROR! 512Hz is too low
```

## Impact

### Before Fix
- Users saw "Sample Rate: 512" and might think audio is sampled at 512Hz
- Code confused buffer size with sample rate
- Perceptor-remote crashed trying to use 512Hz

### After Fix
- Users see "Buffer Size: 512 samples"
- Code has clarifying comments
- Perceptor-remote correctly uses 16000Hz + buffer size from DB
- No data migration needed

## Related Files Updated

1. `/web/prompt-editor/audio-percept/index.html` - UI label
2. `/web/prompt-editor/audio-percept/editor.js` - Comments
3. `/web/perceptor-remote/app.js` - Already fixed to use correct values
4. `/web/perceptor-remote/implementation-notes.md` - Documented fix

## Testing

After this fix:
1. Open `/prompt-editor/audio-percept`
2. UI now shows "Buffer Size (samples)" instead of "Sample Rate"
3. Dropdown still has same values (512, 1024, 4096, etc.)
4. Saving/loading prompts works identically
5. Perceptor-remote correctly interprets the value as buffer size

## Status

✅ **Complete** - UI clarified, comments added, no breaking changes


