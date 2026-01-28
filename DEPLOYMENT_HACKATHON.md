# Vercel Deployment Guide - Decision Trace (Hackathon)

## 🚀 Quick Deploy

### Option 1: Deploy via Vercel CLI (Recommended)

```bash
# Option A: Install Vercel CLI globally
npm i -g vercel

# Option B: Use npx (no installation needed)
# Just use 'npx vercel' instead of 'vercel' in commands below

# Login to Vercel
vercel login
# Or: npx vercel login

# Deploy to production
vercel --prod
# Or: npx vercel --prod
```

### Option 2: Deploy via Vercel UI

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure environment variables (see below)
5. Click "Deploy"

---

## 📋 Prerequisites

### Required Environment Variables

**Demo Mode is DEFAULT for Hackathon Deployments:**

```bash
DEMO_MODE=true
# Or simply omit GEMINI_API_KEY (auto-enables demo mode)
```

**Demo Mode Benefits:**
- ✅ No API key required
- ✅ "Load Sample Case" works instantly
- ✅ No database persistence needed
- ✅ Perfect for hackathon judging
- ✅ Zero costs

**Optional: Live Gemini 3 Mode** (Only if you want real AI analysis):
```bash
GEMINI_API_KEY=your-gemini-api-key-here
# This disables demo mode and enables live Gemini 3
```

### Database Configuration

**Option A: Demo Mode (No Database Required)**
- Demo endpoints work without database
- Uses in-memory/mock responses
- Perfect for hackathon demos

**Option B: Vercel Postgres (Production)**
```bash
# Add Vercel Postgres integration in Vercel dashboard
# DATABASE_URL will be automatically set

# IMPORTANT: Set DATABASE_URL to the prisma+postgres:// URL on Vercel and redeploy.
# The vercel-build script will automatically apply the schema using `prisma db push`.
```

**Option C: SQLite (Local Development Only)**
- Not recommended for Vercel (ephemeral filesystem)
- Use for local testing only

---

## 🔧 Build Configuration

### Package.json Scripts

The app includes:
- ✅ `"build": "next build"` - Standard Next.js build
- ✅ `"start": "next start"` - Production server
- ✅ `"vercel-build": "npm run prisma:generate:pg && npm run prisma:migrate:pg && npx next build"` - Vercel build hook

### Vercel Build Settings

Vercel will automatically:
1. Run `npm install`
2. Run `vercel-build` script (if defined) or `npm run build`
3. Deploy the application

**Note**: If using Postgres, ensure `DATABASE_URL` is set in Vercel environment variables.

---

## 📝 Step-by-Step Deployment

### Step 1: Login to Vercel

```bash
# Using npx (no installation needed)
npx vercel login

# Or if you installed globally:
vercel login
```

This will open a browser window for authentication.

### Step 2: Link Project (First Time)

```bash
npx vercel link
# Or: vercel link
```

Follow the prompts:
- Set up and deploy? **Yes**
- Which scope? **Your account**
- Link to existing project? **No** (for first deploy)
- Project name? **decision-trace** (or your preferred name)
- Directory? **./** (current directory)

### Step 3: Set Environment Variables

**Option A: Via CLI**
```bash
# For Demo Mode (Recommended for Hackathon)
npx vercel env add DEMO_MODE production
# Enter: true

# Optional: If you have a Gemini API key
npx vercel env add GEMINI_API_KEY production
# Enter: your-api-key-here
```

**Option B: Via Vercel Dashboard** (Recommended)
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to Settings → Environment Variables
4. Add variables:
   - `DEMO_MODE` = `true` (Production)
   - `GEMINI_API_KEY` = (optional, only if not using demo mode)
5. Click "Save"

### Step 4: Deploy to Production

```bash
npx vercel --prod
# Or: vercel --prod
```

This will:
1. Build the application
2. Run Prisma migrations (if using Postgres)
3. Deploy to production
4. Provide you with a production URL

---

## ✅ Verify Deployment

### 1. Check Health Endpoint

```bash
curl https://your-app.vercel.app/api/health
```

Expected response:
```json
{"status":"ok"}
```

### 2. Test Demo Flow

Visit your production URL and:
1. ✅ See the landing page with "Try Demo" section
2. ✅ Click "Load Sample Case" button
3. ✅ Verify it navigates to `/case/[id]`
4. ✅ Click "Open Report" button
5. ✅ Click "Open Public Share Link" button
6. ✅ Verify public share page loads

### 3. Test API Endpoints

```bash
# Test demo load endpoint
curl -X POST https://your-app.vercel.app/api/demo/load-sample

# Expected: { "caseId": "...", "slug": "...", "shareSlug": "..." }
```

---

## 🔍 Troubleshooting

### Build Fails

**Issue**: Prisma client generation fails
**Solution**: 
- Ensure `DATABASE_URL` is set (even if using demo mode)
- Check `vercel-build` script runs correctly
- Verify Postgres schema exists if using Postgres

**Issue**: TypeScript errors
**Solution**:
```bash
npm run typecheck
# Fix any errors before deploying
```

### Runtime Errors

**Issue**: "Database connection failed"
**Solution**:
- Demo mode should work without database
- Check `DEMO_MODE=true` is set
- Verify demo endpoints return mock data

**Issue**: "Gemini API key required"
**Solution**:
- Set `DEMO_MODE=true` OR
- Set `GEMINI_API_KEY` environment variable

### Environment Variables Not Working

**Issue**: Variables not available at runtime
**Solution**:
- Ensure variables are set for "Production" environment
- Redeploy after adding variables: `vercel --prod`
- Check variable names match exactly (case-sensitive)

---

## 🎯 Demo Mode Configuration

### How Demo Mode Works

1. **Auto-Enabled**: If `GEMINI_API_KEY` is not set, demo mode auto-enables
2. **No Database Required**: Demo endpoints return mock data
3. **No API Calls**: Gemini calls are mocked
4. **Seeded Data**: `/api/demo/load-sample` creates demo case on demand

### Demo Mode Endpoints

- ✅ `/api/demo/load-sample` - Loads/creates demo case
- ✅ `/api/case/[id]/report` - Returns demo report (mock data if missing)
- ✅ `/api/public/case/[slug]` - Returns demo public report
- ✅ `/api/health` - Always works

---

## 📊 Production Checklist

Before deploying to production:

- [x] `package.json` has `"build"` and `"start"` scripts
- [x] `vercel.json` configured (if needed)
- [x] Environment variables set
- [x] Health endpoint works (`/api/health`)
- [x] Demo mode tested locally
- [x] Build succeeds (`npm run build`)
- [x] TypeScript compiles (`npm run typecheck`)

---

## 🔄 Updating Deployment

### Redeploy After Changes

```bash
# Make your code changes
git add .
git commit -m "Update for deployment"
git push

# Redeploy to Vercel
vercel --prod
```

### Update Environment Variables

```bash
# Update a variable
vercel env rm DEMO_MODE
vercel env add DEMO_MODE
# Enter new value

# Redeploy to apply changes
vercel --prod
```

---

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs)
- [Vercel CLI Reference](https://vercel.com/docs/cli)

---

## 🎉 Success!

Once deployed, your app will be available at:
- **Production**: `https://your-app.vercel.app`
- **Preview**: `https://your-app-git-branch.vercel.app` (for branches)

Share the production URL with hackathon judges! 🚀

