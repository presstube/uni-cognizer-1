# Sigil Prompt DB Integration - Implementation Notes

**Started**: 2025-11-26
**Status**: ✅ Complete

---

## Progress Log

### Database
- [x] Create migration `011_add_image_settings_to_sigil_prompts.sql`
- [x] Create `/assets/sigil-references/` directory

### Backend
- [x] Update `generateSigil()` to load active prompt from DB
- [x] Update image loading to support custom image paths (`src/sigil/image.js`)
- [x] Add `POST /api/sigil-prompts/upload-reference-image` endpoint
- [x] Update API to save `include_image` and `reference_image_path`
- [x] Update `generateSigilWithCustomPrompt()` to accept `referenceImagePath`
- [x] Update providers (Anthropic, Gemini) to use custom image paths
- [x] Update `src/db/sigil-prompts.js` for new columns

### Frontend (Prompt Editor)
- [x] Add `include_image` toggle to editor (already existed)
- [x] Add reference image upload/preview (already existed, updated to persist)
- [x] Wire up to new API (upload on save, load on prompt change)

---

## Implementation Notes

### 2025-11-26 - Implementation Complete

**Files Modified:**
- `src/db/migrations/011_add_image_settings_to_sigil_prompts.sql` - Added columns
- `src/sigil/image.js` - Added `loadCustomImage()` and updated `getImageContent(customPath)`
- `src/sigil/generator.js` - `generateSigil()` now loads active prompt from DB
- `src/sigil/provider.js` - Both Anthropic and Gemini handle `referenceImagePath`
- `src/db/sigil-prompts.js` - Updated create/update functions for new columns
- `src/api/sigil-prompts.js` - Added `uploadReferenceImage` endpoint, updated save
- `server.js` - Mounted new upload endpoint

**Flow:**
1. Editor uploads image → `POST /api/sigil-prompts/upload-reference-image`
2. Server saves to `/assets/sigil-references/{uuid}.png`
3. Returns `{ path: 'sigil-references/{uuid}.png' }`
4. Editor saves prompt with `referenceImagePath`
5. Live cognition calls `generateSigil(concept)`
6. `generateSigil()` loads active prompt, passes `referenceImagePath` to provider
7. Provider loads image via `getImageContent(path)` and sends to LLM

### 2025-11-26 - Frontend Complete

**Files Modified:**
- `web/prompt-editor/sigil/editor.js`
  - Added `referenceImagePath`, `hasUnsavedImage` state
  - Added `resetImageState()` and `uploadImageToServer()` functions
  - Updated `handlePromptChange()` to load `include_image` and `reference_image_path`
  - Updated `handleImageUpload()` to track unsaved state
  - Updated `handleResetImage()` to clear all image state
  - Updated `handleSave()` to upload image before saving, include new fields

**UI already had:**
- `include_image` checkbox (now persisted to DB)
- Image file upload (now uploaded to server and persisted)
- Reset to default button (now clears server path too)

---

## Testing

1. Run migration: `psql -f src/db/migrations/011_add_image_settings_to_sigil_prompts.sql`
2. Start server
3. Open `/prompt-editor/sigil`
4. Upload a custom image, save prompt, activate
5. Reload page - should show saved custom image
6. Start a cognitive session - should use the active DB prompt with custom image

**Note:** Server restart is NOT required after activating a prompt - `generateSigil()` loads the active prompt dynamically on each call.


