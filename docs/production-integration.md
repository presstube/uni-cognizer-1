# Production Integration: How Personalities Work with UNI

## 🔄 Complete Flow: Writer → Production

### Step 1: Writer Creates Personality (Forge UI)

```
Writer opens: https://your-app.railway.app/forge/
  ↓
Logs in with password
  ↓
Loads "UNI Tripartite v2.0" from dropdown
  ↓
Edits prompt (tweaks personality)
  ↓
Tests with "👋 Greeting" preset
  ↓
Sees: "I notice someone waving warmly..."
  ↓
Iterates: Edits prompt → Tests again
  ↓
Satisfied! Saves as "UNI Tripartite v2.1"
  ↓
Clicks "✓ Set Active"
  ↓
Database updated: v2.1 is now active
```

### Step 2: Deploy to Production (You)

```bash
# Option A: Restart server (loads new personality)
# Railway/Render dashboard: Click "Restart"

# Option B: Any git push triggers redeploy
git commit -m "trigger redeploy" --allow-empty
git push origin main

# Server restarts automatically
```

### Step 3: UNI Loads New Personality

```
Server starts
  ↓
Runs: initializePersonality()
  ↓
Queries: SELECT * FROM personalities WHERE active = true
  ↓
Finds: "UNI Tripartite v2.1"
  ↓
Loads prompt into memory
  ↓
Logs: 🎭 Loaded personality: UNI Tripartite v2.1
  ↓
Ready! UNI now uses v2.1 for all cognition
```

---

## 💭 Runtime: How UNI Uses Personality

### Every Cognitive Cycle:

```javascript
// 1. Percepts arrive (visual + audio)
visualPercepts: [{ emoji: '👋', action: 'Person waving' }]
audioPercepts: [{ transcript: 'Hello UNI!' }]

// 2. real-cog.js builds prompt
const prompt = `${currentPersonality}  ← v2.1 prompt from DB

CURRENT PERCEPTS:
Visual: 👋 Person waving
Audio: "Hello UNI!"

RECENT CONTEXT:
1 cycles ago: "Building is quiet, systems nominal"
2 cycles ago: "HVAC adjusted, comfortable temperature"

Generate a complete cognitive response as JSON...`

// 3. Sends to LLM (Gemini/GPT-4/Claude)
const response = await callLLM(prompt);

// 4. LLM responds using v2.1 personality
{
  "mindMoment": "I notice someone waving warmly...",
  "sigilPhrase": "warm greeting",
  "kinetic": { "pattern": "HAPPY_BOUNCE" },
  "lighting": { "color": "0xffd700", "pattern": "SMOOTH_WAVES", "speed": 0.5 }
}

// 5. Saved to database with personality_id
await saveMindMoment({
  mindMoment: "I notice someone waving warmly...",
  personalityId: "[v2.1's UUID]",  ← Tracks which personality generated this
  cognizerVersion: "0.1.0",
  ...
});

// 6. Broadcast to clients (aggregator, test-client)
io.emit('mindMoment', { mindMoment: "I notice...", ... });
```

### Every mind moment is tagged:
- `cognizer_version` - Which Cognizer version (0.1.0)
- `personality_id` - Which personality (v2.1 UUID)
- `llm_provider` - Which LLM (gemini)
- `created_at` - Timestamp

---

## 🗄️ Database State

### personalities table:

```sql
SELECT id, name, active FROM personalities;
```

```
id                                   | name                  | active
-------------------------------------|-----------------------|-------
550e8400-e29b-41d4-a716-446655440000 | UNI Tripartite v2.0  | false
550e8400-e29b-41d4-a716-446655440001 | UNI Tripartite v2.1  | true  ← Active!
```

### mind_moments table:

```sql
SELECT cycle, mind_moment, personality_id 
FROM mind_moments 
ORDER BY cycle DESC LIMIT 5;
```

```
cycle | mind_moment                    | personality_id
------|--------------------------------|--------
45    | I notice someone waving...     | ...440001  ← v2.1
44    | Building systems nominal...    | ...440001  ← v2.1
43    | HVAC adjusted...               | ...440000  ← v2.0 (before restart)
42    | Quiet morning...               | ...440000  ← v2.0
```

**Clear transition point** when personality switched!

---

## 🎯 Key Points

