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

export type GeminiTestMode = 'mock' | 'replay' | 'live';

export interface GeminiCallOptions {
  caseId?: string;
  stepName?: string;
  prompt?: string;
  fileUri?: string;
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
 */
function getTestMode(): GeminiTestMode {
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
 * Respects free-tier limits when FREE_MODE=true
 */
async function callRealGeminiAPI(
  options: GeminiCallOptions
): Promise<GeminiResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required for live mode');
  }
  
  // Apply free mode constraints
  let model = options.model || 'gemini-3-flash-preview';
  let thinkingLevel = options.thinkingLevel || 'low';
  
  if (isFreeMode()) {
    // Force Flash model in free mode
    model = getFreeModeModel();
    thinkingLevel = getFreeModeThinkingLevel();
    
    // Validate model selection
    const validation = validateModelForFreeMode(model, thinkingLevel);
    if (!validation.allowed) {
      throw new Error(`Free mode constraint: ${validation.reason}`);
    }
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
  
  if (options.prompt) {
    requestBody.contents[0].parts.push({ text: options.prompt });
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
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
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
  formData.append('file', new Blob([file], { type: mimeType }), fileName);
  
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

