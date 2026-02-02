# Decision Trace 🔍

[![CI](https://github.com/saisameera27-crypto/DecisionTrace/actions/workflows/ci.yml/badge.svg)](https://github.com/saisameera27-crypto/DecisionTrace/actions/workflows/ci.yml)

**AI-powered decision audit trails using Google Gemini 3**

Decision Trace turns unstructured decision documents (memos, emails, notes) into structured **Decision Ledgers**—audit-ready reports that capture outcomes, evidence, risks, assumptions, and accountability. It uses Google Gemini 3 to extract and structure decision data for compliance, governance, and AI transparency.

---

## 🌟 Features

### 🤖 AI-Powered Analysis
- **Decision Ledger Generation**: Single-call structured output with schema enforcement (decision, flow, evidence, risks, assumptions, RACI)
- **6-Step Orchestration** (optional): Document processing → Decision extraction → Context analysis → Outcome analysis → Risk assessment → Report generation
- **Google Gemini 3 Integration**: Uses Gemini 3 Pro Preview (with Flash fallback) for structured JSON output
- **Structured Output**: `responseMimeType: application/json` + JSON schema for type-safe, parseable responses
- **System Instructions**: Audit-trail semantics (actor: AI/Human/System, AI influence, overrides)

### 📊 Decision Ledger Output
- **Decision**: Outcome, confidence (low/medium/high), trace score (0–100), rationale
- **Flow**: Steps with actor, AI influence, override applied, rules applied, confidence delta
- **Evidence**: Evidence items with used/not used, weight, confidence impact
- **Risks**: Risk register with identified, accepted, severity, mitigation
- **Assumptions**: Assumption, explicit, validated, owner, invalidation impact
- **Accountability**: RACI (Responsible, Accountable, Consulted, Informed)

### 📝 QuickStart Flow
- **Textarea Input**: Paste decision notes (max 5000 words)—no file upload required
- **Save Text** → **Run Gemini 3 Analysis** → View report
- **Report UI**: 6 tabs—Overview, Decision Flow, Stakeholders, Evidence, Risks, Assumptions
- **Demo Mode**: "Load Sample Case" works instantly without API key

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
- Node.js 20+ and npm
- (Optional) Google Gemini API key for live analysis
- (Optional) Neon Postgres for production database
- (Optional) Supabase for Decision Ledger report storage

### Installation

```bash
# Clone the repository
git clone https://github.com/saisameera27-crypto/DecisionTrace.git
cd DecisionTrace

# Install dependencies
npm install

# Generate Prisma client (Postgres by default)
npm run prisma:generate

# For SQLite (dev/tests):
# npm run prisma:generate:sqlite

# Run migrations
npx prisma migrate deploy
```

### Run Locally

```bash
# Development mode (demo mode by default—no API key needed)
npm run dev
```

Open **http://localhost:3000/quick** for the QuickStart flow.

### QuickStart Workflow

1. **Paste text** into the textarea (decision notes, memos, emails—max 5000 words)
2. **Save Text** – POST to `/api/quickstart/text` (stores text, enables Run button)
3. **Run Gemini 3 Analysis** – Creates case, runs analysis, redirects to report
4. **View report** – 6 tabs: Overview, Decision Flow, Stakeholders, Evidence, Risks, Assumptions

### Demo Mode (Default)

**Demo mode is the DEFAULT for hackathon deployments!**

The app works fully without a Gemini API key:
- ✅ **Auto-enabled** when `GEMINI_API_KEY` is missing OR `DEMO_MODE=true`
- ✅ Uses mock responses for unlimited testing
- ✅ No costs, no API calls
- ✅ "Load Sample Case" works instantly
- ✅ All features work except real Gemini analysis

**To use Demo Mode:**
```bash
DEMO_MODE=true npm run dev
# Or simply omit GEMINI_API_KEY
npm run dev
```

**To use Live Gemini 3:**
```bash
GEMINI_API_KEY=your-api-key npm run dev
```

**Production Deployment:**
- Demo mode is **default**—no API key required
- Set `DEMO_MODE=true` in Vercel (or omit `GEMINI_API_KEY`)
- Judges can try the app instantly with "Load Sample Case"

---

## 🤖 Google Gemini Integration

Decision Trace uses **Google Gemini 3** (Pro Preview primary, Flash Preview fallback) for decision analysis.

### Decision Ledger Flow (Structured Output)

The Decision Ledger pipeline uses:

- **Structured JSON output** – `responseMimeType: "application/json"` with a JSON schema (`DECISION_LEDGER_SCHEMA`) so responses are valid, parseable JSON
- **System instructions** – Audit-trail semantics: `actor` (AI/Human/System), `aiInfluence`, `overrideApplied`, required fields, no long paragraphs
- **Model fallback** – `gemini-3-pro-preview` → `gemini-3-flash-preview` on error
- **Schema enforcement** – All required keys (decision, flow, evidenceLedger, riskLedger, assumptionLedger, accountability) validated before use

### 6-Step Orchestration (Case Flow)

For the full case pipeline:

1. **Document Processing** – Forensic extraction (decision candidates, evidence, assumptions, risks)
2. **Decision Extraction** – Decision details (title, maker, rationale)
3. **Context Analysis** – Business context and stakeholders
4. **Outcome Analysis** – Expected vs actual outcomes
5. **Risk Assessment** – Materialized risks and failure indicators
6. **Report Generation** – Final narrative and Mermaid diagram

### Key Features

- ✅ Structured JSON output (Zod + JSON schema validation)
- ✅ Text input (textarea) and file upload (PDF, DOCX, TXT)
- ✅ Gemini Files API for document upload
- ✅ Cost-effective (Gemini 3 Flash fallback, free tier compatible)
- ✅ Production-ready (error handling, retries, rate limiting)

**See [GEMINI_USAGE.md](GEMINI_USAGE.md) for complete documentation.**

---

## 🆓 Free Mode

Decision Trace can run entirely on **free tiers** with strict cost controls. Perfect for hackathons, demos, and personal use.

### Free Tier Stack

- **Hosting**: Vercel Free Tier (100 GB bandwidth/month)
- **Database**: Neon Free Postgres (0.5 GB storage)
- **Report Storage**: Supabase Free Tier (optional, for Decision Ledger persistence)
- **API**: Gemini API Free Tier (optional - app works without it in demo mode)
- **Cost**: **$0/month** ✅

### Free Mode Limits

**Text/Input Limits (QuickStart):**
- Max 5000 words per paste
- Min 50 characters to enable Run

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

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS
- **Backend**: Node.js with TypeScript, Next.js API Routes
- **AI**: Google Gemini 3 (Pro/Flash Preview) via `@google/genai`
- **Database**: Prisma ORM (PostgreSQL for production, SQLite for tests)
- **Report Storage**: Supabase (`decision_traces` table for Decision Ledger)
- **Validation**: Zod schemas, JSON schema for structured output
- **Testing**: Vitest (unit/integration), Playwright (E2E)
- **CI/CD**: GitHub Actions

---

## 📁 Project Structure

```
DecisionTrace/
├── app/
│   ├── quick/page.tsx           # QuickStart (textarea input)
│   ├── case/[id]/page.tsx       # Case report view (6-step narrative)
│   ├── report/[id]/page.tsx     # Decision Ledger report view
│   └── api/
│       ├── quickstart/text/      # POST text (save)
│       ├── case/[id]/run/        # Run 6-step orchestrator
│       ├── analyze/              # File → Decision Ledger (Gemini)
│       └── report/               # GET report by id (Supabase)
├── lib/
│   ├── geminiDecisionLedger.ts  # Decision Ledger generation (Gemini)
│   ├── decisionLedgerSchema.ts   # TypeScript + JSON schema
│   ├── gemini.ts                # Gemini API client (6-step)
│   ├── orchestrator.ts          # 6-step analysis pipeline
│   ├── extractText.ts           # PDF/DOCX/TXT extraction
│   └── ...
├── components/report/            # ReportHeroCard, MetricPills, etc.
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── prisma/
├── supabase/migrations/
└── .github/workflows/
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
2. **Set up Supabase** (optional - for Decision Ledger report storage)
3. **Get Gemini API key** (optional - app works without it in demo mode)
4. **Deploy to Vercel**:
   - Import GitHub repository
   - Set environment variables (see **Vercel environment variables** below)
   - Deploy!

**See [DEPLOY_LIVE.md](DEPLOY_LIVE.md) for step-by-step guide.**

### Vercel environment variables

Configure these in **Vercel → Project → Settings → Environment Variables** (server-only; never exposed to the client):

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | **Yes** for live analysis | Google AI Studio API key. Required for `/api/analyze` and case run. If missing, demo mode is used. Get a key at [Google AI Studio](https://aistudio.google.com/apikey). |
| `DATABASE_URL` | Optional | Neon (or other) Postgres connection string for production DB. |
| `SUPABASE_URL` | For `/api/report` | Supabase project URL for Decision Ledger storage. |
| `SUPABASE_SERVICE_ROLE_KEY` | For `/api/report` | Supabase service role key (server-only). |
| `FREE_MODE` | Optional | Set to `true` for free-tier limits. |
| `NODE_ENV` | Optional | Set to `production` for production builds. |

**Setup steps:**

1. In Vercel, open your project → **Settings** → **Environment Variables**.
2. Add `GEMINI_API_KEY` with your API key; enable for **Production**, **Preview**, and **Development** as needed.
3. (Optional) Add `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FREE_MODE`, `NODE_ENV`.
4. Redeploy so new variables take effect.

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
- Supabase for Decision Ledger report storage
- The open-source community for amazing tools

---

**Decision Trace** - Making decision analysis accessible and intelligent! 🔍✨
