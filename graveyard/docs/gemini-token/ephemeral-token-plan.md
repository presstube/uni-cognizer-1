# Ephemeral Token Endpoint Integration Plan

**Date**: November 18, 2025  
**Status**: Implementation Plan  
**Purpose**: Consolidate Gemini token generation from aggregator-1 into cognizer-1

---

## Overview

Move the ephemeral token endpoint from `aggregator-1` into `cognizer-1` to consolidate backend infrastructure and simplify deployment.

### Current State

```
aggregator-1 (Vercel)
  └── api/token.js (Vercel Function)
        ↓ generates ephemeral token
        ↑ aggregator frontend fetches

cognizer-1 (Render)
  ├── WebSocket Server (cognitive loop)
  └── REST API (personalities, sigil-prompts)
```

### Target State

```
aggregator-1 (Static Frontend)
  └── Fetch token from cognizer-1 API

cognizer-1 (Render)
  ├── WebSocket Server (cognitive loop)
  └── REST API
      ├── /api/personalities/*
      ├── /api/sigil-prompts/*
      └── /api/gemini/token  ← NEW
```

### Benefits

1. **Consolidated Backend**: All server logic in one place
2. **Simpler Deployment**: One backend service instead of two
3. **Easier CORS**: Same origin for WebSocket and REST
4. **Cost Efficient**: One server handles everything
5. **Consistent Auth**: Reuse existing security patterns

---

## Architecture Analysis

### Cognizer-1 Current Architecture

**Server Structure** (`server.js`):
- Line 1-35: Database initialization
- Line 37-79: Express app setup + health endpoints
- Line 81-90: Socket.io configuration
- Line 92-289: WebSocket event handlers
- Line 291-306: HTTP server start + graceful shutdown

**API Pattern**:
```
src/api/
├── forge-auth.js        # Basic auth middleware (~40 lines)
├── personalities.js     # Router-based API (~200 lines)
└── sigil-prompts.js     # Router-based API (~230 lines)
```

**Mounting Pattern** (in `server.js`):
```javascript
import personalitiesAPI from './src/api/personalities.js';
import sigilPromptsAPI from './src/api/sigil-prompts.js';

app.use('/api', forgeAuth, personalitiesAPI);
app.get('/api/sigil-prompts', forgeAuth, sigilPrompts.listSigilPrompts);
// ... more sigil-prompts routes
```

### Aggregator-1 Token Endpoint

**Current Implementation** (`api/token.js`):
```javascript
import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  // CORS handling
  // Password protection (x-password header)
  // Token generation with 30min expiry
  // Error handling
}
```

**Key Features**:
- Password protection via `x-password` header
- CORS support for localhost
- 30-minute token expiry
- Single-use tokens
- Error handling with descriptive messages

---

## Implementation Plan

### Phase 1: Create Token API Module

**File**: `src/api/gemini-token.js` (~50 lines)

**Pattern**: Follow existing router-based API modules

```javascript
import { Router } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = Router();

router.get('/gemini/token', async (req, res) => {
  // 1. Optional password check
  // 2. Validate GEMINI_API_KEY
  // 3. Generate ephemeral token
  // 4. Return token + expiry
  // 5. Error handling
});

export default router;
```

