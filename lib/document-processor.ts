/**
 * Document Processor for Step 1: Document Digest
 * 
 * Processes unstructured documents to create a structured Document Digest:
 * - Normalizes entities (people, orgs, products, dates)
 * - Extracts claims with evidence anchors (citations)
 * - Identifies contradictions
 * - Lists missing information
 * - Generates NEW structure and reasoning, NOT copy-paste
 */

import { callGeminiAPI } from './gemini';
import { uploadFileToGemini } from './gemini';
import { buildForensicAnalysisPrompt } from './forensic-analysis';
import { step1Schema } from './schema-validators';
import { GEMINI_MODEL } from './gemini/config';
import { validateNonEcho } from './non-echo-guard';

export interface ProcessDocumentOptions {
  caseId: string;
  documentId: string;
  documentText?: string; // If provided, use this instead of fileUri
  fileUri?: string; // Gemini file URI if document was uploaded
  fileName?: string;
}

/**
 * Process a document to create Document Digest (Step 1)
 * 
 * This function:
 * 1. Calls Gemini with Document Digest prompt
 * 2. Validates response against step1Schema
 * 3. Checks for non-echo violations (>30% overlap with input)
 * 4. Returns structured Document Digest
 */
export async function processDocumentForensically(
  options: ProcessDocumentOptions
): Promise<{ step: number; status: string; data: any; errors: string[]; warnings: string[] }> {
  const { caseId, documentId, documentText, fileUri } = options;

  if (!documentText && !fileUri) {
    throw new Error('Either documentText or fileUri must be provided');
  }

  // Build prompt for Document Digest
  const prompt = documentText 
    ? buildForensicAnalysisPrompt(documentText)
    : buildForensicAnalysisPrompt(''); // Will use fileUri if documentText not available

  // Call Gemini API
  const geminiResponse = await callGeminiAPI({
    caseId,
    stepName: 'step1',
    prompt,
    fileUri,
    documentText,
    model: GEMINI_MODEL,
  });

  // Extract response text
  const responseText = geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  
  // Parse JSON response
  let parsedResponse: any;
  try {
    parsedResponse = JSON.parse(responseText);
  } catch (parseError: any) {
    return {
      step: 1,
      status: 'error',
      data: {},
      errors: [`Failed to parse Gemini response as JSON: ${parseError.message}`],
      warnings: [],
    };
  }

  // Validate against step1Schema
  const validationResult = step1Schema.safeParse({
    step: 1,
    status: 'success',
    data: {
      document_id: documentId,
      ...parsedResponse,
      extracted_at: new Date().toISOString(),
    },
    errors: [],
    warnings: [],
  });
  
  if (!validationResult.success) {
    return {
      step: 1,
      status: 'partial_success',
      data: {},
      errors: validationResult.error.issues.map((e: any) => e.message || 'Validation error'),
      warnings: ['Schema validation failed'],
    };
  }

  const validatedData = validationResult.data.data;

  // Non-echo guard: Check for excessive overlap with raw input
  if (documentText) {
    const echoViolations = validateNonEcho(validatedData, documentText, 30);
    if (echoViolations.length > 0) {
      return {
        step: 1,
        status: 'partial_success',
        data: validatedData,
        errors: [],
        warnings: [
          `Non-echo violation detected in fields: ${echoViolations.join(', ')}. ` +
          `These fields contain >30% overlap with input text and should be rewritten with abstraction.`
        ],
      };
    }
  }

  // Success
  return {
    step: 1,
    status: 'success',
    data: validatedData,
    errors: [],
    warnings: [],
  };
}

