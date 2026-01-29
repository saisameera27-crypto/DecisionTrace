# 🚀 Vercel Deploy Checklist - Decision Trace (Hackathon)

**Last Updated**: 2026-01-28  
**Status**: ✅ Ready for Hackathon Deployment

---

## 📋 Pre-Deployment Checklist

### ✅ Repository Status
- [ ] All code committed and pushed to GitHub
- [ ] `.gitignore` excludes secrets, build artifacts, DB files
- [ ] `.env.example` is committed (template only, no secrets)
- [ ] `package.json` has `"build"` and `"start"` scripts
- [ ] `vercel.json` exists with function timeouts configured

---

## 🔐 Environment Variables (Hackathon Demo)

### Required for Demo Mode (Default)

**Set these in Vercel Dashboard → Project → Settings → Environment Variables:**

```bash
# ============================================
# DEMO MODE (Default - No API Key Required)
# ============================================
DEMO_MODE=true

# ============================================
# DATABASE (Optional for Demo Mode)
# ============================================
# For demo mode, database is optional
# If using Vercel Postgres, DATABASE_URL is auto-set
# If not using database, demo endpoints work without it

# ============================================
# APPLICATION
# ============================================
NODE_ENV=production
PRISMA_SCHEMA_TARGET=postgres
# Note: Use 'postgres' for Vercel, even in demo mode
# (Vercel uses Postgres schema, demo mode just mocks Gemini)
```

### Optional: Live Gemini 3 Mode

**Only set if you want real AI analysis (not required for hackathon):**

```bash
GEMINI_API_KEY=your-gemini-api-key-here
# Setting this disables demo mode and enables live Gemini 3
```

### Environment Variables Summary

| Variable | Demo Mode | Live Mode | Notes |
|----------|-----------|-----------|-------|
| `DEMO_MODE` | `true` | `false` or omit | **Default: `true`** |
| `GEMINI_API_KEY` | Omit | Required | Auto-enables demo if omitted |
| `DATABASE_URL` | Optional | Required | Auto-set if using Vercel Postgres |
| `PRISMA_SCHEMA_TARGET` | `postgres` | `postgres` | Always `postgres` on Vercel |
| `NODE_ENV` | `production` | `production` | Required |

---

## 🏗️ Build Configuration

### Build Command

**Vercel will automatically use:**
```bash
npm run vercel-build
```

**Which runs:**
```bash
npm run prisma:generate:pg && npm run prisma:migrate:pg && npx next build
```

### Build Output Checks

**✅ Successful Build Should Show:**
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages
✓ Finalizing page optimization
```

**✅ Prisma Generation Should Show:**
```
✔ Generated Prisma Client (X.XXs)
```

**✅ Migration Should Show:**
```
✔ Applied migration: XXXXXXXXXX
```

### Build Settings in Vercel

1. **Framework Preset**: Next.js (auto-detected)
2. **Build Command**: `npm run vercel-build` (or leave empty for auto)
3. **Output Directory**: `.next` (auto-detected)
4. **Install Command**: `npm install` (default)
5. **Node Version**: `20.x` (see `package.json` engines)

---

## 🗄️ Prisma Strategy

### Demo Mode (Hackathon Default)

**Strategy**: Use Vercel Postgres (even in demo mode)

**Why:**
- Demo mode only mocks Gemini API calls
- Database is still used for storing cases/reports
- Vercel Postgres is free tier friendly
- SQLite doesn't work on Vercel (ephemeral filesystem)

**Setup:**
1. In Vercel Dashboard → Project → Storage
2. Click "Create Database" → Select "Postgres"
3. `DATABASE_URL` is automatically set
4. `PRISMA_SCHEMA_TARGET=postgres` (required)

**Build Process:**
```bash
# Uses Postgres schema
npm run prisma:generate:pg
npm run prisma:migrate:pg
npx next build
```

### Production Mode (Live Gemini)

**Strategy**: Same as demo mode (Vercel Postgres)

**Additional Requirements:**
- `GEMINI_API_KEY` must be set
- `DEMO_MODE=false` or omit (auto-disabled if API key present)

### Local Development (SQLite)

**Note**: SQLite is for local development only, not Vercel

**Local Setup:**
```bash
PRISMA_SCHEMA_TARGET=sqlite
DATABASE_URL=file:./tmp/demo.db
npm run prisma:generate:sqlite
npm run prisma:db:push:sqlite
```

---

## ✅ Post-Deployment Verification

### 1. Health Check

**Endpoint**: `https://your-app.vercel.app/api/health`

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-28T..."
}
```

**Check:**
- [ ] Returns `200 OK`
- [ ] Response has `status: "ok"`

---

### 2. Landing Page

**URL**: `https://your-app.vercel.app/`