**Design Decisions**:
1. **Router-based**: Matches `personalities.js`, `sigil-prompts.js` pattern
2. **Functional**: Pure functions, no classes (Prime Directive #1)
3. **Single responsibility**: Only generates tokens (Prime Directive #2)
4. **~50 lines**: Well under 80-line target (Prime Directive #4)
5. **Existing dependency**: `@google/generative-ai` already installed

**Security Options**:
- **Option A**: Password via `x-password` header (matches aggregator-1)
- **Option B**: Use existing `forgeAuth` middleware (most consistent)
- **Option C**: No auth (simplest, but less secure)

**Recommendation**: Option A (password header) because:
- Matches aggregator-1's existing implementation
- More flexible than Basic Auth (easier for programmatic access)
- Optional (disabled when `TOKEN_PASSWORD` not set)

### Phase 2: Integrate into Server

**File**: `server.js`

**Changes Required**:

1. **Add import** (after line 15):
```javascript
import geminiTokenAPI from './src/api/gemini-token.js';
```

2. **Mount router** (after line 51, before sigil-prompts routes):
```javascript
// Mount Gemini Token API
app.use('/api', geminiTokenAPI);
```

**Total Lines Changed**: 2 lines added

**Why This Location**:
- After personalities API (consistent grouping)
- Before sigil-prompts (which uses individual route mounting)
- Keeps related APIs together

### Phase 3: Environment Configuration

**File**: `.env`

**New Variable**:
```bash
# Gemini Token Endpoint (optional password protection)
TOKEN_PASSWORD=your_secure_password_here
```

**Existing Variables** (no changes):
```bash
GEMINI_API_KEY=...           # Already required
CORS_ORIGIN=*                # Already configured
```

**Production Setup** (Render Dashboard):
1. Add `TOKEN_PASSWORD` environment variable
2. Use strong random password (e.g., `openssl rand -base64 32`)

### Phase 4: Update Aggregator-1

**File**: `aggregator-1/src/app.js`

**Before** (current implementation):
```javascript
const getToken = async () => {
  const res = await fetch('/api/token');
  const { token } = await res.json();
  return token;
};
```

**After** (points to cognizer-1):
```javascript
const COGNIZER_API = import.meta.env.VITE_COGNIZER_URL || 'http://localhost:3001';

const getToken = async () => {
  const res = await fetch(`${COGNIZER_API}/api/gemini/token`, {
    headers: {
      'x-password': import.meta.env.VITE_TOKEN_PASSWORD || ''
    }
  });
  
  if (!res.ok) {
    throw new Error(`Failed to get token: ${res.status}`);
  }
  
  const { token } = await res.json();
  return token;
};
```

**New Environment Variables** (aggregator-1):
```bash
VITE_COGNIZER_URL=http://localhost:3001  # or production URL
VITE_TOKEN_PASSWORD=your_password_here
```

---

## Detailed Implementation

### File 1: `src/api/gemini-token.js`

```javascript
import { Router } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = Router();

/**
 * Generate ephemeral Gemini token for client-side use
 * 
 * GET /api/gemini/token
 * 
 * Headers:
 *   x-password: Optional password (if TOKEN_PASSWORD env var is set)
 * 
 * Response:
 *   { token: string, expiresAt: string }
 * 
 * Use case: Allows aggregator-1 to use Gemini API without exposing key
 */
router.get('/gemini/token', async (req, res) => {
  try {
    // Optional password protection
    const providedPassword = req.headers['x-password'] || req.query.password;
    const correctPassword = process.env.TOKEN_PASSWORD;
    
    if (correctPassword && providedPassword !== correctPassword) {
      console.warn('⚠️  Invalid token password attempt');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate Gemini API key is configured
    if (!process.env.GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY not configured');
      return res.status(500).json({ 
        error: 'Gemini API key not configured' 
      });
    }

    // Create Gemini client
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // Calculate expiry time (30 minutes)
    const expireTime = new Date(Date.now() + 30 * 60 * 1000);
    
    // Generate ephemeral token
    const token = await genAI.generateAuthToken({
      ttl: 1800, // 30 minutes in seconds
    });

    console.log(`✓ Generated ephemeral token (expires: ${expireTime.toISOString()})`);

    res.json({ 
      token: token.value,
      expiresAt: expireTime.toISOString()
    });

  } catch (error) {
    console.error('❌ Token generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate token',
      message: error.message 
    });
  }
});

export default router;
```

**Lines**: 68  
**Complexity**: Low  
**Dependencies**: Existing packages only  
**Side Effects**: Token generation (external API call)  

### File 2: `server.js` Changes

**Change 1** - Add import (after line 15):
```javascript
import geminiTokenAPI from './src/api/gemini-token.js';
```

**Change 2** - Mount router (after line 51):
```javascript
// Mount Gemini Token API
app.use('/api', geminiTokenAPI);
```

**Total Impact**: +3 lines

---

## Testing Strategy

### Local Testing

**Step 1: Start cognizer-1**
```bash
cd cognizer-1
npm start
```

**Step 2: Test endpoint without password**
```bash
curl http://localhost:3001/api/gemini/token
```

Expected response:
```json
{
  "token": "projects/123/locations/us/tokens/abc123...",
  "expiresAt": "2025-11-18T20:30:00.000Z"
}
```

**Step 3: Test with password protection**
```bash
# Set password
export TOKEN_PASSWORD=test123

# Test with correct password
curl http://localhost:3001/api/gemini/token \
  -H "x-password: test123"

# Test with wrong password (should fail)
curl http://localhost:3001/api/gemini/token \
  -H "x-password: wrongpass"
```

Expected: 401 Unauthorized

**Step 4: Test with aggregator-1**
```bash
cd aggregator-1
npm run live:percepts
```

Verify:
- Token fetch succeeds
- Gemini connection works
- Mic module initializes

### Integration Testing

**Test Case 1: Token Generation**
- ✓ Generates valid token
- ✓ Token expires in 30 minutes
- ✓ Token works with Gemini API

**Test Case 2: Security**
- ✓ Requires password when TOKEN_PASSWORD is set
- ✓ Rejects invalid passwords
- ✓ Works without password when TOKEN_PASSWORD not set

**Test Case 3: Error Handling**
- ✓ Returns 500 if GEMINI_API_KEY not set
- ✓ Returns 401 for invalid password
- ✓ Returns descriptive error messages

**Test Case 4: CORS**
- ✓ Accepts requests from localhost
- ✓ Works with aggregator-1 frontend

### Production Testing

1. Deploy to Render
2. Set `TOKEN_PASSWORD` environment variable
3. Update aggregator-1 to use production URL
4. Test token generation from aggregator-1 production build

---

## Deployment

### Step 1: Deploy Cognizer-1

**Git Workflow**:
```bash
cd cognizer-1
git add src/api/gemini-token.js
git add server.js
git commit -m "Add Gemini ephemeral token endpoint"
git push origin main
```

**Render Auto-Deploy**:
- Render detects push
- Runs build
- Deploys new version
- Health check passes

**Post-Deploy**:
1. Add `TOKEN_PASSWORD` env var in Render dashboard
2. Restart service (or wait for auto-restart)
3. Test endpoint: `curl https://uni-cognizer-1.onrender.com/api/gemini/token`

### Step 2: Update Aggregator-1

**Code Changes**:
1. Update `src/app.js` (getToken function)
2. Add `.env.local` with COGNIZER_URL and TOKEN_PASSWORD

**Deploy** (if using Vercel):
```bash
cd aggregator-1
vercel env add VITE_COGNIZER_URL
# Enter: https://uni-cognizer-1.onrender.com

vercel env add VITE_TOKEN_PASSWORD
# Enter: (same as Render TOKEN_PASSWORD)

vercel --prod
```

### Step 3: Remove Old Endpoint

**Optional**: Once confirmed working, remove `aggregator-1/api/token.js`

---

## Security Considerations

### Password Strength

**Recommendation**: Use cryptographically random password

```bash
# Generate secure password
openssl rand -base64 32
```

Example: `8K7n2X9pL4mQ6vR1wY3zT5hJ0cF8dG2s`

### CORS Configuration

**Current**: `process.env.CORS_ORIGIN || '*'`

**Production Recommendation**: Set specific origin
```bash
CORS_ORIGIN=https://aggregator-1.vercel.app
```

### Rate Limiting

**Current**: None

**Future Enhancement**: Add rate limiting to prevent abuse
```javascript
import rateLimit from 'express-rate-limit';

const tokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 tokens per window
  message: 'Too many token requests'
});

router.get('/gemini/token', tokenLimiter, async (req, res) => {
  // ...
});
```

**Status**: Not required for MVP (internal use only)

### Environment Variable Checklist

**Required**:
- ✓ `GEMINI_API_KEY` (already exists)

**Recommended**:
- ✓ `TOKEN_PASSWORD` (adds security)
- ✓ `CORS_ORIGIN` (restricts access)

**Optional**:
- ○ Rate limiting configuration

---

## Documentation Updates

### README.md

Add to "WebSocket API" section (after line 117):

```markdown
---

## REST API

### Gemini Token Generation

Generate ephemeral tokens for client-side Gemini API access (used by aggregator-1).

**Endpoint**: `GET /api/gemini/token`

**Headers**:
- `x-password`: Optional password (if `TOKEN_PASSWORD` env var is set)

**Response**:
```json
{
  "token": "projects/.../tokens/...",
  "expiresAt": "2025-11-18T20:30:00.000Z"
}
```

**Example**:
```bash
curl https://uni-cognizer-1.onrender.com/api/gemini/token \
  -H "x-password: your_password"
```

**Use Case**: Allows aggregator-1 to use Gemini Live API without exposing API key.
```

### .env.example

Create or update:
```bash
# LLM Provider
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_key_here

# Token Endpoint (optional password protection)
TOKEN_PASSWORD=your_secure_password_here

# Server
PORT=3001
CORS_ORIGIN=*
```

---

## Rollback Plan

If issues arise, rollback is simple:

### Rollback Cognizer-1

```bash
git revert HEAD
git push origin main
```

Render auto-deploys previous version.

### Rollback Aggregator-1

1. Revert `src/app.js` changes
2. Keep using Vercel function at `/api/token`
3. No backend dependency

**Risk**: Low (endpoint is additive, doesn't affect existing functionality)

---

## Success Metrics

### Technical Metrics

- ✓ Token endpoint responds in <100ms
- ✓ Tokens work with Gemini Live API
- ✓ Zero errors in production logs
- ✓ Aggregator-1 successfully fetches tokens

### Operational Metrics

- ✓ Simplified deployment (one backend instead of two)
- ✓ Reduced infrastructure costs (no Vercel function)
- ✓ Easier CORS management (same origin)

### Code Quality Metrics

- ✓ New file <80 lines (target met: ~68 lines)
- ✓ Functional programming patterns followed
- ✓ No new dependencies added
- ✓ Consistent with existing API modules

---

## Future Enhancements

### Enhancement 1: Token Caching

**Problem**: Each request generates new token (Gemini API call)

**Solution**: Cache tokens until expiry
```javascript
let cachedToken = null;
let cacheExpiry = null;

router.get('/gemini/token', async (req, res) => {
  const now = Date.now();
  
  // Return cached token if valid
  if (cachedToken && cacheExpiry > now) {
    return res.json({ token: cachedToken, expiresAt: new Date(cacheExpiry) });
  }
  
  // Generate new token
  // ...
});
```

**Status**: Not needed for MVP (tokens last 30 minutes)

### Enhancement 2: Token Analytics

**Feature**: Track token usage

```sql
CREATE TABLE token_requests (
  id UUID PRIMARY KEY,
  requested_at TIMESTAMP,
  expires_at TIMESTAMP,
  used BOOLEAN DEFAULT false
);
```

**Status**: Future enhancement (monitoring)

### Enhancement 3: Multiple Provider Support

**Feature**: Generate tokens for Anthropic, OpenAI

**Status**: Waiting for provider support (only Gemini has ephemeral tokens)

---

## Prime Directive Compliance

✅ **Functional Programming**: Pure functions, no classes  
✅ **Immutable State**: Uses `const`, no mutations  
✅ **Unidirectional Flow**: Request → Generate → Response  
✅ **File Size**: ~68 lines (under 80-line target)  
✅ **Minimal Libraries**: Zero new dependencies  
✅ **Dumb Client**: Aggregator remains stateless, fetches token on demand  

---

## Timeline

**Total Estimated Time**: 1 hour

| Phase | Task | Time |
|-------|------|------|
| 1 | Create `gemini-token.js` | 15 min |
| 2 | Update `server.js` | 5 min |
| 3 | Local testing | 15 min |
| 4 | Deploy to Render | 10 min |
| 5 | Update aggregator-1 | 10 min |
| 6 | Integration testing | 10 min |
| 7 | Documentation | 10 min |

---

## Open Questions

1. **Password Protection**: Required or optional?
   - **Recommendation**: Optional (default off, enable with `TOKEN_PASSWORD`)

2. **Rate Limiting**: Should we add it?
   - **Recommendation**: No (internal use only, low traffic)

3. **Token TTL**: Should 30 minutes be configurable?
   - **Recommendation**: No (30 min is Gemini's recommended default)

4. **Multiple Tokens**: Should we support batch token generation?
   - **Recommendation**: No (aggregator only needs one at a time)

---

## Approval Checklist

Before implementing:

- [ ] Architecture approved
- [ ] Security approach approved (password via header)
- [ ] File structure approved (`src/api/gemini-token.js`)
- [ ] Testing strategy approved
- [ ] Documentation plan approved

---

## Implementation Command

When ready to implement:

```bash
# 1. Create API module
cat > src/api/gemini-token.js << 'EOF'
[... implementation code ...]
EOF

# 2. Update server.js
# (add import and mount router)

# 3. Test locally
npm start
curl http://localhost:3001/api/gemini/token

# 4. Commit and push
git add src/api/gemini-token.js server.js
git commit -m "Add Gemini ephemeral token endpoint"
git push origin main
```

---

**Status**: Ready for implementation  
**Complexity**: Low  
**Risk**: Low (additive change, no breaking changes)  
**Approval**: Awaiting user confirmation

---

**Author**: AI Assistant  
**Date**: November 18, 2025  
**Version**: 1.0

