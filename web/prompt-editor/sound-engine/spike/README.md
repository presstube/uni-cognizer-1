# UNI Audio Instrument - Spike

Minimal viable spike to validate LLM-based audio selection system.

## Overview

This spike tests whether an LLM can:
1. Read a creative writing paragraph
2. Select appropriate music/texture samples from CSVs
3. Choose bass/melody parameters
4. Follow scale dependency constraints

## Files

- **generator.js** - Loads specs/CSVs, constructs prompt, calls LLM
- **validator.js** - Parses output, validates constraints
- **test.js** - CLI test runner with predefined test cases

## Quick Start

```bash
# Test with default case (melancholic)
node test.js

# Test with specific case
node test.js --test-case energetic

# Run all test cases
node test.js --all

# Test with custom paragraph
node test.js "Your creative writing here..."

# Adjust temperature
node test.js --temperature 0.3 --test-case contemplative
```

## Test Cases

**melancholic** - Sad, calm, sparse
```
"The old lighthouse stood silent against the storm..."
```

**energetic** - Upbeat, dense, intense
```
"The city buzzed with electric energy..."
```

**contemplative** - Natural, suspended, waiting
```
"Morning mist settled over the lake..."
```

**technological** - Digital, abstract, precise
```
"Data streams flowed through invisible channels..."
```

## Expected Outputs

Each test should produce:
- ✅ All 11 fields present
- ✅ Valid music/texture filenames
- ✅ Valid bass_preset name
- ✅ All numeric values 0.0-1.0
- ✅ Scale constraint satisfied (CRITICAL)

### Scale Constraint

The **most important** validation:
- If music sample is **major** → bass_scale and melody_scale must be **≥0.5**
- If music sample is **minor** → bass_scale and melody_scale must be **<0.5**

This ensures harmonic coherence between the music loop and synthesizers.

## Success Criteria

✅ **Spike is successful if:**
- 80%+ test cases pass validation
- Scale constraints are followed 100%
- Selections feel emotionally appropriate
- Generation takes <3 seconds
- Easy to iterate and test

## Configuration

Uses existing `.env` configuration:
```bash
LLM_PROVIDER=gemini  # or openai, anthropic
GEMINI_API_KEY=your_key
```

Automatically uses configured provider via `src/providers/`.

## Architecture

Follows project best practices:
- ✅ Functional programming (pure functions)
- ✅ Small files (<80 LOC)
- ✅ Vanilla JS (ES6 modules)
- ✅ Immutable state
- ✅ Reuses existing infrastructure

## Example Output

```
================================================================================
🎵 UNI Audio Instrument - Test
================================================================================

Input paragraph:
"Morning mist settled over the lake. A lone bird called out..."

--------------------------------------------------------------------------------
⏳ Generating selections...
✅ Generated in 1247ms

Raw LLM output:
music_filename: music_sample_6
texture_filename: texture_sample_5
bass_preset: bass_lfo_filter
bass_speed: 0.35
bass_stability: 0.45
bass_coloration: 0.3
bass_scale: 0.25
melody_speed: 0.4
melody_stability: 0.5
melody_coloration: 0.35
melody_scale: 0.3

================================================================================
✅ VALIDATION PASSED
================================================================================

Music & Texture:
  music_filename:   music_sample_6
  texture_filename: texture_sample_5

Bass Configuration:
  bass_preset:      bass_lfo_filter
  bass_speed:       0.35
  bass_stability:   0.45
  bass_coloration:  0.3
  bass_scale:       0.25

Melody Configuration:
  melody_speed:       0.4
  melody_stability:   0.5
  melody_coloration:  0.35
  melody_scale:       0.3

Selected Music Sample:
  Description: Mellow but inquisitive feel. Long dusty crushed chord flourishes.
  Tone: cool, Density: sparse, Mood: soothing
  Scale: minor, Rhythm: arhythmic

Selected Texture Sample:
  Description: Slightly abstracted nature. Birds and insects oddly filtered with reverb.
  Category: Nature, Tone: neutral
```

## Troubleshooting

**Import errors:**
```
Error: Cannot find module 'src/providers/index.js'
```
Solution: Make sure you're running from project root or adjust paths.

**API errors:**
```
Error: GEMINI_API_KEY not found
```
Solution: Check `.env` file has correct provider and API key.

**Validation failures:**
- Check LLM output format matches specification
- Ensure scale constraint is explained clearly in prompt
- Try adjusting temperature (0.3 = more consistent, 0.7 = more creative)

## Next Steps

After successful spike validation:

1. **Batch testing** - Test with 50+ paragraphs from database
2. **Result storage** - Save test runs for analysis
3. **Model comparison** - Compare GPT-4o vs Claude vs Gemini
4. **Web UI** - Build simple web interface (optional)
5. **Integration** - Connect to consciousness loop

## Questions to Answer

- Which LLM provider performs best?
- Does temperature affect success rate?
- Are selections emotionally coherent?
- Do scale constraints work reliably?
- What edge cases exist?

## License

MIT
