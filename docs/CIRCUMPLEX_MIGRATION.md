# Circumplex Migration Summary

**Date:** December 9, 2025  
**Migration:** Replace `kinetic` + `lighting` with `circumplex`

---

## Changes Made

### 1. Core Cognition (`src/real-cog.js`)
- ✅ Updated `realLLMCall()` to return `circumplex` instead of `kinetic` + `lighting`
- ✅ Updated fallback error state to use circumplex: `{ valence: -1, arousal: 1 }`
- ✅ Updated `dispatchMindMoment()` signature to pass `circumplex`
- ✅ Updated console logging to display circumplex values
- ✅ Updated all event dispatchers to include circumplex

### 2. Database Layer (`src/db/mind-moments.js`)
- ✅ Updated `saveMindMoment()` to save `circumplex` instead of `kinetic` + `lighting`
- ✅ Updated `getMindMomentWithFullSigil()` query
- ✅ Created migration: `021_replace_kinetic_lighting_with_circumplex.sql`

### 3. Consciousness Loop (`src/consciousness-loop.js`)
- ✅ Updated `onMindMoment` listener signature
- ✅ Updated all database queries to fetch `circumplex` instead of `kinetic` + `lighting`
- ✅ Updated placeholder/fallback moments to use circumplex
- ✅ Updated WebSocket `mindMomentInit` event
- ✅ Updated `mindMoment` WebSocket emission
- ✅ Updated dream recall functions (both fast and slow)

### 4. Type Definitions (`src/types/mind-moment.js`)
- ✅ Updated JSDoc typedef to use `circumplex`
- ✅ Updated `validateMindMoment()` to check for circumplex
- ✅ Updated `normalizeMindMoment()` to default: `{ valence: 0, arousal: 0 }`

### 5. Database Migration
```sql
-- Add circumplex column
ALTER TABLE mind_moments 
ADD COLUMN IF NOT EXISTS circumplex JSONB DEFAULT '{"valence": 0, "arousal": 0}'::jsonb;

-- Drop old columns
ALTER TABLE mind_moments 
DROP COLUMN IF EXISTS kinetic,
DROP COLUMN IF EXISTS lighting;

-- Add GIN index for efficient circumplex queries
CREATE INDEX IF NOT EXISTS idx_mind_moments_circumplex 
ON mind_moments USING GIN (circumplex);
```

---

## Active Personality

**Name:** UNI tripartite-circumplex-text  
**Slug:** `uni-tripartite-circumplex-text`  
**Status:** ⭐ Active

**Output Format:**
```json
{
  "mindMoment": "...",
  "sigilPhrase": "...",
  "circumplex": {
    "valence": 0.6,
    "arousal": 0.3
  }
}
```

**Circumplex Axes:**
- **Valence:** -1 (negative/unpleasant) to +1 (positive/pleasant)
- **Arousal:** -1 (low energy/calm) to +1 (high energy/excited)

---

## Next Steps

1. **Run migration:**
   ```bash
   npm run migrate
   ```

2. **Activate personality:**
   ```bash
   node scripts/query-personality.js uni-tripartite-circumplex-text
   # Then use the Personality Forge to activate it
   ```

3. **Restart server:**
   ```bash
   npm start
   ```

4. **Update clients:** Any client applications expecting `kinetic` and `lighting` fields will need to be updated to use `circumplex` instead.

---

## Breaking Changes

⚠️ **WebSocket API:**
- `mindMoment` event no longer includes `kinetic` or `lighting`
- `mindMoment` event now includes `circumplex: { valence, arousal }`
- `mindMomentInit` event updated similarly

⚠️ **Database Schema:**
- `kinetic` column removed
- `lighting` column removed  
- `circumplex` column added

⚠️ **Existing Data:**
- Old mind moments with `kinetic`/`lighting` will have NULL `circumplex` after migration
- The system will default to `{ valence: 0, arousal: 0 }` when loading old moments

---

## Testing

Test the new system:
1. Load the personality editor: `http://localhost:3001/prompt-editor/personality`
2. Select "UNI tripartite-circumplex-text"
3. Click "🧪 Test" 
4. Verify the output shows `circumplex` with valence/arousal values
5. Watch the server console for circumplex logging in live cycles

---

## Rollback Plan

If needed, revert by:
1. Restore `kinetic` and `lighting` columns in database
2. Git revert the code changes
3. Reactivate a personality with `lighting` output format
