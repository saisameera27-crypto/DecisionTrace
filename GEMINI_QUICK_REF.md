# Google Gemini Integration - Quick Reference

## 🎯 One-Sentence Summary

**Decision Trace uses Google Gemini AI to perform a 6-step structured analysis of decision documents, extracting insights, identifying risks, and generating comprehensive reports.**

---

## 🔄 The 6 Steps (Each Uses Gemini)

```
┌─────────────────────────────────────────────────────────┐
│  Step 1: Document Processing                           │
│  Gemini reads document → extracts text & metadata      │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│  Step 2: Decision Extraction                           │
│  Gemini analyzes text → extracts decision details      │
│  (title, date, maker, rationale, risks)                │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│  Step 3: Context Analysis                              │
│  Gemini analyzes context → identifies stakeholders      │
│  (business context, market conditions, factors)         │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│  Step 4: Outcome Analysis                              │
│  Gemini compares outcomes → finds deviations           │
│  (expected vs actual, success metrics, impact)         │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│  Step 5: Risk Assessment                               │
│  Gemini assesses risks → identifies problems           │
│  (risks materialized, failure indicators, severity)    │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│  Step 6: Final Report Generation                       │
│  Gemini synthesizes → generates report + diagram       │
│  (narrative, lessons learned, recommendations)         │
└─────────────────────────────────────────────────────────┘
```

---

## 💻 Code Example

```typescript
// Each step makes a Gemini API call
const response = await callGeminiAPI({
  stepName: 'step2',
  prompt: 'Extract decision details from this document...',
  fileUri: 'gs://gemini-files/document.txt',
  model: 'gemini-3-flash-preview'  // Free tier uses Gemini 3 Flash
});

// Response is validated with Zod schema
const step2Data = step2Schema.parse(
  JSON.parse(response.candidates[0].content.parts[0].text)
);

// Data is stored and displayed to user
```

---

## 🎨 What Makes This Impressive

### 1. **Structured AI Output**
- Gemini returns JSON matching our schemas
- Validated with Zod for type safety
- Reliable data extraction

### 2. **Multi-Step Reasoning**
- 6 sequential API calls
- Each step builds on previous
- Context maintained throughout

### 3. **Business Intelligence**
- Understands decision-making context
- Identifies relationships (stakeholders, risks)
- Generates actionable insights

### 4. **Cost-Effective**
- Uses Flash model (fast, cheap)
- Free tier compatible
- ~$0.0002 per analysis

### 5. **Production-Ready**
- Error handling & retries
- Rate limiting
- Schema validation
- Token tracking

---

## 📊 Real Example

**Input Document** (excerpt):
```
DECISION MEMO: Q2 2024 Product Launch

Date: March 15, 2024
Decision Maker: Sarah Chen, VP of Product
Status: APPROVED

We have decided to launch "Project Phoenix" - a new mobile 
application targeting the healthcare sector...
```

**Gemini Output** (Step 2):
```json
{
  "decision_title": "Q2 2024 Product Launch - Project Phoenix",
  "decision_date": "2024-03-15",
  "decision_maker": "Sarah Chen",
  "decision_maker_role": "VP of Product",
  "rationale": [
    "Market opportunity: $50B addressable market",
    "Competitive advantage: Proprietary AI technology"
  ],
  "risks_identified": [
    "Regulatory compliance requirements (HIPAA)",
    "Longer sales cycles than anticipated"
  ]
}
```

**Result**: Structured data extracted from unstructured text! ✨

---

## 🎤 Hackathon Pitch Points

1. **"We use Google Gemini to analyze decision documents"**
   - 6-step structured analysis
   - Each step extracts specific insights

2. **"Gemini understands business context"**
   - Identifies stakeholders and relationships
   - Assesses risks and outcomes

3. **"Production-ready implementation"**
   - Schema validation prevents errors
   - Error handling and retries
   - Cost-effective (Flash model)

4. **"Perfect for hackathon demos"**
   - Demo mode works without API key
   - Shows all features
   - No costs, unlimited testing

---

## 📈 Token Usage

- **Per case**: ~44,000 tokens
- **Cost**: ~$0.0002 per analysis
- **Free tier**: 1 real run/day = $0.006/month

---

## 🔗 Key Files

- **`lib/gemini.ts`** - Gemini API client
- **`lib/schema-validators.ts`** - Zod schemas for validation
- **`test-data/gemini/recorded/`** - Example responses

---

**See `GEMINI_USAGE.md` for complete documentation.**

