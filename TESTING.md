# Testing Guide

This document explains the testing architecture, how to run tests, and which test data files are used for each test layer.

## Testing Layers

### Unit Tests
**Purpose**: Test individual functions, classes, and modules in isolation.

**Location**: `tests/unit/`

**Test Data Used**:
- `test-data/docs/{positive,negative,edge}/` - Sample documents for testing document processing
- `test-data/api/payloads/` - Mock API request/response payloads
- `test-data/gemini/recorded/` - Recorded Gemini API responses for mocking

**How to Run**:
```bash
npm run test:unit
```

**Features**:
- Fast execution (< 1 second)
- No external dependencies
- Uses mocked Gemini API responses
- Tests pure logic and data transformations

### Integration Tests
**Purpose**: Test interactions between multiple components, API integrations, and data flow.

**Location**: `tests/integration/`

**Test Data Used**:
- `test-data/api/payloads/` - Full API request/response examples
- `test-data/gemini/recorded/` - Recorded Gemini API responses
- `test-data/expected/normalized/` - Expected normalized output formats

**How to Run**:
```bash
npm run test:integration
```

**Features**:
- Tests component interactions
- Validates API contract compliance
- Uses recorded Gemini responses (no real API calls)
- Tests data normalization and transformation pipelines
- Tests Next.js API routes with test database

#### Integration Test Harness

The integration test harness (`tests/integration/_harness.ts`) provides utilities for testing Next.js API routes with a dedicated test database.

**Setup**:

1. **Prisma Test Database**: Uses a separate SQLite database file (default: `/tmp/test-decision-trace.db`)
   - Set `TEST_DATABASE_URL` environment variable to customize location
   - Database is automatically reset before each test

2. **Database Helpers**:
   ```typescript
   import { resetTestDatabase, createTestCase } from './_harness';
   
   beforeEach(async () => {
     await resetTestDatabase(); // Clean database before each test
   });
   
   const { id, slug } = await createTestCase({
     title: 'Test Case',
     status: 'draft',
   });
   ```

3. **Route Handler Helpers**:
   ```typescript
   import {
     callFilesUpload,
     callCaseRun,
     callCaseReport,
     callCaseEvents,
     callPublicCase,
   } from './_harness';
   
   // Test file upload
   const response = await callFilesUpload(handler, {
     name: 'document.txt',
     content: 'File content',
     type: 'text/plain',
   });
   
   // Test case run
   const response = await callCaseRun(handler, caseId, {
     resumeFromStep: 4,
   });
   
   // Test case report
   const response = await callCaseReport(handler, caseId);
   
   // Test case events stream
   const { response, stream } = await callCaseEvents(handler, caseId);
   
   // Test public case
   const response = await callPublicCase(handler, slug);
   ```

**Supported Routes**:
- `POST /api/files/upload` - File upload handler
- `POST /api/case/[id]/run` - Run case analysis
- `GET /api/case/[id]/report` - Get case report
- `GET /api/case/[id]/events` - Stream case events (validates stream response)
- `GET /api/public/case/[slug]` - Public case access

**Example Integration Test**:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import {
  resetTestDatabase,
  createTestCase,
  callCaseRun,
  callCaseReport,
  parseJsonResponse,
  assertResponseStatus,
} from './_harness';
import { POST as runHandler } from '@/app/api/case/[id]/run/route';
import { GET as reportHandler } from '@/app/api/case/[id]/report/route';

