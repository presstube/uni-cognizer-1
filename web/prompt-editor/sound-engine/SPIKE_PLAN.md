# UNI Audio Instrument - Spike Implementation Plan

**Goal:** Build minimal viable spike to validate LLM-based audio selection system

**Timeline:** Quick iteration - aim for working prototype in 1-2 hours

---

## Phase 1: Minimal Viable Spike

### File Structure

```
web/prompt-editor/sound-engine/
├── spike/
│   ├── generator.js          # Core LLM generation (~60 lines)
│   ├── validator.js          # Output validation (~50 lines)
│   ├── test.js               # CLI test runner (~40 lines)
│   └── README.md             # Usage docs
├── music_samples.csv         # ✅ Already exists
├── texture_samples.csv       # ✅ Already exists
└── UNI_Audio_Instrument_Specification.md  # ✅ Already exists
```

---

## Implementation Pattern (Following Project Best Practices)

### ✅ Prime Directive Compliance

From `prime-directive.md`:
- ✅ **Functional** - Pure functions, no classes
- ✅ **Small files** - Target <80 LOC per file
- ✅ **Vanilla JS** - ES6 modules, minimal dependencies
- ✅ **Immutable** - Use `const`, avoid mutations

### Reuse Existing Infrastructure

- **Use `src/providers/`** - Already handles OpenAI/Anthropic/Gemini
- **Follow sigil generation pattern** - See `src/sigil/provider.js`
- **No new dependencies** - Everything needed already exists

---

## File 1: generator.js

**Purpose:** Load resources, construct prompt, call LLM

```javascript
// spike/generator.js
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { callLLM } from '../../../src/providers/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load source files once at module initialization
const specification = await fs.readFile(
  path.join(__dirname, '..', 'UNI_Audio_Instrument_Specification.md'),
  'utf-8'
);

const musicCSV = await fs.readFile(
  path.join(__dirname, '..', 'music_samples.csv'),
  'utf-8'
);

const textureCSV = await fs.readFile(
  path.join(__dirname, '..', 'texture_samples.csv'),
  'utf-8'
);

// Build system message once (efficient - reused across calls)
const systemMessage = `${specification}\n\nMUSIC SAMPLES:\n${musicCSV}\n\nTEXTURE SAMPLES:\n${textureCSV}`;

export async function generateAudioSelections(paragraph, options = {}) {
  const temperature = options.temperature ?? 0.7;
  
  const response = await callLLM({
    systemPrompt: systemMessage,
    userPrompt: `COGNITIVE STATE:\n${paragraph}\n\nGenerate your Sigil Sound selections.`,
    temperature,
    maxTokens: 500
  });
  
  return response;
}
```

---

## File 2: validator.js

**Purpose:** Parse output, validate constraints