**Verify:**
- [ ] Page loads without errors
- [ ] "Demo Mode" badge is visible (if `DEMO_MODE=true`)
- [ ] "Try Demo (No Login Required)" section is visible
- [ ] Three buttons are present:
  - [ ] "Load Sample Case" button
  - [ ] "Open Report" button
  - [ ] "Open Public Share Link" button
- [ ] "Powered by Google Gemini 3" footer is visible

**Test IDs to Check:**
- `[data-testid="load-sample-case-button"]`
- `[data-testid="open-report-button"]`
- `[data-testid="open-public-share-button"]`

---

### 3. Demo Mode Status API

**Endpoint**: `https://your-app.vercel.app/api/mode-status`

**Expected Response (Demo Mode):**
```json
{
  "enabled": true,
  "reason": "explicit",
  "hasApiKey": false
}
```

**Verify:**
- [ ] Returns `200 OK`
- [ ] `enabled: true` (if demo mode)
- [ ] `hasApiKey: false` (if no API key)

---

### 4. Load Sample Case

**Action**: Click "Load Sample Case" button on landing page

**Expected:**
- [ ] Button shows loading state
- [ ] Navigates to `/case/[id]` (case page)
- [ ] Report page loads without errors
- [ ] Report root element is visible: `[data-testid="report-root"]`
- [ ] Report header is visible: `[data-testid="report-header"]`

**API Endpoint**: `POST /api/demo/load-sample`

**Expected Response:**
```json
{
  "caseId": "demo-sample-case",
  "message": "Demo case loaded successfully"
}
```

---

### 5. Report Page

**URL**: `https://your-app.vercel.app/case/[id]`

**Verify:**
- [ ] Page loads without errors
- [ ] Report root is visible: `[data-testid="report-root"]`
- [ ] Report header is visible: `[data-testid="report-header"]`
- [ ] Report content is displayed (title, summary, etc.)
- [ ] No console errors in browser DevTools

**Test IDs:**
- `[data-testid="report-root"]`
- `[data-testid="report-header"]`
- `[data-testid="tab-overview"]` (if tabs exist)

---

### 6. Public Report Page

**Action**: Click "Open Public Share Link" button on landing page

**Expected:**
- [ ] Button shows loading state
- [ ] Navigates to `/public/case/[slug]` (public report page)
- [ ] Public report page loads without errors
- [ ] Read-only badge is visible: `[data-testid="public-report-readonly-badge"]`
- [ ] Public report root is visible: `[data-testid="public-report-root"]`
- [ ] Decision title is displayed: `[data-testid="public-report-decision-title"]`
- [ ] Summary section is visible: `[data-testid="public-report-summary"]`
- [ ] Diagram section is visible: `[data-testid="public-report-diagram"]`
- [ ] Evidence section is visible: `[data-testid="public-report-evidence"]`

**URL**: `https://your-app.vercel.app/public/case/[slug]`

**Verify:**
- [ ] No authentication required
- [ ] Read-only indicator is visible
- [ ] All sections render correctly

---

### 7. API Endpoints (Optional Verification)

**Health Check:**
```bash
curl https://your-app.vercel.app/api/health
```