### 1. **Personality is Cached**
- Loaded once at startup into `currentPersonality` variable
- Used for all LLM calls
- **Must restart server to reload** after activation

### 2. **Only One Active**
- Database constraint ensures only one `active = true`
- Activating one deactivates all others automatically
- Transaction-safe (no race conditions)

### 3. **Graceful Fallback**
- If DB fails, uses hardcoded `ROBOT_PERSONALITY` from `personality-uni-v2.js`
- Server never crashes from missing personality
- Logs warning: `🎭 Using default hardcoded personality`

### 4. **Tagging Everything**
- Every mind moment links to personality UUID
- Can query: "Show all moments from v2.1"
- Can analyze: "How did responses change between versions?"

---

## 📊 Analytics Queries

### Compare personality performance:

```sql
-- Average response length by personality
SELECT 
  p.name,
  COUNT(*) as moments,
  AVG(LENGTH(mm.mind_moment)) as avg_length,
  AVG(mm.processing_duration_ms) as avg_speed
FROM mind_moments mm
JOIN personalities p ON mm.personality_id = p.id
GROUP BY p.name;
```

### Find personality transition points:

```sql
-- When did personality change?
SELECT 
  cycle,
  mind_moment,
  p.name as personality
FROM mind_moments mm
JOIN personalities p ON mm.personality_id = p.id
WHERE cycle BETWEEN 40 AND 50
ORDER BY cycle;
```

### A/B test personalities:

```sql
-- Compare sigil generation rate
SELECT 
  p.name,
  COUNT(CASE WHEN sigil_phrase IS NOT NULL THEN 1 END)::float / COUNT(*) as sigil_rate
FROM mind_moments mm
JOIN personalities p ON mm.personality_id = p.id
GROUP BY p.name;
```

---

## 🔄 Workflow Summary

**Writer's perspective:**
1. Edit personality in Forge
2. Test instantly with mock percepts
3. Save when happy
4. Click "Set Active"
5. Tell developer to restart

**Your perspective:**
1. Get notification from writer
2. Restart server (or just push any commit)
3. Verify logs: `🎭 Loaded personality: [new name]`
4. Done! UNI uses new personality

**UNI's perspective:**
- No downtime
- Smooth transition between personalities
- All history preserved
- Can always roll back (activate old personality + restart)

---

## 🛡️ Safety Features

### Can't Delete Active
```bash
curl -X DELETE /api/personalities/[ACTIVE-ID]
# Error: Cannot delete active personality
```

### Can't Have Multiple Active
```sql
-- Database constraint prevents this
CREATE UNIQUE INDEX idx_personalities_one_active 
  ON personalities(active) WHERE active = true;
```

### Transaction-Safe Activation
```javascript
// Atomic operation
BEGIN;
UPDATE personalities SET active = false;  -- Deactivate all
UPDATE personalities SET active = true WHERE id = $1;  -- Activate one
COMMIT;
```

---

## 🚀 Production Checklist

Before going live with writer access:

- [ ] `FORGE_AUTH_ENABLED=true` set in production
- [ ] `FORGE_PASSWORD` is strong and shared securely
- [ ] Writer has been shown how to use Forge
- [ ] Writer knows to notify you after activation
- [ ] You know how to restart production server
- [ ] Database backups are enabled (Railway/Render auto-backup)
- [ ] You've tested activating a personality + restart locally

---

## 📝 Writer Instructions (Send This)

**Hi [Writer Name],**

You now have access to UNI's Personality Forge!

**URL:** `https://your-app.railway.app/forge/`  
**Username:** `writer`  
**Password:** `[secure password]`

**How to update UNI's personality:**

1. Open Forge, log in
2. Select "UNI Tripartite v2.X" from dropdown
3. Edit the personality prompt
4. Select a test scenario (👋 Greeting, 🏢 Silence, etc.)
5. Click "🧪 Test" to see how UNI responds
6. Iterate until happy
7. Click "💾 Save" with a new name (e.g., "UNI Tripartite v2.2")
8. Click "✓ Set Active"
9. **Tell me to restart the server** (just say "ready to deploy v2.2")
10. I'll restart → UNI uses your new personality!

**Tips:**
- Test frequently! Each test calls the real AI
- Save often with new version numbers
- Old versions are preserved (we can always roll back)
- The prompt should be 1-2 paragraphs max

Let me know if you have questions!

---

Last updated: November 17, 2025

