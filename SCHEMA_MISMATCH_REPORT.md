# Schema vs Fixture Mismatch Report

## Step 1 Schema vs Step 1 Fixture

### Schema Location: `lib/schema-validators.ts` lines 18-71
### Fixture Location: `tests/helpers/makeValidStepFixtures.ts` lines 26-101

### Required Fields in Schema:
1. `document_id` - `z.string().min(1)` - **REQUIRED**
2. `normalizedEntities` - `z.object({...})` - **REQUIRED** (object itself, not optional)
   - `people`: `z.array(z.string()).default([])` - array with default
   - `organizations`: `z.array(z.string()).default([])` - array with default
   - `products`: `z.array(z.string()).default([])` - array with default
   - `dates`: `z.array(z.string()).default([])` - array with default
3. `extractedClaims` - `z.array(...).default([])` - array with default
   - Each item requires: `claim` (required string)
   - Optional: `evidenceAnchor`, `category`
4. `contradictions` - `z.array(...).default([])` - array with default
   - Each item requires: `statement1` (required string), `statement2` (required string)
   - Optional: `description`, `evidenceAnchor1`, `evidenceAnchor2`
5. `missingInfo` - `z.array(...).default([])` - array with default
   - Each item requires: `information` (required string)
   - Optional: `whyNeeded`, `category`
6. `extracted_at` - `z.string().datetime()` - **REQUIRED**

### Fixture Provides:
✅ `document_id`: 'doc_12345' - **MATCHES**
✅ `normalizedEntities`: Full object with people, organizations, products, dates arrays - **MATCHES**
✅ `extractedClaims`: Array with items containing claim, evidenceAnchor, category - **MATCHES**
✅ `contradictions`: Array with items containing statement1, statement2, description, evidenceAnchor1, evidenceAnchor2 - **MATCHES**
✅ `missingInfo`: Array with items containing information, whyNeeded, category - **MATCHES**
✅ `extracted_at`: ISO datetime string - **MATCHES**

### Optional Fields in Schema:
- `document_type`, `file_name`, `file_size`, `mime_type` - all optional

### Fixture Provides:
✅ All optional fields are present - **MATCHES**

### Step 1 Conclusion:
**NO MISMATCHES FOUND** - The fixture matches the schema requirements perfectly.

---

## Step 2 Schema vs Step 2 Fixture

### Schema Location: `lib/schema-validators.ts` lines 84-133
### Fixture Location: `tests/helpers/makeValidStepFixtures.ts` lines 117-212

### Required Fields in Schema:
1. `case_id` - `z.string().min(1)` - **REQUIRED**
2. `document_id` - `z.string().min(1)` - **REQUIRED**
3. `inferredDecision` - `z.string().min(1)` - **REQUIRED**
4. `decisionType` - `z.enum(['hiring', 'product_launch', 'procurement', 'policy', 'incident', 'other'])` - **REQUIRED**
5. `decisionOwnerCandidates` - `z.array(...).default([])` - array with default
   - Each item requires: `name` (required string)
   - Optional: `role`, `confidence`, `evidenceAnchor`
6. `decisionCriteria` - `z.array(...).default([])` - array with default
   - Each item requires: `criterion` (required string)
   - Optional: `inferredFrom`, `evidenceAnchor`
7. `confidence` - `z.object({...})` - **REQUIRED** (object itself, not optional, no default)
   - `score`: `z.number().min(0).max(1)` - **REQUIRED**
   - `reasons`: `z.array(z.string()).default([])` - array with default
8. `extracted_at` - `z.string().datetime()` - **REQUIRED**

### Fixture Provides:
✅ `case_id`: 'case_67890' - **MATCHES**
✅ `document_id`: 'doc_12345' - **MATCHES**
✅ `inferredDecision`: 'Launch of a new mobile application...' - **MATCHES**
✅ `decisionType`: 'product_launch' - **MATCHES**
✅ `decisionOwnerCandidates`: Array with items containing name, role, confidence, evidenceAnchor - **MATCHES**
✅ `decisionCriteria`: Array with items containing criterion, inferredFrom, evidenceAnchor - **MATCHES**
✅ `confidence`: Object with score (0.75) and reasons array - **MATCHES**
✅ `extracted_at`: ISO datetime string - **MATCHES**

### Optional Fields in Schema:
- `decision_title`, `decision_date`, `decision_maker`, `decision_maker_role`, `decision_status`, `decision_summary`
- `context`, `rationale`, `risks_identified`, `mitigation_strategies`, `expected_outcomes`

### Fixture Provides:
✅ All optional legacy fields are present - **MATCHES**

### Step 2 Conclusion:
**NO MISMATCHES FOUND** - The fixture matches the schema requirements perfectly.

---

## Overall Summary

**Both Step 1 and Step 2 fixtures appear to match their respective schemas perfectly.**

If tests are failing, the issue is likely:
1. Runtime validation errors (e.g., datetime format, string length)
2. Type inference issues in TypeScript
3. Test execution environment differences
4. The fixture helper functions may not be generating the exact structure expected

### Potential Issues to Check:
1. **Step 1 `extracted_at`**: Ensure the ISO datetime string format is correct (must include timezone or be UTC)
2. **Step 2 `extracted_at`**: Same datetime format requirement
3. **Step 1 `normalizedEntities`**: The object itself is required (not optional), but arrays inside have defaults
4. **Step 2 `confidence`**: The object itself is required (not optional, no default), but `reasons` array has default

### Recommendation:
Run the actual test and capture the Zod validation error output to see the exact mismatch.

