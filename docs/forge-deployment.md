# Forge Deployment Guide

## Password Protection Setup

### Local Development (No Auth)

```bash
# .env
FORGE_AUTH_ENABLED=false  # Or just omit - defaults to off
```

### Production Deployment (With Auth)

```bash
# .env or Railway/Render env vars
FORGE_AUTH_ENABLED=true
FORGE_USERNAME=writer       # Optional, defaults to "admin"
FORGE_PASSWORD=your-secure-password-here
```

### How It Works

**Basic HTTP Authentication** - Browser shows login prompt:
- Username: `writer` (or whatever you set)
- Password: Your secure password
- Browser remembers for session

**What's Protected:**
- `/forge/` - Forge UI
- `/api/personalities/*` - All personality API endpoints

**What's NOT Protected:**
- `/` - Health check
- `/health` - Health check
- WebSocket connections - UNI's cognitive loop

---

## Deployment Steps

### 1. Deploy to Railway/Render

```bash
# Push to main
git push origin main

# Railway/Render auto-deploys
```

### 2. Set Environment Variables

**In Railway/Render dashboard:**

```
DATABASE_ENABLED=true
DATABASE_URL=postgresql://...  (auto-provided)
LLM_PROVIDER=gemini
GEMINI_API_KEY=your-key

# NEW: Forge auth
FORGE_AUTH_ENABLED=true
FORGE_USERNAME=writer
FORGE_PASSWORD=SecurePassword123!
```

### 3. Share with Writer

Send them:
- URL: `https://your-app.railway.app/forge/`
- Username: `writer`
- Password: `SecurePassword123!`

**First login:**
- Browser shows login prompt
- Enter credentials
- Browser remembers for session

---

## Writer Workflow

### 1. Access Forge
```
https://your-app.railway.app/forge/
```

### 2. Create/Edit Personality
- Load existing personality from dropdown
- Edit prompt
- Save with new name/slug

### 3. Test with Mock Percepts
- Select preset (greeting, silence, etc.)
- Click "🧪 Test"
- See LLM response immediately
- Iterate on prompt

### 4. Activate for Production
- Click "✓ Set Active"
- Confirms activation

### 5. Deploy to UNI
**You (developer) restart server:**
```bash
# Render: Auto-restart via dashboard
# Railway: Auto-restart via dashboard
# Or: Just push any commit to trigger redeploy
```

**Server logs show:**
```
🎭 Loaded personality: [Writer's New Personality]
```

**UNI now uses new personality!**

---

## Security Notes

### ✅ Good Enough For Internal Tool
- Basic Auth is simple, works everywhere
- Good for small team (1-5 people)
- No extra dependencies
- Built into all browsers

### ⚠️ Limitations
- Password sent in base64 (use HTTPS!)
- No rate limiting
- No user roles (everyone has full access)
- No audit log

### 🔒 For Production-Grade Security (Future)
- Add proper authentication (JWT, OAuth)
- Role-based access (admin, writer, viewer)
- Audit logging (who changed what)
- Rate limiting on test endpoint (LLM costs!)

---

## Troubleshooting

### "Authentication required" loop
- Check `FORGE_AUTH_ENABLED=true`
- Check `FORGE_PASSWORD` is set
- Try incognito window (clears auth)

### Can't access Forge
- Check server logs for auth errors
- Verify env vars in Railway/Render dashboard
- Try with `FORGE_AUTH_ENABLED=false` first

### Password not working
- Check for typos in env vars
- Username defaults to "admin" if not set
- Clear browser cache/cookies

---

## Alternative: Railway Private Networking

**Even simpler** - Use Railway's built-in auth:
1. Don't enable `FORGE_AUTH_ENABLED`
2. Use Railway's "Private" network setting
3. Only accessible via Railway's secure URLs
4. Railway handles auth automatically

(But this locks it to Railway - Basic Auth works anywhere)

---

Last updated: November 17, 2025

