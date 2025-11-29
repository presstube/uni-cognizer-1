# Gemini Model Names Fixed

**Issue**: Personality test failing with 404 error for Gemini models

**Error**:
```
[404 Not Found] models/gemini-1.5-flash is not found for API version v1beta, 
or is not supported for generateContent.
```

## Root Cause

Gemini API model names have version suffixes that were missing from our model lists:
- ❌ `gemini-1.5-flash` (doesn't exist)
- ✅ `gemini-1.5-flash-002` (correct)
- ❌ `gemini-1.5-pro` (doesn't exist)
- ✅ `gemini-1.5-pro-002` (correct)

## Files Fixed

### 1. Personality Editor
**File**: `web/prompt-editor/personality/forge.js`

**Before**:
```javascript
gemini: [
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' }
]
```

**After**:
```javascript
gemini: [
  { value: 'gemini-1.5-flash-002', label: 'Gemini 1.5 Flash' },
  { value: 'gemini-1.5-pro-002', label: 'Gemini 1.5 Pro' }
]
```

### 2. Sigil Editor
**File**: `web/prompt-editor/sigil/editor.js`

**Before**:
```javascript
gemini: [
  { value: 'models/gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  { value: 'models/gemini-1.5-pro', label: 'Gemini 1.5 Pro' }
]
```

**After**:
```javascript
gemini: [
  { value: 'models/gemini-1.5-flash-002', label: 'Gemini 1.5 Flash' },
  { value: 'models/gemini-1.5-pro-002', label: 'Gemini 1.5 Pro' }
]
```

## Correct Gemini Model Names

From Google's Generative AI API:

| Display Name | Model ID |
|--------------|----------|
| Gemini 2.0 Flash (Exp) | `gemini-2.0-flash-exp` |
| Gemini 2.0 Flash | `gemini-2.0-flash` |
| Gemini 1.5 Flash | `gemini-1.5-flash-002` ✅ |
| Gemini 1.5 Flash 8B | `gemini-1.5-flash-8b` |
| Gemini 1.5 Pro | `gemini-1.5-pro-002` ✅ |

**Note**: Personality editor stores names WITHOUT `models/` prefix, dynamic provider adds it when calling API.

## Next Steps

### 1. Restart Server
The JavaScript changes require a page reload.

### 2. Update Existing Personalities
The "lalatest" personality has `gemini-1.5-flash` stored. Options:
- **Easy**: Change the model in the UI to one that works (e.g., `gemini-2.0-flash-exp` or `gemini-1.5-flash-002`)
- **OR**: Manually update the database (not recommended)

### 3. Test
1. Load "lalatest" personality
2. Change model to `Gemini 1.5 Flash` (will now be `gemini-1.5-flash-002`)
3. Save
4. Click TEST

Should now work! 🎯

## Impact

This fixes:
- ✅ Personality editor TEST button with Gemini models
- ✅ Sigil editor with Gemini models
- ✅ Any future code using these model lists

All editors now use the correct, versioned model names that actually exist in the Gemini API.

