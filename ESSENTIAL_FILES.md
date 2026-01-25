# Decision Trace - Essential Files

This folder contains only the essential files needed to run and test Decision Trace.

## 📁 Directory Structure

```
decisiontrace/
├── .github/              # CI/CD workflows
│   └── workflows/
│       └── ci.yml       # GitHub Actions CI pipeline
├── lib/                 # Core application code
│   ├── gemini.ts        # Gemini 3 API client
│   ├── schema-validators.ts  # Zod schemas for validation
│   ├── free-tier-limits.ts   # Cost controls
│   ├── report-normalizer.ts  # Data normalization
│   ├── retry.ts         # Retry logic
│   └── usage-tracking.ts     # Usage tracking
├── prisma/              # Database schema
│   └── schema.prisma    # Prisma schema (SQLite/Postgres)
├── scripts/             # Utility scripts
│   ├── budget-check.ts  # Cost estimation
│   ├── smoke-test.ts    # Smoke tests
│   └── test-real-gemini.ts  # Real Gemini testing
├── test-data/           # Test fixtures
│   ├── api/             # API payload examples
│   ├── docs/            # Test documents (positive/negative/edge)
│   ├── expected/         # Expected test outputs
│   └── gemini/          # Recorded Gemini responses
├── tests/               # Test suite
│   ├── unit/            # Unit tests
│   ├── integration/     # Integration tests
│   ├── e2e/             # End-to-end tests
│   └── ui/              # UI component tests
├── .gitignore           # Git ignore rules
├── package.json         # Dependencies and scripts
├── package-lock.json    # Dependency lock file
├── tsconfig.json        # TypeScript configuration
├── vercel.json          # Vercel deployment config
├── playwright.config.js # Playwright E2E test config
├── vitest.config.js     # Vitest unit test config
├── README.md            # Main documentation
├── DEPLOY_LIVE.md       # Deployment guide
├── GEMINI_USAGE.md      # Gemini integration docs
├── GEMINI_QUICK_REF.md  # Quick reference
├── TESTING.md           # Testing documentation
└── WHY_NOT_GEMINI_3.md  # Model selection explanation
```

## ✅ Essential Files Included

### Core Application
- ✅ `lib/` - All core application code (6 files)
- ✅ `prisma/schema.prisma` - Database schema

### Configuration
- ✅ `package.json` - Dependencies and npm scripts
- ✅ `tsconfig.json` - TypeScript config
- ✅ `vercel.json` - Deployment config
- ✅ `playwright.config.js` - E2E test config
- ✅ `vitest.config.js` - Unit test config
- ✅ `.gitignore` - Git ignore rules

### Testing
- ✅ `tests/` - Complete test suite (unit, integration, E2E, UI)
- ✅ `test-data/` - All test fixtures and expected outputs
- ✅ `scripts/` - Testing and utility scripts

### CI/CD
- ✅ `.github/workflows/ci.yml` - GitHub Actions pipeline

### Documentation
- ✅ `README.md` - Main project documentation
- ✅ `DEPLOY_LIVE.md` - Deployment guide
- ✅ `GEMINI_USAGE.md` - Gemini integration guide
- ✅ `TESTING.md` - Testing documentation

## ❌ Files Excluded

The following files were **intentionally excluded** as they're not required to run and test Decision Trace:

- ❌ VetCompass files (not part of Decision Trace)
- ❌ Architecture diagram HTML files
- ❌ Python scripts for diagram conversion
- ❌ One-health-sentinel-lite (unrelated project)
- ❌ Data files (missouri/texas zip codes)
- ❌ Old/unused documentation files

## 🚀 Quick Start

```bash
cd /Users/sammy/decisiontrace

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Run tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e
```

## 📊 File Count

- **Total files**: ~123 files
- **Core code**: 6 TypeScript files in `lib/`
- **Tests**: ~50+ test files
- **Test data**: ~30+ fixture files
- **Documentation**: 6 markdown files

## ✅ Verification

All essential files are present and the project is ready to:
- ✅ Run locally
- ✅ Run all tests
- ✅ Deploy to Vercel
- ✅ Use Gemini 3 API
- ✅ Work in free tier mode


