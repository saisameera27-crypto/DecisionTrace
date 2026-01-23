# How Google Gemini Powers Decision Trace

## Overview

**Decision Trace** uses **Google Gemini AI** to perform a 6-step analysis of decision documents, extracting insights, identifying risks, and generating comprehensive reports. This is the core AI functionality that makes your hackathon project stand out.

---

## 🎯 Gemini's Role in the Application

### What Gemini Does

Google Gemini acts as an **intelligent document analyst** that:

1. **Reads and understands** decision documents (memos, emails, reports)
2. **Extracts structured information** (decisions, dates, stakeholders, rationale)
3. **Analyzes context** (business environment, market conditions)
4. **Identifies risks** (potential problems, conflicts, missing evidence)
5. **Assesses outcomes** (what happened vs. what was expected)
6. **Generates insights** (lessons learned, recommendations)

### Why Gemini?

- ✅ **Multimodal**: Can process text documents and PDFs
- ✅ **Structured Output**: Returns JSON that we validate with Zod schemas
- ✅ **Context-Aware**: Understands business decision-making context
- ✅ **Cost-Effective**: Free tier available for hackathons
- ✅ **Fast**: Flash model provides quick responses

---

## 🔄 The 6-Step Analysis Process

Each step makes a **separate Gemini API call** with a specific prompt designed to extract or analyze different aspects of the decision.

### Step 1: Document Processing
**Gemini Call**: `callGeminiAPI({ stepName: 'step1', prompt: '...', fileUri: '...' })`

**What Gemini Does**:
- Reads the uploaded document
- Extracts text content
- Identifies document type (memo, email, report)
- Extracts metadata (dates, authors, file info)

**Gemini Response** (validated by `Step1Schema`):
```json
{
  "step": 1,
  "status": "success",
  "data": {
    "document_id": "doc_12345",
    "document_type": "decision_memo",
    "extracted_text": "DECISION MEMO: Q2 2024 Product Launch...",
    "file_name": "01_launch_decision_memo.txt",
    "metadata": {
      "character_count": 1850,
      "word_count": 320
    }
  }
}
```

**Hackathon Value**: Shows Gemini can read and understand documents.

---

### Step 2: Decision Extraction
**Gemini Call**: `callGeminiAPI({ stepName: 'step2', prompt: 'Extract decision details...' })`

**What Gemini Does**:
- Identifies the **core decision** being made
- Extracts **decision maker** and their role
- Finds **decision date** and status
- Identifies **rationale** (why the decision was made)
- Lists **risks** and **mitigation strategies**

**Gemini Response** (validated by `Step2Schema`):
```json
{
  "step": 2,
  "status": "success",
  "data": {
    "decision_title": "Approve Project Phoenix Launch",
    "decision_maker": "Sarah Chen, VP of Product",
    "decision_date": "2024-03-15",
    "rationale": [
      "Market research shows strong demand",
      "Technical feasibility confirmed",
      "Budget approved by finance"
    ],
    "risks_identified": [
      "Tight timeline may cause quality issues",
      "Competitor may launch similar product"
    ]
  }
}
```

**Hackathon Value**: Demonstrates Gemini's ability to extract structured information from unstructured text.

---

### Step 3: Context Analysis
**Gemini Call**: `callGeminiAPI({ stepName: 'step3', prompt: 'Analyze business context...' })`

**What Gemini Does**:
- Analyzes **business context** surrounding the decision
- Identifies **market conditions** at the time
- Lists **stakeholders** and their influence levels
- Considers **organizational factors** (culture, resources, constraints)

**Gemini Response** (validated by `Step3Schema`):
```json
{
  "step": 3,
  "data": {
    "context_analysis": {
      "business_context": "Company was expanding into healthcare sector...",
      "market_conditions": "Healthcare apps market growing 25% YoY",
      "organizational_factors": ["Strong engineering team", "Limited marketing budget"]
    },
    "stakeholders": [
      { "name": "Sarah Chen", "role": "VP Product", "influence": "high" },
      { "name": "Engineering Team", "role": "Development", "influence": "medium" }
    ]
  }
}
```

