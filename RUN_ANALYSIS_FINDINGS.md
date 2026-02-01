# Run Gemini 3 Analysis – Findings Report

## 1. onClick handler and function

### Main page (app/page.tsx)

- **Button:** "Run Gemini 3 Analysis" at line ~812.
- **onClick:** `handleRunAnalysis` (wired at line ~788).
- **Handler:** `handleRunAnalysis` at line 168.

### Quick Start page (app/quick/page.tsx)

- **Button:** "Run Gemini 3 Analysis" at line ~510 (`data-testid="qs-run"`).
- **onClick:** `handleRunAnalysis` (wired at line ~493).
- **Handler:** `handleRunAnalysis` at line 131.

---

## 2. Network requests (main page – app/page.tsx)

| # | URL | Method | Body type | When |
|---|-----|--------|-----------|------|
| 1 | `/api/files/upload` | POST | FormData | Live mode only (not demo). Step 1: upload file to get documentId. |
| 2 | `/api/case/create` | POST | JSON | Live mode only. Step 2: create case with documentId. |
| 3 | `/api/case/${newCaseId}/run` | POST | JSON (empty body) | Always. Step 3: run analysis. |

- **Demo mode:** no requests 1 or 2; only request 3 with `newCaseId = demo-case-${hash}-${timestamp}`.
- **Live mode:** all three requests in order.

---

## 3. Network requests (Quick Start page – app/quick/page.tsx)

| # | URL | Method | Body type | When |
|---|-----|--------|-----------|------|
| 1 | `/api/quickstart/text` | POST | JSON `{ text }` | If `isReady && !documentId`: save text first. |
| 2 | `/api/case/create` | POST | JSON `{ inferMode, documentId }` | Live mode when `docIdToUse` is set. |
| 3 | `/api/case/${newCaseId}/run` | POST | JSON (empty body) | Always. |

- **Demo path:** may do request 1 only (get demo docId), then skip 2 and use demo case ID, then request 3.
- **Live path:** 1 (if needed) → 2 → 3.

---

## 4. Where "Error: File upload failed" is set

The UI shows **"Error: File upload failed"** when `setError(err.message)` is called with `err.message === "File upload failed"` (or when the server returns that string and it’s used as the thrown message). All paths that can produce that message:

### Path A – Main page, Run Analysis (app/page.tsx)

1. User clicks "Run Gemini 3 Analysis" → `handleRunAnalysis` runs.
2. Live mode: `fetch("/api/files/upload", { method: "POST", body: uploadFormData })`.
3. If `!uploadResponse.ok`: parse body into `uploadPayload`; if parse fails, `uploadPayload = { error: "File upload failed" }`.
4. `throw new Error(uploadPayload.error || "File upload failed")` (line ~212).
5. Catch at line ~257: `setError(err.message || 'Analysis failed')` → UI shows **"Error: File upload failed"**.

So: **any non-ok response from POST /api/files/upload** on the main page (e.g. 400, 413, 500) can lead to "Error: File upload failed" (or the server’s `error` string).

### Path B – Create case page (app/create/page.tsx)

1. User uploads a file and submits the create form.
2. `fetch('/api/files/upload', { method: 'POST', body: formDataUpload })`.
3. If `!uploadResponse.ok`: parse body; on parse failure, `uploadPayload = { error: 'File upload failed' }`.
4. `throw new Error(uploadPayload.error || 'File upload failed')` (line ~65).
5. Form’s catch sets the error state → UI shows **"Error: File upload failed"**.

So: **any non-ok response from POST /api/files/upload** on the create page can produce the same message.

### Path C – Server-side (app/api/files/upload/route.ts)

- The route returns 500 with `{ error: 'File upload failed' }` in the catch block (line ~90). That body is what the client uses in Path A and B when it throws and then sets the error message.

---

## 5. Summary of code paths that can set "Error: File upload failed"

| Location | Trigger | Condition |
|----------|---------|-----------|
| app/page.tsx ~212, ~258 | Click "Run Gemini 3 Analysis" (main page) | Live mode + POST /api/files/upload returns !ok |
| app/create/page.tsx ~65 | Submit create form with file | POST /api/files/upload returns !ok |
| app/api/files/upload/route.ts ~90 | Any POST /api/files/upload that throws | Server catch returns 500 with `error: 'File upload failed'` |

---

## 6. Temporary console logs added

For each request in the Run Analysis flow, logs were added in this format:

- **Request:** `[RunAnalysis] request: URL=<url>, method=<method>, bodyType=FormData|JSON`
- **Response:** `[RunAnalysis] response: URL=<url>, status=<status>, body=<raw text>`

**app/page.tsx**

- POST /api/files/upload (request + response).
- POST /api/case/create (request + response).
- POST /api/case/${newCaseId}/run (request + response).

**app/quick/page.tsx**

- POST /api/quickstart/text (request + response), when that request is made.
- POST /api/case/create (request + response).
- POST /api/case/${newCaseId}/run (request + response).

Response bodies are read once with `.text()` and then parsed for error handling, so the logs show the raw response body for each request.

No refactors were done beyond adding these logs and the single-read response handling needed to log the body.
