# Phase 3a Backend Testing Guide

**Status**: Ready to test  
**Prerequisites**: Database enabled, migrations run, personality seeded

---

## Setup for Testing

### 1. Ensure Database is Running

```bash
# Check your .env
cat .env | grep DATABASE

# Should have:
DATABASE_ENABLED=true
DATABASE_URL=postgresql://...
```

### 2. Run Migrations

```bash
npm run migrate

# Expected output:
# 🔄 Running database migrations...
# ✓ Migration 1 (001_initial_schema.sql) already applied
# ✓ Migration 2 (002_personalities.sql) applied
# ✓ Database schema up to date
```

### 3. Seed Personality

```bash
npm run db:seed-personality

# Expected output:
# ✅ Seeded default personality:
#    ID: [uuid]
#    Name: UNI Tripartite v2.0
#    Slug: uni-tripartite-v2-0
#    Active: true
#    Prompt length: [number] characters
```

### 4. Start Server

```bash
npm start

# Expected output:
# 📦 Cognizer v0.1.0 (Node v20.10.0)
# 🔄 Running database migrations...
# ✓ Migration 1 (001_initial_schema.sql) already applied
# ✓ Migration 2 (002_personalities.sql) already applied
# ✓ Database schema up to date
# 🧠 UNI's consciousness resuming from cycle [number]
# 🎭 Loaded personality: UNI Tripartite v2.0 (uni-tripartite-v2-0)
# ╔═══════════════════════════════════════════════════════════╗
# ║  COGNIZER-1 WebSocket Server                             ║
# ╚═══════════════════════════════════════════════════════════╝
# 🌐 Listening on port 3001
```

**Key logs to verify:**
- ✅ `🎭 Loaded personality:` - Confirms personality loaded from DB
- ✅ `🧠 UNI's consciousness resuming` - Confirms cycle index loaded

---

## API Tests (curl)

### Test 1: List All Personalities

```bash
curl http://localhost:3001/api/personalities
```

**Expected:**
```json
{
  "personalities": [
    {
      "id": "uuid-here",
      "name": "UNI Tripartite v2.0",
      "slug": "uni-tripartite-v2-0",
      "active": true,
      "created_at": "2025-11-17T...",
      "updated_at": "2025-11-17T..."
    }
  ]
}
```

### Test 2: Get Active Personality

```bash
curl http://localhost:3001/api/personalities/active
```

**Expected:**
```json
{
  "personality": {
    "id": "uuid-here",
    "name": "UNI Tripartite v2.0",
    "slug": "uni-tripartite-v2-0",
    "prompt": "You are UNI - the soul of the Unisphere...",
    "active": true,
    "created_at": "2025-11-17T...",
    "updated_at": "2025-11-17T..."
  }
}
```

### Test 3: Get Specific Personality

```bash
# Replace [ID] with actual UUID from Test 1
curl http://localhost:3001/api/personalities/[ID]
```

### Test 4: Create New Personality

```bash
curl -X POST http://localhost:3001/api/personalities \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Personality",
    "slug": "test-v1",
    "prompt": "You are a test robot. Respond with: {\"mindMoment\": \"test\", \"sigilPhrase\": \"test\", \"kinetic\": {\"pattern\": \"IDLE\"}, \"lighting\": {\"color\": \"0xffffff\", \"pattern\": \"IDLE\", \"speed\": 0}}"
  }'
```

**Expected:**
```json
{
  "personality": {
    "id": "new-uuid",
    "name": "Test Personality",
    "slug": "test-v1",
    "prompt": "You are a test robot...",
    "active": false,
    "created_at": "2025-11-17T...",
    "updated_at": "2025-11-17T..."
  }
}
```

### Test 5: Test Personality with Mock Percepts

```bash
# Replace [ID] with UUID from Test 4
curl -X POST http://localhost:3001/api/personalities/[ID]/test \
  -H "Content-Type: application/json" \
  -d '{
    "visualPercepts": [
      {"emoji": "👋", "action": "Person waving"}
    ],
    "audioPercepts": [
      {"transcript": "Hello UNI!"}
    ]
  }'
```

**Expected:**
```json
{
  "mindMoment": "...",
  "sigilPhrase": "...",
  "kinetic": {"pattern": "..."},
  "lighting": {"color": "...", "pattern": "...", "speed": ...}
}
```

**Note**: This calls the actual LLM! Will cost API tokens.

### Test 6: Activate Personality

```bash
# Replace [ID] with UUID from Test 4
curl -X POST http://localhost:3001/api/personalities/[ID]/activate
```

