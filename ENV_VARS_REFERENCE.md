# Environment Variables Reference - Decision Trace

## Complete Environment Variables Table

| ENV_VAR | Required? | Default | Used In | Vercel Value Suggestion |
|---------|-----------|---------|---------|------------------------|
| **DATABASE_URL** | Conditional | None | `prisma/schema.prisma`, `lib/prisma.ts`, API routes | Auto-set by Vercel Postgres integration, or `postgresql://user:pass@host:5432/db` |
| **GEMINI_API_KEY** | Optional | None | `lib/gemini.ts`, `lib/demo-mode.ts`, `app/api/mode-status/route.ts` | Leave empty for demo mode, or set your Gemini API key |
| **DEMO_MODE** | Optional | `true` (if no GEMINI_API_KEY) | `lib/demo-mode.ts`, API routes | `true` (for hackathon demo) |
| **PRISMA_SCHEMA_TARGET** | Optional | `postgres` | `lib/prisma.ts`, build scripts | `postgres` (for Vercel) |
| **NODE_ENV** | Auto-set | `production` (Vercel) | `lib/gemini.ts`, `lib/free-tier-limits.ts`, API routes | Auto-set by Vercel to `production` |
| **FREE_MODE** | Optional | `false` | `lib/free-tier-limits.ts`, `lib/usage-tracking.ts` | `false` (or `true` for free tier limits) |
| **FREE_PDF_ALLOWED** | Optional | `false` | `lib/free-tier-limits.ts` | `false` (or `true` to allow PDFs in free mode) |
| **GEMINI_TEST_MODE** | Optional | `mock` (test), `live` (prod) | `lib/gemini.ts`, `lib/gemini-files.ts`, API routes | Not needed in production (auto-detected) |
| **CI** | Auto-set | `false` | `playwright.config.js`, API routes, tests | Auto-set by CI systems |
| **BASE_URL** | Optional | `http://localhost:3000` | `playwright.config.js`, smoke tests | Not needed (auto-detected by Vercel) |
| **TEST_DATABASE_URL** | Optional | None | `tests/integration/_harness.ts`, Prisma schema comments | Not needed for production |
| **SMOKE_TEST_URL** | Optional | `BASE_URL` | `scripts/smoke-test.ts` | Not needed for production |

---

## Detailed Breakdown

### 🔴 Critical (Required for Production with Database)

#### DATABASE_URL
- **Required**: Yes (if using database), No (if demo mode only)
- **Default**: None
- **Used In**:
  - `prisma/schema.prisma` - Prisma datasource URL
  - `lib/prisma.ts` - Prisma client initialization
  - All API routes that use database
- **Vercel Value**: 
  - **Option 1**: Auto-set by Vercel Postgres integration (recommended)
  - **Option 2**: Manual: `postgresql://user:password@host:5432/database`
  - **Demo Mode**: Can be omitted (demo endpoints work without DB)

---

### 🟡 Important (Optional but Recommended)

#### GEMINI_API_KEY
- **Required**: No (demo mode works without it)
- **Default**: None (auto-enables demo mode)
- **Used In**:
  - `lib/gemini.ts` - Gemini API calls
  - `lib/demo-mode.ts` - Demo mode detection
  - `app/api/mode-status/route.ts` - Mode status API
- **Vercel Value**: 
  - **Demo Mode**: Leave empty (defaults to demo mode)
  - **Live Mode**: Your Gemini API key from Google AI Studio

#### DEMO_MODE
- **Required**: No (auto-enabled if no API key)
- **Default**: `true` (if `GEMINI_API_KEY` is not set)
- **Used In**:
  - `lib/demo-mode.ts` - Demo mode detection
  - `lib/gemini.ts` - Mock mode selection
  - API routes - Demo-safe responses
- **Vercel Value**: `true` (for hackathon demo)

#### PRISMA_SCHEMA_TARGET
- **Required**: No
- **Default**: `postgres`
- **Used In**:
  - `lib/prisma.ts` - Schema selection
  - Build scripts - Prisma client generation
- **Vercel Value**: `postgres` (always use Postgres on Vercel)

---

### 🟢 Optional (Feature Flags)

#### FREE_MODE
- **Required**: No
- **Default**: `false`
- **Used In**:
  - `lib/free-tier-limits.ts` - Free tier limits enforcement
  - `lib/usage-tracking.ts` - Usage tracking limits
- **Vercel Value**: `false` (or `true` to enable free tier limits)

