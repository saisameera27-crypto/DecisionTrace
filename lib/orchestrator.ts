/**
 * Orchestrator Module
 * 
 * Executes 6-step analysis pipeline:
 * - Step 1: Decision inference + categorization (forensic analysis)
 * - Steps 2-6: Reference Step 1 output, NOT raw user input
 * - Later steps are forbidden from repeating raw text
 */

import { callGeminiAPI } from './gemini';
import { uploadFileToGemini } from './gemini';
import { buildForensicAnalysisPrompt } from './forensic-analysis';
import { processDocumentForensically } from './document-processor';
import { 
  step1Schema, 
  step2Schema, 
  step3Schema, 
  step4Schema, 
  step5Schema, 
  step6Schema 
} from './schema-validators';
import { GEMINI_MODEL } from './gemini/config';

export interface OrchestratorOptions {
  caseId: string;
  documentId: string;
  fileUri?: string; // Gemini file URI if document was uploaded
  documentText?: string; // Raw document text (for text files)
  fileName?: string;
}

export interface StepResult {
  stepNumber: number;
  status: 'completed' | 'failed' | 'skipped';
  data?: any;
  errors?: string[];
  warnings?: string[];
  tokensUsed?: number;
  durationMs?: number;
}

export interface OrchestratorResult {
  success: boolean;
  stepsCompleted: number;
  stepsFailed: number;
  stepsSkipped: number;
  totalTokens: number;
  totalDurationMs: number;
  steps: StepResult[];
}

/**
 * Build prompt for Step 1: Decision Inference + Categorization
 * This performs forensic analysis on the document
 */
function buildStep1Prompt(documentText?: string): string {
  if (documentText) {
    return buildForensicAnalysisPrompt(documentText);
  }
  
  // If fileUri is used, document will be read from Gemini Files
  return `You are a decision forensic analyst.

Input is an unstructured document containing notes, emails, fragments, or partial thoughts.

There may or may not be a clearly stated decision.

Your task:

1. Identify ALL decision candidates (explicit or implicit).

2. Extract evidence fragments as verbatim quotes.

3. Classify fragments into:
   - evidence
   - assumptions
   - risks
   - stakeholder signals

4. If no clear decision exists, say so explicitly.

DO NOT summarize.
DO NOT paraphrase.
DO NOT invent facts.

Return structured JSON only.

Return JSON in this exact format:
{
  "step": 1,
  "status": "success",
  "data": {
    "document_id": string,
    "has_clear_decision": boolean,
    "decision_candidates": [
      {
        "decision_text": "verbatim quote from document",
        "type": "explicit" | "implicit"
      }
    ],
    "fragments": [
      {
        "quote": "exact verbatim quote from document",
        "classification": "evidence" | "assumption" | "risk" | "stakeholder_signal",
        "context": "surrounding text (verbatim) if helpful"
      }
    ],
    "no_decision_message": string (only if has_clear_decision is false),
    "extracted_at": string (ISO datetime)
  },
  "errors": [],
  "warnings": []
}`;
}

/**
 * Build prompt for Steps 2-6 that reference Step 1 Document Digest
 * These prompts explicitly forbid repeating raw text
 */
