# Sound Brief Backfill Script

## Purpose
Generates sound briefs for existing mind moments that don't have them yet. Useful for:
- Adding sound briefs to moments created before the feature existed
- Re-generating sound briefs with a new prompt
- Testing the sound generation system on real mind moment data

## Prerequisites
1. ✅ Database migration must be run (column `sound_brief` exists)
2. ✅ Active sound prompt must be set (via `/web/prompt-editor/sound`)
3. ✅ Music and texture CSV files must be active
4. ✅ Gemini API key must be configured in `.env`

## Usage

### Basic (process last 10 moments)
```bash
node scripts/backfill-sound-briefs.js
```

### Custom limit (e.g., last 50 moments)
```bash
node scripts/backfill-sound-briefs.js 50
```

### Process ALL moments (use with caution)
```bash
node scripts/backfill-sound-briefs.js 1000
```

## What It Does

1. **Validates setup**
   - Checks database is enabled
   - Verifies active sound prompt exists
   - Loads music/texture CSV files

2. **Queries database**
   - Fetches last N mind moments (ordered by cycle DESC)
   - Filters out moments with empty/short text

3. **Generates sound briefs**
   - For each moment WITHOUT a sound brief:
     - Calls Gemini Flash Exp with mind moment text
     - Validates the response
     - Updates database with result
   - Skips moments that already have sound briefs

4. **Reports progress**
   - Shows progress for each moment
   - Displays success/skip/error counts
   - Shows final summary

## Example Output

```
🎵 Sound Brief Backfill Tool
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Checking for active sound prompt...
✓ Found active prompt: "UNI Audio Instrument v1.0"

📁 Loading CSV files...
✓ Music CSV loaded (24 samples)
✓ Texture CSV loaded (18 samples)

🔍 Fetching last 10 mind moments...
✓ Found 10 moments to process

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎵 Starting sound brief generation...

[1/10] Cycle 142
  Text: "I notice someone moving through the space, their presence..."
  ✓ Generated in 1243ms
    Music: eno_ambient_dark_Dm.wav
    Texture: rain_distant_soft.wav

[2/10] Cycle 141
  Text: "The quiet continues. Systems hum steadily..."
  ✓ Generated in 987ms
    Music: debussy_ethereal_Am.wav
    Texture: wind_gentle_steady.wav

...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Summary:
  ✓ Success: 8
  ⏭️  Skipped: 2
  ❌ Errors:  0
  📋 Total:   10

✅ Backfill complete!
```

## Rate Limiting

The script includes a 500ms delay between API calls to be respectful to the Gemini API. For large batches, this means:
- 10 moments: ~10-20 seconds
- 50 moments: ~1-2 minutes
- 100 moments: ~2-4 minutes

## Error Handling

The script handles errors gracefully:
- **No active prompt**: Exits with error message
- **Missing CSV files**: Exits with error message
- **LLM validation fails**: Logs error, continues to next moment
- **API call fails**: Logs error, continues to next moment
- **Already has sound brief**: Skips, counts as skipped

## Verification

After running, check the database:

```sql
SELECT cycle, 
       mind_moment,
       sound_brief->>'valid' as has_sound_brief,
       sound_brief->'selections'->>'music_filename' as music
FROM mind_moments 
WHERE sound_brief IS NOT NULL
ORDER BY cycle DESC 
LIMIT 10;
```

## Notes

- Script processes moments in **reverse cycle order** (newest first)
- Skips moments that already have sound briefs (idempotent)
- Safe to run multiple times
- Can be interrupted (Ctrl+C) and resumed later
- Only updates moments without sound briefs (won't overwrite existing ones)

## Troubleshooting

### "No active sound prompt found"
→ Visit `/web/prompt-editor/sound` and activate a prompt

### "Missing CSV files"
→ Upload or activate CSV files in sound prompt editor

### "Database not enabled"
→ Set `DATABASE_ENABLED=true` in `.env`

### High error rate
→ Check Gemini API key is valid
→ Verify CSV files are properly formatted
→ Check console logs for specific errors

## Re-generating Sound Briefs

To regenerate sound briefs (e.g., with a new prompt):

1. Delete existing sound briefs:
   ```sql
   UPDATE mind_moments SET sound_brief = NULL WHERE sound_brief IS NOT NULL;
   ```

2. Run the backfill script again

---

**Ready to backfill!** 🎵