**Hackathon Value**: Shows Gemini understands business context and relationships.

---

### Step 4: Outcome Analysis
**Gemini Call**: `callGeminiAPI({ stepName: 'step4', prompt: 'Compare expected vs actual outcomes...' })`

**What Gemini Does**:
- Compares **expected outcomes** vs **actual results**
- Identifies **success metrics** and whether they were met
- Analyzes **deviations** from the plan
- Assesses **impact** of the decision

**Gemini Response** (validated by `Step4Schema`):
```json
{
  "step": 4,
  "data": {
    "outcome_analysis": {
      "actual_outcomes": {
        "revenue": "$2.5M",
        "users": "50,000"
      },
      "expected_vs_actual": {
        "revenue": { "expected": "$3M", "actual": "$2.5M", "variance": "-16.7%" },
        "users": { "expected": "60,000", "actual": "50,000", "variance": "-16.7%" }
      }
    }
  }
}
```

**Hackathon Value**: Demonstrates Gemini's analytical capabilities and comparison skills.

---

### Step 5: Risk Assessment
**Gemini Call**: `callGeminiAPI({ stepName: 'step5', prompt: 'Assess risks and failure indicators...' })`

**What Gemini Does**:
- Identifies **potential risks** that materialized
- Lists **failure indicators** (warning signs that appeared)
- Assesses **risk severity** and impact
- Suggests **what could have been done differently**

**Gemini Response** (validated by `Step5Schema`):
```json
{
  "step": 5,
  "data": {
    "risk_assessment": {
      "risks_materialized": [
        {
          "risk": "Tight timeline caused quality issues",
          "severity": "medium",
          "impact": "User complaints increased 15%"
        }
      ],
      "failure_indicators": [
        "Missed revenue target by 16.7%",
        "Lower user adoption than expected"
      ]
    }
  }
}
```

**Hackathon Value**: Shows Gemini can identify problems and assess severity.

---

### Step 6: Final Report Generation
**Gemini Call**: `callGeminiAPI({ stepName: 'step6', prompt: 'Generate comprehensive report...' })`

**What Gemini Does**:
- Synthesizes all previous steps into a **cohesive narrative**
- Generates **lessons learned**
- Creates **recommendations** for future decisions
- Produces **Mermaid diagram** code for visualization

**Gemini Response** (validated by `Step6Schema`):
```json
{
  "step": 6,
  "data": {
    "final_narrative": "# Decision Trace: Project Phoenix Launch\n\n## Summary\n...",
    "mermaid_diagram": "graph TD\n    A[Decision] --> B[Outcome]\n    B --> C[Lessons]",
    "lessons_learned": [
      "Allow more time for quality assurance",
      "Increase marketing budget for better adoption"
    ],
    "recommendations": [
      "Implement phased rollout approach",
      "Set more conservative revenue targets"
    ]
  }
}
```

**Hackathon Value**: Demonstrates Gemini's ability to synthesize complex information into actionable insights.

---

## 🔌 Technical Implementation

### API Integration

**Location**: `lib/gemini.ts`

**Key Functions**:
```typescript
// Main API call function
callGeminiAPI({
  stepName: 'step2',
  prompt: 'Extract decision details from this document...',
  fileUri: 'gs://gemini-files/document.txt',
  model: 'gemini-3-flash-preview'  // Free mode uses Gemini 3 Flash
})

// File upload function
uploadFileToGemini(
  fileBuffer,
  'text/plain',
  'document.txt'
)
```

### API Endpoint

**Gemini API Endpoint**:
```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=YOUR_API_KEY
```

