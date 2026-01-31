# Contract Drift Mismatch Report

## Overview
This report compares the recorded response JSON files (`test-data/gemini/recorded/step1.json` and `test-data/gemini/recorded/step2.json`) against the current `Step1Schema` and `Step2Schema` defined in `lib/schema-validators.ts`.

## Test Context
- **Test File**: `tests/integration/contract-drift.test.ts`
- **Line 122**: `expect(result.valid).toBe(true);` for Step 1 validation
- **Line 131**: `expect(result.valid).toBe(true);` for Step 2 validation
- **Current Status**: Both tests FAIL because recorded responses don't match current schemas

---

## STEP 1 MISMATCH ANALYSIS

### File Path
`test-data/gemini/recorded/step1.json`

### Missing Required Fields (Schema expects, but JSON lacks)
1. **`data.normalizedEntities`** (REQUIRED)
   - Schema expects: `z.object({ people: z.array(z.string()).default([]), organizations: z.array(z.string()).default([]), products: z.array(z.string()).default([]), dates: z.array(z.string()).default([]) })`
   - Recorded JSON has: **undefined** (field completely missing)
   - **Error**: `"Invalid input: expected object, received undefined"`

2. **`data.extractedClaims`** (Has default `[]` - Zod will auto-apply if missing)
   - Schema expects: Array of objects with `{ claim: string, evidenceAnchor?: {...}, category?: enum }`
   - Recorded JSON has: **undefined** (field completely missing)
   - Note: Schema has `.default([])` so Zod will use empty array if field is missing - **not causing validation error**

3. **`data.contradictions`** (Has default `[]` - Zod will auto-apply if missing)
   - Schema expects: Array of contradiction objects
   - Recorded JSON has: **undefined** (field completely missing)
   - Note: Schema has `.default([])` so Zod will use empty array if field is missing - **not causing validation error**

4. **`data.missingInfo`** (Has default `[]` - Zod will auto-apply if missing)
   - Schema expects: Array of missing info objects
   - Recorded JSON has: **undefined** (field completely missing)
   - Note: Schema has `.default([])` so Zod will use empty array if field is missing - **not causing validation error**

### Extra Fields (JSON has, but Schema doesn't expect)
1. **`data.has_clear_decision`** (boolean)
   - Not in current schema (was likely in old schema)

2. **`data.decision_candidates`** (array)
   - Not in current schema (was likely in old schema)
   - Structure: `[{ decision_text: string, type: string, confidence: number }]`

3. **`data.fragments`** (array)
   - Not in current schema (was likely in old schema)
   - Structure: `[{ quote: string, classification: string, context: string, decision_candidate_index: number }]`

### Type Mismatches
None (all existing fields have correct types, but required fields are missing)

### Why Validation Fails at Line 122
The test at line 122 expects `result.valid` to be `true`, but it returns `false` because:
- **Primary failure**: `data.normalizedEntities` is **required** by the schema but is **completely missing** from the recorded JSON
- The schema expects the new "Document Digest" structure with:
  - `normalizedEntities` (required object)
  - `extractedClaims` (array, defaults to `[]` if missing)
  - `contradictions` (array, defaults to `[]` if missing)
  - `missingInfo` (array, defaults to `[]` if missing)
- The recorded JSON uses the **old schema structure** with:
  - `has_clear_decision`
  - `decision_candidates`
  - `fragments`

---

## STEP 2 MISMATCH ANALYSIS

### File Path
`test-data/gemini/recorded/step2.json`

### Missing Required Fields (Schema expects, but JSON lacks)
1. **`data.inferredDecision`** (REQUIRED)
   - Schema expects: `z.string().min(1, 'Inferred decision description is required')`
   - Recorded JSON has: **undefined** (field completely missing)
   - **Error**: `"Invalid input: expected string, received undefined"`

2. **`data.decisionType`** (REQUIRED)
   - Schema expects: `z.enum(['hiring', 'product_launch', 'procurement', 'policy', 'incident', 'other'])`
   - Recorded JSON has: **undefined** (field completely missing)
   - **Error**: `"Invalid option: expected one of \"hiring\"|\"product_launch\"|\"procurement\"|\"policy\"|\"incident\"|\"other\""`

3. **`data.confidence`** (REQUIRED)
   - Schema expects: `z.object({ score: z.number().min(0).max(1), reasons: z.array(z.string()).default([]) })`
   - Recorded JSON has: **undefined** (field completely missing)
   - **Error**: `"Invalid input: expected object, received undefined"`
   - Note: JSON has `confidence_score` (number) but schema expects `confidence` (object with `score` and `reasons`)

