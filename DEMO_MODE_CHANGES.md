# DEMO MODE - Exact Code Changes

## Summary

DEMO MODE has been implemented to enable hackathon demos without requiring:
- ❌ User authentication/login
- ❌ Google Gemini API key
- ✅ Uses seeded demo data
- ✅ All Gemini calls automatically mocked

## Files Created

### 1. `lib/demo-mode.ts` (NEW)

**Purpose**: Centralized demo mode detection

```typescript
/**
 * Demo Mode Helper
 * Checks if demo mode is enabled and provides utilities for demo mode behavior
 */

export function isDemoMode(): boolean {
  // Explicit DEMO_MODE flag
  if (process.env.DEMO_MODE === 'true') {
    return true;
  }
  
  // Default to demo mode if no API key is present (hackathon-friendly)
  if (!process.env.GEMINI_API_KEY) {
    return true;
  }
  
  return false;
}

export function getDemoModeStatus(): {
  enabled: boolean;
  reason: 'explicit' | 'no-api-key' | 'disabled';
} {
  if (process.env.DEMO_MODE === 'true') {
    return { enabled: true, reason: 'explicit' };
  }
  
  if (!process.env.GEMINI_API_KEY) {
    return { enabled: true, reason: 'no-api-key' };
  }
  
  return { enabled: false, reason: 'disabled' };
}
```

## Files Modified

### 2. `lib/gemini.ts`

**Changes**:
1. **Import added**:
```typescript
import { isDemoMode } from './demo-mode';
```

2. **`getTestMode()` updated**:
```typescript
function getTestMode(): GeminiTestMode {
  // If demo mode is enabled, use mock mode (no API key needed)
  if (isDemoMode()) {
    return 'mock';
  }
  
  const mode = process.env.GEMINI_TEST_MODE;
  // ... rest of function
}
```

3. **`callGeminiAPI()` updated**:
```typescript
export async function callGeminiAPI(
  options: GeminiCallOptions
): Promise<GeminiResponse> {
  // In demo mode, always use mock (no API key needed)
  if (isDemoMode()) {
    const stepName = options.stepName || 'step1';
    return getMockResponse(stepName);
  }
  
  // ... rest of function
}
```

4. **`uploadFileToGemini()` updated**:
```typescript
export async function uploadFileToGemini(
  file: Buffer,
  mimeType: string,
  fileName: string
): Promise<{ uri: string; mimeType: string; name: string }> {
  // In demo mode, return mock file URI (no API key needed)
  if (isDemoMode()) {
    return {
      uri: `gs://gemini-files/demo-${Date.now()}-${fileName}`,
      mimeType,
      name: fileName,
    };
  }
  
  // ... rest of function
}
```

### 3. `app/api/demo/load-sample/route.ts`

**Changes**:
1. **Import added**:
```typescript
import { isDemoMode } from '@/lib/demo-mode';
```

2. **Function refactored to support GET and POST**:
```typescript
async function loadSampleCase() {
  const isTestMode = process.env.NODE_ENV === 'test' || process.env.CI === 'true';
  const isMockMode = process.env.GEMINI_TEST_MODE === 'mock';
  const demoModeEnabled = isDemoMode();  // ← Uses helper
  
  if (!isTestMode && !isMockMode && !demoModeEnabled) {
    return NextResponse.json({
      code: 'DEMO_ENDPOINT_DISABLED',
      message: 'This endpoint is only available in test/CI mode, mock mode, or when DEMO_MODE is enabled',
    }, { status: 403 });
  }
  
  // ... rest of function uses upsert for idempotency
}

export async function GET() {
  return loadSampleCase();
}

export async function POST() {
  return loadSampleCase();
}
```

3. **Uses seeded case (idempotent)**:
```typescript
// Use seeded demo case (idempotent - creates if doesn't exist)
const demoCase = await prisma.case.upsert({
  where: { slug: 'demo-sample-case' },
  update: {},
  create: {
    title: 'Sample Decision Case - Q2 2024 Product Launch',
    status: 'completed',
    slug: 'demo-sample-case',
  },
});
```

### 4. `app/page.tsx`

**Complete rewrite** with demo mode UI:

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDemoCase = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/demo/load-sample', {
        method: 'POST',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to load demo case');
      }
      
      const data = await response.json();
      router.push(`/case/${data.caseId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to load demo case');
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Decision Trace</h1>
      <p>AI-powered decision analysis using Google Gemini</p>

      {/* Demo Mode Badge */}
      <div style={{ /* demo mode badge styles */ }}>
        <span>🎯 DEMO MODE</span>
        <p>No API key required. Click below to load a pre-populated demo case.</p>
      </div>

      {/* Load Demo Case Button */}
      <button onClick={loadDemoCase} disabled={loading}>
        {loading ? 'Loading Demo Case...' : '🚀 Load Demo Case'}
      </button>

      {/* Error Message */}
      {error && <div>{error}</div>}
    </div>
  );
}
```

### 5. `app/api/case/[id]/share/route.ts`

**Changes**:
1. **Import added**:
```typescript
import { isDemoMode } from '@/lib/demo-mode';
```

2. **Updated to use helper**:
```typescript
const isTestMode = process.env.NODE_ENV === 'test' || process.env.CI === 'true';
const isMockMode = process.env.GEMINI_TEST_MODE === 'mock';
const demoModeEnabled = isDemoMode() || isTestMode || isMockMode;  // ← Uses helper
```

## Where DEMO_MODE is Checked

### 1. `lib/demo-mode.ts`
- **Function**: `isDemoMode()`
- **Checks**: 
  - `process.env.DEMO_MODE === 'true'` (explicit)
  - `!process.env.GEMINI_API_KEY` (default if no API key)

### 2. `lib/gemini.ts`
- **Line 54**: `if (isDemoMode()) return 'mock'` in `getTestMode()`
- **Line 182**: `if (isDemoMode()) return getMockResponse(...)` in `callGeminiAPI()`
- **Line 311**: `if (isDemoMode()) return mockFileUri` in `uploadFileToGemini()`

### 3. `app/api/demo/load-sample/route.ts`
- **Line 23**: `const demoModeEnabled = isDemoMode()`

### 4. `app/api/case/[id]/share/route.ts`
- **Line 23**: `const demoModeEnabled = isDemoMode() || isTestMode || isMockMode`

## Environment Variables

### `DEMO_MODE=true`
- Explicitly enables demo mode
- All Gemini calls use mock responses
- Demo endpoint is accessible

### Default Behavior (No `DEMO_MODE` set)
- If `GEMINI_API_KEY` is missing → Demo mode enabled automatically
- If `GEMINI_API_KEY` is present → Normal mode (requires API key)

## Testing

### Enable Demo Mode:
```bash
# Option 1: Explicit flag
export DEMO_MODE=true
npm run dev

# Option 2: Omit API key (auto-enables)
# (no GEMINI_API_KEY set)
npm run dev
```

### Test Demo Endpoint:
```bash
curl http://localhost:3000/api/demo/load-sample
# Returns: { "caseId": "...", "slug": "demo-sample-case", "shareSlug": "demo-sample-case-share" }
```

## Summary

✅ **No login required** - No authentication system needed
✅ **No API key required** - Defaults to demo mode if missing
✅ **Uses seeded data** - `/api/demo/load-sample` returns pre-populated case
✅ **Gemini calls mocked** - All AI calls use mock responses automatically
✅ **UI works out of box** - Home page has "Load Demo Case" button

Perfect for hackathon demos! 🎉


