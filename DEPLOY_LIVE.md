# Deploy Decision Trace to Production (One-Time)

## Quick Deployment Guide

This guide deploys Decision Trace to **Vercel Free Tier** with **Neon Free Postgres** in a single deployment.

---

## Prerequisites

1. **GitHub Account** (free)
2. **Vercel Account** (free) - Sign up at https://vercel.com
3. **Neon Account** (free) - Sign up at https://neon.tech
4. **Google Cloud Account** (free) - For Gemini API key at https://aistudio.google.com/apikey

---

## Step 1: Set Up Neon Postgres Database (5 minutes)

1. **Go to Neon**: https://neon.tech
2. **Sign up** (free, no credit card)
3. **Create a new project**
   - Project name: `decision-trace` (or any name)
   - Region: Choose closest to you
4. **Copy the connection string**
   - In Neon dashboard, find "Connection string"
   - Format: `postgresql://user:password@host/dbname?sslmode=require`
   - **Save this** - you'll need it for Step 3

**Free Tier Limits:**
- 0.5 GB storage
- Unlimited projects
- No credit card required

---

## Step 2: Get Gemini API Key (2 minutes)

1. **Go to Google AI Studio**: https://aistudio.google.com/apikey
2. **Sign in** with Google account
3. **Click "Create API Key"**
4. **Copy the API key** - you'll need it for Step 3

**Note**: App works in demo mode without API key, but real Gemini calls require this.

---

## Step 3: Push Code to GitHub (if not already)

```bash
# If you haven't initialized git yet
git init
git add .
git commit -m "Initial commit - Decision Trace"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

**Replace** `YOUR_USERNAME` and `YOUR_REPO` with your actual GitHub username and repository name.

---

## Step 4: Deploy to Vercel (10 minutes)

### Option A: GitHub Integration (Recommended)

1. **Go to Vercel**: https://vercel.com
2. **Sign up/Login** (use GitHub account for easiest setup)
3. **Click "Add New Project"**
4. **Import your GitHub repository**
   - Select the repository you just pushed
   - Vercel will auto-detect the project
5. **Configure Project Settings**:
   - **Framework Preset**: Leave as auto-detected (or "Other" if needed)
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run vercel-build` (or leave default)
   - **Output Directory**: Leave default
6. **Add Environment Variables** (IMPORTANT):
   Click "Environment Variables" and add:
   
   ```
   Name: DATABASE_URL
   Value: <paste-your-neon-connection-string>
   Environment: Production, Preview, Development (check all)
   ```
   
   ```
   Name: GEMINI_API_KEY
   Value: <paste-your-gemini-api-key>
   Environment: Production, Preview, Development (check all)
   ```
   
   ```
   Name: FREE_MODE
   Value: true
   Environment: Production, Preview, Development (check all)
   ```
   
   ```
   Name: NODE_ENV
   Value: production
   Environment: Production (only)
   ```

7. **Click "Deploy"**
   - Vercel will build and deploy your app
   - This takes 2-5 minutes
   - Watch the build logs for any errors

8. **Wait for deployment to complete**
   - You'll see a success message with your app URL
   - Example: `https://your-app-name.vercel.app`

### Option B: Vercel CLI (Alternative)

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy (one-time production deployment)
vercel --prod

# Set environment variables (run these one by one)
vercel env add DATABASE_URL production
# Paste your Neon connection string when prompted

vercel env add GEMINI_API_KEY production
# Paste your Gemini API key when prompted

vercel env add FREE_MODE production
# Enter: true

vercel env add NODE_ENV production
# Enter: production

# Redeploy to apply env vars
vercel --prod
```

---

## Step 5: Verify Deployment

1. **Visit your app URL** (from Vercel dashboard)
2. **Test the app**:
   - Load sample case (should work)
   - Try uploading a document (if API key is set)
   - Check that free mode limits are enforced

3. **Check Vercel logs**:
   - Go to Vercel dashboard → Your project → "Deployments" → Click latest deployment → "Logs"
   - Look for any errors

---

## Environment Variables Summary

| Variable | Value | Required | Notes |
|----------|-------|----------|-------|
| `DATABASE_URL` | Neon Postgres connection string | ✅ Yes | From Neon dashboard |
| `GEMINI_API_KEY` | Google Gemini API key | ⚠️ Optional | App works in demo mode without it |
| `FREE_MODE` | `true` | ✅ Yes | Enables free tier limits |
| `NODE_ENV` | `production` | ✅ Yes | Production environment |

---

## Troubleshooting

### Build Fails

**Error: "Prisma Client not generated"**
- Solution: The `vercel-build` script should handle this. Check that `package.json` has:
  ```json
  "vercel-build": "prisma generate && prisma migrate deploy && next build"
  ```

**Error: "Database connection failed"**
- Check `DATABASE_URL` is correct
- Verify Neon database is running
- Check connection string format

**Error: "Module not found"**
- Run `npm install` locally first
- Ensure all dependencies are in `package.json`

### Runtime Errors

**Error: "GEMINI_API_KEY not found"**
- This is OK if you want demo mode only
- Or add the API key in Vercel environment variables

**Error: "Rate limit exceeded"**
- This is expected in free mode
- Check `FREE_MODE=true` is set
- Limits: 3 runs/day per IP, 10 requests/minute

---

## Post-Deployment Checklist

- [ ] App loads at Vercel URL
- [ ] Database connection works (check Vercel logs)
- [ ] Sample case loads (demo mode)
- [ ] Free mode limits are enforced
- [ ] Environment variables are set correctly
- [ ] No errors in Vercel logs

---

## Important Notes

1. **One-Time Deployment**: Deploy once. Don't keep redeploying unless you make code changes.

2. **Free Tier Limits**:
   - Vercel: 100GB bandwidth/month, unlimited requests
   - Neon: 0.5GB storage, auto-suspend after 5 min inactivity
   - Gemini: Free tier with rate limits

3. **Database Auto-Suspend**: Neon free tier suspends after 5 minutes of inactivity. First request after suspend takes ~5 seconds to wake up.

4. **Environment Variables**: Set them once in Vercel dashboard. They persist across deployments.

5. **Custom Domain** (Optional): Vercel free tier includes one custom domain. Add in Vercel project settings.

---

## Your Live App URL

After deployment, your app will be available at:
```
https://your-project-name.vercel.app
```

**Save this URL** - this is your production app!

---

## Need Help?

- **Vercel Docs**: https://vercel.com/docs
- **Neon Docs**: https://neon.tech/docs
- **Gemini API Docs**: https://ai.google.dev/docs

---

**Deploy once. Test thoroughly. You're done!** ✅

