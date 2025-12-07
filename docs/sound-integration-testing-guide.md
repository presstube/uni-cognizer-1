# Sound Integration - Testing Guide

## Quick Start

### 1. Prerequisites Check
Before testing, ensure:
- [ ] Active sound prompt exists at `/web/prompt-editor/sound`
- [ ] Music CSV and texture CSV files are active
- [ ] Gemini API key is configured in `.env`

### 2. Start Server
The migration will run automatically on startup:

```bash
npm start
```

Watch for in console:
```
✓ Migration 020_add_sound_brief.sql completed
```

### 3. Test Sound Generation

#### Option A: Wait for Natural Cycle
If percepts are flowing, sound generation will happen automatically during next cognitive cycle.

#### Option B: Manual Trigger
Send a test percept via perceptor-remote or circumplex interface.

### 4. Check Console Output

Look for these log messages:

```
🎵 Generating sound brief for mind moment...
✓ Sound brief generated (500ms)
  Music: [filename]
  Texture: [filename]
✓ Sound brief saved to database
```

### 5. Check Dashboard

1. Open: `http://localhost:3000/web/dashboard`
2. Scroll down in center pane
3. Look for new section: **🎵 Sound Brief**
4. Should display:
   - Reasoning (AI's explanation)
   - Music Sample + Scale info
   - Texture Sample
   - Bass parameters (preset, speed, stability, coloration, scale)
   - Melody parameters (speed, stability, coloration, scale)

### 6. Check Database

```sql
SELECT cycle, 
       mind_moment, 
       sound_brief->>'valid' as valid,
       sound_brief->'selections'->>'music_filename' as music
FROM mind_moments 
WHERE sound_brief IS NOT NULL
ORDER BY cycle DESC 
LIMIT 5;
```

## Expected Behavior

### ✅ Success Cases
- Sound brief generates in ~500ms-2s
- Persists to database as JSONB
- Displays in dashboard below sigil info
- No impact on cycle timing

### ⚠️ Graceful Degradation
- **No active sound prompt**: Skips generation, logs warning
- **CSV files missing**: Skips generation, logs warning
- **LLM validation fails**: Returns null, continues cycle
- **Database save fails**: Logs error, continues cycle

## Troubleshooting

### Sound brief not generating?
1. Check if sound prompt is active:
   - Visit `/web/prompt-editor/sound`
   - Look for ⭐ next to prompt name
2. Check console for errors
3. Verify Gemini API key is valid

### Dashboard not showing sound brief?
1. Check browser console for JavaScript errors
2. Verify sound_brief exists in database
3. Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+R)

### Migration didn't run?
1. Check `src/db/migrate.js` runs on startup
2. Manually check if column exists:
   ```sql
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'mind_moments' 
   AND column_name = 'sound_brief';
   ```

## Files to Monitor

- **Console logs**: Watch for 🎵 emoji and sound generation messages
- **Dashboard**: Center pane, below sigil section
- **Database**: `mind_moments.sound_brief` column

## Rollback

If you need to rollback:

```sql
ALTER TABLE mind_moments DROP COLUMN sound_brief;
DROP INDEX idx_mind_moments_sound_brief;
```

Then restart server without the migration file.

---

**Ready to test!** 🎵
