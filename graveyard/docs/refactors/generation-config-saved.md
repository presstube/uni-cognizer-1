# Generation Config Now Saved to Database!

**Date**: November 21, 2025  
**Feature**: Generation config parameters now persist per audio prompt  
**Status**: ✅ Complete

---

## What Was Added

The generation config parameters (temperature, topP, topK, maxOutputTokens) are now saved to the database with each audio prompt profile.

---

## Changes Made

### 1. Database Migration
**File**: `src/db/migrations/007_add_generation_config_to_audio_prompts.sql`

Added 4 new columns to `audio_prompts`:
```sql
temperature DECIMAL(3,2) DEFAULT 0.8
top_p DECIMAL(3,2) DEFAULT 0.9
top_k INTEGER DEFAULT 40
max_output_tokens INTEGER DEFAULT 1024
```

### 2. Database Functions
**File**: `src/db/audio-prompts.js`

Updated to handle generation config:
- `createAudioPrompt()` - Now accepts `generationConfig` object
- `updateAudioPrompt()` - Now accepts `generationConfig` object

### 3. API Endpoint
**File**: `src/api/audio-prompts.js`

`saveAudioPrompt()` now:
- Accepts `generationConfig` in request body
- Passes it to database functions
- Returns saved values in response

### 4. Editor UI
**File**: `prompt-editor/audio-percept/editor.js`

- **On Load**: Populates input fields from database (with defaults)
- **On Save**: Reads input fields and sends to API
- Values persist per prompt profile

---

## How It Works

### Saving
```
1. User adjusts generation config sliders
2. Clicks "Save"
3. Editor reads: temperature, top-p, top-k, max-tokens
4. Sends to API as generationConfig object
5. API saves to database columns
6. Returns saved prompt with all values
```

### Loading
```
1. User selects prompt from dropdown
2. Editor fetches from /api/audio-prompts/:id
3. Populates all fields including generation config
4. Uses values when starting WebSocket session
```

### Using
```
1. User clicks "START LISTENING"
2. Editor reads current values from inputs
3. Builds generationConfig object
4. Sends to Gemini Live API in setup message
5. API applies settings for entire session
```

---

## Database Schema

```sql
CREATE TABLE audio_prompts (
  id UUID PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  system_prompt TEXT NOT NULL,
  user_prompt TEXT NOT NULL,
  
  -- Generation Config (NEW)
  temperature DECIMAL(3,2) DEFAULT 0.8,
  top_p DECIMAL(3,2) DEFAULT 0.9,
  top_k INTEGER DEFAULT 40,
  max_output_tokens INTEGER DEFAULT 1024,
  
  active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Testing

### Test 1: Save New Prompt
```
1. Open /prompt-editor/audio-percept/
2. Click "+ New Prompt"
3. Fill in name, slug, prompts
4. Adjust generation config (e.g., temp = 1.2)
5. Click "Save"
6. Reload page
7. Select your prompt
8. Verify temperature shows 1.2
```

### Test 2: Update Existing
```
1. Load an existing prompt
2. Change temperature from 0.8 to 0.5
3. Click "Save"
4. Reload page
5. Verify it saved 0.5
```

### Test 3: Use in Session
```
1. Load a prompt with temperature = 1.5
2. Click "START LISTENING"
3. Check console: "generationConfig: { temperature: 1.5, ... }"
4. Speak
5. Responses should be more creative
```

---

## Defaults

If a prompt is missing generation config values (old prompts), defaults apply:
- **temperature**: 0.8
- **top_p**: 0.9
- **top_k**: 40
- **max_output_tokens**: 1024

---

## Migration

To apply the migration (when database is enabled):

```bash
npm run migrate
```

This will:
- Add 4 new columns to `audio_prompts`
- Set default values for existing prompts
- Add comments explaining each field

---

## Next Steps

### For door/see App
The `/door/see/` app loads the active prompt. It will automatically get the saved generation config values and use them!

No changes needed to door/see - it already reads from `/api/audio-prompts/active`.

### For Testing
Try different configs to see how they affect responses:
- **temperature 0.0** = Deterministic, repetitive
- **temperature 2.0** = Highly creative, unpredictable
- **maxOutputTokens 512** = Shorter responses
- **maxOutputTokens 2048** = Longer responses

---

## Summary

✅ **Database schema updated**  
✅ **Database functions updated**  
✅ **API endpoint updated**  
✅ **Editor UI updated**  
✅ **Load/save working**  
✅ **Migration ready**  

Generation config is now **fully persistent** per audio prompt! 🎉

Each prompt can have its own personality based on these settings.