```javascript
// spike/validator.js

// Parse LLM output (key: value format)
function parseOutput(text) {
  const lines = text.trim().split('\n');
  const selections = {};
  
  for (const line of lines) {
    const [key, value] = line.split(':').map(s => s.trim());
    if (key && value) {
      selections[key] = value;
    }
  }
  
  return selections;
}

// Parse CSV helper
export function parseCSV(csvString) {
  const lines = csvString.trim().split('\n');
  const headers = lines[0].split(',');
  
  return lines.slice(1).map(line => {
    const values = line.split(',');
    return headers.reduce((obj, header, i) => {
      obj[header] = values[i]?.trim().replace(/^"|"$/g, '');
      return obj;
    }, {});
  });
}

// Main validation function
export function validateSelections(output, musicSamples) {
  const selections = parseOutput(output);
  const errors = [];
  
  // Check all 11 required fields
  const required = [
    'music_filename', 'texture_filename', 'bass_preset',
    'bass_speed', 'bass_stability', 'bass_coloration', 'bass_scale',
    'melody_speed', 'melody_stability', 'melody_coloration', 'melody_scale'
  ];
  
  required.forEach(field => {
    if (!(field in selections)) {
      errors.push(`Missing field: ${field}`);
    }
  });
  
  // ⚠️ CRITICAL: Scale constraint validation
  const musicSample = musicSamples.find(s => 
    s.filename === selections.music_filename
  );
  
  if (musicSample) {
    const isMajor = musicSample.scale === 'major';
    const bassScale = parseFloat(selections.bass_scale);
    const melodyScale = parseFloat(selections.melody_scale);
    
    if (isMajor && (bassScale < 0.5 || melodyScale < 0.5)) {
      errors.push('Scale mismatch: major music requires bass/melody ≥ 0.5');
    }
    if (!isMajor && (bassScale >= 0.5 || melodyScale >= 0.5)) {
      errors.push('Scale mismatch: minor music requires bass/melody < 0.5');
    }
  } else if (selections.music_filename) {
    errors.push(`Invalid music_filename: ${selections.music_filename}`);
  }
  
  // Validate bass_preset
  const validPresets = ['bass_lfo_gain', 'bass_delay', 'bass_lfo_filter', 'bass_basic'];
  if (selections.bass_preset && !validPresets.includes(selections.bass_preset)) {
    errors.push(`Invalid bass_preset: ${selections.bass_preset}`);
  }
  
  // Validate numeric ranges (0.0-1.0)
  const numericFields = [
    'bass_speed', 'bass_stability', 'bass_coloration', 'bass_scale',
    'melody_speed', 'melody_stability', 'melody_coloration', 'melody_scale'
  ];
  
  numericFields.forEach(field => {
    const val = parseFloat(selections[field]);
    if (isNaN(val) || val < 0 || val > 1) {
      errors.push(`${field} must be 0.0-1.0, got: ${selections[field]}`);
    }
  });
  
  return {
    valid: errors.length === 0,
    selections,
    errors
  };
}
```

---

## File 3: test.js

**Purpose:** CLI interface for manual testing

```javascript
// spike/test.js
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateAudioSelections } from './generator.js';
import { validateSelections, parseCSV } from './validator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Test paragraphs from implementation plan
const TEST_CASES = {
  melancholic: "The old lighthouse stood silent against the storm. Inside, a single lamp flickered, casting long shadows that danced like memories.",
  energetic: "The city buzzed with electric energy. Neon signs flashed, footsteps echoed rapid-fire on concrete, and somewhere distant, a saxophone wailed against the night.",
  contemplative: "Morning mist settled over the lake. A lone bird called out, its voice rippling across the glassy surface. Everything felt suspended, waiting.",
  technological: "Data streams flowed through invisible channels. The hum of processors created a strange music—mathematical, precise, yet somehow alive."
};

async function runTest(paragraph, options = {}) {
  console.log('\n' + '='.repeat(80));
  console.log('🎵 Testing UNI Audio Instrument');
  console.log('='.repeat(80));
  console.log('\nInput paragraph:');
  console.log(paragraph);
  console.log('\n' + '-'.repeat(80));
  
  try {
    const startTime = Date.now();
    
    // Generate
    console.log('⏳ Generating selections...');
    const output = await generateAudioSelections(paragraph, options);
    
    const duration = Date.now() - startTime;
    console.log(`✅ Generated in ${duration}ms`);
    
    console.log('\nRaw output:');
    console.log(output);
    console.log('\n' + '-'.repeat(80));
    
    // Load music samples for validation
    const musicCSV = await fs.readFile(
      path.join(__dirname, '..', 'music_samples.csv'),
      'utf-8'
    );
    const musicSamples = parseCSV(musicCSV);
    
    // Validate
    const validation = validateSelections(output, musicSamples);
    
    if (validation.valid) {
      console.log('✅ VALIDATION PASSED\n');
      console.log('Selections:');
      console.log(JSON.stringify(validation.selections, null, 2));
    } else {
      console.log('❌ VALIDATION FAILED\n');
      console.log('Errors:');
      validation.errors.forEach(err => console.log(`  - ${err}`));
      console.log('\nParsed selections:');
      console.log(JSON.stringify(validation.selections, null, 2));
    }
    
    return validation;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  
  // Handle test cases
  if (args[0] === '--test-case') {
    const caseName = args[1] || 'melancholic';
    const paragraph = TEST_CASES[caseName];
    
    if (!paragraph) {
      console.error(`Unknown test case: ${caseName}`);
      console.log('Available:', Object.keys(TEST_CASES).join(', '));
      process.exit(1);
    }
    
    await runTest(paragraph);
    return;
  }
  
  // Handle custom paragraph
  const paragraph = args.join(' ') || TEST_CASES.melancholic;
  await runTest(paragraph);
}

main().catch(console.error);
```

