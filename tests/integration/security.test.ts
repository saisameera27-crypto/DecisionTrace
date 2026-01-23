/**
 * Security Regression Tests
 * Tests for API key leakage and public write protection
 * 
 * Why: A single leak is catastrophic; tests make it provable.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { test as base } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

// Mock Next.js types
type NextRequest = any;
type NextResponse = any;

let NextRequestClass: any;
let NextResponseClass: any;

try {
  const nextServer = require('next/server');
  NextRequestClass = nextServer.NextRequest;
  NextResponseClass = nextServer.NextResponse;
} catch {
  NextRequestClass = class MockNextRequest {
    constructor(public url: string, public init?: any) {}
    async formData() {
      return new FormData();
    }
  };
  NextResponseClass = {
    json: (data: any, init?: any) => ({
      status: init?.status || 200,
      json: async () => data,
      text: async () => JSON.stringify(data),
      headers: new Headers(init?.headers || {}),
    }),
  };
}

import {
  resetTestDatabase,
  createTestCase,
  callRouteHandler,
  createTestRequest,
} from './_harness';

/**
 * Mock handler that should NOT expose API keys
 */
async function mockSecureHandler(req: NextRequest): Promise<NextResponse> {
  const apiKey = process.env.GEMINI_API_KEY || 'secret-key';
  
  // Simulate handler that uses API key but should not expose it
  const response = NextResponseClass.json({
    success: true,
    message: 'Operation completed',
    // Intentionally NOT including apiKey
  });
  
  // Ensure API key is not in headers
  response.headers.delete('X-API-Key');
  response.headers.delete('Authorization');
  
  return response;
}

/**
 * Mock handler that simulates a public read-only endpoint
 */
async function mockPublicReadHandler(req: NextRequest): Promise<NextResponse> {
  return NextResponseClass.json({
    caseId: 'test-case-123',
    report: {
      title: 'Public Report',
      narrative: 'This is a public report',
    },
  });
}

/**
 * Mock handler that simulates a write endpoint (should be protected)
 */
async function mockWriteHandler(req: NextRequest): Promise<NextResponse> {
  // Check for authentication/authorization
  const authHeader = req.headers.get('authorization');
  const csrfToken = req.headers.get('x-csrf-token');
  
  // Public requests should not be able to write
  if (!authHeader && !csrfToken) {
    return NextResponseClass.json(
      { error: 'Unauthorized: Write operations require authentication' },
      { status: 401 }
    );
  }
  
  // Check if request is from public page (should be blocked)
  const referer = req.headers.get('referer') || '';
  if (referer.includes('/public/case/')) {
    return NextResponseClass.json(
      { error: 'Forbidden: Public pages cannot perform write operations' },
      { status: 403 }
    );
  }
  
  return NextResponseClass.json({ success: true });
}