**Mode Status:**
```bash
curl https://your-app.vercel.app/api/mode-status
```

**Load Sample Case:**
```bash
curl -X POST https://your-app.vercel.app/api/demo/load-sample
```

---

## 🔧 Common Failure Fixes

### 1. Next.js Config ESM Error

**Error:**
```
Error: Must use import to load ES Module
```

**Fix:**
- ✅ Already fixed: `next.config.cjs` uses CommonJS (`.cjs` extension)
- ✅ `package.json` has `"type": "module"` but Next.js config is `.cjs`
- ✅ No action needed if using current config

**If Still Failing:**
```javascript
// next.config.cjs (already correct)
module.exports = {
  // config
};
```

---

### 2. Prisma Client Not Generated

**Error:**
```
@prisma/client did not initialize yet. Please run "prisma generate"
```

**Fix:**
1. **Check `vercel-build` script in `package.json`:**
   ```json
   "vercel-build": "npm run prisma:generate:pg && npm run prisma:migrate:pg && npx next build"
   ```

2. **Verify `postinstall` script:**
   ```json
   "postinstall": "npm run prisma:generate:pg"
   ```

3. **Ensure `PRISMA_SCHEMA_TARGET=postgres` is set**

4. **Check Vercel build logs for Prisma generation output**

---

### 3. Missing Environment Variables

**Error:**
```
Environment variable DATABASE_URL is missing
```

**Fix:**
1. **For Demo Mode (No Database):**
   - Demo endpoints work without `DATABASE_URL`
   - Only set if using Vercel Postgres

2. **For Production (With Database):**
   - Add Vercel Postgres integration
   - `DATABASE_URL` is automatically set
   - Or manually set in Environment Variables

3. **Verify in Vercel Dashboard:**
   - Project → Settings → Environment Variables
   - Ensure variables are set for "Production" environment

---

### 4. Prisma Migration Fails

**Error:**
```
Migration failed: P3005
```

**Fix:**
1. **Check `DATABASE_URL` is correct:**
   ```bash
   # Should be Postgres connection string
   postgresql://user:password@host:5432/database
   ```

2. **Verify schema file exists:**
   - `prisma/schema.postgres.prisma` should exist

3. **Check migration command:**
   ```bash
   # Should use Postgres schema
   npm run prisma:migrate:pg
   ```

4. **If migrations don't exist:**
   - Run `prisma db push` instead of `migrate deploy`
   - Or create initial migration locally

---

### 5. Build Timeout

**Error:**
```
Build exceeded maximum build time
```

**Fix:**
1. **Optimize build:**
   - Remove unnecessary dependencies
   - Check for large files in `public/`
   - Ensure `.gitignore` excludes build artifacts

2. **Check Vercel plan limits:**
   - Free tier: 45 minutes
   - Pro tier: 45 minutes
   - Enterprise: Custom

3. **Optimize Prisma generation:**
   - Ensure only Postgres schema is generated
   - Don't generate SQLite schema on Vercel

---

### 6. Module Resolution Errors

**Error:**
```
Cannot find module '@/lib/...'
```

**Fix:**
1. **Verify `tsconfig.json` has:**
   ```json
   {
     "compilerOptions": {
       "baseUrl": ".",
       "paths": {
         "@/*": ["./*"]
       }
     }
   }
   ```

2. **Check `next.config.cjs` doesn't override paths**

3. **Ensure imports use `@/` prefix:**
   ```typescript
   import { something } from '@/lib/...';
   ```

---

### 7. Demo Mode Not Working

**Error:**
```
Demo mode not enabled
```

**Fix:**
1. **Set `DEMO_MODE=true` in Vercel environment variables**

2. **Or omit `GEMINI_API_KEY` (auto-enables demo mode)**

3. **Verify in code:**
   ```typescript
   // lib/demo-mode.ts
   export function isDemoMode(): boolean {
     if (process.env.DEMO_MODE === 'true') return true;
     if (!process.env.GEMINI_API_KEY) return true; // Auto-enable
     return false;
   }
   ```

