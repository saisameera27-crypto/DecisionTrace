/**
 * Document Processor with Forensic Analysis
 * 
 * Processes unstructured documents using forensic analysis approach:
 * - Identifies ALL decision candidates (explicit or implicit)
 * - Extracts evidence fragments as verbatim quotes
 * - Classifies fragments into: evidence, assumptions, risks, stakeholder signals
 * - Returns structured JSON only (no summaries, paraphrasing, or invented facts)
 */

import { callGeminiAPI } from './gemini';
import { uploadFileToGemini } from './gemini';
import { forensicAnalysisSchema, type ForensicAnalysisResult } from './forensic-analysis';
import { step2Schema } from './schema-validators';
import { GEMINI_MODEL } from './gemini/config';

export interface ProcessDocumentOptions {
  caseId: string;
  documentId: string;
  documentText?: string; // If provided, use this instead of fileUri
  fileUri?: string; // Gemini file URI if document was uploaded
  fileName?: string;
}

/**
 * Process a document using forensic analysis
 * 
 * This function:
 * 1. Calls Gemini with forensic analysis prompt
 * 2. Validates response against forensicAnalysisSchema
 * 3. Returns structured JSON with verbatim quotes and classifications
 */
export async function processDocumentForensically(
  options: ProcessDocumentOptions
): Promise<ForensicAnalysisResult & { step: number; status: string; errors: string[]; warnings: string[] }> {
  const { caseId, documentId, documentText, fileUri, fileName } = options;

  // Call Gemini API with forensic analysis prompt
  const geminiResponse = await callGeminiAPI({
    caseId,
    stepName: 'step2',
    prompt: documentText, // If documentText provided, it will be used in prompt
    fileUri, // If fileUri provided, document will be read from Gemini Files
    model: GEMINI_MODEL,
  });

  // Extract response text
  const responseText = geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  
  // Parse JSON response
  let parsedResponse: any;
  try {
    parsedResponse = JSON.parse(responseText);
  } catch (parseError: any) {
    throw new Error(`Failed to parse Gemini response as JSON: ${parseError.message}`);
  }

  // Validate against step2Schema (which includes forensic analysis fields)
  const validationResult = step2Schema.safeParse(parsedResponse);
  
  if (!validationResult.success) {
    // Return partial success with errors
    return {
      step: 2,
      status: 'partial_success',
      has_clear_decision: false,
      decision_candidates: [],
      fragments: [],
      no_decision_message: 'Failed to validate forensic analysis response',
      errors: validationResult.error.issues.map((e: any) => e.message || 'Validation error'),
      warnings: [],
    };
  }

  const validatedData = validationResult.data.data;

  // Return forensic analysis result
  return {
    step: 2,
    status: validatedData.has_clear_decision ? 'success' : 'partial_success',
    has_clear_decision: validatedData.has_clear_decision,
    decision_candidates: validatedData.decision_candidates || [],
    fragments: validatedData.fragments || [],
    no_decision_message: validatedData.no_decision_message,
    errors: parsedResponse.errors || [],
    warnings: parsedResponse.warnings || [],
  };
}

