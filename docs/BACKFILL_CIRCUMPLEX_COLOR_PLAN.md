# Backfill Plan: Circumplex & Color for Historical Mind Moments

## Overview

Backfill all historical mind moments with circumplex coordinates and color triads.

---

## Strategy

### Scenario 1: Has Circumplex, Missing Color ✅
**Action:** Generate color from existing circumplex using `circumplexToColor()`

```javascript
const color = circumplexToColor(moment.circumplex, ETHEREAL_VAPOUR_PALETTE);
// Update: SET color = $1
```

### Scenario 2: Missing Both Circumplex AND Color 🎲
**Action:** Generate random circumplex, then generate color

```javascript
const randomCircumplex = {
  valence: (Math.random() * 2) - 1,  // -1.0 to +1.0
  arousal: (Math.random() * 2) - 1   // -1.0 to +1.0
};
const color = circumplexToColor(randomCircumplex, ETHEREAL_VAPOUR_PALETTE);
// Update: SET circumplex = $1, color = $2
```

**Why random?** 
- Better than leaving it null
- Provides visual variety in DREAM mode
- Avoids expensive LLM calls
- Can be re-generated later if needed

### Scenario 3: Has Both ✅
**Action:** Skip (already complete)

---

## Implementation Steps

### 1. Query Analysis
```sql
SELECT 
  COUNT(*) as total,
  COUNT(circumplex) as with_circumplex,
  COUNT(color) as with_color,
  COUNT(*) FILTER (WHERE circumplex IS NULL) as needs_circumplex,
  COUNT(*) FILTER (WHERE circumplex IS NOT NULL AND color IS NULL) as needs_color_only
FROM mind_moments
WHERE session_id = 'uni';
```

### 2. Fetch Moments
```sql
SELECT id, cycle, circumplex, color
FROM mind_moments
WHERE session_id = 'uni'
  AND (circumplex IS NULL OR color IS NULL)
ORDER BY cycle DESC  -- Latest first for testing
LIMIT 10;  -- Test on 10 most recent
```

### 3. Process Each Moment

```javascript
for (const moment of moments) {
  let circumplex = moment.circumplex;
  let needsCircumplexUpdate = false;
  
  // Generate random circumplex if missing
  if (!circumplex) {
    circumplex = {
      valence: (Math.random() * 2) - 1,
      arousal: (Math.random() * 2) - 1
    };
    needsCircumplexUpdate = true;
  }
  
  // Generate color from circumplex (always needed if we're here)
  const color = circumplexToColor(circumplex, ETHEREAL_VAPOUR_PALETTE);
  
  // Update database
  if (needsCircumplexUpdate) {
    await pool.query(
      'UPDATE mind_moments SET circumplex = $1, color = $2 WHERE id = $3',
      [JSON.stringify(circumplex), JSON.stringify(color), moment.id]
    );
  } else {
    await pool.query(
      'UPDATE mind_moments SET color = $1 WHERE id = $2',
      [JSON.stringify(color), moment.id]
    );
  }
}
```

### 4. Summary Report
- Moments processed
- Circumplex generated (random)
- Colors generated
- Errors encountered
- Time taken

---

## Safety Features

### Dry Run Mode
- `--dry-run` flag shows what would be updated
- No database changes made
- Perfect for testing

### Batch Processing
- `--limit=N` processes only N moments
- Default: 10 (for testing)
- Production: Remove limit or use larger number

### Progress Logging
- Shows each moment as it's processed
- Color preview (hex codes)
- Error handling per-moment (doesn't fail entire batch)

### Transaction Safety
- Each UPDATE is a separate transaction
- If one fails, others continue
- Could wrap in transaction if needed

---

## Testing Strategy

### Phase 1: Dry Run on 10 Latest
```bash
node scripts/backfill-circumplex-color.js --dry-run --limit=10
```
**Expected:** Shows 10 moments, what circumplex/color would be generated

### Phase 2: Real Run on 10 Latest
```bash
node scripts/backfill-circumplex-color.js --limit=10
```
**Expected:** Updates 10 moments, shows success

### Phase 3: Verify in Dashboard
- Refresh dashboard
- Switch to DREAM mode
- Check that recent moments have colors

### Phase 4: Full Backfill (if satisfied)
```bash
node scripts/backfill-circumplex-color.js
```
**Expected:** Updates all moments in database

---

## Example Output

```
🎨 Circumplex & Color Backfill Script
════════════════════════════════════════════
📊 Analyzing database...

Total moments: 380
With circumplex: 360
With color: 0
Needs circumplex: 20
Needs color only: 360

🔄 Processing 10 moments (latest first)...

✓ Cycle 380: [RANDOM] valence=0.23, arousal=-0.67 → #5d7c99
✓ Cycle 379: [EXISTS] valence=0.60, arousal=0.70 → #51c17b
✓ Cycle 378: [EXISTS] valence=-0.30, arousal=0.70 → #7c4445
...

════════════════════════════════════════════
📋 Summary:
  ✅ Processed: 10
  🎲 Random circumplex: 2
  🎨 Colors generated: 10
  ❌ Errors: 0
  ⏱️  Time: 0.5s

✅ Backfill complete!
```

---

## Script Location

`scripts/backfill-circumplex-color.js`

---

## Future Improvements

1. **Batch UPDATEs** - Update multiple rows in one query for performance
2. **Transaction Wrapping** - Wrap all updates in single transaction
3. **Retry Logic** - Retry failed updates
4. **Resume Capability** - Track progress, resume from last processed
5. **Replace Random** - Re-run LLM to get real circumplex values

For now: Keep it simple, test on 10, expand as needed.
