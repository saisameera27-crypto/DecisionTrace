/**
 * Gemini API Client with Test Mode Support
 * Supports mock, replay, and live modes for testing
 * Respects free-tier limits when FREE_MODE=true
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  isFreeMode,
  getFreeModeModel,
  getFreeModeThinkingLevel,
  validateModelForFreeMode,
} from './free-tier-limits';
import { isDemoMode } from './demo-mode';
import {
  GEMINI_MODEL,
  validateGemini3Model,
  getDefaultGemini3Model,
  isBlockedModel,
} from './gemini/config';
import { buildForensicAnalysisPrompt } from './forensic-analysis';

export type GeminiTestMode = 'mock' | 'replay' | 'live';

export interface GeminiCallOptions {
  caseId?: string;
  stepName?: string;
  prompt?: string;
  fileUri?: string;
  documentText?: string; // Raw document text for non-echo validation
  model?: string;
  thinkingLevel?: 'low' | 'medium' | 'high';
}

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
      role: string;
    };
    finishReason: string;
    index: number;
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

/**
 * Get test mode from environment variable
 * In demo mode, automatically uses mock mode
 */
function getTestMode(): GeminiTestMode {
  // If demo mode is enabled, use mock mode (no API key needed)
  if (isDemoMode()) {
    return 'mock';
  }
  
  const mode = process.env.GEMINI_TEST_MODE;
  if (mode === 'mock' || mode === 'replay' || mode === 'live') {
    return mode;
  }
  // Default to mock in test environment, live in production
  return process.env.NODE_ENV === 'test' ? 'mock' : 'live';
}

/**
 * Load recorded response from test-data/gemini/recorded/
 */
function loadRecordedResponse(filename: string): GeminiResponse {
  const filePath = path.join(
    process.cwd(),
    'test-data',
    'gemini',
    'recorded',
    filename
  );
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`Recorded response not found: ${filePath}`);
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Load replay response by caseId and stepName
 */
function loadReplayResponse(caseId: string, stepName: string): GeminiResponse | null {
  const replayDir = path.join(
    process.cwd(),
    'test-data',
    'gemini',
    'recorded',
    'replay'
  );
  
  if (!fs.existsSync(replayDir)) {
    return null;
  }
  
  const filename = `${caseId}_${stepName}.json`;
  const filePath = path.join(replayDir, filename);
  
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Mock mode: Return deterministic canned JSON per step
 */
function getMockResponse(stepName: string): GeminiResponse {
  // Map step names to fixture files
  const stepMap: Record<string, string> = {
    'step1': 'step1.json',
    'step2': 'step2.json',
    'step3': 'step3.json',
    'step4': 'step4.json',
    'step5': 'step5.json',
    'step6': 'step6.json',
  };
  
  const filename = stepMap[stepName] || 'default.json';
  return loadRecordedResponse(filename);
}

/**
 * Convert normalized step data to Gemini response format
 */
function convertStepDataToGeminiResponse(stepData: any): GeminiResponse {
  // Convert step data to Gemini API response format
  const text = JSON.stringify(stepData, null, 2);
  
  return {
    candidates: [
      {
        content: {
          parts: [{ text }],
          role: 'model',
        },
        finishReason: 'STOP',
        index: 0,
        safetyRatings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            probability: 'NEGLIGIBLE',
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            probability: 'NEGLIGIBLE',
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            probability: 'NEGLIGIBLE',
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            probability: 'NEGLIGIBLE',
          },
        ],
      },
    ],
    usageMetadata: {
      promptTokenCount: 100,
      candidatesTokenCount: 200,
      totalTokenCount: 300,
    },
  };
}

/**
 * Call Gemini API with test mode support
 */