#### FREE_PDF_ALLOWED
- **Required**: No
- **Default**: `false`
- **Used In**:
  - `lib/free-tier-limits.ts` - PDF file type allowance
- **Vercel Value**: `false` (or `true` to allow PDF uploads in free mode)

#### GEMINI_TEST_MODE
- **Required**: No
- **Default**: `mock` (test env), `live` (production)
- **Used In**:
  - `lib/gemini.ts` - Test mode selection
  - `lib/gemini-files.ts` - File upload test mode
  - API routes - Mock/replay mode
- **Vercel Value**: Not needed (auto-detected based on `NODE_ENV` and `DEMO_MODE`)

---

### 🔵 Auto-Set (System/CI)

#### NODE_ENV
- **Required**: Auto-set
- **Default**: `production` (Vercel), `development` (local)
- **Used In**:
  - `lib/gemini.ts` - Default test mode
  - `lib/free-tier-limits.ts` - Environment checks
  - `lib/rate-limit.ts` - Rate limiting
  - API routes - Error handling
- **Vercel Value**: Auto-set to `production` by Vercel

#### CI
- **Required**: Auto-set by CI systems
- **Default**: `false` (local), `true` (CI)
- **Used In**:
  - `playwright.config.js` - Test configuration
  - `playwright.smoke.config.ts` - Smoke test config
  - API routes - Test mode detection
- **Vercel Value**: Auto-set by CI systems

---

### ⚪ Development/Testing Only

#### BASE_URL
- **Required**: No
- **Default**: `http://localhost:3000`
- **Used In**:
  - `playwright.config.js` - E2E test base URL
  - `scripts/smoke-test.ts` - Smoke test target
- **Vercel Value**: Not needed (auto-detected)

#### SMOKE_TEST_URL
- **Required**: No
- **Default**: `BASE_URL` or `http://localhost:3000`
- **Used In**:
  - `scripts/smoke-test.ts` - Smoke test target URL
- **Vercel Value**: Not needed for production

#### TEST_DATABASE_URL
- **Required**: No (tests only)
- **Default**: None
- **Used In**:
  - `tests/integration/_harness.ts` - Test database path
  - Prisma schema comments
- **Vercel Value**: Not needed for production

---

## Vercel Deployment Configuration

### Minimum Required (Demo Mode)
```bash
DEMO_MODE=true
NODE_ENV=production  # Auto-set by Vercel
PRISMA_SCHEMA_TARGET=postgres
```

### With Database (Demo Mode)
```bash
DEMO_MODE=true
DATABASE_URL=<auto-set by Vercel Postgres>
PRISMA_SCHEMA_TARGET=postgres
NODE_ENV=production  # Auto-set by Vercel
```

### With Live Gemini 3
```bash
GEMINI_API_KEY=your-gemini-api-key-here
DATABASE_URL=<auto-set by Vercel Postgres>
PRISMA_SCHEMA_TARGET=postgres
NODE_ENV=production  # Auto-set by Vercel
```

### With Free Tier Limits
```bash
DEMO_MODE=true
FREE_MODE=true
FREE_PDF_ALLOWED=false
DATABASE_URL=<auto-set by Vercel Postgres>
PRISMA_SCHEMA_TARGET=postgres
NODE_ENV=production  # Auto-set by Vercel
```

---

## Environment Variable Priority

1. **Demo Mode Detection**:
   - If `DEMO_MODE=true` → Demo mode enabled
   - Else if `GEMINI_API_KEY` is missing → Demo mode enabled
   - Else → Live mode enabled

2. **Test Mode Detection**:
   - If `DEMO_MODE=true` → `mock` mode
   - Else if `GEMINI_TEST_MODE` is set → Use that mode
   - Else if `NODE_ENV=test` → `mock` mode
   - Else → `live` mode

3. **Database Schema**:
   - If `PRISMA_SCHEMA_TARGET=sqlite` → Use SQLite schema
   - Else → Use Postgres schema (default)

---

## Notes

- **Demo Mode is DEFAULT**: If `GEMINI_API_KEY` is not set, demo mode is automatically enabled
- **Database is Optional**: Demo endpoints work without `DATABASE_URL`
- **Vercel Auto-Sets**: `NODE_ENV` and `DATABASE_URL` (if using Vercel Postgres) are auto-set
- **CI Detection**: `CI` environment variable is auto-set by CI systems
- **Build Time**: Only `PRISMA_SCHEMA_TARGET` affects build (for Prisma client generation)
- **Runtime**: All other variables are used at runtime in API routes