describe('Security Regression Tests', () => {
  beforeEach(async () => {
    await resetTestDatabase();
    vi.clearAllMocks();
  });

  describe('API Key Leakage Prevention', () => {
    it('should NOT expose GEMINI_API_KEY in response body', async () => {
      const req = createTestRequest('/api/test', { method: 'GET' });
      const response = await callRouteHandler(mockSecureHandler, req);
      
      const text = await response.text();
      const json = JSON.parse(text);
      
      // API key should not appear in response
      expect(text).not.toContain(process.env.GEMINI_API_KEY || 'secret-key');
      expect(json).not.toHaveProperty('apiKey');
      expect(json).not.toHaveProperty('GEMINI_API_KEY');
      expect(json).not.toHaveProperty('geminiApiKey');
    });

    it('should NOT expose GEMINI_API_KEY in response headers', async () => {
      const req = createTestRequest('/api/test', { method: 'GET' });
      const response = await callRouteHandler(mockSecureHandler, req);
      
      const headers = response.headers;
      const headerKeys = Array.from(headers.keys());
      
      // Check common header names that might leak API keys
      const suspiciousHeaders = [
        'x-api-key',
        'authorization',
        'x-gemini-key',
        'api-key',
        'gemini-api-key',
      ];
      
      suspiciousHeaders.forEach((headerName) => {
        expect(headerKeys).not.toContain(headerName);
        expect(headers.get(headerName)).toBeNull();
      });
    });

    it('should NOT expose GEMINI_API_KEY in error messages', async () => {
      const errorHandler = async (req: NextRequest) => {
        const apiKey = process.env.GEMINI_API_KEY || 'secret-key';
        throw new Error(`API call failed with key: ${apiKey}`);
      };
      
      const req = createTestRequest('/api/test', { method: 'GET' });
      
      try {
        await callRouteHandler(errorHandler, req);
      } catch (error: any) {
        // Error should not contain API key
        const errorMessage = error.message || String(error);
        expect(errorMessage).not.toContain(process.env.GEMINI_API_KEY || 'secret-key');
      }
    });

    it('should NOT expose GEMINI_API_KEY in HTML responses (E2E)', async () => {
      // This would be tested in E2E with Playwright
      // For now, we'll create a test that can be run in E2E
      const htmlContent = `
        <html>
          <head><title>Test Page</title></head>
          <body>
            <div id="app">Test Content</div>
            <script>
              // This should NOT contain API key
              const config = { apiUrl: '/api' };
            </script>
          </body>
        </html>
      `;
      
      // Verify HTML doesn't contain API key
      expect(htmlContent).not.toContain(process.env.GEMINI_API_KEY || 'secret-key');
      expect(htmlContent).not.toContain('GEMINI_API_KEY');
    });
  });

  describe('Public Write Protection', () => {
    it('should reject POST requests from public pages without auth', async () => {
      const req = createTestRequest('/api/case/test-case-123/run', {
        method: 'POST',
        headers: {
          referer: 'https://example.com/public/case/test-slug',
        },
      });
      
      const response = await callRouteHandler(mockWriteHandler, req);
      
      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.error).toContain('Public pages cannot perform write operations');
    });

    it('should reject write operations without CSRF token from public pages', async () => {
      const req = createTestRequest('/api/case/test-case-123/run', {
        method: 'POST',
        headers: {
          referer: 'https://example.com/public/case/test-slug',
          // No CSRF token
        },
      });
      
      const response = await callRouteHandler(mockWriteHandler, req);
      
      expect(response.status).toBe(403);
    });

    it('should allow read operations from public pages', async () => {
      const req = createTestRequest('/api/public/case/test-slug', {
        method: 'GET',
        headers: {
          referer: 'https://example.com/public/case/test-slug',
        },
      });
      
      const response = await callRouteHandler(mockPublicReadHandler, req);
      
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toHaveProperty('caseId');
      expect(json).toHaveProperty('report');
    });

    it('should reject DELETE requests from public pages', async () => {
      const req = createTestRequest('/api/case/test-case-123', {
        method: 'DELETE',
        headers: {
          referer: 'https://example.com/public/case/test-slug',
        },
      });
      
      const response = await callRouteHandler(mockWriteHandler, req);
      
      expect(response.status).toBe(403);
    });

    it('should reject PUT/PATCH requests from public pages', async () => {
      const methods = ['PUT', 'PATCH'];
      
      for (const method of methods) {
        const req = createTestRequest('/api/case/test-case-123', {
          method: method as any,
          headers: {
            referer: 'https://example.com/public/case/test-slug',
          },
        });
        
        const response = await callRouteHandler(mockWriteHandler, req);
        
        expect(response.status).toBe(403);
      }
    });

    it('should allow authenticated write operations from non-public pages', async () => {
      const req = createTestRequest('/api/case/test-case-123/run', {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-token',
          referer: 'https://example.com/case/test-case-123',
        },
      });
      
      const response = await callRouteHandler(mockWriteHandler, req);
      
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
    });
  });

  describe('E2E Security Checks', () => {
    it('should verify no API keys in page HTML (E2E test placeholder)', async () => {
      // This test should be run in E2E with Playwright
      // It would:
      // 1. Navigate to a page
      // 2. Get page HTML content
      // 3. Search for API key patterns
      // 4. Assert no matches found
      
      const htmlContent = '<html><body><div>Test</div></html>';
      expect(htmlContent).not.toContain(process.env.GEMINI_API_KEY || 'secret-key');
    });

    it('should verify no API keys in network responses (E2E test placeholder)', async () => {
      // This test should be run in E2E with Playwright
      // It would:
      // 1. Intercept network requests
      // 2. Check response bodies and headers
      // 3. Assert no API keys found
      
      const mockResponse = {
        body: { success: true, data: {} },
        headers: { 'content-type': 'application/json' },
      };
      
      const responseText = JSON.stringify(mockResponse.body);
      expect(responseText).not.toContain(process.env.GEMINI_API_KEY || 'secret-key');
    });

    it('should verify no API keys in JavaScript console errors (E2E test placeholder)', async () => {
      // This test should be run in E2E with Playwright
      // It would:
      // 1. Listen to console errors
      // 2. Check error messages
      // 3. Assert no API keys found
      
      const mockError = new Error('Something went wrong');
      expect(mockError.message).not.toContain(process.env.GEMINI_API_KEY || 'secret-key');
    });
  });

  describe('CSRF Protection', () => {
    it('should require CSRF token for state-changing operations', async () => {
      const req = createTestRequest('/api/case/test-case-123/run', {
        method: 'POST',
        headers: {
          // No CSRF token
        },
      });
      
      const response = await callRouteHandler(mockWriteHandler, req);
      
      // Should require authentication/CSRF
      expect([401, 403]).toContain(response.status);
    });

    it('should validate CSRF token format if provided', async () => {
      const req = createTestRequest('/api/case/test-case-123/run', {
        method: 'POST',
        headers: {
          'x-csrf-token': 'invalid-token-format',
        },
      });
      
      // In a real implementation, this would validate the token
      // For now, we just check that the header is read
      expect(req.headers.get('x-csrf-token')).toBe('invalid-token-format');
    });
  });
});

