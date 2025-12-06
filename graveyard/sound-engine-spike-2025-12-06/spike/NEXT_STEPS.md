# Next Steps for UNI Audio Instrument

Based on spike test results (75% success rate), here's the roadmap:

---

## 🔧 Immediate Fixes Needed

### 1. Fix CSV Parsing Issue

The validator has trouble with commas inside quoted CSV fields. Fix the `parseCSV` function:

```javascript
// Better CSV parser that handles quoted fields
export function parseCSV(csvString) {
  const lines = csvString.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  return lines.slice(1).map(line => {
    // Use regex to handle quoted fields with commas
    const values = [];
    let currentValue = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim()); // Last value
    
    return headers.reduce((obj, header, i) => {
      obj[header] = values[i]?.replace(/^"|"$/g, '');
      return obj;
    }, {});
  });
}
```

### 2. Strengthen Scale Constraint in Specification

Add to the top of `UNI_Audio_Instrument_Specification.md`:

```markdown
## ⚠️ CRITICAL RULE: Scale Dependencies

This is the MOST IMPORTANT constraint you must follow:

1. First, select a `music_filename`
2. Look at its `scale` column (major or minor)
3. Then set `bass_scale` and `melody_scale` based on this rule:

**If music_sample scale = "minor":**
- bass_scale MUST be 0.00 to 0.49
- melody_scale MUST be 0.00 to 0.49

**If music_sample scale = "major":**
- bass_scale MUST be 0.50 to 1.00
- melody_scale MUST be 0.50 to 1.00

Example:
- music_sample_20 has scale="minor"
- Therefore: bass_scale=0.3 ✅ melody_scale=0.2 ✅
- WRONG: bass_scale=0.7 ❌ melody_scale=0.6 ❌
```

---

## 🧪 Testing Improvements

### Test Different Temperatures

```bash
# More consistent (better for scale compliance?)
node spike/test.js --temperature 0.3 --test-case contemplative

# More creative (better emotional matching?)
node spike/test.js --temperature 0.9 --test-case energetic
```

### Batch Testing

Create `spike/batch-test.js`:
- Load 20-50 paragraphs from `data/mind-moments.json`
- Test each one
- Generate statistics:
  - Overall success rate
  - Scale constraint compliance rate
  - Most selected samples
  - Parameter distributions

---

## 🔬 Model Comparison

Test all three providers to find the best one:

```bash
# Test with Gemini (current)
LLM_PROVIDER=gemini node spike/test.js --all

# Test with GPT-4o
LLM_PROVIDER=openai node spike/test.js --all

# Test with Claude
LLM_PROVIDER=anthropic node spike/test.js --all
```

Compare:
- Success rate (scale constraint compliance)
- Generation speed
- Cost per generation
- Creative quality

---

## 💡 Prompt Engineering Options

If scale violations persist (>25%), try:

### Option A: Two-Step Generation

1. First prompt: Select music/texture only
2. Second prompt: Given the selected music's scale, set bass/melody parameters

### Option B: Add Validation Step to Prompt

```
After generating selections, verify:
1. Check the selected music_sample's scale
2. Confirm bass_scale and melody_scale match the rule
3. If not, adjust them before outputting
```

### Option C: Few-Shot Examples

Add examples to the specification showing correct scale matching:

```
Example 1:
Input: "Sad and contemplative..."
Selected: music_sample_6 (scale=minor)
Therefore: bass_scale=0.25 (minor), melody_scale=0.3 (minor) ✅

Example 2:
Input: "Upbeat and joyful..."
Selected: music_sample_10 (scale=major)
Therefore: bass_scale=0.75 (major), melody_scale=0.8 (major) ✅
```

---

## 🎯 Success Metrics (Target)

Before production integration:

- ✅ Scale constraint compliance: **95%+** (currently 75%)
- ✅ Format compliance: **100%** (already achieved)
- ✅ Generation speed: **<2s** (already achieved ~1.2s)
- ✅ Emotional coherence: **Subjectively strong** (already good)
- ✅ Sample diversity: Use all bass presets, not just one

---

## 🚀 Integration Path

Once spike is refined:

1. **Add to consciousness loop**
   - Generate audio selections alongside sigil
   - Store in database with mind moments

2. **Create audio API endpoints**
   - GET `/api/sigils/:id/audio` - Return audio selections
   - Store alongside sigil data

3. **Database schema**
   ```sql
   ALTER TABLE mind_moments ADD COLUMN audio_selections JSONB;
   ```

4. **Build audio playback (future)**
   - Web Audio API implementation
   - Load actual sample files
   - Implement bass/melody synthesis
   - Real-time parameter control

---

## 📊 Current Status

**Spike Phase:** ✅ COMPLETE

**Findings:**
- System works end-to-end
- LLM makes sensible creative choices
- Main issue: Scale constraint needs emphasis
- CSV parsing needs fix
- Generation speed excellent

**Confidence Level:** HIGH - Ready to refine and integrate

**Estimated Time to Production:**
- Fix CSV parsing: 30 minutes
- Strengthen specification: 30 minutes
- Batch testing: 1-2 hours
- Model comparison: 2 hours
- Integration: 3-4 hours

**Total:** ~1 day of work to production-ready

---

## 🎵 The Big Picture

This system will enable UNI to:
- Express internal states through sound
- Generate unique 15-second "Sigil Sounds" for each mind moment
- Create ambient soundscapes that reflect cognitive/emotional state
- Provide multi-sensory feedback (visual sigil + audio sigil)

**Next milestone:** 95% scale compliance with batch testing
