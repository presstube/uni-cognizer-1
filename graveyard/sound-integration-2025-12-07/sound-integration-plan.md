# Sound Integration Plan

**Goal**: Integrate sound generation (Gemini Flash Exp) into the main cognitive loop, parallel to sigil generation.

**Status**: 📋 Planning Complete - Ready for Implementation

---

## Overview

Add sound brief generation to each cognitive cycle, using the existing sound engine from `/web/sound`. The sound brief will be:
- Generated in parallel with sigil generation
- Hydrated onto the mind moment object
- Persisted to database
- Displayed in dashboard below existing mind moment details

## Architecture

### Data Flow
```
Mind Moment Text (from LLM)
    ↓
    ├─→ Sigil Generation (Anthropic) → sigilCode, sigilPhrase
    └─→ Sound Generation (Gemini) → soundBrief
         ↓
    Combined & Hydrated onto Mind Moment
         ↓
    Persisted to Database
         ↓
    Broadcast to Dashboard
         ↓
    Displayed in UI
```

### Integration Pattern
Following the established sigil pattern:
1. Generate in `real-cog.js` during cognition
2. Extend mind moment type definition
3. Persist in database (new JSONB column)
4. Display in dashboard (new section)

---

## Implementation Steps

### 1. Database Migration
**File**: `src/db/migrations/020_add_sound_brief.sql`

```sql
-- Add sound_brief column to mind_moments table
ALTER TABLE mind_moments
ADD COLUMN sound_brief JSONB DEFAULT NULL;

-- Optional: Add index for querying moments with sound briefs
CREATE INDEX idx_mind_moments_sound_brief 
ON mind_moments ((sound_brief IS NOT NULL));
```

**Run migration**: The system will auto-run on next start, or manually with migration script.

---

### 2. Backend: Sound Generation Function
**File**: `src/real-cog.js`

**Location**: Add new function after `generateSigil` (around line 250)

```javascript
/**
 * Generate sound brief for a mind moment
 * @param {string} mindMomentText - The mind moment text to generate sound for
 * @returns {Promise<Object|null>} Sound brief result or null if failed/disabled
 */
async function generateSoundBrief(mindMomentText) {
  try {
    const { getActiveSoundPrompt, getActiveCSVs, getDefaultCSVs } = 
      await import('./db/sound-prompts.js');
    const { generateAudioSelections } = 
      await import('./sound/generator.js');
    
    // Get active sound prompt
    const activePrompt = await getActiveSoundPrompt();
    if (!activePrompt) {
      console.log('⚠️  No active sound prompt, skipping sound generation');
      return null;
    }
    
    // Get CSV files (active or defaults)
    const csvs = await getActiveCSVs();
    const defaults = await getDefaultCSVs();
    const musicCSV = csvs.music?.content || defaults.music?.content;
    const textureCSV = csvs.texture?.content || defaults.texture?.content;
    
    if (!musicCSV || !textureCSV) {
      console.log('⚠️  Missing CSV files, skipping sound generation');
      return null;
    }
    
    // Generate sound selections using Gemini Flash Exp
    const result = await generateAudioSelections({
      input: mindMomentText,
      prompt: activePrompt.prompt,
      llmSettings: activePrompt.llm_settings || {},
      musicCSV,
      textureCSV
    });
    
    // Only return if valid
    if (result.valid) {
      console.log(`🎵 Sound brief generated (${result.duration}ms)`);
      return result;
    } else {
      console.warn('⚠️  Sound generation validation failed:', result.errors);
      return null;
    }
  } catch (error) {
    console.error('❌ Sound generation failed:', error.message);
    return null;
  }
}
```

**Location**: Modify `cognize()` function (around line 280-320)

Add sound generation call after sigil generation:

```javascript
// Inside cognize() function, after generateSigil call

// Generate sigil (existing)
let sigilCode = null;
let sigilPNG = null;
if (sigilPhrase) {
  const sigilResult = await generateSigil(sigilPhrase, cycleIndex);
  sigilCode = sigilResult?.sigilCode || null;
  sigilPNG = sigilResult?.png || null;
}

// Generate sound brief (NEW)
const soundBrief = await generateSoundBrief(mindMoment);

// Store result (modify existing object)
const result = {
  cycle: cycleIndex,
  mindMoment,
  sigilPhrase,
  sigilCode,
  sigilPNG,
  kinetic,
  lighting,
  soundBrief,  // ADD THIS LINE
  visualPercepts,
  audioPercepts
};
```

**Estimated changes**: ~60 lines added to `real-cog.js`

---

### 3. Database Layer: Persist Sound Brief
**File**: `src/db/mind-moments.js`