export async function callGeminiAPI(
  options: GeminiCallOptions
): Promise<GeminiResponse> {
  // In demo mode, always use mock (no API key needed)
  if (isDemoMode()) {
    const stepName = options.stepName || 'step1';
    return getMockResponse(stepName);
  }
  
  // In production, only allow live mode (safety check)
  if (process.env.NODE_ENV === 'production') {
    const mode = process.env.GEMINI_TEST_MODE;
    if (mode && mode !== 'live') {
      throw new Error('Test modes are not allowed in production');
    }
    // Force live mode in production
    return callRealGeminiAPI(options);
  }
  
  const mode = getTestMode();
  
  switch (mode) {
    case 'mock':
      // Return deterministic canned JSON per step
      const stepName = options.stepName || 'step1';
      return getMockResponse(stepName);
    
    case 'replay':
      // Look up by (caseId, stepName) and return recorded outputs
      if (!options.caseId || !options.stepName) {
        throw new Error('caseId and stepName required for replay mode');
      }
      
      const replayResponse = loadReplayResponse(options.caseId, options.stepName);
      if (replayResponse) {
        return replayResponse;
      }
      
      // Fallback to mock if replay not found
      console.warn(`Replay response not found for ${options.caseId}_${options.stepName}, falling back to mock`);
      return getMockResponse(options.stepName);
    
    case 'live':
      // Real Gemini API call
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is required for live mode');
      }
      
      return callRealGeminiAPI(options);
    
    default:
      throw new Error(`Unknown test mode: ${mode}`);
  }
}

/**
 * Call real Gemini API (only used in live mode)
 * STRICT: Only Gemini 3 models are allowed
 * Respects free-tier limits when FREE_MODE=true
 */
