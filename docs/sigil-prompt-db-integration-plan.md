# Sigil Prompt Database Integration Plan

**Purpose**: Wire the active sigil prompt from DB into the live cognition engine

**Date**: 2025-11-26

---

## Current State (Broken)

The production `generateSigil()` function uses a **hardcoded prompt** in `prompt.js`:

```javascript
// src/sigil/generator.js
export async function generateSigil(concept) {
  // ...
  userContent.push({
    type: 'text',
    text: buildPrompt(concept)  // <-- Uses hardcoded prompt.js
  });
  
  // Hardcoded model and settings
  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',  // <-- Hardcoded
    max_tokens: 1024,                    // <-- Hardcoded
    // ...
  });
}
```

The `generateSigilWithCustomPrompt()` function CAN use custom prompts, but it's only called by the Prompt Editor for testing - NOT by the live cognition engine.

---

## Database Schema (Already Exists)

```sql
-- sigil_prompts table
id UUID PRIMARY KEY
name VARCHAR(200)
slug VARCHAR(100) UNIQUE
prompt TEXT               -- The prompt template with ${concept} placeholder
active BOOLEAN            -- Only one can be active
llm_settings JSONB        -- {provider, model, temperature, top_p, top_k, max_tokens}
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

**Missing:** 
- `include_image BOOLEAN` - whether to include reference image
- `reference_image_path VARCHAR` - path to custom reference image (null = use default)

---

## Implementation Plan

### Phase 1: Add Image Columns to Schema

**Migration: `011_add_image_settings_to_sigil_prompts.sql`**
```sql
-- Add image-related columns to sigil_prompts

ALTER TABLE sigil_prompts 
ADD COLUMN IF NOT EXISTS include_image BOOLEAN DEFAULT true;

ALTER TABLE sigil_prompts 
ADD COLUMN IF NOT EXISTS reference_image_path VARCHAR(500) DEFAULT NULL;

COMMENT ON COLUMN sigil_prompts.include_image IS 
'Whether to include the reference image in sigil generation prompts';

COMMENT ON COLUMN sigil_prompts.reference_image_path IS 
'Relative path to custom reference image (e.g., sigil-references/abc123.png). NULL = use default image.';
```

### Phase 1.5: Reference Image Storage

**Directory:** `/assets/sigil-references/`

**Upload Flow:**
1. Prompt Editor uploads image via new endpoint
2. Server saves to `/assets/sigil-references/{uuid}.png`
3. Returns relative path `sigil-references/{uuid}.png`
4. Path stored in `reference_image_path` column

**New API Endpoint:** `POST /api/sigil-prompts/upload-reference-image`
```javascript
// Accepts multipart/form-data with image file
// Saves to /assets/sigil-references/{uuid}.png
// Returns { path: 'sigil-references/{uuid}.png' }
```

**Image Loading in Generator:**
```javascript
function getImageForPrompt(referenceImagePath) {
  if (referenceImagePath) {
    // Load custom image from assets/
    return loadImageFromPath(`assets/${referenceImagePath}`);
  }
  // Fall back to default
  return loadReferenceImage(); // existing function
}
```

### Phase 2: Update `generateSigil()` to Use Active DB Prompt

**File: `src/sigil/generator.js`**

Replace the current `generateSigil()` with one that:
1. Loads active prompt from DB via `getActiveSigilPrompt()`
2. Uses `llm_settings` (provider, model, temperature, etc.)
3. Respects `include_image` flag
4. Falls back to hardcoded defaults if no active prompt

```javascript
import { getActiveSigilPrompt } from '../db/sigil-prompts.js';