4. **`data.decisionOwnerCandidates`** (Has default `[]` - Zod will auto-apply if missing)
   - Schema expects: Array of objects with `{ name: string, role?: string, confidence?: number, evidenceAnchor?: {...} }`
   - Recorded JSON has: **undefined** (field completely missing)
   - Note: Schema has `.default([])` so Zod will use empty array if field is missing - **not causing validation error**

5. **`data.decisionCriteria`** (Has default `[]` - Zod will auto-apply if missing)
   - Schema expects: Array of objects with `{ criterion: string, inferredFrom?: string, evidenceAnchor?: {...} }`
   - Recorded JSON has: **undefined** (field completely missing)
   - Note: Schema has `.default([])` so Zod will use empty array if field is missing - **not causing validation error**

### Extra Fields (JSON has, but Schema doesn't expect)
1. **`data.has_clear_decision`** (boolean)
   - Not in current schema (was likely in old schema)

2. **`data.decision_candidates`** (array)
   - Not in current schema (was likely in old schema)
   - Structure: `[{ decision_text: string, type: string, confidence: number }]`

3. **`data.fragments`** (array)
   - Not in current schema (was likely in old schema)
   - Structure: `[{ quote: string, classification: string, context: string, decision_candidate_index: number }]`

4. **`data.confidence_score`** (number)
   - Not in current schema
   - Schema expects: `confidence: { score: number, reasons: string[] }`
   - This is a **type mismatch** - old format was a number, new format is an object

### Type Mismatches
1. **`confidence_score` vs `confidence`**
   - Recorded JSON: `"confidence_score": 0.92` (number)
   - Schema expects: `confidence: { score: number, reasons: string[] }` (object)
   - This is both a missing field (`confidence` is missing) and a type mismatch (old field name vs new structure)

### Why Validation Fails at Line 131
The test at line 131 expects `result.valid` to be `true`, but it returns `false` because:
- **Primary failures**:
  1. `data.inferredDecision` is **required** but **missing**
  2. `data.decisionType` is **required** but **missing**
  3. `data.confidence` is **required** but **missing** (JSON has `confidence_score` instead)
- The schema expects the new "Decision Hypothesis" structure with:
  - `inferredDecision` (required string)
  - `decisionType` (required enum)
  - `decisionOwnerCandidates` (array, defaults to `[]` if missing)
  - `decisionCriteria` (array, defaults to `[]` if missing)
  - `confidence` (required object with `score` and `reasons`)
- The recorded JSON uses the **old schema structure** with:
  - `has_clear_decision`
  - `decision_candidates`
  - `fragments`
  - `confidence_score` (number) instead of `confidence` (object)

---

## SUMMARY

### Root Cause
The recorded response JSON files (`step1.json` and `step2.json`) were created using an **old schema version** that has been completely replaced by the new "Document Digest" (Step 1) and "Decision Hypothesis" (Step 2) structures.

### Schema Evolution
- **Old Step 1 Schema**: Used `has_clear_decision`, `decision_candidates`, `fragments`
- **New Step 1 Schema**: Uses `normalizedEntities`, `extractedClaims`, `contradictions`, `missingInfo`

- **Old Step 2 Schema**: Used `has_clear_decision`, `decision_candidates`, `fragments`, `confidence_score` (number)
- **New Step 2 Schema**: Uses `inferredDecision`, `decisionType`, `decisionOwnerCandidates`, `decisionCriteria`, `confidence` (object)

### Required Actions
To fix the contract drift tests:
1. **Update `test-data/gemini/recorded/step1.json`** to match the new Step1Schema structure
2. **Update `test-data/gemini/recorded/step2.json`** to match the new Step2Schema structure
3. Or, if these are historical fixtures, mark the tests as skipped/outdated and create new fixtures

### Field Mapping (Old → New)
**Step 1:**
- `fragments` → `extractedClaims` (with new structure)
- `decision_candidates` → Not directly mapped (moved to Step 2)
- `has_clear_decision` → Not in new schema

**Step 2:**
- `decision_candidates[0].decision_text` → `inferredDecision`
- `decision_candidates[0].type` → `decisionType` (needs enum mapping)
- `confidence_score` → `confidence.score` (and add `confidence.reasons`)
- `fragments` → `decisionCriteria` (with new structure)
- `decision_maker` → `decisionOwnerCandidates[0].name`
- `has_clear_decision` → Not in new schema