**Location**: Modify `saveMindMoment()` function (around line 30-80)

Add `sound_brief` to INSERT statement:

```javascript
// In saveMindMoment() function
const result = await pool.query(
  `INSERT INTO mind_moments (
    session_id, cycle, mind_moment, sigil_phrase, sigil_code,
    kinetic, lighting,
    visual_percepts, audio_percepts, prior_moment_ids,
    personality_id, personality_name,
    sigil_prompt_id, sigil_prompt_name,
    sigil_svg_data, sigil_sdf_data, sigil_sdf_width, sigil_sdf_height,
    sigil_generation_error, sigil_png_data, sigil_png_width, sigil_png_height,
    sound_brief  /* ADD THIS */
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23  /* Add $23 */
  ) RETURNING id, cycle, created_at`,
  [
    sessionId, cycle, mindMoment, sigilPhrase, sigilCode,
    JSON.stringify(kinetic), JSON.stringify(lighting),
    JSON.stringify(visualPercepts), JSON.stringify(audioPercepts), priorMomentIds,
    personalityId, personalityName,
    sigilPromptId, sigilPromptName,
    svgData, sdfBuffer, sdfWidth, sdfHeight,
    generationError, pngBuffer, pngWidth, pngHeight,
    JSON.stringify(soundBrief)  /* ADD THIS */
  ]
);
```

**Estimated changes**: 2-3 lines modified in `mind-moments.js`

---

### 4. Type Definition: Extend Mind Moment
**File**: `src/types/mind-moment.js`

**Location**: Modify `normalizeMindMoment()` function (around line 48-64)

Add one line:

```javascript
export function normalizeMindMoment(data) {
  return {
    cycle: data.cycle,
    mindMoment: data.mindMoment || data.mind_moment,
    sigilPhrase: data.sigilPhrase || data.sigil_phrase,
    sigilCode: data.sigilCode || data.sigil_code || null,
    kinetic: data.kinetic || { pattern: 'IDLE' },
    lighting: data.lighting || { color: '0xffffff', pattern: 'IDLE', speed: 0 },
    visualPercepts: data.visualPercepts || data.visual_percepts || [],
    audioPercepts: data.audioPercepts || data.audio_percepts || [],
    priorMoments: data.priorMoments || data.prior_moments || data.priorMomentIds || data.prior_moment_ids || [],
    sdf: data.sdf || null,
    png: data.png || null,
    soundBrief: data.soundBrief || data.sound_brief || null,  /* ADD THIS LINE */
    isDream: data.isDream || false,
    timestamp: data.timestamp || new Date().toISOString()
  };
}
```

**Update JSDoc** (around line 8-23):

```javascript
/**
 * @typedef {Object} MindMoment
 * @property {number} cycle - Cycle number
 * @property {string} mindMoment - The cognitive observation/reflection
 * @property {string} sigilPhrase - Essence phrase for visualization
 * @property {string|null} sigilCode - Canvas drawing code for sigil
 * @property {Object} kinetic - Movement pattern data
 * @property {Object} lighting - Lighting pattern data
 * @property {Array} visualPercepts - Array of visual percept objects
 * @property {Array} audioPercepts - Array of audio percept objects
 * @property {Array} priorMoments - Array of prior moment references
 * @property {Object|null} sdf - Signed distance field data (optional)
 * @property {Object|null} png - PNG image data (optional)
 * @property {Object|null} soundBrief - Sound generation result (optional)  /* ADD THIS */
 * @property {boolean} isDream - Whether this is a dream (replayed) moment
 * @property {string} timestamp - ISO timestamp of emission
 */
```

**Estimated changes**: 2 lines modified

---

### 5. Dashboard: HTML Structure
**File**: `web/dashboard/index.html`

**Location**: Add after line 125 (after `#sigil-png-display`)

```html
<!-- Sound Brief Section -->
<div class="sound-brief-section" id="sound-brief-section" style="display: none;">
  <div class="label">🎵 Sound Brief</div>
  <div class="sound-brief-display" id="sound-brief-display"></div>
</div>
```

**Estimated changes**: 4 lines added

---

### 6. Dashboard: CSS Styling
**File**: `web/dashboard/dashboard.css`

**Location**: Add at end of file (around line 400+)

