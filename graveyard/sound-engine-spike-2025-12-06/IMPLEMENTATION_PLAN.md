# UNI Audio Instrument Testing Tool - Implementation Plan

## Executive Summary

This document outlines the creation of a testing tool to validate the **UNI Audio Instrument** system—an AI-driven audio engine that selects music samples and synthesizer parameters based on creative writing inputs.

The tool will:
1. Accept a paragraph of creative writing as input
2. Use an LLM to analyze the writing and select appropriate audio samples/parameters
3. Return structured data that can control an audio synthesis engine
4. Allow testing and validation of the selection logic before full integration

---

## What is the UNI Audio Instrument?

The UNI Audio Instrument is an AI system that **expresses internal moods and perceptions through sound**. Given a piece of creative writing (representing the AI's "cognitive state"), it:

1. **Analyzes** the emotional tone, mood, density, and atmosphere of the writing
2. **Selects** a music sample from a curated library
3. **Selects** a texture/ambience sample from a second library  
4. **Chooses** a bass synthesizer preset and parameters
5. **Sets** melody synthesizer parameters
6. **Generates** a specification for a 15-second audio piece called a "Sigil Sound"

The output is a structured set of selections that an audio engine uses to generate the actual sound.

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────┐
│  INPUT: Creative Writing Paragraph              │
│  "She walked through foggy morning streets..."  │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│           LLM (GPT-4o / Claude)                 │
│                                                  │
│  Context: UNI Audio Specification               │
│  Data: music_samples.csv (53 samples)           │
│  Data: texture_samples.csv (~50 samples)        │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  OUTPUT: Structured Selection Data              │
│                                                  │
│  music_filename: music_sample_12                │
│  texture_filename: texture_sample_7             │
│  bass_preset: bass_lfo_filter                   │
│  bass_speed: 0.75                               │
│  bass_stability: 0.3                            │
│  bass_coloration: 0.6                           │
│  bass_scale: 0.25                               │
│  melody_speed: 0.4                              │
│  melody_stability: 0.5                          │
│  melody_coloration: 0.7                         │
│  melody_scale: 0.15                             │
└─────────────────────────────────────────────────┘
                 │
                 ▼
        (Audio Engine generates sound)
```

---

## What Needs to Be Built

### Core Requirements

A **simple, standalone testing tool** that:

1. **Loads static resources:**
   - `UNI_Audio_Instrument_Specification.md` - The full system specification
   - `music_samples.csv` - 53 music sample descriptions
   - `texture_samples.csv` - ~50 texture sample descriptions

2. **Accepts input:**
   - A paragraph of creative writing (1-4 sentences typical)
   - Optional: Model selection (GPT-4o, Claude 3.5 Sonnet, etc.)
   - Optional: Temperature setting (0.0-1.0)

3. **Processes via LLM:**
   - Constructs a prompt with specification + CSV data + input paragraph
   - Sends to LLM API
   - Handles API responses and errors

4. **Returns structured output:**
   - Parsed selection data (11 fields total)
   - Validates output format and constraints
   - Optional: Includes LLM reasoning/explanation

5. **Logs/stores results:**
   - Save test runs for comparison
   - Track which paragraphs produce which selections
   - Enable batch testing of multiple paragraphs

---

## Source Files Provided

You will receive three files:

### 1. `UNI_Audio_Instrument_Specification.md`
**What it is:** The complete system specification that serves as the LLM's instructions.

**Contents:**
- How the system works (conceptual overview)
- Glossary of all parameters and their meanings
- Description of all 4 bass presets
- Detailed parameter descriptions (11 total parameters)
- Rules and constraints (especially scale dependencies)
- Required output format

**How to use:** Include this entire document in the LLM system message or prompt.

### 2. `music_samples.csv`
**What it is:** A catalog of 53 music samples with descriptive attributes.

**Columns:**
- `filename` - identifier (e.g., "music_sample_1")
- `description` - Poetic/musical description
- `tone` - warm / neutral / cool
- `density` - sparse / moderate / dense
- `mood` - soothing / neutral / intense
- `scale` - **major / minor** ⚠️ CRITICAL: Constrains bass_scale and melody_scale
- `rhythm` - arhythmic / strong pulse / mixed

**How to use:** Include formatted CSV data in the LLM prompt.

### 3. `texture_samples.csv`
**What it is:** A catalog of ~50 texture/ambience samples with descriptive attributes.

**Columns:**
- `filename` - identifier (e.g., "texture_sample_1")
- `description` - Description of the sound
- `tone` - warm / neutral / cool
- `density` - sparse / moderate / dense
- `mood` - soothing / neutral / intense
- `category` - Nature / Technological / Biological / Musical / Mixed

**How to use:** Include formatted CSV data in the LLM prompt.

---

## Implementation Approach

### Recommended: Direct LLM Approach (Not Embeddings)

**Why not embeddings?**
- Small dataset (53 + 50 samples easily fits in context)
- Complex interdependencies require holistic reasoning
- Scale constraints must be enforced (major/minor)
- LLM needs to make creative, not just semantic, matches

**Architecture:** Use the **system message pattern** for efficiency.

```javascript
// Pseudocode structure
class SigilSoundGenerator {
  constructor() {
    // Load once at initialization
    specification = load('UNI_Audio_Instrument_Specification.md')
    musicCSV = load('music_samples.csv')
    textureCSV = load('texture_samples.csv')
    
    // Build system message once
    systemMessage = {
      role: 'system',
      content: `${specification}\n\nMUSIC SAMPLES:\n${musicCSV}\n\nTEXTURE SAMPLES:\n${textureCSV}`
    }
  }
  
  async generate(paragraph) {
    response = await llm.chat({
      messages: [
        systemMessage,
        {
          role: 'user',
          content: `COGNITIVE STATE:\n${paragraph}\n\nGenerate your Sigil Sound selections.`
        }
      ]
    })
    
    return parseOutput(response)
  }
}
```

---

## Expected Output Format

The LLM must return selections in this exact format:

```
music_filename: music_sample_12
texture_filename: texture_sample_7
bass_preset: bass_lfo_filter
bass_speed: 0.75
bass_stability: 0.3
bass_coloration: 0.6
bass_scale: 0.25
melody_speed: 0.4
melody_stability: 0.5
melody_coloration: 0.7
melody_scale: 0.15
```

### Output Validation

The testing tool should validate:

1. **Field presence:** All 11 fields present
2. **Filename validity:** 
   - `music_filename` matches a row in `music_samples.csv`
   - `texture_filename` matches a row in `texture_samples.csv`
3. **Preset validity:** `bass_preset` is one of: `bass_lfo_gain`, `bass_delay`, `bass_lfo_filter`, `bass_basic`
4. **Float ranges:** All numeric parameters are between 0.0 and 1.0
5. **Scale constraint:** ⚠️ **CRITICAL VALIDATION**
   - If selected `music_sample` has scale="minor": `bass_scale` and `melody_scale` must be 0.00-0.49
   - If selected `music_sample` has scale="major": `bass_scale` and `melody_scale` must be 0.50-1.00

### Example Validation Function

```javascript
function validateOutput(selections, musicSamples) {
  // Check all fields present
  const requiredFields = [
    'music_filename', 'texture_filename', 'bass_preset',
    'bass_speed', 'bass_stability', 'bass_coloration', 'bass_scale',
    'melody_speed', 'melody_stability', 'melody_coloration', 'melody_scale'
  ]
  
  for (field of requiredFields) {
    if (!selections[field]) return { valid: false, error: `Missing ${field}` }
  }
  
  // Check scale constraint
  const musicSample = musicSamples.find(s => s.filename === selections.music_filename)
  const isMajor = musicSample.scale === 'major'
  
  if (isMajor) {
    if (selections.bass_scale < 0.5 || selections.melody_scale < 0.5) {
      return { valid: false, error: 'Scale mismatch: major music requires major bass/melody' }
    }
  } else {
    if (selections.bass_scale >= 0.5 || selections.melody_scale >= 0.5) {
      return { valid: false, error: 'Scale mismatch: minor music requires minor bass/melody' }
    }
  }
  
  return { valid: true }
}
```

---

## Testing Tool Features

### Minimum Viable Implementation

```
INPUT: A single paragraph of text
OUTPUT: Validated selection data
```

### Recommended Features

1. **Single Test Mode**
   - Enter a paragraph
   - Get immediate result
   - Show validation status
   - Display reasoning (if available)

2. **Batch Test Mode**
   - Load multiple paragraphs from database
   - Process all sequentially
   - Save results to database or CSV
   - Generate summary statistics

3. **Comparison Mode**
   - Test same paragraph with different models
   - Test same paragraph with different temperatures
   - Show variation in selections

4. **Result Storage**
   - Save each test with:
     - Input paragraph
     - Output selections
     - Timestamp
     - Model used
     - Temperature setting
     - Validation status
     - Optional: LLM reasoning

---

## Implementation Steps

### Phase 1: Basic Functionality (MVP)

1. **Setup Environment**
   - Install LLM API client (OpenAI, Anthropic, etc.)
   - Set up configuration (API keys, model selection)
   - Create project structure

2. **Load Source Files**
   - Load and parse `UNI_Audio_Instrument_Specification.md`
   - Load and parse `music_samples.csv`
   - Load and parse `texture_samples.csv`
   - Format data for LLM prompt

3. **Build Prompt Constructor**
   - Create system message with specification + CSVs
   - Create user message template for paragraph input
   - Handle prompt assembly

4. **Implement LLM Integration**
   - Call LLM API with constructed prompts
   - Handle responses
   - Error handling and retries

5. **Parse & Validate Output**
   - Parse LLM output into structured data
   - Validate all fields present
   - Validate scale constraints
   - Return validation results

6. **Basic CLI/Interface**
   - Accept paragraph input
   - Display parsed selections
   - Show validation status

### Phase 2: Enhanced Testing

7. **Batch Processing**
   - Load paragraphs from database
   - Process multiple inputs
   - Save results

8. **Result Storage**
   - Database schema for test results
   - Save test runs
   - Query and compare results

9. **Reporting**
   - Generate test summaries
   - Show most-selected samples
   - Identify validation failures
   - Compare model performance

### Phase 3: Advanced Features (Optional)

10. **A/B Testing**
    - Compare multiple models
    - Compare temperature settings
    - Statistical analysis of variations

11. **Reasoning Capture**
    - Request LLM to explain choices
    - Store reasoning with results
    - Enable qualitative analysis

12. **Visual Dashboard**
    - Web interface for testing
    - Visualization of selection patterns
    - Interactive parameter exploration

---

## Model Recommendations

### Primary Recommendation: GPT-4o
- **Excellent** at creative interpretation
- Fast response times (~2-3 seconds)
- Good at following format specifications
- Cost: ~$0.004 per generation

**Configuration:**
```javascript
{
  model: 'gpt-4o',
  temperature: 0.7,  // Allow creative variation
  max_tokens: 500    // Enough for output + optional reasoning
}
```

### Alternative: Claude 3.5 Sonnet
- **Superior** at nuanced creative interpretation
- Excellent at constraint following
- Slightly slower but higher quality
- Cost: Similar to GPT-4o

**Configuration:**
```javascript
{
  model: 'claude-3-5-sonnet-20241022',
  temperature: 0.7,
  max_tokens: 500
}
```

### Budget Option: GPT-4o-mini
- Faster and cheaper (~10x less)
- Still capable for this task
- Good for initial testing/development

---

## Sample Test Cases

Use these paragraphs to validate the system:

### Test Case 1: Melancholic & Sparse
```
The old lighthouse stood silent against the storm. Inside, 
a single lamp flickered, casting long shadows that danced 
like memories.
```

**Expected characteristics:**
- Minor scale music
- Cool or neutral tone
- Sparse to moderate density
- Soothing to neutral mood
- Arhythmic rhythm

### Test Case 2: Energetic & Dense
```
The city buzzed with electric energy. Neon signs flashed, 
footsteps echoed rapid-fire on concrete, and somewhere 
distant, a saxophone wailed against the night.
```

**Expected characteristics:**
- Major scale possible
- Warm or neutral tone
- Moderate to dense density
- Intense or neutral mood
- Strong pulse or mixed rhythm

### Test Case 3: Contemplative & Natural
```
Morning mist settled over the lake. A lone bird called out, 
its voice rippling across the glassy surface. Everything 
felt suspended, waiting.
```

**Expected characteristics:**
- Minor or major scale
- Cool tone
- Sparse density
- Soothing mood
- Arhythmic rhythm
- Texture: Nature category

### Test Case 4: Technological & Abstract
```
Data streams flowed through invisible channels. The hum of 
processors created a strange music—mathematical, precise, 
yet somehow alive.
```

**Expected characteristics:**
- Scale: Either
- Neutral or cool tone
- Moderate to dense density
- Neutral or intense mood
- Texture: Technological category

---

## Success Criteria

The testing tool is successful if it:

1. ✅ **Consistently produces valid output**
   - All 11 fields present
   - Values in correct ranges
   - Scale constraints satisfied

2. ✅ **Produces sensible selections**
   - Music/texture match paragraph mood
   - Parameters align with emotional tone
   - Selections feel coherent as a set

3. ✅ **Is reliable**
   - Handles edge cases
   - Graceful error handling
   - Consistent behavior across test runs

4. ✅ **Is useful for testing**
   - Easy to run multiple tests
   - Results are stored and comparable
   - Failures are clearly identified

5. ✅ **Provides insights**
   - Can identify patterns in selections
   - Helps validate the specification logic
   - Enables comparison of model performance

---

## Database Schema (If Storing Results)

```sql
CREATE TABLE sigil_test_results (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Input
  input_paragraph TEXT NOT NULL,
  model_name VARCHAR(100),
  temperature FLOAT,
  
  -- Output
  music_filename VARCHAR(50),
  texture_filename VARCHAR(50),
  bass_preset VARCHAR(50),
  bass_speed FLOAT,
  bass_stability FLOAT,
  bass_coloration FLOAT,
  bass_scale FLOAT,
  melody_speed FLOAT,
  melody_stability FLOAT,
  melody_coloration FLOAT,
  melody_scale FLOAT,
  
  -- Metadata
  validation_passed BOOLEAN,
  validation_errors TEXT,
  llm_reasoning TEXT,
  generation_time_ms INTEGER,
  
  -- Optional: Store raw response
  raw_response TEXT
);

-- Index for querying by paragraph
CREATE INDEX idx_input_paragraph ON sigil_test_results (input_paragraph);

-- Index for finding validation failures
CREATE INDEX idx_validation ON sigil_test_results (validation_passed);
```

---

## Example Implementation Outline (Node.js)

```javascript
// testTool.js - Main testing tool

import { SigilSoundGenerator } from './sigilGenerator.js';
import { validateSelections } from './validator.js';
import { saveResult } from './storage.js';

async function runTest(paragraph, options = {}) {
  const generator = new SigilSoundGenerator({
    model: options.model || 'gpt-4o',
    temperature: options.temperature || 0.7,
  });
  
  try {
    const startTime = Date.now();
    
    // Generate selections
    const result = await generator.generate(paragraph);
    
    const generationTime = Date.now() - startTime;
    
    // Validate
    const validation = validateSelections(result, generator.musicSamples);
    
    // Store result
    const testResult = {
      input_paragraph: paragraph,
      model_name: options.model,
      temperature: options.temperature,
      ...result.selections,
      validation_passed: validation.valid,
      validation_errors: validation.error || null,
      llm_reasoning: result.reasoning || null,
      generation_time_ms: generationTime,
    };
    
    await saveResult(testResult);
    
    return testResult;
    
  } catch (error) {
    console.error('Test failed:', error);
    return {
      input_paragraph: paragraph,
      validation_passed: false,
      validation_errors: error.message,
    };
  }
}

// CLI Interface
async function main() {
  const paragraph = process.argv[2] || 
    "She walked through foggy morning streets, each step echoing in silence.";
  
  console.log('Testing paragraph:', paragraph);
  console.log('---');
  
  const result = await runTest(paragraph);
  
  console.log('Results:');
  console.log(JSON.stringify(result, null, 2));
  
  if (result.validation_passed) {
    console.log('✅ Validation passed');
  } else {
    console.log('❌ Validation failed:', result.validation_errors);
  }
}

main();
```

---

## Deliverables

From this implementation plan, you should produce:

1. **Testing Tool Application**
   - Standalone script or application
   - CLI or web interface
   - Can run single or batch tests

2. **Documentation**
   - Setup instructions
   - Usage examples
   - API documentation (if applicable)

3. **Test Results**
   - Initial validation with provided test cases
   - Database of test runs
   - Summary report of findings

4. **Validation Report**
   - Success rate statistics
   - Common failure patterns
   - Model comparison (if tested)

---

## Questions to Consider

As you implement, consider:

1. **Consistency:** Does the same paragraph produce similar results across runs?
2. **Variation:** Does temperature setting meaningfully affect output?
3. **Model Differences:** Do GPT-4o and Claude make different choices? Better/worse?
4. **Constraint Adherence:** Are scale constraints always followed?
5. **Creative Quality:** Do selections feel emotionally appropriate?
6. **Edge Cases:** What happens with very short or very long paragraphs?

---

## Next Steps

1. **Review this plan** and source files
2. **Set up development environment** with LLM API access
3. **Implement MVP** (Phase 1) - basic single-test functionality
4. **Validate with test cases** provided above
5. **Expand to batch testing** (Phase 2)
6. **Report findings** and recommendations

---

## Support & Questions

If anything in this specification is unclear or you need additional information:
- The specification document is the source of truth for system behavior
- The CSVs contain all available samples
- Scale dependency rules are critical and must be validated
- Temperature 0.7 is recommended starting point for creative variation

Good luck with implementation! This testing tool will be crucial for validating the UNI Audio Instrument system before full integration.