describe('Case API Integration', () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it('should run case analysis and generate report', async () => {
    const { id } = await createTestCase();
    
    const runResponse = await callCaseRun(runHandler, id);
    assertResponseStatus(runResponse, 200);
    
    const reportResponse = await callCaseReport(reportHandler, id);
    assertResponseStatus(reportResponse, 200);
    
    const report = await parseJsonResponse(reportResponse);
    expect(report).toHaveProperty('caseId', id);
  });
});
```

**Database Schema**:
The project uses a dual-schema Prisma approach:
- **Postgres Schema** (`prisma/schema.postgres.prisma`) - Used in production and Postgres tests
- **SQLite Schema** (`prisma/schema.sqlite.prisma`) - Used in SQLite-specific tests

Both schemas have identical model definitions, only the provider differs. The appropriate schema is selected by generating the Prisma client from the correct schema file before running tests.

**Important**: You must generate the Prisma client for the schema you want to use:
- For SQLite tests: `PRISMA_SCHEMA_TARGET=sqlite npm run prisma:generate:sqlite`
- For Postgres/production: `npm run prisma:generate:pg`
- To generate both: `npm run prisma:generate`

See `prisma/schema.postgres.prisma` and `prisma/schema.sqlite.prisma` for full schema definitions.

**Setup Requirements**:
1. Install Prisma dependencies:
   ```bash
   npm install --save-dev prisma @prisma/client
   ```

2. Generate Prisma client:
   ```bash
   npx prisma generate
   ```

3. Run migrations (if needed):
   ```bash
   npx prisma migrate dev --name init
   ```

4. Set test database URL and schema target (optional):
   ```bash
   # For SQLite tests
   export TEST_DATABASE_URL="file:/tmp/test-decision-trace.db"
   export PRISMA_SCHEMA_TARGET="sqlite"
   
   # For Postgres tests
   export DATABASE_URL="postgresql://user:pass@localhost:5432/test_db"
   export PRISMA_SCHEMA_TARGET="postgres"
   ```

**Database Configuration**:
- Integration tests use a test database (SQLite by default)
- Set `TEST_DATABASE_URL` environment variable to customize location
- Set `PRISMA_SCHEMA_TARGET` to select the Prisma schema:
  - `PRISMA_SCHEMA_TARGET=sqlite` - Use SQLite schema (for SQLite tests)
  - `PRISMA_SCHEMA_TARGET=postgres` - Use Postgres schema (default, for production and Postgres tests)

**Example**:
```bash
# Run integration tests with SQLite
export TEST_DATABASE_URL="file:/tmp/test-decision-trace.db"
export PRISMA_SCHEMA_TARGET="sqlite"
npm run test:integration

# Run integration tests with Postgres
export DATABASE_URL="postgresql://user:pass@localhost:5432/test_db"
export PRISMA_SCHEMA_TARGET="postgres"
npm run test:integration
```

**Note**: The harness can work without Prisma installed, but database operations will fail until Prisma is set up. The route handler helpers work independently of Prisma.

### End-to-End (E2E) Tests

### End-to-End (E2E) Tests
**Purpose**: Test complete user workflows from start to finish in a browser environment.

**Location**: `tests/e2e/`

**Test Data Used**:
- `test-data/docs/{positive,negative,edge}/` - Real document samples for upload
- `test-data/expected/snapshots/` - Visual snapshots and expected UI states

**How to Run**:
```bash
npm run test:e2e
```

**Features**:
- Runs in real browser (via Playwright)
- Tests complete user journeys
- Validates UI rendering and interactions
- Can optionally use real Gemini API (if `GEMINI_API_KEY` is set)

## Running All Tests

To run all test layers sequentially:
```bash
npm run test:all
```

This runs unit → integration → e2e tests in order.

## Test Data Structure

```
test-data/
├── docs/
│   ├── positive/          # Valid documents that should pass processing
│   ├── negative/          # Invalid documents that should fail gracefully
│   └── edge/              # Edge cases and boundary conditions
├── api/
│   └── payloads/          # API request/response examples
├── expected/
│   ├── normalized/        # Expected normalized output formats
│   └── snapshots/         # Visual snapshots for E2E tests
└── gemini/
    └── recorded/          # Recorded Gemini API responses for mocking
```

## Environment Variables

### Default Behavior (No API Key Required)
By default, all tests run with **mocked Gemini API responses**. This means:
- ✅ Tests run without `GEMINI_API_KEY`
- ✅ Tests are fast and deterministic
- ✅ Tests don't consume API quota
- ✅ Tests work offline

### Using Real API (Optional)
To use the real Gemini API in E2E tests:
```bash
GEMINI_API_KEY=your_key_here npm run test:e2e
```

**Note**: Unit and integration tests always use mocks, regardless of environment variables.

## Writing Tests

### Unit Test Example
```javascript
import { describe, it, expect } from 'vitest';
import { processDocument } from '../src/document-processor';
import positiveDoc from '../test-data/docs/positive/sample-1.json';

