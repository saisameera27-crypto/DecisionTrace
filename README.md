# Decision Trace 🔍

[![CI](https://github.com/saisameera27-crypto/DecisionTrace/actions/workflows/ci.yml/badge.svg)](https://github.com/saisameera27-crypto/DecisionTrace/actions/workflows/ci.yml)

**AI-powered decision audit trails with Google Gemini 3**

Paste decision notes or upload documents—Decision Trace uses Gemini 3 to produce structured **Decision Ledgers**: audit-ready reports with outcomes, evidence, risks, assumptions, and RACI accountability. Built for compliance, governance, and AI transparency.

---

## Table of Contents

- [What is Decision Trace?](#what-is-decision-trace)
- [Features](#-features)
- [Quick Start](#-quick-start)
- [Google Gemini Integration](#-google-gemini-integration)
- [Free Mode](#-free-mode)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Documentation](#-documentation)
- [Contributing](#-contributing)
- [License](#-license)

---

## What is Decision Trace?

Decision Trace turns unstructured decision content into structured **Decision Ledgers**—audit-ready reports for compliance and AI transparency.

| Step | Action |
|------|--------|
| 1. **Input** | Paste text (max 5000 words) or upload PDF/DOCX/TXT |
| 2. **Analyze** | Gemini 3 extracts structured data with schema enforcement |
| 3. **Output** | Decision Ledger: decision, flow, evidence, risks, assumptions, RACI |
| 4. **View** | 6-tab report: Overview, Decision Flow, Stakeholders, Evidence, Risks, Assumptions |

**Entry points:**
- **[QuickStart](http://localhost:3000/quick)** – Paste text, Save, Run (recommended)
- **[Home](http://localhost:3000)** – File upload flow

---

## 🌟 Features

### 🤖 AI-Powered Analysis

- **Paste or upload** – Textarea (max 5000 words) or file upload (PDF, DOCX, TXT)
- **Decision Ledger** – Single Gemini call produces structured JSON (decision, flow, evidence, risks, assumptions, RACI)
- **6-step pipeline** – Full case flow: document processing → decision extraction → context → outcomes → risks → report
- **Gemini 3** – Pro Preview with Flash fallback; schema-enforced output
- **Audit semantics** – Actor (AI/Human/System), AI influence, overrides tracked per step

### 📊 Decision Ledger Output

| Section | Contents |
|---------|----------|
| **Decision** | Outcome, confidence, trace score (0–100), rationale |
| **Flow** | Steps with actor, AI influence, override, rules, confidence delta |
| **Evidence** | Items with used/not used, weight, confidence impact |
| **Risks** | Risk register with identified, accepted, severity, mitigation |
| **Assumptions** | Assumption, explicit, validated, owner, invalidation impact |
| **Accountability** | RACI (Responsible, Accountable, Consulted, Informed) |

### 📝 QuickStart Flow

- **Paste text** → **Save Text** → **Run Gemini 3 Analysis** → View report
- **6-tab report** – Overview, Decision Flow, Stakeholders, Evidence, Risks, Assumptions
- **Demo mode** – "Load Sample Case" works without API key; no costs

### 🆓 Free Tier Compatible

- Vercel + Neon + Supabase + Gemini (all free tiers)
- Demo mode runs without API key
- Cost controls and rate limiting

### 🧪 Production Ready

- Unit, integration, and E2E tests (Vitest, Playwright)
- Error handling, retries, schema validation (Zod)
- CI/CD via GitHub Actions

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 20+** and npm
- (Optional) **Google Gemini API key** for live analysis
- (Optional) **Neon Postgres** for production database
- (Optional) **Supabase** for Decision Ledger report storage

### Installation

```bash
git clone https://github.com/saisameera27-crypto/DecisionTrace.git
cd DecisionTrace

npm install
npm run prisma:generate
npx prisma migrate deploy
```

For SQLite (dev/tests): `npm run prisma:generate:sqlite`

### Run Locally

```bash
npm run dev
```

- **QuickStart:** [http://localhost:3000/quick](http://localhost:3000/quick)
- **Home:** [http://localhost:3000](http://localhost:3000)

### QuickStart Workflow

1. **Paste text** into the textarea (max 5000 words, min 50 chars)
2. **Save Text** – POST to `/api/quickstart/text`, enables Run button
3. **Run Gemini 3 Analysis** – Creates case, runs analysis, redirects to report
4. **View report** – 6 tabs with enterprise styling

### Demo Mode (Default)

Demo mode is **enabled by default** when `GEMINI_API_KEY` is missing or `DEMO_MODE=true`:

- No API key required
- Mock responses for unlimited testing
- No costs, no API calls
- "Load Sample Case" works instantly

```bash
# Demo mode (default)
npm run dev

# Live Gemini 3
GEMINI_API_KEY=your-api-key npm run dev
```

**Production:** Set `DEMO_MODE=true` in Vercel or omit `GEMINI_API_KEY` for demo-only.

---

## 🤖 Google Gemini Integration

Decision Trace uses **Google Gemini 3** (Pro Preview primary, Flash Preview fallback).

### Decision Ledger Flow

- **Structured JSON** – `responseMimeType: "application/json"` with `DECISION_LEDGER_SCHEMA`
- **System instructions** – Audit-trail semantics: `actor` (AI/Human/System), `aiInfluence`, `overrideApplied`
- **Model fallback** – `gemini-3-pro-preview` → `gemini-3-flash-preview` on error
- **Schema enforcement** – Required keys validated before use

### 6-Step Orchestration (Case Flow)

1. **Document Processing** – Forensic extraction (decision candidates, evidence, assumptions, risks)
2. **Decision Extraction** – Decision details (title, maker, rationale)
3. **Context Analysis** – Business context and stakeholders
4. **Outcome Analysis** – Expected vs actual outcomes
5. **Risk Assessment** – Materialized risks and failure indicators
6. **Report Generation** – Final narrative and Mermaid diagram

### Key Features

- Text input (textarea) and file upload (PDF, DOCX, TXT)
- Gemini Files API for document upload
- Zod + JSON schema validation
- Error handling, retries, rate limiting

**See [GEMINI_USAGE.md](GEMINI_USAGE.md) for complete documentation.**

---

## 🆓 Free Mode

Decision Trace runs on **free tiers** with strict cost controls.

### Free Tier Stack

| Service | Tier | Notes |
|---------|------|-------|
| **Vercel** | Free | 100 GB bandwidth/month |
| **Neon** | Free | 0.5 GB storage |
| **Supabase** | Free | Optional, for Decision Ledger storage |
| **Gemini** | Free | Optional, demo mode works without it |
| **Cost** | **$0/month** | ✅ |

### Limits

| Type | Limit |
|------|-------|
| **QuickStart** | Max 5000 words, min 50 chars |
| **Files** | Max 1.5 MB, 30k characters |
| **API** | 6 Gemini calls/run, 3 runs/IP/day, 10 req/min |

**See [DEPLOY_LIVE.md](DEPLOY_LIVE.md) for deployment guide.**

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|-------------|
| **Frontend** | Next.js 14 (App Router), React 18, Tailwind CSS |
| **Backend** | Node.js, TypeScript, Next.js API Routes |
| **AI** | Google Gemini 3 (Pro/Flash) via `@google/genai` |
| **Database** | Prisma ORM (PostgreSQL / SQLite) |
| **Report Storage** | Supabase (`decision_traces` table) |
| **Validation** | Zod, JSON schema |
| **Testing** | Vitest, Playwright |
| **CI/CD** | GitHub Actions |

---

## 📁 Project Structure

```
DecisionTrace/
├── app/
│   ├── page.tsx                    # Home (file upload)
│   ├── quick/page.tsx               # QuickStart (textarea)
│   ├── case/[id]/page.tsx          # Case report (6-step)
│   ├── report/[id]/page.tsx         # Decision Ledger report
│   ├── create/page.tsx             # Create case
│   ├── public/case/[slug]/page.tsx # Public share view
│   └── api/
│       ├── quickstart/text/        # POST text (save)
│       ├── case/[id]/run/         # Run orchestrator
│       ├── case/[id]/report/      # Get case report
│       ├── analyze/               # File → Decision Ledger
│       ├── report/                # GET report by id (Supabase)
│       ├── demo/load-sample/      # Load sample case
│       └── ...
├── lib/
│   ├── geminiDecisionLedger.ts    # Decision Ledger (Gemini)
│   ├── decisionLedgerSchema.ts    # TypeScript + JSON schema
│   ├── gemini.ts                  # Gemini client (6-step)
│   ├── orchestrator.ts            # 6-step pipeline
│   ├── extractText.ts             # PDF/DOCX/TXT extraction
│   └── ...
├── components/report/              # ReportHeroCard, MetricPills, etc.
├── tests/                          # Unit, integration, E2E
├── test-data/                      # Test fixtures
├── prisma/                         # Database schema
├── supabase/migrations/            # Supabase migrations
└── .github/workflows/              # CI pipeline
```

---

## 🧪 Testing

```bash
npm test              # All tests
npm run test:unit     # Unit tests
npm run test:integration  # Integration tests
npm run test:e2e      # E2E tests
npm run test:e2e:smoke   # Smoke tests
```

CI runs TypeScript, Vitest, and Playwright. All tests use mocked Gemini (no real API calls).

**See [TESTING.md](TESTING.md) for details.**

---

## 🚀 Deployment

### Deploy to Vercel

1. Set up **Neon Postgres** (free tier)
2. Set up **Supabase** (optional, for Decision Ledger storage)
3. Get **Gemini API key** (optional, demo mode works without it)
4. Deploy to **Vercel** – Import repo, add env vars, deploy

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | For live analysis | [Google AI Studio](https://aistudio.google.com/apikey). Omit for demo. |
| `DATABASE_URL` | For case flow | Neon Postgres connection string |
| `SUPABASE_URL` | For `/api/report` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | For `/api/report` | Supabase service role key (server-only) |
| `FREE_MODE` | Optional | `true` for free-tier limits |
| `NODE_ENV` | Optional | `production` |

**See [DEPLOY_LIVE.md](DEPLOY_LIVE.md) for step-by-step guide.**

---

## 📚 Documentation

- **[GEMINI_USAGE.md](GEMINI_USAGE.md)** – Gemini integration guide
- **[GEMINI_QUICK_REF.md](GEMINI_QUICK_REF.md)** – Quick reference
- **[DEPLOY_LIVE.md](DEPLOY_LIVE.md)** – Production deployment
- **[TESTING.md](TESTING.md)** – Testing guide

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

ISC License.

---

## 👨‍💻 Author

**Sameera Polapragada** – Decision Trace Architect and Developer

---

## 🙏 Acknowledgments

- Google Gemini 3 for AI capabilities
- Vercel and Neon for hosting and database
- Supabase for report storage
- The open-source community

---

**Decision Trace** – Making decision analysis accessible and intelligent! 🔍✨