async function callRealGeminiAPI(
  options: GeminiCallOptions
): Promise<GeminiResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required for live mode');
  }
  
  // STRICT VALIDATION: Check if model is explicitly blocked
  if (options.model && isBlockedModel(options.model)) {
    throw new Error(
      `Model "${options.model}" is blocked. Only Gemini 3 models are supported. ` +
      `Please use "gemini-3" or a Gemini 3 variant.`
    );
  }
  
  // Get model - default to Gemini 3, validate strictly
  let model: string;
  if (options.model) {
    // Validate that provided model is Gemini 3
    try {
      model = validateGemini3Model(options.model);
    } catch (error: any) {
      throw new Error(
        `Invalid model: ${error.message}. ` +
        `Only Gemini 3 models are supported. Please use "gemini-3" or a Gemini 3 variant.`
      );
    }
  } else {
    // Default to Gemini 3
    model = getDefaultGemini3Model();
  }
  
  let thinkingLevel = options.thinkingLevel || 'low';
  
  if (isFreeMode()) {
    // Force Flash model in free mode (must still be Gemini 3)
    const freeModel = getFreeModeModel();
    
    // Validate free mode model is still Gemini 3
    try {
      model = validateGemini3Model(freeModel);
    } catch (error: any) {
      throw new Error(
        `Free mode model "${freeModel}" is not a Gemini 3 model. ` +
        `This is a configuration error. Only Gemini 3 models are supported.`
      );
    }
    
    thinkingLevel = getFreeModeThinkingLevel();
    
    // Validate model selection
    const validation = validateModelForFreeMode(model, thinkingLevel);
    if (!validation.allowed) {
      throw new Error(`Free mode constraint: ${validation.reason}`);
    }
  }
  
  // Final validation before API call
  if (!model.startsWith('gemini-3')) {
    throw new Error(
      `Model "${model}" is not a Gemini 3 model. ` +
      `Only Gemini 3 models are supported. Please use "gemini-3" or a Gemini 3 variant.`
    );
  }
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  const requestBody: any = {
    contents: [
      {
        parts: [],
      },
    ],
  };
  
  // Only set thinkingLevel if not in free mode (free mode always uses low)
  if (!isFreeMode() && thinkingLevel && thinkingLevel !== 'low') {
    requestBody.generationConfig = {
      thinkingLevel: thinkingLevel,
    };
  }
  
  // For step2, automatically use forensic analysis prompt
  // The prompt should be the forensic analysis instructions (document will be read from fileUri)
  let finalPrompt = options.prompt;
  if (options.stepName === 'step2') {
    // Use forensic analysis prompt - document text will be read from fileUri
    // If prompt contains document text (no fileUri), use it directly
    // Otherwise, use standard forensic analysis instructions
    if (options.fileUri) {
      // Document is in fileUri, use forensic analysis instructions
      finalPrompt = `You are a decision forensic analyst.

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
  "has_clear_decision": boolean,
  "decision_candidates": [
    {
      "decision_text": "verbatim quote from document",
      "type": "explicit" | "implicit",
      "confidence": number (0-1)
    }
  ],
  "fragments": [
    {
      "quote": "exact verbatim quote from document",
      "classification": "evidence" | "assumption" | "risk" | "stakeholder_signal",
      "context": "surrounding text (verbatim) if helpful for understanding",
    }
  ],
  "no_decision_message": string (only if has_clear_decision is false)
}`;
    } else if (options.prompt) {
      // Document text is in prompt, use forensic analysis prompt builder
      finalPrompt = buildForensicAnalysisPrompt(options.prompt);
    }
  }
  
  if (finalPrompt) {
    requestBody.contents[0].parts.push({ text: finalPrompt });
  }
  
  if (options.fileUri) {
    requestBody.contents[0].parts.push({ fileData: { fileUri: options.fileUri } });
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Gemini API error: ${response.status} - ${errorText}`;
    
    // Check if error is due to model unavailability
    if (response.status === 404 || errorText.includes('not found') || errorText.includes('invalid model')) {
      errorMessage = `Gemini 3 model "${model}" is not available. ` +
        `Please verify that the model name is correct and that Gemini 3 is available in your region. ` +
        `Original error: ${errorText}`;
    }
    
    throw new Error(errorMessage);
  }
  
  return await response.json() as GeminiResponse;
}

/**
 * Upload file to Gemini Files API
 */
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
  
  // In production, only allow live mode (safety check)
  if (process.env.NODE_ENV === 'production') {
    const mode = process.env.GEMINI_TEST_MODE;
    if (mode && mode !== 'live') {
      throw new Error('Test modes are not allowed in production');
    }
    // Force live mode in production
    return uploadFileToGeminiLive(file, mimeType, fileName);
  }
  
  const mode = getTestMode();
  
  switch (mode) {
    case 'mock':
    case 'replay':
      // Return mock file URI
      return {
        uri: `gs://gemini-files/test-${Date.now()}-${fileName}`,
        mimeType,
        name: fileName,
      };
    
    case 'live':
      // Real Gemini Files API upload
      return uploadFileToGeminiLive(file, mimeType, fileName);
    
    default:
      throw new Error(`Unknown test mode: ${mode}`);
  }
}

/**
 * Upload file to real Gemini Files API (only used in live mode)
 */
async function uploadFileToGeminiLive(
  file: Buffer,
  mimeType: string,
  fileName: string
): Promise<{ uri: string; mimeType: string; name: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required for live mode');
  }
  
  const url = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`;
  
  // Create multipart form data
  const formData = new FormData();
  const metadata = {
    file: {
      displayName: fileName,
    },
  };
  
  formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  formData.append('file', new Blob([new Uint8Array(file)], { type: mimeType }), fileName);
  
  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini Files API error: ${response.status} - ${error}`);
  }
  
  const result = await response.json() as {
    file?: {
      uri?: string;
      mimeType?: string;
      displayName?: string;
    };
    name?: string;
  };
  return {
    uri: result.file?.uri || `gs://gemini-files/${result.name || fileName}`,
    mimeType: result.file?.mimeType || mimeType,
    name: result.file?.displayName || fileName,
  };
}

/**
 * Get Gemini client instance (for compatibility)
 */
export function getGeminiClient() {
  return {
    callAPI: callGeminiAPI,
    uploadFile: uploadFileToGemini,
  };
}