describe('processDocument', () => {
  it('should process valid documents', () => {
    const result = processDocument(positiveDoc);
    expect(result).toMatchSnapshot();
  });
});
```

### Integration Test Example
```javascript
import { describe, it, expect } from 'vitest';
import { analyzeDecision } from '../src/decision-analyzer';
import { mockGeminiResponse } from './helpers/gemini-mock';

describe('Decision Analysis Integration', () => {
  it('should analyze decision documents end-to-end', async () => {
    mockGeminiResponse('test-data/gemini/recorded/analysis-1.json');
    const result = await analyzeDecision('test-data/docs/positive/decision-1.pdf');
    expect(result).toMatchFileSnapshot('test-data/expected/normalized/decision-1.json');
  });
});
```

### E2E Test Example
```javascript
import { test, expect } from '@playwright/test';

test('complete decision trace workflow', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Start Trace');
  // ... complete workflow
  await expect(page).toHaveScreenshot('test-data/expected/snapshots/trace-complete.png');
});
```

## Mocking Gemini API

All Gemini API calls are automatically mocked using recorded responses from `test-data/gemini/recorded/`. The mock system:

1. Intercepts API calls during tests
2. Matches requests to recorded responses
3. Returns recorded data instead of making real API calls
4. Validates request format matches expected structure

To record new Gemini responses:
```bash
GEMINI_API_KEY=your_key npm run test:record-gemini
```

### Gemini Test Modes

The Gemini client supports three test modes controlled by the `GEMINI_TEST_MODE` environment variable:

#### 1. Mock Mode (Default)
**Mode**: `GEMINI_TEST_MODE=mock`

**Behavior**:
- Returns deterministic canned JSON per step from `test-data/gemini/recorded/stepN.json`
- No real API calls are made
- Fast and deterministic
- Uses step name to select the appropriate fixture (step1.json, step2.json, etc.)

**Usage**:
```bash
GEMINI_TEST_MODE=mock npm run test:integration
```

**Fixture Files**:
- `test-data/gemini/recorded/step1.json` - Step 1 (document processing)
- `test-data/gemini/recorded/step2.json` - Step 2 (decision extraction)
- `test-data/gemini/recorded/step3.json` - Step 3 (context analysis)
- `test-data/gemini/recorded/step4.json` - Step 4 (outcome analysis)
- `test-data/gemini/recorded/step5.json` - Step 5 (root cause analysis)
- `test-data/gemini/recorded/step6.json` - Step 6 (lessons learned)

#### 2. Replay Mode
**Mode**: `GEMINI_TEST_MODE=replay`

**Behavior**:
- Looks up responses by `(caseId, stepName)` from `test-data/gemini/recorded/replay/`
- Returns recorded outputs for specific test cases
- Falls back to mock mode if replay not found
- Useful for testing specific scenarios with known inputs/outputs

**Usage**:
```bash
GEMINI_TEST_MODE=replay npm run test:integration
```

**Replay Files**:
- `test-data/gemini/recorded/replay/{caseId}_{stepName}.json`
- Example: `test-data/gemini/recorded/replay/case_123_step2.json`

**Recording Replay Responses**:
1. Run test in live mode to capture real API responses
2. Save responses to `test-data/gemini/recorded/replay/{caseId}_{stepName}.json`
3. Use replay mode to replay those exact responses

#### 3. Live Mode (Disabled by Default)
**Mode**: `GEMINI_TEST_MODE=live`

**Behavior**:
- Makes real Gemini API calls
- Requires `GEMINI_API_KEY` environment variable
- **Disabled by default** - must be explicitly enabled
- **Not allowed in production** - will throw error

**Usage**:
```bash
GEMINI_TEST_MODE=live GEMINI_API_KEY=your_key npm run test:integration
```

**Warning**: Live mode will consume API quota and may incur costs. Use only when necessary.

### Switching Test Modes

**Default Behavior**:
- In test environment (`NODE_ENV=test`): Defaults to `mock` mode
- In production: Always uses `live` mode (test modes disabled)

**Explicit Mode Selection**:
```bash
# Mock mode (default for tests)
GEMINI_TEST_MODE=mock npm run test:integration

# Replay mode
GEMINI_TEST_MODE=replay npm run test:integration