export async function generateSigil(concept) {
  if (!concept?.trim()) {
    throw new Error('Concept is required for sigil generation');
  }
  
  // Load active prompt from DB
  let activePrompt = null;
  if (process.env.DATABASE_ENABLED === 'true') {
    try {
      activePrompt = await getActiveSigilPrompt();
    } catch (error) {
      console.warn('[Sigil] Failed to load active prompt, using defaults:', error.message);
    }
  }
  
  // Extract settings or use defaults
  const promptTemplate = activePrompt?.prompt || buildPrompt(concept);
  const includeImage = activePrompt?.include_image ?? true;
  const llmSettings = activePrompt?.llm_settings || {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    temperature: 0.7,
    top_p: 0.9,
    max_tokens: 1024,
    top_k: null
  };
  
  // Log which prompt is being used
  if (activePrompt) {
    console.log(`[Sigil] Using DB prompt: "${activePrompt.name}" (${llmSettings.provider}/${llmSettings.model})`);
  } else {
    console.log('[Sigil] Using hardcoded fallback prompt');
  }
  
  // Delegate to existing custom prompt function
  return await generateSigilWithCustomPrompt(
    concept,
    promptTemplate,
    includeImage,
    null, // No custom image from live cognition
    llmSettings
  );
}
```

### Phase 3: Update DB Repository

**File: `src/db/sigil-prompts.js`**

Update `getActiveSigilPrompt()` to include the new `include_image` column (already returns all columns via `SELECT *`).

### Phase 4: Update Prompt Editor

**Files:**
- `web/prompt-editor/sigil/editor.js` - Add include_image toggle
- `src/api/sigil-prompts.js` - Handle include_image in save

---

## Data Flow (After Implementation)

```
[/prompt-editor/sigil]
    ↓ upload image
[POST /api/sigil-prompts/upload-reference-image]
    ↓ saves to /assets/sigil-references/{uuid}.png
    ↓ returns path
[/prompt-editor/sigil]
    ↓ save prompt (with reference_image_path)
[sigil_prompts DB]
    ↓ active=true
[generateSigil(concept)]
    ↓ getActiveSigilPrompt()
    ↓ extract: prompt, llm_settings, include_image, reference_image_path
    ↓ 
[generateSigilWithCustomPrompt()]
    ↓ load image from path (or default)
    ↓
[Anthropic/Gemini API]
    ↓
[Sigil Code]
```

---

## Implementation Checklist

### Database
- [ ] Create migration `011_add_image_settings_to_sigil_prompts.sql`
- [ ] Create `/assets/sigil-references/` directory

### Backend
- [ ] Update `generateSigil()` to load active prompt from DB
- [ ] Update `getImageContent()` to support custom image paths
- [ ] Add `POST /api/sigil-prompts/upload-reference-image` endpoint
- [ ] Update API to save `include_image` and `reference_image_path`
- [ ] Add logging to show which prompt/image is being used

### Frontend (Prompt Editor)
- [ ] Add `include_image` toggle to editor
- [ ] Add reference image upload/preview
- [ ] Wire up image upload to new API endpoint
- [ ] Show current reference image (custom or default)

### Testing
- [ ] Test: Save prompt with custom image → Activate → Verify live cognition uses it
- [ ] Test: Save prompt with default image → Verify fallback works
- [ ] Test: No active prompt → Falls back to hardcoded defaults
- [ ] Test: `include_image = false` → No image sent to LLM

---

## Fallback Behavior

If no active prompt in DB (or DB disabled):
- Use hardcoded prompt from `prompt.js`
- Use hardcoded LLM settings (Anthropic claude-sonnet-4)
- Include reference image by default
- Use default reference image (`/assets/72_Goeta_sigils.png`)

If active prompt has `reference_image_path = NULL`:
- Use default reference image

If active prompt has `include_image = false`:
- Skip image entirely in LLM call

This ensures the system works even without DB configuration.

---

## Notes

- The `generateSigilWithCustomPrompt()` function already handles multi-provider (Anthropic/Gemini)
- The `getSigilProvider()` function already routes to the correct provider
- We're reusing existing infrastructure, just wiring it into the live path

---

**Ready for implementation!**

