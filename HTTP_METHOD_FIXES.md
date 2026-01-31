# HTTP Method Alignment Fixes

## Summary of Changes

Fixed 405 errors by aligning HTTP methods and ensuring all state-changing actions use POST.

### 1. `/api/demo/load-sample` - Removed GET Handler
**Before:**
- Exported both `GET` and `POST`
- Client uses `POST` (correct)

**After:**
- Only exports `POST` (state-changing action)
- Returns `{ ok: true, caseId, slug, shareSlug }` on success
- **Route:** `app/api/demo/load-sample/route.ts`
- **Client:** `POST /api/demo/load-sample` (app/page.tsx:287, app/quick/page.tsx:189)

**Status:** ✅ FIXED - GET removed, only POST supported

---

### 2. `/api/case/[id]/run` - Updated Response Format
**Before:**
- Returns `{ success: true, ... }`

**After:**
- Returns `{ ok: true, success: true, ... }` on success
- **Route:** `app/api/case/[id]/run/route.ts` - exports `POST`
- **Client:** `POST /api/case/${id}/run` (app/page.tsx:262, app/quick/page.tsx:164)

**Status:** ✅ FIXED - Now returns `ok: true`

---

### 3. `/api/case/create` - Updated Response Format
**Before:**
- Returns `{ caseId, slug, message }`

**After:**
- Returns `{ ok: true, caseId, slug, message }` on success
- **Route:** `app/api/case/create/route.ts` - exports `POST`
- **Client:** `POST /api/case/create` (app/page.tsx:241, app/quick/page.tsx:143)

**Status:** ✅ FIXED - Now returns `ok: true`

---

### 4. `/api/case/[id]/generate` - Updated Response Format
**Before:**
- Returns `{ caseId, status, message }`

**After:**
- Returns `{ ok: true, caseId, status, message }` on success
- **Route:** `app/api/case/[id]/generate/route.ts` - exports `POST`
- **Client:** `POST /api/case/${id}/generate` (app/create/page.tsx:114)

**Status:** ✅ FIXED - Now returns `ok: true`

---

### 5. `/api/files/upload` - Updated Response Format
**Before:**
- Returns `{ success: true, documentId, geminiFileUri }`

**After:**
- Returns `{ ok: true, success: true, documentId, geminiFileUri }` on success
- **Route:** `app/api/files/upload/route.ts` - exports `POST`
- **Client:** `POST /api/files/upload` (app/page.tsx:223, app/quick/page.tsx:125)

**Status:** ✅ FIXED - Now returns `ok: true`

---

### 6. `/api/quickstart/upload` - Updated Response Format
**Before:**
- Returns `{ success: true, documentId, extractedText, ... }`

**After:**
- Returns `{ ok: true, success: true, documentId, extractedText, ... }` on success
- **Route:** `app/api/quickstart/upload/route.ts` - exports `POST`
- **Client:** `POST /api/quickstart/upload` (app/page.tsx:66, app/quick/page.tsx:38)

**Status:** ✅ FIXED - Now returns `ok: true`

---

## All State-Changing Routes (POST Only)

| Route | Method | Handler | Status |
|-------|--------|---------|--------|
| `/api/demo/load-sample` | POST | ✅ Exported | Fixed |
| `/api/case/[id]/run` | POST | ✅ Exported | Fixed |
| `/api/case/create` | POST | ✅ Exported | Fixed |
| `/api/case/[id]/generate` | POST | ✅ Exported | Fixed |
| `/api/files/upload` | POST | ✅ Exported | Fixed |
| `/api/quickstart/upload` | POST | ✅ Exported | Fixed |
| `/api/case/[id]/share` | POST | ✅ Exported | OK |

## All Read-Only Routes (GET Only)

| Route | Method | Handler | Status |
|-------|--------|---------|--------|
| `/api/case/[id]/report` | GET | ✅ Exported | OK |
| `/api/mode-status` | GET | ✅ Exported | OK |
| `/api/public/case/[slug]` | GET | ✅ Exported | OK |
| `/api/health` | GET | ✅ Exported | OK |

## Test Updates

- **Removed:** Test that used GET for `/api/demo/load-sample` (state-changing action)
- **Updated:** `tests/integration/demo-load-sample.test.ts` to only import and test POST

## Response Format Standard

All state-changing POST routes now return:
```json
{
  "ok": true,
  // ... other fields
}
```

Error responses use:
```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Result

✅ All routes aligned with HTTP methods
✅ All state-changing actions use POST only
✅ All success responses include `ok: true`
✅ Tests updated to match new method requirements
✅ No more 405 errors expected