# Live mode (requires API key)
GEMINI_TEST_MODE=live GEMINI_API_KEY=your_key npm run test:integration
```

### Implementation Details

The Gemini client (`lib/gemini.ts`) automatically:
1. Checks `GEMINI_TEST_MODE` environment variable
2. Falls back to `mock` in test environment if not set
3. Prevents test modes in production (safety check)
4. Provides consistent API interface regardless of mode

**Safety Features**:
- ✅ Test modes are **disabled in production** (throws error)
- ✅ Live mode requires `GEMINI_API_KEY` (throws error if missing)
- ✅ Replay mode falls back to mock if replay file not found
- ✅ All modes use the same API interface (no code changes needed)

### Example Usage in Tests

```typescript
import { callGeminiAPI } from '@/lib/gemini';

// Mock mode (default) - uses step1.json
const response = await callGeminiAPI({
  stepName: 'step1',
});

// Replay mode - uses case-specific response
const response = await callGeminiAPI({
  caseId: 'case_123',
  stepName: 'step2',
});

// Live mode - real API call (if enabled)
const response = await callGeminiAPI({
  stepName: 'step1',
  prompt: 'Analyze this decision document',
});
```

## Continuous Integration

Tests are designed to run in CI/CD pipelines:
- ✅ No external API dependencies by default
- ✅ Deterministic results
- ✅ Fast execution
- ✅ Parallel test execution supported

## Test Fixture Mapping

This section maps each test data fixture to specific test cases and scenarios.

### Document Fixtures (`test-data/docs/`)

#### Positive Test Documents

| Fixture | Test Case | Description |
|---------|-----------|-------------|
| `01_launch_decision_memo.txt` | **Unit**: Document parsing<br>**Integration**: Step 1 → Step 2 flow<br>**E2E**: Complete trace workflow | Decision memo format with all required fields (title, date, decision maker, rationale, risks, outcomes). Tests standard decision document processing. |
| `02_email_thread_hiring.txt` | **Unit**: Email parsing<br>**Integration**: Multi-party decision extraction<br>**E2E**: Email upload workflow | Email thread format with decision embedded in conversation. Tests extraction from non-standard formats. |
| `03_incident_postmortem.txt` | **Unit**: Postmortem format parsing<br>**Integration**: Incident analysis workflow<br>**E2E**: Postmortem upload | Incident postmortem format. Tests extraction of decisions from incident reports and postmortems. |
| `04_policy_llm_training.txt` | **Unit**: Policy document parsing<br>**Integration**: Policy decision extraction<br>**E2E**: Policy document workflow | Policy document format. Tests extraction of policy decisions with regulatory context. |
| `05_kpi_snapshot.txt` | **Unit**: KPI report parsing<br>**Integration**: Decision extraction from metrics<br>**E2E**: Report upload workflow | KPI snapshot with embedded decisions. Tests extraction of decisions from performance reports. |

#### Negative Test Documents

| Fixture | Test Case | Description |
|---------|-----------|-------------|
| `01_tiny_note.txt` | **Unit**: Minimum content validation<br>**Integration**: Error handling<br>**E2E**: Error message display | Single-line document. Tests handling of insufficient content for analysis. Expected: Error or warning about insufficient content. |
| `02_blank.txt` | **Unit**: Empty file handling<br>**Integration**: Validation pipeline<br>**E2E**: Empty file upload error | Empty file. Tests validation of empty documents. Expected: Clear error message. |
| `03_two_decisions_conflict.txt` | **Unit**: Conflict detection<br>**Integration**: Multi-decision handling<br>**E2E**: Conflict warning display | Document with conflicting decisions. Tests detection and handling of conflicting decisions in same document. Expected: Warning or error about conflicts. |

#### Edge Case Documents

| Fixture | Test Case | Description |
|---------|-----------|-------------|
| `01_giant_repetitive.txt` | **Unit**: Large file processing<br>**Integration**: Performance testing<br>**E2E**: Large file upload timeout | 200 repeated paragraphs (~50KB+). Tests handling of large, repetitive documents. Expected: Processing completes or timeout with appropriate error. |

### Expected Normalized Outputs (`test-data/expected/normalized/`)

| Fixture | Test Case | Description |
|---------|-----------|-------------|
| `step1_good.json` | **Unit**: Step 1 output validation<br>**Integration**: Document upload → Step 1 | Expected output from Step 1 (document upload and text extraction). Validates document processing pipeline. |
| `step2_good.json` | **Unit**: Step 2 output validation<br>**Integration**: Step 1 → Step 2 transformation | Expected output from Step 2 (decision extraction) with all required fields present. Used with `01_launch_decision_memo.txt`. |
| `step2_missing_required.json` | **Unit**: Partial data handling<br>**Integration**: Validation with missing fields | Step 2 output with missing required fields. Tests graceful handling of incomplete extractions. Expected: Warnings for missing fields, partial success status. |
| `step2_wrong_type.json` | **Unit**: Type validation<br>**Integration**: Type coercion/validation | Step 2 output with wrong data types. Tests type validation and error reporting. Expected: Clear type errors in errors array. |
| `step2_snake_case_variation.json` | **Unit**: Field name normalization<br>**Integration**: API response normalization | Step 2 output using snake_case field names. Tests normalization of different naming conventions. |
| `step2_camelCase_variation.json` | **Unit**: Field name normalization<br>**Integration**: API response normalization | Step 2 output using camelCase field names. Tests normalization of camelCase to standard format. |

### API Payload Fixtures (`test-data/api/payloads/`)

| Fixture | Test Case | Description |
|---------|-----------|-------------|
| `create_case.json` | **Integration**: Case creation API<br>**E2E**: API contract validation | POST `/api/cases` request/response example. Tests case creation endpoint contract. |
| `run_resume_step4.json` | **Integration**: Resume workflow API<br>**E2E**: Resume functionality | POST `/api/cases/{id}/resume` request/response example. Tests resuming analysis from specific step. |
| `share_create.json` | **Integration**: Share creation API<br>**E2E**: Sharing workflow | POST `/api/cases/{id}/share` request/response example. Tests case sharing endpoint contract. |

### Test Case Scenarios

#### Scenario 1: Happy Path - Complete Decision Memo
- **Input**: `01_launch_decision_memo.txt`
- **Expected Step 1**: `step1_good.json`
- **Expected Step 2**: `step2_good.json`
- **Test**: Full workflow from upload to decision extraction

#### Scenario 2: Email Thread Decision
- **Input**: `02_email_thread_hiring.txt`
- **Expected Step 2**: `step2_missing_required.json` (email format may miss some fields)
- **Test**: Extraction from non-standard format, handling missing fields

#### Scenario 3: Error Handling - Insufficient Content
- **Input**: `01_tiny_note.txt`
- **Expected**: Error response indicating insufficient content
- **Test**: Validation and error handling for minimal content

#### Scenario 4: Error Handling - Empty File
- **Input**: `02_blank.txt`
- **Expected**: Clear error message about empty file
- **Test**: Empty file validation

#### Scenario 5: Conflict Detection
- **Input**: `03_two_decisions_conflict.txt`
- **Expected**: Warning or error about conflicting decisions
- **Test**: Multi-decision conflict detection

#### Scenario 6: Large File Processing
- **Input**: `01_giant_repetitive.txt`
- **Expected**: Either successful processing or timeout error
- **Test**: Performance and resource limits

#### Scenario 7: Type Validation
- **Input**: Any document producing malformed output
- **Expected**: `step2_wrong_type.json` format with type errors
- **Test**: Type validation and error reporting

#### Scenario 8: Field Name Normalization
- **Input**: Documents producing snake_case or camelCase outputs
- **Expected**: `step2_snake_case_variation.json` or `step2_camelCase_variation.json`
- **Test**: Normalization of different naming conventions

## Troubleshooting

### Tests fail with "GEMINI_API_KEY not found"
This shouldn't happen - check that mocks are properly configured. Ensure `vitest.config.js` has mock setup.

### Snapshot tests fail
Update snapshots with: `npm run test:unit -- -u`

### E2E tests timeout
Increase timeout in `playwright.config.js` or check that test server is running.

## Smoke Tests

**Purpose**: Quick health checks for staging and production environments.

**Location**: `scripts/smoke-test.ts`

**What It Tests**:
- `/api/health` - Health check endpoint
- `/api/demo/load-sample` - Sample case loading
- `/api/case/[id]/report` - Report page endpoint
- `/api/case/[id]/export` - Export endpoints (JSON bundle)
- `/api/public/case/[slug]` - Public slug endpoint

**How to Run**:
```bash
# Test production (defaults to http://localhost:3000)
npm run smoke:prod

