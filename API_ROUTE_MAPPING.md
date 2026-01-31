# API Route Mapping - Client Calls vs Route Handlers

## Summary of All Client API Calls and Matching Routes

### 1. Load Sample Case
**Client Call:**
- **File:** `app/page.tsx` (line 287)
- **URL:** `/api/demo/load-sample`
- **Method:** `POST`
- **Code:**
  ```typescript
  const response = await fetch('/api/demo/load-sample', {
    method: 'POST',
  });
  ```

**Route Handler:**
- **File:** `app/api/demo/load-sample/route.ts`
- **Exported Handlers:** `GET` (line 211), `POST` (line 215)
- **Status:** ✅ MATCH - POST handler exists

---

### 2. Run Gemini Analysis
**Client Call:**
- **File:** `app/page.tsx` (line 262)
- **URL:** `/api/case/${newCaseId}/run`
- **Method:** `POST`
- **Code:**
  ```typescript
  const runResponse = await fetch(`/api/case/${newCaseId}/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  ```

**Route Handler:**
- **File:** `app/api/case/[id]/run/route.ts`
- **Exported Handlers:** `POST` (line 18)
- **Status:** ✅ MATCH - POST handler exists

---

### 3. QuickStart Upload
**Client Call:**
- **File:** `app/page.tsx` (line 66)
- **URL:** `/api/quickstart/upload`
- **Method:** `POST`
- **Code:**
  ```typescript
  const response = await fetch('/api/quickstart/upload', {
    method: 'POST',
    body: formData,
  });
  ```

**Route Handler:**
- **File:** `app/api/quickstart/upload/route.ts`
- **Exported Handlers:** `POST` (line 23)
- **Status:** ✅ MATCH - POST handler exists

---

### 4. Files Upload
**Client Call:**
- **File:** `app/page.tsx` (line 223)
- **URL:** `/api/files/upload`
- **Method:** `POST`
- **Code:**
  ```typescript
  const uploadResponse = await fetch('/api/files/upload', {
    method: 'POST',
    body: uploadFormData,
  });
  ```

**Route Handler:**
- **File:** `app/api/files/upload/route.ts`
- **Exported Handlers:** `POST` (line 12)
- **Status:** ✅ MATCH - POST handler exists

---

### 5. Create Case
**Client Call:**
- **File:** `app/page.tsx` (line 241)
- **URL:** `/api/case/create`
- **Method:** `POST`
- **Code:**
  ```typescript
  const createResponse = await fetch('/api/case/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: decisionTitle,
      documentId: documentId,
      artifactId: artifactId,
      desiredOutput: 'full_report',
    }),
  });
  ```

**Route Handler:**
- **File:** `app/api/case/create/route.ts`
- **Exported Handlers:** `POST` (line 69)
- **Status:** ✅ MATCH - POST handler exists

---

### 6. Generate Report
**Client Call:**
- **File:** `app/create/page.tsx` (line 114)
- **URL:** `/api/case/${caseId}/generate`
- **Method:** `POST`
- **Code:**
  ```typescript
  const generateResponse = await fetch(`/api/case/${caseId}/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  ```

**Route Handler:**
- **File:** `app/api/case/[id]/generate/route.ts`
- **Exported Handlers:** `POST` (line 17)
- **Status:** ✅ MATCH - POST handler exists

---

### 7. Get Report
**Client Call:**
- **File:** `app/case/[id]/page.tsx` (line 235)
- **URL:** `/api/case/${caseId}/report`
- **Method:** `GET` (default)
- **Code:**
  ```typescript
  const response = await fetch(`/api/case/${caseId}/report`);
  ```

**Route Handler:**
- **File:** `app/api/case/[id]/report/route.ts`
- **Exported Handlers:** `GET` (line 14)
- **Status:** ✅ MATCH - GET handler exists

---

### 8. Mode Status
**Client Call:**
- **File:** `app/page.tsx` (line 35)
- **URL:** `/api/mode-status`
- **Method:** `GET` (default)
- **Code:**
  ```typescript
  fetch('/api/mode-status')
  ```

**Route Handler:**
- **File:** `app/api/mode-status/route.ts`
- **Exported Handlers:** `GET` (line 9)
- **Status:** ✅ MATCH - GET handler exists

---

### 9. Public Case Report
**Client Call:**
- **File:** `app/public/case/[slug]/page.tsx` (line 41)
- **URL:** `/api/public/case/${slug}`
- **Method:** `GET` (default)
- **Code:**
  ```typescript
  const response = await fetch(`/api/public/case/${slug}`);
  ```

**Route Handler:**
- **File:** `app/api/public/case/[slug]/route.ts`
- **Exported Handlers:** `GET` (line 10)
- **Status:** ✅ MATCH - GET handler exists

---

## Potential 405 Error Causes

All routes appear to have matching handlers. A 405 error could occur if:

1. **Route file not found** - Check if route files exist in production build
2. **Method mismatch** - Verify the exact HTTP method being sent
3. **Route path mismatch** - Check for typos in URL paths
4. **Next.js routing issue** - Verify `app/api/**/route.ts` structure is correct
5. **Build/deployment issue** - Route handlers might not be included in production build

## Debugging Steps

1. Check browser Network tab for exact URL and method causing 405
2. Verify route file exists in production build
3. Check Next.js build logs for route compilation errors
4. Verify `app/api/**/route.ts` files are being compiled correctly