function buildStepPrompt(
  stepNumber: number,
  step1Data: any,
  previousSteps?: StepResult[]
): string {
  // Step 1 now produces Document Digest structure
  const step1Summary = {
    normalizedEntities: step1Data.normalizedEntities || {},
    extractedClaims: step1Data.extractedClaims || [],
    contradictions: step1Data.contradictions || [],
    missingInfo: step1Data.missingInfo || [],
  };

  const step1Json = JSON.stringify(step1Summary, null, 2);

  switch (stepNumber) {
    case 2:
      return `You are a decision analysis expert. Your task is to create a "Decision Hypothesis" based on the Step 1 Document Digest.

CRITICAL RULES:
1. You MUST reference ONLY the Step 1 Document Digest results below
2. DO NOT repeat raw document text
3. DO NOT quote or paraphrase the original document
4. DO NOT access the original document file
5. Generate NEW structure and reasoning, NOT copy-paste paragraphs
6. If any field would contain >30% direct overlap with raw input, rewrite it with abstraction/summary
7. Use citations/anchors: include source excerpts (<= 20 words) and stable identifiers where relevant

Step 1 Document Digest:
${step1Json}

Your task:

1. Infer the decision:
   - What decision is likely being made? (synthesize from claims, entities, contradictions)
   - Provide a brief synthesized description (NOT copy-paste)

2. Classify decision type:
   - hiring, product_launch, procurement, policy, incident, or other

3. Identify decision owner candidates:
   - Who is likely making this decision? (from normalized entities - people)
   - Include confidence score (0-1) for each candidate
   - Include evidence anchors (excerpt + identifier) supporting each candidate

4. Infer decision criteria:
   - What criteria are being used to make this decision? (infer from claims, contradictions, missing info)
   - For each criterion, explain what evidence led to inferring it
   - Include evidence anchors where relevant

5. Assess confidence:
   - Confidence score (0-1) in the decision hypothesis
   - List reasons for this confidence level (based on quality of evidence, contradictions, missing info)

Return JSON in this exact format:
{
  "inferredDecision": "Brief synthesized description of the decision (NOT copy-paste)",
  "decisionType": "hiring" | "product_launch" | "procurement" | "policy" | "incident" | "other",
  "decisionOwnerCandidates": [
    {
      "name": "normalized name",
      "role": "role if available",
      "confidence": 0.85,
      "evidenceAnchor": {
        "excerpt": "source excerpt <= 20 words",
        "chunkIndex": 0
      }
    }
  ],
  "decisionCriteria": [
    {
      "criterion": "Brief description of criterion",
      "inferredFrom": "What evidence led to inferring this",
      "evidenceAnchor": {
        "excerpt": "source excerpt <= 20 words",
        "chunkIndex": 0
      }
    }
  ],
  "confidence": {
    "score": 0.75,
    "reasons": ["reason 1", "reason 2"]
  }
}

FORBIDDEN: Copy-pasting paragraphs from the original document. Generate new structure and reasoning.`;

    case 3:
      return `You are analyzing context based on Step 1 forensic analysis.

CRITICAL RULES:
1. Reference ONLY Step 1 results
2. DO NOT repeat raw document text
3. DO NOT quote the original document
4. DO NOT access the original document file
5. Only reference categorized fragments

Step 1 Analysis Results:
${step1Json}

Your task:
- Analyze business context from evidence and assumption fragments (reference, don't quote)
- Identify stakeholders from stakeholder_signal fragments (reference, don't quote)
- Consider organizational factors based on categorized fragments

Return structured JSON matching step3Schema format.
FORBIDDEN: Including verbatim quotes from the original document. Only reference categorized fragments.`;

    case 4:
      return `You are analyzing outcomes based on Step 1 forensic analysis.

CRITICAL: Use ONLY Step 1 categorized fragments. DO NOT repeat raw text.

Step 1 Analysis Results:
${step1Json}

Previous Steps:
${previousSteps ? JSON.stringify(previousSteps.map(s => ({ step: s.stepNumber, data: s.data })), null, 2) : 'None'}

Your task:
- Compare expected vs actual outcomes based on evidence fragments
- Identify success/failure indicators from categorized fragments

Return structured JSON matching step4Schema format.
DO NOT include raw document quotes.`;

    case 5:
      return `You are performing risk assessment based on Step 1 forensic analysis.

CRITICAL: Reference ONLY Step 1 risk fragments. DO NOT repeat raw document text.

Step 1 Analysis Results:
${step1Json}

Previous Steps:
${previousSteps ? JSON.stringify(previousSteps.map(s => ({ step: s.stepNumber, data: s.data })), null, 2) : 'None'}

Your task:
- Assess materialized risks from risk fragments
- Identify failure indicators from categorized fragments

Return structured JSON matching step5Schema format.
DO NOT quote the original document.`;

    case 6:
      return `You are generating a final report based on all previous steps.

CRITICAL RULES:
1. Synthesize from Step 1 categorized fragments and previous step outputs
2. DO NOT repeat raw document text
3. DO NOT quote the original document
4. DO NOT access the original document file
5. Only reference categorized fragments and previous step outputs

Step 1 Analysis Results:
${step1Json}

Previous Steps Summary:
${previousSteps ? JSON.stringify(previousSteps.map(s => ({ step: s.stepNumber, summary: 'See step data' })), null, 2) : 'None'}

Your task:
- Generate comprehensive narrative using categorized fragments (reference, don't quote)
- Create lessons learned from evidence and risk fragments (reference, don't quote)
- Generate recommendations based on categorized analysis
- Create Mermaid diagram

Return structured JSON matching step6Schema format.
FORBIDDEN: Including verbatim quotes from the original document. Only reference categorized fragments and analysis results.`;

    default:
      throw new Error(`Unknown step number: ${stepNumber}`);
  }
}

/**
 * Execute orchestrator: Run all 6 steps sequentially
 */