```css
/* Sound Brief Display */
.sound-brief-section {
  margin-bottom: 32px;
}

.sound-brief-display {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  padding: 16px;
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 24px;
}

.sound-brief-reasoning {
  margin-bottom: 16px;
  font-style: italic;
  opacity: 0.85;
  color: rgba(255, 255, 255, 0.9);
}

.sound-brief-section-title {
  margin-top: 12px;
  margin-bottom: 8px;
  font-weight: 600;
  opacity: 0.7;
  text-transform: uppercase;
  font-size: 12px;
  letter-spacing: 0.5px;
}

.sound-param {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  padding: 6px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  transition: background 0.2s;
}

.sound-param:hover {
  background: rgba(255, 255, 255, 0.03);
}

.sound-param-label {
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
  text-transform: capitalize;
}

.sound-param-value {
  color: rgba(255, 255, 255, 0.95);
  font-family: 'Courier New', monospace;
  font-size: 13px;
}
```

**Estimated changes**: ~60 lines added

---

### 7. Dashboard: JavaScript Display Logic
**File**: `web/dashboard/app.js`

**Location 1**: Add display function (around line 600-700, near other display functions)

```javascript
/**
 * Display sound brief in dashboard
 * @param {Object|null} soundBrief - Sound generation result
 */
function displaySoundBrief(soundBrief) {
  const $section = document.getElementById('sound-brief-section');
  const $display = document.getElementById('sound-brief-display');
  
  if (!soundBrief || !soundBrief.valid) {
    $section.style.display = 'none';
    return;
  }
  
  const { selections, reasoning, musicSample, textureSample } = soundBrief;
  
  let html = '';
  
  // Reasoning (if present)
  if (reasoning) {
    html += `<div class="sound-brief-reasoning">${reasoning}</div>`;
  }
  
  // Music/Texture files
  html += `<div class="sound-param">
    <span class="sound-param-label">Music Sample</span>
    <span class="sound-param-value">${selections.music_filename}</span>
  </div>`;
  
  if (musicSample) {
    html += `<div class="sound-param">
      <span class="sound-param-label">Scale</span>
      <span class="sound-param-value">${musicSample.scale} (${musicSample.key})</span>
    </div>`;
  }
  
  html += `<div class="sound-param">
    <span class="sound-param-label">Texture Sample</span>
    <span class="sound-param-value">${selections.texture_filename}</span>
  </div>`;
  
  // Bass parameters
  html += `<div class="sound-brief-section-title">Bass</div>`;
  html += `<div class="sound-param">
    <span class="sound-param-label">Preset</span>
    <span class="sound-param-value">${selections.bass_preset}</span>
  </div>`;
  
  ['speed', 'stability', 'coloration', 'scale'].forEach(param => {
    const value = selections[`bass_${param}`];
    html += `<div class="sound-param">
      <span class="sound-param-label">${param}</span>
      <span class="sound-param-value">${value}</span>
    </div>`;
  });
  
  // Melody parameters
  html += `<div class="sound-brief-section-title">Melody</div>`;
  ['speed', 'stability', 'coloration', 'scale'].forEach(param => {
    const value = selections[`melody_${param}`];
    html += `<div class="sound-param">
      <span class="sound-param-label">${param}</span>
      <span class="sound-param-value">${value}</span>
    </div>`;
  });
  
  $display.innerHTML = html;
  $section.style.display = 'block';
}
```

**Location 2**: Call in `onHistoryMomentClick()` (around line 103-171)

Add after lighting display (around line 170):

```javascript
// Display sound brief
displaySoundBrief(moment.sound_brief);
```

**Location 3**: Call in `receiveMindMoment()` (around line 600-650)

Add with other display calls:

```javascript
// Display sound brief
displaySoundBrief(data.soundBrief);
```

**Estimated changes**: ~80 lines added, 2 function calls added

---

### 8. Query Updates: Fetch Sound Brief
**File**: `src/consciousness-loop.js`

**Location**: Update SQL queries to include `sound_brief` column

Lines to modify:
- Line 142: `recallMoment()` query - add `sound_brief` to SELECT
- Line 620: `recallMoment()` query - add `sound_brief` to SELECT
- Line 930: `recallMomentSlow()` query - add `sound_brief` to SELECT

Example:

```javascript
const result = await pool.query(`
  SELECT 
    cycle, mind_moment, sigil_phrase, sigil_code,
    kinetic, lighting,
    visual_percepts, audio_percepts, prior_moment_ids,
    sigil_png_data, sigil_png_width, sigil_png_height,
    sound_brief  /* ADD THIS */
  FROM mind_moments
  WHERE cycle = $1
`, [selectedCycle]);
```

Then add to normalization:

```javascript
return normalizeMindMoment({
  cycle: row.cycle,
  mind_moment: row.mind_moment,
  sigil_code: row.sigil_code,
  sigil_phrase: row.sigil_phrase,
  kinetic: row.kinetic,
  lighting: row.lighting,
  visual_percepts: row.visual_percepts,
  audio_percepts: row.audio_percepts,
  prior_moments: priorMoments,
  png,
  sound_brief: row.sound_brief,  /* ADD THIS */
  isDream: true
});
```

**Estimated changes**: 9-12 lines modified across 3 query locations

---

## Testing Plan

### 1. Unit Testing
- [ ] Test `generateSoundBrief()` with valid mind moment text
- [ ] Test graceful failure when no active sound prompt
- [ ] Test graceful failure when CSV files missing
- [ ] Test validation of LLM response

### 2. Integration Testing
- [ ] Run full cognitive cycle with sound prompt active
- [ ] Verify sound brief persisted to database
- [ ] Verify sound brief appears in dashboard
- [ ] Test with sound prompt inactive (should skip gracefully)

### 3. Regression Testing
- [ ] Verify sigil generation still works
- [ ] Verify dashboard displays existing moments correctly
- [ ] Verify dream mode works with old moments (no sound brief)

### 4. Performance Testing
- [ ] Measure cycle time impact (sound generation is parallel to sigil)
- [ ] Verify no blocking delays
- [ ] Monitor Gemini API call duration

---

## Configuration

### Prerequisites
- Active sound prompt in database (via `/web/prompt-editor/sound`)
- Active music CSV and texture CSV (via sound prompt editor)
- Gemini API key configured in environment

### Enabling/Disabling
Sound generation is **opt-in** via active prompt:
- **Enabled**: When a sound prompt is set to active
- **Disabled**: When no sound prompt is active (falls back gracefully)

---

## Risk Mitigation

### Potential Issues & Solutions

| Risk | Impact | Mitigation |
|------|--------|------------|
| Gemini API call failure | Sound brief missing for cycle | Wrapped in try-catch, returns null, cycle continues |
| No active sound prompt | No sound generation | Graceful check, logs warning, continues |
| CSV files missing | No sound generation | Graceful check with fallback to defaults |
| LLM returns invalid format | Validation fails | Validator catches errors, returns null |
| Database migration fails | Can't persist sound briefs | Migration is additive (DEFAULT NULL), existing data safe |
| Display breaks with old data | Dashboard errors | Check for null/undefined before display |

**Key Safety**: All changes are **additive** and **nullable**. System degrades gracefully.

---

## Performance Impact

### Expected Overhead
- **LLM Call**: ~500ms - 2s (Gemini Flash Exp)
- **Validation**: <10ms
- **Database Storage**: ~500 bytes per moment (JSONB)
- **Display Rendering**: <5ms

### Optimization
- Sound generation happens **in parallel** with sigil generation
- No blocking on main cognitive loop
- Failures don't block cycle completion

---

## File Checklist

- [ ] `src/db/migrations/020_add_sound_brief.sql` - Create migration
- [ ] `src/real-cog.js` - Add generation function + hydration
- [ ] `src/db/mind-moments.js` - Update INSERT query
- [ ] `src/types/mind-moment.js` - Extend type definition
- [ ] `src/consciousness-loop.js` - Update 3 SELECT queries
- [ ] `web/dashboard/index.html` - Add HTML structure
- [ ] `web/dashboard/dashboard.css` - Add CSS styling
- [ ] `web/dashboard/app.js` - Add display function + calls

**Total**: 8 files modified, 1 file created

---

## Rollout Strategy

### Phase 1: Backend (Database + Logic)
1. Create and run migration
2. Modify `real-cog.js` to generate sound briefs
3. Update database persistence
4. Update type definitions
5. Test in terminal (check logs for sound generation)

### Phase 2: Frontend (Display)
1. Add HTML structure
2. Add CSS styling
3. Add JavaScript display logic
4. Test in dashboard (verify display)

### Phase 3: Testing & Polish
1. Run regression tests
2. Test with historical moments
3. Test with sound prompt disabled
4. Performance profiling

---

## Success Criteria

- [x] Plan documented
- [ ] Migration runs successfully
- [ ] Sound briefs generate during cognitive cycles
- [ ] Sound briefs persist to database
- [ ] Sound briefs display correctly in dashboard
- [ ] System degrades gracefully when sound disabled
- [ ] No performance degradation to main loop
- [ ] All existing functionality intact

---

## Notes

- Sound generation uses existing infrastructure from `/web/sound`
- Integration follows established sigil generation pattern
- All changes are non-breaking and backward compatible
- System remains functional even if sound generation fails
- CSV management is already handled via sound prompt editor

---

**Ready for implementation. Awaiting go-ahead.**
