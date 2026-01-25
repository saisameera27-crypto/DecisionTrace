/**
 * Gemini Files API Client
 * Handles file uploads and polling for ACTIVE status
 * Supports test modes (mock/replay/live) for testing
 */

import { HttpError, badRequest } from './errors';

export interface GeminiFile {
  uri: string;
  mimeType: string;
  name: string;
  state?: 'PROCESSING' | 'ACTIVE' | 'FAILED';
}

export interface GeminiFilesClient {
  uploadFile(file: File | Buffer, mimeType: string, fileName?: string): Promise<GeminiFile>;
  getFile(uri: string): Promise<GeminiFile>;
  waitForFileActive(uri: string, maxAttempts?: number, intervalMs?: number): Promise<GeminiFile>;
}

/**
 * Get test mode from environment variable
 */
function getTestMode(): 'mock' | 'replay' | 'live' {
  const mode = process.env.GEMINI_TEST_MODE;
  if (mode === 'mock' || mode === 'replay' || mode === 'live') {
    return mode;
  }
  // Default to mock in test environment, live in production
  return process.env.NODE_ENV === 'test' ? 'mock' : 'live';
}

/**
 * Mock Gemini Files Client (for test mode)
 */
class MockGeminiFilesClient implements GeminiFilesClient {
  async uploadFile(file: File | Buffer, mimeType: string, fileName?: string): Promise<GeminiFile> {
    const name = fileName || (file instanceof File ? file.name : 'uploaded-file');
    return {
      uri: `gs://gemini-files/test-${Date.now()}-${name}`,
      mimeType,
      name,
      state: 'ACTIVE', // In mock mode, files are immediately ACTIVE
    };
  }

  async getFile(uri: string): Promise<GeminiFile> {
    // In mock mode, always return ACTIVE
    return {
      uri,
      mimeType: 'application/pdf',
      name: uri.split('/').pop() || 'file',
      state: 'ACTIVE',
    };
  }

  async waitForFileActive(uri: string, maxAttempts?: number, intervalMs?: number): Promise<GeminiFile> {
    // In mock mode, return immediately with ACTIVE state
    return this.getFile(uri);
  }
}

/**
 * Live Gemini Files Client (for production)
 */
class LiveGeminiFilesClient implements GeminiFilesClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async uploadFile(file: File | Buffer, mimeType: string, fileName?: string): Promise<GeminiFile> {
    const name = fileName || (file instanceof File ? file.name : 'uploaded-file');
    const url = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${this.apiKey}`;

    // Create multipart form data
    const formData = new FormData();
    const metadata = {
      file: {
        displayName: name,
      },
    };

    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    
    if (file instanceof File) {
      formData.append('file', file);
    } else {
      formData.append('file', new Blob([new Uint8Array(file)], { type: mimeType }), name);
    }

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
        state?: string;
      };
      name?: string;
    };

    const fileInfo: GeminiFile = {
      uri: result.file?.uri || `gs://gemini-files/${result.name || name}`,
      mimeType: result.file?.mimeType || mimeType,
      name: result.file?.displayName || name,
      state: (result.file?.state as any) || 'PROCESSING',
    };

    // Wait for file to become ACTIVE
    return this.waitForFileActive(fileInfo.uri);
  }

  async getFile(uri: string): Promise<GeminiFile> {
    const fileId = uri.split('/').pop() || uri;
    const url = `https://generativelanguage.googleapis.com/v1beta/files/${fileId}?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini Files API error: ${response.status} - ${error}`);
    }

    const result = await response.json() as {
      name?: string;
      mimeType?: string;
      state?: string;
    };

    return {
      uri,
      mimeType: result.mimeType || 'application/pdf',
      name: result.name || fileId,
      state: (result.state as any) || 'PROCESSING',
    };
  }

  async waitForFileActive(
    uri: string,
    maxAttempts: number = 50,
    intervalMs: number = process.env.NODE_ENV === 'test' ? 10 : 1000
  ): Promise<GeminiFile> {
    let attempts = 0;

    while (attempts < maxAttempts) {
      const file = await this.getFile(uri);

      if (file.state === 'ACTIVE') {
        return file;
      }

      if (file.state === 'FAILED') {
        throw new Error(`File processing failed: ${uri}`);
      }

      attempts++;
      
      if (attempts >= maxAttempts) {
        throw badRequest(
          'FILE_PROCESSING_TIMEOUT',
          `File did not become ACTIVE within ${maxAttempts} attempts (${maxAttempts * intervalMs}ms). File may still be processing.`,
          { uri, attempts, maxAttempts }
        );
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    throw badRequest(
      'FILE_PROCESSING_TIMEOUT',
      `File did not become ACTIVE within ${maxAttempts} attempts`,
      { uri, attempts, maxAttempts }
    );
  }
}

/**
 * Get Gemini Files Client instance
 * Returns mock client in test mode, live client in production
 */
export function getGeminiFilesClient(): GeminiFilesClient {
  const mode = getTestMode();

  if (mode === 'mock' || mode === 'replay') {
    return new MockGeminiFilesClient();
  }

  // Live mode - requires API key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required for live mode');
  }

  return new LiveGeminiFilesClient(apiKey);
}