# Test staging
BASE_URL=https://staging.example.com npm run smoke:prod

# Test production
BASE_URL=https://production.example.com npm run smoke:prod

# Or use SMOKE_TEST_URL
SMOKE_TEST_URL=https://production.example.com npm run smoke:prod
```

**Exit Codes**:
- `0` - All tests passed
- `1` - One or more tests failed

**Output**:
The script prints pass/fail for each test with timing information:
```
✅ PASS: Health Check (45ms)
✅ PASS: Load Sample Case (120ms)
✅ PASS: Report Page (case: abc123) (80ms)
✅ PASS: Export JSON Bundle (case: abc123) (150ms)
✅ PASS: Public Slug Endpoint (slug: share-xyz) (90ms)

📊 Smoke Test Summary
============================================================
Total: 5 | Passed: 5 | Failed: 0
============================================================

✅ All smoke tests passed!
```

**Use Cases**:
- Pre-deployment verification
- Post-deployment health checks
- Monitoring integration
- CI/CD pipeline validation
- Quick production sanity checks

**Environment Variables**:
- `BASE_URL` or `SMOKE_TEST_URL` - Target environment URL (default: `http://localhost:3000`)

### Smoke Test Troubleshooting

### Smoke tests fail in production
- Verify the target URL is correct
- Check that all endpoints are accessible
- Ensure sample case endpoint exists (`/api/demo/load-sample`)
- Verify CORS settings allow requests from CI environment