**Usage:**
```bash
# Test with custom paragraph
node spike/test.js "She walked through foggy streets..."

# Test with predefined case
node spike/test.js --test-case energetic

# Available cases: melancholic, energetic, contemplative, technological
```

---

## Success Criteria

### ✅ Spike is successful if:
1. **Generates valid output** - 80%+ success rate with 11 fields
2. **Scale constraints work** - 100% compliance after validation
3. **Emotionally appropriate** - Selections feel right for paragraph mood
4. **Fast enough** - <3 seconds per generation
5. **Easy to test** - Quick iteration on multiple paragraphs

### ❌ Concerns to investigate if:
- Success rate <50% → Prompt engineering needed
- Scale violations common → Specification needs clarification
- Selections feel random → CSV descriptions insufficient
- Takes >5 seconds → Consider model change

---

## Testing Strategy

### Test All 4 Cases

```bash
node spike/test.js --test-case melancholic
node spike/test.js --test-case energetic
node spike/test.js --test-case contemplative
node spike/test.js --test-case technological
```

### Expected Behaviors

**Melancholic:**
- Minor scale music
- Cool/neutral tone
- Sparse density
- Soothing mood

**Energetic:**
- Major scale possible
- Warm tone
- Dense density
- Intense mood

**Contemplative:**
- Sparse density
- Nature texture category
- Soothing mood

**Technological:**
- Technological texture category
- Neutral/cool tone
- Moderate/dense density

---

## Questions to Answer

As you build and test:

1. **Model performance:** Which provider (Gemini/OpenAI/Anthropic) works best?
2. **Temperature:** Does 0.7 vs 0.3 affect success rate?
3. **Consistency:** Same paragraph, different results each run?
4. **Edge cases:** Very short or very long paragraphs?
5. **Scale constraint:** Does LLM understand the dependency rule?
6. **Creative quality:** Do selections feel emotionally coherent?

---

## What NOT to Build (Keep Spike Simple)

- ❌ Database persistence
- ❌ Web UI
- ❌ Batch processing
- ❌ Result storage
- ❌ Comparison tools
- ❌ Audio playback

**Focus:** Prove the LLM can make valid selections. That's it.

---

## Next Steps After Successful Spike

If validation shows promise:

1. **Phase 2:** Add batch testing
   - Load from `data/mind-moments.json`
   - Test 50+ paragraphs automatically
   - Track success rates

2. **Phase 3:** Result storage
   - Simple JSON file or SQLite
   - Track which paragraphs → which selections
   - Enable analysis

3. **Phase 4:** Model comparison
   - Test GPT-4o vs Claude vs Gemini
   - Compare quality, speed, cost
   - Choose best model

4. **Phase 5:** Web UI (Optional)
   - Follow dumb client pattern
   - Input paragraph, see selections
   - Visualize parameter ranges

---

## Environment Setup

Already configured! Use existing `.env`:

```bash
# Your existing config works
LLM_PROVIDER=gemini  # or openai, anthropic
GEMINI_API_KEY=your_key_here
```

No additional setup needed.

---

## Quick Start

```bash
# 1. Create spike folder
mkdir -p web/prompt-editor/sound-engine/spike

# 2. Create the 3 files (generator.js, validator.js, test.js)

# 3. Test it
node web/prompt-editor/sound-engine/spike/test.js --test-case melancholic

# 4. Iterate quickly
```

---

## Estimated Timeline

- **generator.js** - 20 minutes
- **validator.js** - 30 minutes
- **test.js** - 15 minutes
- **Testing & refinement** - 30 minutes

**Total:** ~90 minutes to working spike

---

## Documentation After Spike

Create `spike/README.md` with:
- Test results summary
- Success rate metrics
- Model performance notes
- Recommendations for full implementation

---

## References

- Full spec: `UNI_Audio_Instrument_Specification.md`
- Implementation details: `IMPLEMENTATION_PLAN.md`
- Project patterns: `../../../prime-directive.md`
- Provider abstraction: `../../../src/providers/`