**Request Body**:
```json
{
  "contents": [{
    "parts": [
      { "text": "Extract decision details from this document..." },
      { "fileData": { "fileUri": "gs://gemini-files/document.txt" } }
    ]
  }],
  "generationConfig": {
    "thinkingLevel": "low"  // Free mode uses low
  }
}
```

**Response**:
```json
{
  "candidates": [{
    "content": {
      "parts": [{ "text": "{ \"step\": 2, \"data\": {...} }" }]
    }
  }],
  "usageMetadata": {
    "promptTokenCount": 5000,
    "candidatesTokenCount": 2000,
    "totalTokenCount": 7000
  }
}
```

---

## 📊 Data Flow

```
1. User uploads document
   ↓
2. Document uploaded to Gemini Files API (or stored in DB for text)
   ↓
3. Step 1: Gemini reads document → extracts text & metadata
   ↓
4. Step 2: Gemini analyzes text → extracts decision details
   ↓
5. Step 3: Gemini analyzes context → identifies stakeholders & factors
   ↓
6. Step 4: Gemini compares outcomes → finds deviations
   ↓
7. Step 5: Gemini assesses risks → identifies problems
   ↓
8. Step 6: Gemini synthesizes → generates final report + diagram
   ↓
9. All data validated with Zod schemas → stored in database
   ↓
10. Report displayed to user with visualizations
```

---

## 🎨 Hackathon Demo Flow

### For Judges (Recommended)

1. **Start with Demo Mode** (no API key needed)
   - Click "Load Sample Case"
   - Shows pre-populated analysis
   - Demonstrates all features without costs

2. **Show Real Gemini** (if API key available)
   - Upload a small document
   - Run one real analysis
   - Show live Gemini processing
   - Display token usage and cost

3. **Highlight Gemini Features**:
   - ✅ Multimodal (text + PDF support)
   - ✅ Structured JSON output
   - ✅ Context understanding
   - ✅ Risk identification
   - ✅ Report generation

---

## 💡 Key Gemini Features Demonstrated

### 1. **Structured Output**
- Gemini returns JSON that matches our Zod schemas
- Enables reliable data extraction
- Validates with `Step1Schema` through `Step6Schema`

### 2. **File Processing**
- Uses **Gemini Files API** for PDFs
- Can process large documents
- Extracts text and metadata automatically

### 3. **Context Understanding**
- Understands business decision-making
- Identifies relationships (stakeholders, risks)
- Connects concepts across the document

### 4. **Multi-Step Reasoning**
- Each step builds on previous analysis
- Maintains context across 6 API calls
- Synthesizes information in final step

### 5. **Cost Optimization**
- Uses **Flash model** (faster, cheaper)
- **Low thinking level** (sufficient for structured extraction)
- Token usage tracked and limited

---

## 📈 Token Usage & Costs

### Per Case Analysis

| Step | Input Tokens | Output Tokens | Cost (Flash) |
|------|--------------|---------------|--------------|
| Step 1 | ~5,000 | ~2,000 | $0.000031 |
| Step 2 | ~8,000 | ~3,000 | $0.000047 |
| Step 3 | ~6,000 | ~2,500 | $0.000038 |
| Step 4 | ~5,000 | ~2,000 | $0.000031 |
| Step 5 | ~4,000 | ~1,500 | $0.000025 |
| Step 6 | ~3,000 | ~2,000 | $0.000022 |
| **Total** | **~31,000** | **~13,000** | **~$0.000194** |

**Free Tier**: 1 real run/day = **$0.000194/day** = **$0.006/month** ✅

---

## 🛡️ Safety & Validation

### Schema Validation
Every Gemini response is validated against Zod schemas:
- Ensures data structure matches expectations
- Catches API response changes
- Provides type safety

### Error Handling
- Retries on 429 (rate limit) errors
- Handles 5xx errors gracefully
- Validates responses before storing