## Advanced Test Categories

### 1. Export Correctness Tests

**Purpose**: Verify that exported files (PDF/SVG/PNG/JSON) contain correct content, not just that downloads trigger.

**Location**: `tests/integration/export-correctness.test.ts`

**What It Tests**:
- PDF opens and contains key section headers (e.g., "Evidence Map", "Risks")
- Mermaid SVG contains `<svg>` tag and non-empty nodes
- PNG files have valid PNG signature
- JSON bundle manifest fields present and schema version matches current

**Why It Matters**: Judges will open exported files; regressions happen silently here.

**How to Run**:
```bash
npm run test:integration -- tests/integration/export-correctness.test.ts
```

### 2. Security Regression Tests

**Purpose**: Prevent API key leakage and ensure public write protection.

**Location**: 
- `tests/integration/security.test.ts` (integration)
- `tests/e2e/security.spec.ts` (E2E)

**What It Tests**:
- `GEMINI_API_KEY` never appears in response bodies
- `GEMINI_API_KEY` never appears in response headers
- `GEMINI_API_KEY` never appears in error messages
- `GEMINI_API_KEY` never appears in HTML/JavaScript (E2E)
- Public slug pages cannot call write routes (POST/PUT/DELETE blocked)
- CSRF protection for state-changing operations

**Why It Matters**: A single leak is catastrophic; tests make it provable.

**How to Run**:
```bash
# Integration tests
npm run test:integration -- tests/integration/security.test.ts

# E2E tests
npm run test:e2e -- tests/e2e/security.spec.ts
```

### 3. SSE Reliability Tests

**Purpose**: Test Server-Sent Events under real browser conditions.

**Location**: `tests/integration/sse-reliability.test.ts`

**What It Tests**:
- Refresh mid-run → reconnect and continue from last step
- Tab backgrounded then resumed → messages continue
- Network drop then reconnect → reconnection works
- SSE closes cleanly at completion (no infinite spinner)
- Error handling and reconnection attempts

**Common Real Bugs**:
- Refresh during step 2-4 → should reconnect and continue
- Simulate offline for 5-10 seconds → reconnect works
- SSE closes cleanly at completion

**How to Run**:
```bash
npm run test:integration -- tests/integration/sse-reliability.test.ts
```

### 4. Data Retention + Deletion Flow Tests

**Purpose**: Verify that deletion actually removes data and respects privacy claims.

