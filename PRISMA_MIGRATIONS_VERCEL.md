# Production Database Migrations - Vercel Deployment

## Problem
Production deployments fail with: `PrismaClientKnownRequestError: The table 'public.Case' does not exist`

This occurs because database migrations are not running during Vercel builds.

## Solution

### 1. Initial Migration Setup (One-Time)

Before deploying, create the initial migration locally:

```bash
# Set your production DATABASE_URL
export DATABASE_URL="postgresql://user:password@host:5432/database"

# Create initial migration from schema
npx prisma migrate dev --name init --schema=prisma/schema.postgres.prisma

# This creates prisma/migrations/ directory with migration files
# Commit these migration files to git
```

**Important**: Migration files in `prisma/migrations/` must be committed to git for `prisma migrate deploy` to work.

### 2. Automated Migration During Build

The `vercel-build` script now automatically runs migrations:

```json
"vercel-build": "npm run db:migrate:prod && npx next build"
```

Which runs:
```json
"db:migrate:prod": "npm run prisma:generate:pg && npm run prisma:migrate:pg"
```

This ensures:
1. Prisma client is generated for Postgres schema
2. Migrations are applied to production database
3. Next.js build proceeds with correct schema

### 3. Environment Variables Required

In Vercel Dashboard → Project → Settings → Environment Variables:

- **DATABASE_URL**: Auto-set by Vercel Postgres integration (recommended)
  - Or manually: `postgresql://user:password@host:5432/database`
- **PRISMA_SCHEMA_TARGET**: `postgres` (optional, defaults to postgres)

### 4. How It Works

**During Vercel Build:**
1. `npm install` runs (installs dependencies)
2. `vercel-build` script executes:
   - `npm run db:migrate:prod`:
     - Generates Prisma client from `prisma/schema.postgres.prisma`
     - Runs `prisma migrate deploy` to apply migrations
   - `npx next build` builds the Next.js app

**Migration Behavior:**
- `prisma migrate deploy` is **idempotent** - safe to run multiple times
- Only applies migrations that haven't been applied yet
- Does NOT require manual SQL
- Does NOT run on every request (only during build)

### 5. Alternative: Post-Deploy Hook (If Build Fails)

If migrations fail during build (e.g., database not ready), you can use Vercel's post-deploy hook:

**Option A: Vercel CLI (Manual)**
```bash
# After deployment, run migrations manually
vercel env pull .env.production
npx prisma migrate deploy --schema=prisma/schema.postgres.prisma
```

**Option B: Vercel Post-Deploy Script**
Create `vercel.json` with post-deploy hook (if supported):
```json
{
  "functions": {
    "app/api/**/route.ts": {
      "maxDuration": 30
    }
  }
}
```

**Note**: Vercel doesn't have native post-deploy hooks. The build-time approach is recommended.

### 6. Troubleshooting

**Error: "Migration engine failed to connect to the database"**
- Ensure `DATABASE_URL` is set in Vercel environment variables
- Verify database is accessible from Vercel's build environment
- Check database connection string format

**Error: "No migrations found"**
- Ensure `prisma/migrations/` directory exists and is committed to git
- Run `npx prisma migrate dev --name init --schema=prisma/schema.postgres.prisma` locally first
- Commit migration files to git

**Error: "Migration already applied"**
- This is normal - `prisma migrate deploy` is idempotent
- It will skip already-applied migrations

**Error: "Table does not exist" after deployment**
- Verify migrations ran during build (check Vercel build logs)
- Ensure `DATABASE_URL` is correct
- Check that migration files are in git

### 7. Verification

After deployment, verify migrations:

```bash
# Connect to production database
psql $DATABASE_URL

# Check if tables exist
\dt

# Should show: Case, CaseDocument, CaseStep, CaseEvent, Report, Share, UsageTracking
```

Or use Prisma Studio:
```bash
npx prisma studio --schema=prisma/schema.postgres.prisma
```

---

## Summary

✅ **Migrations run automatically during Vercel build**  
✅ **No manual SQL required**  
✅ **No per-request overhead**  
✅ **Idempotent and safe**

The `vercel-build` script now includes `db:migrate:prod` which ensures your production database schema is always up-to-date.