**Expected:**
```json
{
  "personality": {
    "id": "uuid",
    "name": "Test Personality",
    "slug": "test-v1",
    "active": true,
    ...
  },
  "message": "Personality activated. Restart server to load new personality."
}
```

**Verify**: Restart server, check logs for `🎭 Loaded personality: Test Personality`

### Test 7: Delete Inactive Personality

```bash
# Delete the original (now inactive) personality
# Get ID from Test 1
curl -X DELETE http://localhost:3001/api/personalities/[ORIGINAL-ID]
```

**Expected:**
```json
{
  "success": true,
  "message": "Personality deleted"
}
```

### Test 8: Try to Delete Active Personality (Should Fail)

```bash
# Replace [ID] with currently active personality
curl -X DELETE http://localhost:3001/api/personalities/[ACTIVE-ID]
```

**Expected:**
```json
{
  "error": "Cannot delete active personality. Activate another personality first."
}
```

---

## Integration Tests

### Test 9: Mind Moment Uses Active Personality

1. **Create a distinct personality:**
   ```bash
   curl -X POST http://localhost:3001/api/personalities \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Simple Test Bot",
       "slug": "simple-test",
       "prompt": "You are a simple test bot. Always respond with: {\"mindMoment\": \"TESTING ACTIVE\", \"sigilPhrase\": \"test active\", \"kinetic\": {\"pattern\": \"IDLE\"}, \"lighting\": {\"color\": \"0xff0000\", \"pattern\": \"IDLE\", \"speed\": 0}}"
     }'
   ```

2. **Activate it:**
   ```bash
   curl -X POST http://localhost:3001/api/personalities/[NEW-ID]/activate
   ```

3. **Restart server:**
   ```bash
   # Stop server (Ctrl+C)
   npm start
   # Check logs: 🎭 Loaded personality: Simple Test Bot
   ```

4. **Connect test client and send percept:**
   ```bash
   npm run client:local
   ```
   
5. **Send a percept, watch mind moment:**
   - Should say "TESTING ACTIVE" (from Simple Test Bot personality)
   - **NOT** the UNI tripartite response

6. **Check database:**
   ```bash
   npm run db:query
   ```
   - Latest mind moment should have `personality_id` of Simple Test Bot

---

## Database Verification

### Query Personalities Table

```sql
psql $DATABASE_URL -c "SELECT id, name, slug, active FROM personalities;"
```

### Query Mind Moments with Personality

```sql
psql $DATABASE_URL -c "
  SELECT 
    mm.cycle, 
    mm.mind_moment, 
    p.name as personality_name 
  FROM mind_moments mm 
  LEFT JOIN personalities p ON mm.personality_id = p.id 
  ORDER BY mm.cycle DESC 
  LIMIT 5;
"
```

### Verify Only One Active

```sql
psql $DATABASE_URL -c "SELECT COUNT(*) as active_count FROM personalities WHERE active = true;"
```

**Expected**: `active_count = 1`

---

## Success Criteria

- ✅ Migration 002 applies successfully
- ✅ Personality seeds successfully
- ✅ Server loads personality from DB on startup
- ✅ All API endpoints return correct responses
- ✅ Test endpoint calls LLM and returns valid response
- ✅ Only one personality can be active at a time
- ✅ Cannot delete active personality
- ✅ Mind moments saved with personality_id
- ✅ Activating personality switches which one is used
- ✅ Server restart loads newly activated personality

---

## Troubleshooting

### Migration Fails

```bash
# Check database connection
psql $DATABASE_URL -c "SELECT 1;"

# Check migration status
psql $DATABASE_URL -c "SELECT * FROM schema_migrations;"

# If stuck, reset (CAUTION: DELETES DATA)
# psql $DATABASE_URL -c "DROP TABLE personalities CASCADE;"
# npm run migrate
```

### Seed Fails

```bash
# Check if personality already exists
psql $DATABASE_URL -c "SELECT * FROM personalities WHERE slug = 'uni-tripartite-v2-0';"

# If exists, either delete or skip seed
```

### API Returns 500

```bash
# Check server logs for error
# Common issues:
# - DATABASE_ENABLED not set
# - Database connection failed
# - Migration not run
```

### Personality Not Loading

```bash
# Check DATABASE_ENABLED in .env
echo $DATABASE_ENABLED

# Check active personality exists
curl http://localhost:3001/api/personalities/active

# Check server startup logs for "🎭 Loaded personality"
```

---

## Next Steps

After all tests pass:
- ✅ Phase 3a Backend: COMPLETE
- ⏳ Phase 3b Frontend: Build Personality Forge UI

---

Last updated: November 17, 2025

