# Upload flow end-to-end trace and "Error: File upload failed"

## Where "Error: File upload failed" is set in the UI

1. **app/page.tsx (main page – Run analysis flow)**  
   - **Lines 244–246:** When the user has already selected a file and clicks **Run analysis**, the app calls `POST /api/files/upload`. If `!uploadResponse.ok`, it throws `Error(errorData.error || 'File upload failed')`.  
   - **Line 275:** The catch calls `setError(err.message || 'Analysis failed')`, so the UI shows **"Error: File upload failed"** (or the server’s `error` message).

2. **app/create/page.tsx (create case with file)**  
   - **Lines 62–64:** When the user submits the create form with a file, the app calls `POST /api/files/upload`. If `!uploadResponse.ok`, it throws `Error(uploadPayload.error || 'File upload failed')`.  
   - That error is caught by the form’s catch and shown in the UI as **"Error: File upload failed"** (or the server message).

So the message is always tied to a **failed** `POST /api/files/upload` response (non‑ok status). The initial file‑pick upload uses `/api/upload` and shows **"Upload failed"** or the server message, not "File upload failed".

---

## Upload flow end-to-end

### Flow A: File select (main page)

| Step | What happens |
|------|-------------------------------|
| **Trigger** | User selects a file (click or drag) → `handleFileInputChange` or `handleDrop` runs and calls `handleFileSelect(file)`. |
| **Function** | `handleFileSelect` (app/page.tsx, ~line 49). |
| **Request** | `fetch("/api/upload", { method: "POST", body: formData })`. |
| **Body** | `FormData` with one entry: `"file"` → `File`. No `Content-Type` header (browser sets multipart boundary). |
| **Response** | Try `response.json()` → use `data.success`, `data.filename`, etc. On non‑ok or parse error, set `errorMessage` and throw; catch calls `setError(displayError)`. Success: set `uploadedFile`, `fileName`, etc. |

- **Endpoint:** `POST /api/upload`  
- **Method:** POST  
- **Payload:** FormData (file only)  
- **Console logs added:** `[Upload] endpoint URL:`, `[Upload] response.status:`, `[Upload] response body (json):` or `[Upload] response body (text/error):`

---

### Flow B: Run analysis (main page, live mode)

| Step | What happens |
|------|-------------------------------|
| **Trigger** | User has a file uploaded and clicks **Run analysis**; not in demo mode → `handleRunAnalysis` runs. |
| **Function** | `handleRunAnalysis` (app/page.tsx, ~line 191). |
| **Request** | `fetch("/api/files/upload", { method: "POST", body: uploadFormData })`. |
| **Body** | `FormData` with one entry: `"file"` → `uploadedFile`. No `Content-Type` header. |
| **Response** | `uploadResponse.text()` → log body → `JSON.parse` → if `!uploadResponse.ok` throw `Error(uploadPayload.error || 'File upload failed')` → catch calls `setError(err.message)` → **"Error: File upload failed"** in UI. If ok, use `uploadPayload.documentId` and continue to `/api/case/create` and `/api/case/:id/run`. |

- **Endpoint:** `POST /api/files/upload`  
- **Method:** POST  
- **Payload:** FormData (file only)  
- **Console logs added:** `[Upload] endpoint URL:`, `[Upload] response.status:`, `[Upload] response body (text):`

---

### Flow C: Create case with file (create page)

| Step | What happens |
|------|-------------------------------|
| **Trigger** | User has chosen a file and submits the create form → submit handler runs. |
| **Function** | Submit handler in app/create/page.tsx (~line 40). |
| **Request** | `fetch('/api/files/upload', { method: 'POST', body: formDataUpload })`. |
| **Body** | `FormData` with one entry: `"file"` → `uploadedFile`. No `Content-Type` header. |
| **Response** | Same as Flow B: `text()` → log → parse JSON → if `!uploadResponse.ok` throw **"File upload failed"** → shown in UI. If ok, use `documentId` and call `/api/case/create`. |

- **Endpoint:** `POST /api/files/upload`  
- **Method:** POST  
- **Payload:** FormData (file only)  
- **Console logs added:** same as Flow B.

---

## What to check in the browser

1. **Console**  
   Look for:
   - `[Upload] endpoint URL:` → which URL was called (`/api/upload` or `/api/files/upload`).
   - `[Upload] response.status:` → HTTP status (e.g. 405, 500).
   - `[Upload] response body (text):` or `[Upload] response body (json):` → raw body or parsed JSON.

2. **Network tab**  
   - Find the request that matches the logged URL (e.g. `POST /api/files/upload`).  
   - Check **Status** (e.g. 405 Method Not Allowed, 500).  
   - Check **Request method** (should be POST).  
   - Check **Request payload** (should be multipart/form-data with `file`).

---

## Failing endpoint and status (to fill after testing)

- **Endpoint that returns error:** _________________ (e.g. `POST /api/files/upload` or `POST /api/upload`).  
- **Status code in Network tab:** _________________ (e.g. 405, 500).  
- **Response body (from console or Network):** _________________.

No refactors were done; only the described console logs and response handling (single read + parse) were added so you can report the failing endpoint and status from the browser.
