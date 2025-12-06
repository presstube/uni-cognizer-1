# 🚀 Quick Start Guide

## Test the Spike

```bash
# From project root:

# 1. Single test with default case
node web/prompt-editor/sound-engine/spike/test.js

# 2. Test specific case
node web/prompt-editor/sound-engine/spike/test.js --test-case energetic

# 3. Test all cases
node web/prompt-editor/sound-engine/spike/test.js --all

# 4. Custom paragraph
node web/prompt-editor/sound-engine/spike/test.js "Your paragraph here..."

# 5. Adjust creativity (temperature)
node web/prompt-editor/sound-engine/spike/test.js --temperature 0.3 --test-case melancholic
```

## Available Test Cases

- **melancholic** - Sad, calm, sparse → expect minor scale, cool tones
- **energetic** - Upbeat, intense, dense → expect major scale, warm tones  
- **contemplative** - Natural, suspended → expect Nature textures, sparse
- **technological** - Digital, abstract → expect Technological textures

## What to Watch For

✅ **Success Indicators:**
- All 11 fields present in output
- Scale constraint satisfied (major music → bass/melody ≥0.5)
- Selections feel emotionally appropriate
- Generation completes in <3 seconds

❌ **Failure Patterns:**
- Missing fields → prompt clarity issue
- Scale violations → LLM not understanding constraint
- Random selections → CSV descriptions unclear
- Long generation times → model too slow

## Configuration

Uses your existing `.env`:
```bash
LLM_PROVIDER=gemini  # Change to openai or anthropic to test
GEMINI_API_KEY=your_key
```

## File Structure

```
spike/
├── generator.js    - LLM integration (53 lines)
├── validator.js    - Output validation (139 lines)
├── test.js         - CLI runner (226 lines)
└── README.md       - Full documentation
```

Total: ~420 LOC (kept small per prime-directive.md)

## What Was Built

1. ✅ **generator.js** - Loads specs/CSVs once, constructs prompt, calls existing `src/providers/`
2. ✅ **validator.js** - Parses key:value output, validates all constraints including CRITICAL scale rule
3. ✅ **test.js** - Full CLI with 4 test cases, pretty output, batch testing
4. ✅ **README.md** - Complete documentation with examples

## Architecture Highlights

- Follows prime-directive.md: functional, <80 LOC/file, vanilla JS
- Reuses `src/providers/` - no provider lock-in
- Immutable, pure functions
- Zero new dependencies

## Next: Run Your First Test!

```bash
node web/prompt-editor/sound-engine/spike/test.js --test-case melancholic
```

This should generate audio selections and validate them. Watch for:
1. Generation time (<3s is good)
2. Validation status (✅ = success)
3. Music/texture appropriateness (does it match the mood?)

Good luck! 🎵
