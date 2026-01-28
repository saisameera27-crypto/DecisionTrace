# Decision Trace 🔍

[![CI](https://github.com/saisameera27-crypto/DecisionTrace/actions/workflows/ci.yml/badge.svg)](https://github.com/saisameera27-crypto/DecisionTrace/actions/workflows/ci.yml)

**AI-powered decision analysis using Google Gemini 3**

Decision Trace is an intelligent application that analyzes decision documents using Google Gemini 3 Flash Preview. It performs a comprehensive 6-step analysis to extract insights, identify risks, and generate detailed reports.

---

## 🌟 Features

### 🤖 AI-Powered Analysis
- **6-Step Analysis Process**: Document processing → Decision extraction → Context analysis → Outcome analysis → Risk assessment → Report generation
- **Google Gemini 3 Integration**: Uses latest Gemini 3 Flash Preview for fast, cost-effective analysis
- **Structured Output**: JSON responses validated with Zod schemas
- **Multimodal Support**: Processes text documents and PDFs

### 📊 Decision Analysis
- **Decision Extraction**: Identifies decision title, date, maker, rationale, and risks
- **Context Analysis**: Analyzes business context, stakeholders, and market conditions
- **Outcome Analysis**: Compares expected vs actual outcomes
- **Risk Assessment**: Identifies materialized risks and failure indicators
- **Comprehensive Reports**: Generates detailed narratives with lessons learned

### 🆓 Free Tier Compatible
- **Zero Cost**: Runs entirely on free tiers (Vercel + Neon + Gemini)
- **Demo Mode**: Works fully without API key using mock responses
- **Cost Controls**: Server-side limits prevent runaway costs
- **Rate Limiting**: Built-in protection against abuse

### 🧪 Production Ready
- **Complete Test Suite**: Unit, integration, and E2E tests
- **Error Handling**: Robust retry logic and error recovery
- **Schema Validation**: Type-safe data with Zod
- **CI/CD Pipeline**: Automated testing on every push

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- (Optional) Google Gemini API key for real analysis
- (Optional) Neon Postgres for production database

### Installation

```bash
# Clone the repository
git clone https://github.com/saisameera27-crypto/DecisionTrace.git
cd decision-trace

# Install dependencies
npm install

# Generate Prisma client (uses SQLite schema by default)
npx prisma generate

# For Postgres production, use:
# npm run prisma:generate:postgres

# Run migrations (uses SQLite by default for local dev)
npx prisma migrate dev
```

### Run Locally

```bash
# Development mode (uses mock Gemini responses)
npm run dev

# Or with real Gemini API (requires GEMINI_API_KEY)
export GEMINI_API_KEY=your-api-key
npm run dev
```

### Demo Mode (Default for Production)

**Demo mode is the DEFAULT for hackathon deployments!**

The app works fully without a Gemini API key:
- ✅ **Auto-enabled** when `GEMINI_API_KEY` is missing OR `DEMO_MODE=true`
- ✅ Uses mock responses for unlimited testing
- ✅ No costs, no API calls
- ✅ Perfect for demos and hackathon judging
- ✅ "Load Sample Case" works instantly
- ✅ All features work except real Gemini analysis

**To use Demo Mode:**
```bash
# Option 1: Set DEMO_MODE=true (recommended)
DEMO_MODE=true npm run dev

# Option 2: Simply omit GEMINI_API_KEY (auto-enables demo mode)
npm run dev
```

**To use Live Gemini 3 (Optional):**
```bash
# Set GEMINI_API_KEY to enable live mode
GEMINI_API_KEY=your-api-key npm run dev
```

**Production Deployment:**
- Demo mode is **default** - no API key required
- Set `DEMO_MODE=true` in Vercel environment variables
- Or simply omit `GEMINI_API_KEY` (demo mode auto-enables)
- Judges can try the app instantly with "Load Sample Case"

---

## 🤖 Google Gemini Integration

Decision Trace uses **Google Gemini 3 Flash Preview** to perform intelligent analysis of decision documents.

### How Gemini Works

**6-Step Analysis Process:**
1. **Document Processing** - Gemini reads and extracts text from documents
2. **Decision Extraction** - Identifies decision details (title, date, maker, rationale)
3. **Context Analysis** - Analyzes business context and stakeholders
4. **Outcome Analysis** - Compares expected vs actual outcomes
5. **Risk Assessment** - Identifies risks and failure indicators
6. **Report Generation** - Synthesizes insights into comprehensive report

**Key Features:**
- ✅ Structured JSON output (validated with Zod schemas)
- ✅ Multimodal support (text documents + PDFs)
- ✅ Context-aware analysis
- ✅ Cost-effective (Gemini 3 Flash, free tier compatible)
- ✅ Production-ready (error handling, retries, rate limiting)

**See [GEMINI_USAGE.md](GEMINI_USAGE.md) for complete documentation.**

---

## 🆓 Free Mode

Decision Trace can run entirely on **free tiers** with strict cost controls. Perfect for hackathons, demos, and personal use.

### Free Tier Stack

- **Hosting**: Vercel Free Tier (100 GB bandwidth/month)
- **Database**: Neon Free Postgres (0.5 GB storage)
- **API**: Gemini API Free Tier (optional - app works without it)
- **Cost**: **$0/month** ✅

### Free Mode Limits

**File Limits:**
- Max 1 file per case (demo cases can have more)
- Max 1.5 MB upload size
- Text/plain only (PDFs if `FREE_PDF_ALLOWED=true`)
- Max 30,000 characters per document

**API Limits:**
- Max 6 Gemini calls per run
- Max 60,000 tokens per run
- 3 runs per IP per day
- 10 requests per IP per minute
- 1 real Gemini run per day globally (if API key set)

**Model Constraints:**
- Only `gemini-3-flash-preview` (Gemini 3 Flash)
- Only `low` thinking level
- No "Deep Analysis" mode

### Quick Start (Free Mode)

```bash
# Set free mode
export FREE_MODE=true
export DATABASE_URL="<neon-connection-string>"

# Install and run
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

### Deployment

See **[DEPLOY_LIVE.md](DEPLOY_LIVE.md)** for complete free-tier deployment guide.

---

## 🛠️ Technology Stack

- **Frontend**: Next.js (or your framework)
- **Backend**: Node.js with TypeScript
- **Database**: Prisma ORM (SQLite for dev/tests, Postgres for production)
  - Postgres schema: `prisma/schema.prisma` (default for production)
  - SQLite schema: `prisma/schema.sqlite.prisma` (for tests)
  - Postgres schema (explicit): `prisma/schema.postgres.prisma`
- **AI**: Google Gemini 3 Flash Preview API
- **Validation**: Zod schemas
- **Testing**: Vitest (unit), Playwright (E2E)
- **CI/CD**: GitHub Actions

---

## 📁 Project Structure

```
decision-trace/
├── lib/                    # Core application code
│   ├── gemini.ts          # Gemini API client
│   ├── schema-validators.ts  # Zod schemas
│   ├── free-tier-limits.ts   # Cost controls
│   └── ...
├── tests/                 # Test suite
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   └── e2e/               # End-to-end tests
├── test-data/             # Test fixtures
├── scripts/               # Utility scripts
├── prisma/                # Database schema
├── .github/               # CI/CD workflows
└── DEPLOY_LIVE.md         # Deployment guide
```

---

## 🧪 Testing

### Run Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# E2E tests only
npm run test:e2e
```

### CI/CD Pipeline

This project includes a comprehensive GitHub Actions CI pipeline:

- ✅ Type checking with TypeScript
- ✅ Unit tests with Vitest
- ✅ Integration tests with SQLite
- ✅ E2E tests with Playwright
- ✅ All tests use mock Gemini responses (no real API calls)

See `.github/workflows/ci.yml` for configuration.

---

## 🚀 Deployment

### Deploy to Vercel (Free Tier)

1. **Set up Neon Postgres** (free tier)
2. **Get Gemini API key** (optional - app works without it)
3. **Deploy to Vercel**:
   - Import GitHub repository
   - Set environment variables:
     - `DATABASE_URL` (from Neon)
     - `GEMINI_API_KEY` (optional)
     - `FREE_MODE=true`
     - `NODE_ENV=production`
   - Deploy!

**See [DEPLOY_LIVE.md](DEPLOY_LIVE.md) for step-by-step guide.**

---

## 📚 Documentation

- **[GEMINI_USAGE.md](GEMINI_USAGE.md)** - Complete Gemini integration guide
- **[GEMINI_QUICK_REF.md](GEMINI_QUICK_REF.md)** - Quick reference for presentations
- **[DEPLOY_LIVE.md](DEPLOY_LIVE.md)** - Production deployment guide
- **[DEPLOYMENT_FREE.md](DEPLOYMENT_FREE.md)** - Free tier deployment details
- **[TESTING.md](TESTING.md)** - Testing documentation

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the ISC License.

---

## 👨‍💻 Author

**Sammy** - Decision Trace Developer

---

## 🙏 Acknowledgments

- Google Gemini 3 for powerful AI capabilities
- Vercel and Neon for free hosting and database
- The open-source community for amazing tools

---

**Decision Trace** - Making decision analysis accessible and intelligent! 🔍✨