### Free Mode Protection
- Limits to Flash model (not Pro)
- Low thinking level only
- Token budget enforced (60k max)
- Rate limits (3 runs/IP/day)

---

## 🎯 Hackathon Talking Points

### For Your Presentation

1. **"We use Google Gemini to analyze decision documents"**
   - 6-step structured analysis
   - Each step extracts specific insights
   - Validates responses with Zod schemas

2. **"Gemini understands business context"**
   - Identifies stakeholders and relationships
   - Assesses risks and outcomes
   - Generates actionable recommendations

3. **"Cost-effective implementation"**
   - Uses Flash model (fast, cheap)
   - Free tier compatible
   - Token usage tracked and limited

4. **"Production-ready with safety"**
   - Schema validation prevents errors
   - Retry logic handles failures
   - Rate limiting prevents abuse

5. **"Demo mode works without API key"**
   - Perfect for hackathon demos
   - Shows all features
   - No costs, unlimited testing

---

## 📚 Code Examples

### Making a Gemini Call

```typescript
import { callGeminiAPI } from '@/lib/gemini';

// Step 2: Extract decision details
const response = await callGeminiAPI({
  stepName: 'step2',
  prompt: `
    Analyze this decision document and extract:
    - Decision title and date
    - Decision maker and their role
    - Rationale for the decision
    - Risks identified
    - Expected outcomes
    
    Return JSON matching Step2Schema.
  `,
  fileUri: 'gs://gemini-files/document.txt',
  model: 'gemini-3-flash-preview',
  thinkingLevel: 'low'
});

// Validate response
const step2Data = Step2Schema.parse(response.candidates[0].content.parts[0].text);
```

### Uploading a File

```typescript
import { uploadFileToGemini } from '@/lib/gemini';

// Upload PDF to Gemini Files API
const fileInfo = await uploadFileToGemini(
  fileBuffer,
  'application/pdf',
  'decision-memo.pdf'
);

// Use file URI in API calls
const fileUri = fileInfo.uri; // gs://gemini-files/...
```

---

## 🎓 Learning Outcomes

### What This Demonstrates

1. **API Integration**: Proper use of REST APIs
2. **Structured AI**: Getting JSON from LLMs
3. **Validation**: Schema validation with Zod
4. **Error Handling**: Retries, rate limits, fallbacks
5. **Cost Management**: Token tracking, model selection
6. **Testing**: Mock/replay modes for testing

---

## 🚀 Quick Demo Script

**For Hackathon Judges:**

1. **"Let me show you how Gemini analyzes a decision document"**
   - Upload `01_launch_decision_memo.txt`
   - Click "Run Trace"

2. **"Gemini performs 6 steps of analysis"**
   - Step 1: Reads document
   - Step 2: Extracts decision details
   - Step 3: Analyzes context
   - Step 4: Compares outcomes
   - Step 5: Assesses risks
   - Step 6: Generates report

3. **"Here's what Gemini extracted"**
   - Show decision details tab
   - Show evidence table
   - Show risk heatmap
   - Show final report

4. **"All validated and structured"**
   - Show Zod schema validation
   - Show token usage
   - Show cost estimate

---

## 📖 Additional Resources

- **Gemini API Docs**: https://ai.google.dev/docs
- **Gemini Models**: https://ai.google.dev/models/gemini
- **Files API**: https://ai.google.dev/docs/file_upload
- **Pricing**: https://ai.google.dev/pricing

---

## ✅ Summary

**Google Gemini is the AI brain of Decision Trace:**

- ✅ Reads and understands decision documents
- ✅ Extracts structured information (6 steps)
- ✅ Analyzes context and relationships
- ✅ Identifies risks and outcomes
- ✅ Generates comprehensive reports
- ✅ Returns validated JSON responses
- ✅ Cost-effective (Flash model, free tier)
- ✅ Production-ready (error handling, validation)

**Perfect for hackathon judging** - demonstrates real AI integration with practical business value!