**Location**: `tests/integration/deletion.test.ts`

**What It Tests**:
- Deleting a case deletes artifacts/steps/reports
- Public slugs become invalid after deletion (410 Gone)
- Gemini file delete (if implemented) is called or properly mocked
- No orphaned data after deletion
- CASCADE delete constraints work correctly

**Why It Matters**: This is the biggest "trust" gap if a judge asks "does it actually delete?"

**How to Run**:
```bash
npm run test:integration -- tests/integration/deletion.test.ts
```

### 5. File Processing Edge Cases

**Purpose**: Test handling of real-world file uploads that fail differently.

**Location**: `tests/integration/file-edge-cases.test.ts`

**What It Tests**:
- Password-protected PDF → handled gracefully with specific error (not stack trace)
- Corrupted PDF → fails cleanly (400, not 500 with stack trace)
- Image-only PDF → triggers scanned detection path with warning
- User-friendly error messages (no stack traces exposed)
- Error codes for programmatic handling

**Why It Matters**: Real PDFs fail differently than test fixtures.

**How to Run**:
```bash
npm run test:integration -- tests/integration/file-edge-cases.test.ts
```

### 6. Database Migration Safety Tests

**Purpose**: Verify Postgres compatibility and migration safety.

**Location**: `tests/integration/migration-safety.test.ts`

**What It Tests**:
- Postgres connection and basic operations
- Postgres-specific features (JSONB, enums, transactions)
- Migration deployment on Postgres
- Schema compatibility checks
- CI Postgres service integration

**Why It Matters**: "Postgres-ready" is often where runtime breaks.

**How to Run**:
```bash
# With Postgres URL set
TEST_POSTGRES_URL=postgresql://user:pass@localhost:5432/db npm run test:integration -- tests/integration/migration-safety.test.ts
```

**CI Integration**: The CI pipeline includes a `postgres-migration` job that runs migrations and tests against a Postgres service.

### 7. Contract Drift Tests

**Purpose**: Detect schema versioning issues and API contract changes.

**Location**: `tests/integration/contract-drift.test.ts`

**What It Tests**:
- Recorded Gemini responses validate against Zod schemas
- Schema version matches current version
- Missing required fields detected
- Type mismatches detected
- Schema version bump triggers failing test until fixtures updated

**Why It Matters**: Keeps you safe after tweaks. Schema version bump triggers failing test until fixtures are updated.

**How to Run**:
```bash
npm run test:integration -- tests/integration/contract-drift.test.ts
```

**Schema Versioning**:
- Current schema version: `1.0.0` (defined in test file)
- Recorded responses in `test-data/gemini/recorded/` must match current version
- Version mismatch triggers test failure with clear error message

## Test Coverage Summary

### ✅ Unit Tests
- Schema validators (Zod)
- Report normalizer (snake_case/camelCase)
- Retry logic (429/5xx/backoff)
- Gemini client modes (mock/replay/live)

### ✅ Integration Tests
- File upload validation
- Orchestrator golden path
- Orchestrator reliability (idempotency/resume/retries)
- Concurrency guard (409 Conflict)
- Report loader + public share + expiration
- Rate limiting
- **Export correctness** (PDF/SVG/PNG/JSON content)
- **Security regression** (API key leakage, public write protection)
- **SSE reliability** (refresh, offline, reconnection)
- **Data deletion** (privacy compliance)
- **File edge cases** (password-protected PDF, corrupted PDF, scanned PDF)
- **Migration safety** (Postgres compatibility)
- **Contract drift** (schema versioning)

### ✅ Functional Tests (UI Components)
- Evidence table filters
- Risk heatmap rendering
- Diagram tab (Mermaid rendering)
- Export tab (download triggers)

### ✅ E2E Tests
- Golden path (full user flow)
- Messy/negative cases
- Reliability (resume after failure)
- Rate limiting UI handling
- **Security** (API key leakage in browser)

### ✅ CI Pipeline
- Runs all test layers
- Mocked Gemini (no real API calls)
- **Postgres migration tests** (separate job)
- Artifact storage on failure

### ✅ Smoke Tests
- Health check
- Sample case loading
- Report endpoints
- Export endpoints
- Public slug endpoints