export async function runOrchestrator(
  options: OrchestratorOptions
): Promise<OrchestratorResult> {
  const { caseId, documentId, fileUri, documentText, fileName } = options;
  
  const results: StepResult[] = [];
  let totalTokens = 0;
  let totalDurationMs = 0;
  let stepsCompleted = 0;
  let stepsFailed = 0;
  let stepsSkipped = 0;

  let step1Data: any = null;

  // Step 1: Document Digest
  try {
    const step1Start = Date.now();
    const step1Prompt = buildStep1Prompt(documentText);
    
    const step1Response = await callGeminiAPI({
      caseId,
      stepName: 'step1',
      prompt: step1Prompt,
      fileUri, // Document will be read from Gemini Files if fileUri provided
      documentText, // Also pass documentText for non-echo validation
      model: GEMINI_MODEL,
    });

    const step1ResponseText = step1Response.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    let step1Parsed: any;
    try {
      step1Parsed = JSON.parse(step1ResponseText);
    } catch (parseError: any) {
      throw new Error(`Step 1 JSON parse failed: ${parseError.message}`);
    }
    
    // Wrap in step1Schema format
    const step1Wrapped = {
      step: 1,
      status: 'success',
      data: {
        document_id: documentId,
        ...step1Parsed,
        extracted_at: new Date().toISOString(),
      },
      errors: [],
      warnings: [],
    };
    
    // Validate Step 1 response
    const step1Validation = step1Schema.safeParse(step1Wrapped);
    if (!step1Validation.success) {
      throw new Error(`Step 1 validation failed: ${step1Validation.error.message}`);
    }

    step1Data = step1Validation.data.data;
    
    // Non-echo guard: Check for excessive overlap with raw input
    if (documentText) {
      const { validateNonEcho } = await import('./non-echo-guard');
      const echoViolations = validateNonEcho(step1Data, documentText, 30);
      if (echoViolations.length > 0) {
        step1Parsed.warnings = step1Parsed.warnings || [];
        step1Parsed.warnings.push(
          `Non-echo violation detected in fields: ${echoViolations.join(', ')}. ` +
          `These fields contain >30% overlap with input text.`
        );
      }
    }
    
    const step1Duration = Date.now() - step1Start;
    const step1Tokens = step1Response.usageMetadata?.totalTokenCount || 0;
    
    totalTokens += step1Tokens;
    totalDurationMs += step1Duration;
    stepsCompleted++;

    results.push({
      stepNumber: 1,
      status: 'completed',
      data: step1Data,
      errors: step1Parsed.errors || [],
      warnings: step1Parsed.warnings || [],
      tokensUsed: step1Tokens,
      durationMs: step1Duration,
    });
  } catch (error: any) {
    stepsFailed++;
    results.push({
      stepNumber: 1,
      status: 'failed',
      errors: [error.message || 'Step 1 failed'],
    });
    // Cannot continue without Step 1
    return {
      success: false,
      stepsCompleted,
      stepsFailed,
      stepsSkipped,
      totalTokens,
      totalDurationMs,
      steps: results,
    };
  }

  // Steps 2-6: Reference Step 1 output, NOT raw input
  for (let stepNumber = 2; stepNumber <= 6; stepNumber++) {
    try {
      const stepStart = Date.now();
      
      // Build prompt that references Step 1 output
      const stepPrompt = buildStepPrompt(stepNumber, step1Data, results);
      
      const stepResponse = await callGeminiAPI({
        caseId,
        stepName: `step${stepNumber}`,
        prompt: stepPrompt,
        // DO NOT pass fileUri - later steps should NOT access raw document
        model: GEMINI_MODEL,
      });

      const stepResponseText = stepResponse.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const stepParsed = JSON.parse(stepResponseText);
      
      // Validate response based on step number
      let stepValidation: any;
      switch (stepNumber) {
        case 2:
          stepValidation = step2Schema.safeParse(stepParsed);
          break;
        case 3:
          stepValidation = step3Schema.safeParse(stepParsed);
          break;
        case 4:
          stepValidation = step4Schema.safeParse(stepParsed);
          break;
        case 5:
          stepValidation = step5Schema.safeParse(stepParsed);
          break;
        case 6:
          stepValidation = step6Schema.safeParse(stepParsed);
          break;
        default:
          throw new Error(`Unknown step number: ${stepNumber}`);
      }

      if (!stepValidation.success) {
        throw new Error(`Step ${stepNumber} validation failed: ${stepValidation.error.message}`);
      }

      const stepDuration = Date.now() - stepStart;
      const stepTokens = stepResponse.usageMetadata?.totalTokenCount || 0;
      
      totalTokens += stepTokens;
      totalDurationMs += stepDuration;
      stepsCompleted++;

      results.push({
        stepNumber,
        status: 'completed',
        data: stepValidation.data.data,
        errors: stepParsed.errors || [],
        warnings: stepParsed.warnings || [],
        tokensUsed: stepTokens,
        durationMs: stepDuration,
      });
    } catch (error: any) {
      stepsFailed++;
      results.push({
        stepNumber,
        status: 'failed',
        errors: [error.message || `Step ${stepNumber} failed`],
      });
      // Continue to next step even if one fails
    }
  }

  return {
    success: stepsFailed === 0,
    stepsCompleted,
    stepsFailed,
    stepsSkipped,
    totalTokens,
    totalDurationMs,
    steps: results,
  };
}

