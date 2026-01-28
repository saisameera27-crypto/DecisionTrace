# DEMO MODE Implementation Summary

## Overview

DEMO MODE enables Decision Trace to run without requiring:
- ❌ User authentication/login
- ❌ Google Gemini API key
- ✅ Uses seeded demo data
- ✅ All Gemini calls are automatically mocked

## Environment Flag

**`DEMO_MODE=true`** - Explicitly enables demo mode

**Default Behavior**: If `GEMINI_API_KEY` is not set, demo mode is automatically enabled (hackathon-friendly)

## Code Changes

### 1. New Helper Module: `lib/demo-mode.ts`

**Purpose**: Centralized demo mode detection and utilities

**Key Functions**:
```typescript
// Check if demo mode is enabled
isDemoMode(): boolean
// Returns true if:
//   - DEMO_MODE=true is set, OR
//   - No GEMINI_API_KEY is present (defaults to demo mode)

// Get demo mode status for UI
getDemoModeStatus(): { enabled: boolean; reason: 'explicit' | 'no-api-key' | 'disabled' }
```

**Where It's Used**:
- `lib/gemini.ts` - Automatically uses mock mode
- `app/api/demo/load-sample/route.ts` - Enables demo endpoint

### 2. Updated: `lib/gemini.ts`

**Changes**:
- Imports `isDemoMode()` from `lib/demo-mode.ts`
- `getTestMode()` automatically returns `'mock'` when demo mode is enabled
- `callGeminiAPI()` checks demo mode first and returns mock responses
- `uploadFileToGemini()` returns mock file URIs in demo mode

**Key Code**:
```typescript
// In callGeminiAPI()
if (isDemoMode()) {
  const stepName = options.stepName || 'step1';
  return getMockResponse(stepName);  // No API call needed
}

// In uploadFileToGemini()
if (isDemoMode()) {
  return {
    uri: `gs://gemini-files/demo-${Date.now()}-${fileName}`,
    mimeType,
    name: fileName,
  };  // Mock file URI
}
```

### 3. Updated: `app/api/demo/load-sample/route.ts`

**Changes**:
- Uses `isDemoMode()` helper instead of checking env directly
- Uses `upsert` operations (idempotent) to match `prisma/seed.ts`
- Returns seeded demo case with slug `'demo-sample-case'`
- Creates public share slug `'demo-sample-case-share'`
- Supports both GET and POST methods

**Key Code**:
```typescript
// Check demo mode
const demoModeEnabled = isDemoMode();

// Use seeded case (idempotent)
const demoCase = await prisma.case.upsert({
  where: { slug: 'demo-sample-case' },
  update: {},
  create: { /* ... */ },
});

// Returns caseId, slug, and shareSlug
return NextResponse.json({
  caseId: demoCase.id,
  slug: demoCase.slug,
  shareSlug: 'demo-sample-case-share',
});
```

### 4. Updated: `app/page.tsx`

**Changes**:
- Complete UI rewrite with demo mode badge
- "Load Demo Case" button that calls `/api/demo/load-sample`
- Error handling and loading states
- Clear indication that demo mode is active

**Key Features**:
- 🎯 Demo mode badge showing no API key required
- 🚀 "Load Demo Case" button
- Error messages if demo case fails to load
- Feature list

## Where DEMO_MODE is Checked

### 1. `lib/demo-mode.ts` (Helper)
- **Function**: `isDemoMode()`
- **Checks**: `DEMO_MODE=true` OR missing `GEMINI_API_KEY`
- **Returns**: `boolean`

### 2. `lib/gemini.ts` (Gemini Client)
- **Function**: `getTestMode()`
- **Check**: `if (isDemoMode()) return 'mock'`
- **Function**: `callGeminiAPI()`
- **Check**: `if (isDemoMode()) return getMockResponse(...)`
- **Function**: `uploadFileToGemini()`
- **Check**: `if (isDemoMode()) return mockFileUri`

### 3. `app/api/demo/load-sample/route.ts` (Demo Endpoint)
- **Check**: `const demoModeEnabled = isDemoMode()`
- **Usage**: Enables endpoint access when demo mode is active

## Demo Mode Behavior

### When DEMO_MODE is Enabled:

1. **No API Key Required**
   - `GEMINI_API_KEY` can be missing
   - All Gemini calls use mock responses from `test-data/gemini/recorded/`

2. **No Authentication Required**
   - No login system needed
   - Demo endpoint is accessible
   - All routes work without user authentication

3. **Seeded Demo Data**
   - `/api/demo/load-sample` returns case with slug `'demo-sample-case'`
   - Case has completed report with all 6 steps
   - Public share available at slug `'demo-sample-case-share'`

4. **UI Works Without User Input**
   - Home page shows "Load Demo Case" button
   - Clicking loads pre-populated case
   - All features work with demo data

## Testing Demo Mode

### Enable Demo Mode:
```bash
# Explicitly enable
export DEMO_MODE=true
npm run dev

# Or just omit API key (auto-enables)
# (no GEMINI_API_KEY set)
npm run dev
```

### Test Demo Endpoint:
```bash
# GET request
curl http://localhost:3000/api/demo/load-sample

# POST request
curl -X POST http://localhost:3000/api/demo/load-sample
```

### Expected Response:
```json
{
  "caseId": "clx...",
  "slug": "demo-sample-case",
  "shareSlug": "demo-sample-case-share"
}
```

## Files Modified

1. ✅ `lib/demo-mode.ts` - **NEW** - Demo mode helper functions
2. ✅ `lib/gemini.ts` - Updated to check demo mode and use mocks
3. ✅ `app/api/demo/load-sample/route.ts` - Updated to use seeded data
4. ✅ `app/page.tsx` - Updated with demo mode UI

## Files Created

1. ✅ `lib/demo-mode.ts` - Demo mode utilities

## Summary

DEMO MODE is now fully implemented:
- ✅ No login required
- ✅ No API key required (defaults to demo mode if missing)
- ✅ Uses seeded demo data
- ✅ All Gemini calls are mocked
- ✅ UI clearly indicates demo mode
- ✅ "Load Demo Case" button works out of the box

Perfect for hackathon demos! 🎉