4. **Check `/api/mode-status` endpoint:**
   ```bash
   curl https://your-app.vercel.app/api/mode-status
   ```

---

### 8. Public Report Page 404

**Error:**
```
404 - Page not found
```

**Fix:**
1. **Verify route exists:**
   - `app/public/case/[slug]/page.tsx`

2. **Check API route:**
   - `app/api/public/case/[slug]/route.ts`

3. **Ensure share link was created:**
   - Use "Open Public Share Link" button
   - Or manually create share via API

4. **Check Vercel logs for errors**

---

### 9. Database Connection Failed

**Error:**
```
Can't reach database server
```

**Fix:**
1. **For Demo Mode:**
   - Demo endpoints work without database
   - Only set `DATABASE_URL` if using Vercel Postgres

2. **For Production:**
   - Verify Vercel Postgres is running
   - Check `DATABASE_URL` format
   - Ensure connection string is correct

3. **Check Vercel Postgres status:**
   - Vercel Dashboard → Storage → Postgres
   - Verify database is active

---

### 10. TypeScript Errors in Build

**Error:**
```
Type error: Property 'X' does not exist
```

**Fix:**
1. **Run typecheck locally first:**
   ```bash
   npm run typecheck
   ```

2. **Fix all TypeScript errors before deploying**

3. **Check `tsconfig.json` is correct**

4. **Ensure all dependencies are installed:**
   ```bash
   npm install
   ```

---

## 📊 Deployment Verification Checklist

### Pre-Deploy
- [ ] All code committed and pushed
- [ ] Local build succeeds: `npm run build`
- [ ] TypeScript compiles: `npm run typecheck`
- [ ] No secrets in tracked files
- [ ] `.env.example` is committed

### Environment Variables
- [ ] `DEMO_MODE=true` is set (or `GEMINI_API_KEY` omitted)
- [ ] `NODE_ENV=production` is set
- [ ] `PRISMA_SCHEMA_TARGET=postgres` is set
- [ ] `DATABASE_URL` is set (if using Vercel Postgres)
- [ ] `GEMINI_API_KEY` is set (only if using live mode)

### Build
- [ ] Build command is correct: `npm run vercel-build`
- [ ] Prisma generation succeeds
- [ ] Prisma migration succeeds
- [ ] Next.js build succeeds
- [ ] No build errors in Vercel logs

### Post-Deploy
- [ ] Health check returns `200 OK`
- [ ] Landing page loads
- [ ] Demo mode status is correct
- [ ] "Load Sample Case" works
- [ ] Report page loads
- [ ] Public report page loads
- [ ] No console errors
- [ ] No 404 errors

---

## 🚀 Quick Deploy Commands

### Via Vercel CLI

```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Or use npx (no installation)
npx vercel login

# Deploy to production
npx vercel --prod
```

### Via Vercel UI

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import GitHub repository
4. Configure environment variables (see above)
5. Click "Deploy"

---

## 📝 Post-Deployment Notes

### Demo Mode (Hackathon Default)
- ✅ No API key required
- ✅ "Load Sample Case" works instantly
- ✅ No database persistence needed (optional)
- ✅ Perfect for hackathon judging
- ✅ Zero costs

### Live Mode (Optional)
- Requires `GEMINI_API_KEY`
- Requires `DATABASE_URL` (Vercel Postgres)
- Real AI analysis
- Database persistence

---

## 🆘 Emergency Rollback

If deployment fails:

1. **Check Vercel Dashboard → Deployments**
2. **Click previous successful deployment**
3. **Click "Promote to Production"**
4. **Fix issues in new deployment**

---

## 📞 Support

**If issues persist:**
1. Check Vercel build logs
2. Check Vercel function logs
3. Review `RELEASE_MANAGER_REPORT.md` for security audit
4. Review `DEPLOYMENT_HACKATHON.md` for detailed guide

---

**Last Updated**: 2026-01-28  
**Status**: ✅ Ready for Hackathon Deployment

