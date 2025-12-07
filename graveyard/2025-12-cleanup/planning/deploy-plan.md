# Cognizer-1 Railway Deployment Plan

**Goal**: Deploy the WebSocket server to Railway so the aggregator can connect from anywhere.

**Don't worry!** This is straightforward. Railway handles almost everything automatically.

---

## Pre-Flight Check ✅

Before we start, let's confirm:

- [ ] You have a Railway account (we'll create one if not)
- [ ] Server works locally (`npm run dev:full`)
- [ ] You have your API keys ready (OpenAI, Anthropic, or Gemini)
- [ ] Git is working in this directory

---

## What We're Deploying

**Only the backend WebSocket server** (port 3001)
- The `host/` test client stays local for now
- Railway will give us a URL like: `cognizer-1-production.up.railway.app`
- The aggregator will connect to that URL instead of `localhost:3001`

---

## Deployment Steps

### Step 1: Create Railway Account (5 min)
1. Go to https://railway.app
2. Click "Login" → Use GitHub or email
3. Free tier gives you $5/month credit (plenty for testing)
4. Verify email if needed

### Step 2: Prepare the Code (2 min)
We need to make sure Railway knows how to start our server.

**Check `package.json`:**
- ✅ Has `"main": "server.js"`
- ✅ Has `"start": "node server.js"`
- ✅ Railway will automatically run `npm start`

**Create `.railwayignore`** (tells Railway what NOT to upload):
```
node_modules/
host/
scripts/
data/mock-*.json
src/fake-*.js
src/main-fake.js
.env
.git/
*.md
docs/
```

This keeps the deployment lean (only production code).

### Step 3: Create Railway Project (3 min)
1. Go to https://railway.app/new
2. Click **"Deploy from GitHub repo"**
3. Connect your GitHub account (if not already)
4. Select the `cognizer-1` repository
5. Railway will auto-detect it's a Node.js app

**OR Deploy from CLI (alternative):**
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

We'll use the web UI (easier for first time).

### Step 4: Set Environment Variables (5 min)
In Railway dashboard:

1. Click your project
2. Go to **"Variables"** tab
3. Add these (click "+ New Variable" for each):

```
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-proj-...your-actual-key...
PORT=3001
SESSION_TIMEOUT_MS=60000
CORS_ORIGIN=*
```

**Important**: 
- Copy your real API key (don't share it!)
- Railway encrypts these automatically
- Can add Anthropic/Gemini keys later if you want to switch

### Step 5: Deploy! (2 min)
Railway auto-deploys when you add variables.

You'll see:
- ⚙️ Building...
- 📦 Deploying...
- ✅ Deployed!

Click **"View Logs"** to watch it start up.

### Step 6: Get Your URL (1 min)
1. In Railway dashboard, click **"Settings"**
2. Scroll to **"Domains"**
3. Click **"Generate Domain"**
4. You'll get something like: `cognizer-1-production.up.railway.app`

Copy this URL - you'll need it for the aggregator!

### Step 7: Test the Deployment (5 min)
Update your local test host to point to Railway:

**In `host/index.html`**, change:
```javascript
const SOCKET_URL = 'https://cognizer-1-production.up.railway.app';
```

Then test:
```bash
npm run host
```

Open `http://localhost:8080/host/` and try starting a session!

---

## Troubleshooting

### "Build Failed"
**Check Railway logs** - usually missing dependency or env var.

**Fix**: Make sure all npm packages are in `package.json` dependencies (not devDependencies).

### "Application Failed to Respond"
**Check**: 
- Railway assigns a `PORT` env var (we use 3001, should be fine)
- Logs show server started

**Fix**: Verify `server.js` logs show the startup banner.

### "WebSocket Connection Failed"
**Check**:
- URL uses `https://` (Railway auto-provides SSL)
- CORS_ORIGIN is set to `*`

**Fix**: Socket.io handles WebSocket/polling automatically over HTTPS.

### "API Key Invalid"
**Check**: Railway Variables tab shows your key

**Fix**: Re-paste the full key (including `sk-proj-` prefix for OpenAI).

---

## Post-Deployment

### Monitor Usage
Railway dashboard shows:
- CPU/Memory usage
- Network bandwidth
- Build/deploy history
- Live logs

### Cost Estimate
**Free tier**: $5/month credit
- ~150 hours of uptime
- WebSocket server is lightweight
- Main cost is LLM API calls (not Railway)

**Paid hobby**: $5/month subscription if you need more

### Updates
Whenever you push to GitHub:
- Railway auto-deploys
- Zero downtime (seamless swap)
- Can rollback to previous version

### Pause/Delete
- **Pause**: Settings → Sleep project (stops charging)
- **Delete**: Settings → Delete project (clears everything)

---

## What Changes in Your Aggregator

**Before (local):**
```javascript
const socket = io('http://localhost:3001');
```

**After (Railway):**
```javascript
const socket = io('https://cognizer-1-production.up.railway.app');
```

Everything else stays the same!

---

## Security Notes

✅ **Good**:
- Railway encrypts env vars
- HTTPS by default
- Isolated environment

⚠️ **Watch Out**:
- Don't commit `.env` to git (already in `.gitignore`)
- Rotate API keys if exposed
- CORS is wide open (`*`) - fine for testing, tighten for production

---

## Next Steps After Deploy

1. Update aggregator to use Railway URL
2. Test full cam/mic → cognizer → sigil flow
3. Monitor costs/usage
4. Add health check endpoint (optional)
5. Set up Sentry for error tracking (optional)

---

## Help & Support

- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: Great community support
- **This README**: Keep the `.env` template handy

---

## Quick Command Reference

```bash
# View logs in CLI
railway logs

# Open dashboard
railway open

# Link to existing project
railway link

# Redeploy
railway up

# Check status
railway status
```

---

**Ready?** Let's start with Step 1! 🚀

