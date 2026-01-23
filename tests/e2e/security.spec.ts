/**
 * E2E Security Tests
 * Tests API key leakage in real browser environment
 */

import { test, expect } from '@playwright/test';

test.describe('Security E2E Tests', () => {
  test('should not expose GEMINI_API_KEY in page HTML', async ({ page }) => {
    // Navigate to a page
    await page.goto('/');
    
    // Get page HTML content
    const htmlContent = await page.content();
    
    // Check that API key is not in HTML
    const apiKeyPatterns = [
      process.env.GEMINI_API_KEY || 'mock-api-key-for-testing',
      'GEMINI_API_KEY',
      'geminiApiKey',
      'apiKey',
    ];
    
    for (const pattern of apiKeyPatterns) {
      expect(htmlContent).not.toContain(pattern);
    }
  });

  test('should not expose GEMINI_API_KEY in network responses', async ({ page }) => {
    const responses: string[] = [];
    
    // Intercept network requests
    page.on('response', async (response) => {
      const text = await response.text().catch(() => '');
      responses.push(text);
    });
    
    // Navigate and trigger API calls
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check all responses for API key
    const apiKey = process.env.GEMINI_API_KEY || 'mock-api-key-for-testing';
    for (const response of responses) {
      expect(response).not.toContain(apiKey);
      expect(response).not.toContain('GEMINI_API_KEY');
    }
  });

  test('should not expose GEMINI_API_KEY in JavaScript console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    // Listen to console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Navigate and trigger potential errors
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check console errors for API key
    const apiKey = process.env.GEMINI_API_KEY || 'mock-api-key-for-testing';
    for (const error of consoleErrors) {
      expect(error).not.toContain(apiKey);
      expect(error).not.toContain('GEMINI_API_KEY');
    }
  });

  test('should not expose API keys in response headers', async ({ page }) => {
    const headers: Record<string, string>[] = [];
    
    // Intercept network requests
    page.on('response', async (response) => {
      const responseHeaders: Record<string, string> = {};
      for (const [key, value] of Object.entries(response.headers())) {
        responseHeaders[key.toLowerCase()] = value;
      }
      headers.push(responseHeaders);
    });
    
    // Navigate and trigger API calls
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check headers for API key
    const suspiciousHeaders = ['x-api-key', 'authorization', 'x-gemini-key', 'api-key'];
    const apiKey = process.env.GEMINI_API_KEY || 'mock-api-key-for-testing';
    
    for (const headerSet of headers) {
      for (const headerName of suspiciousHeaders) {
        const headerValue = headerSet[headerName];
        if (headerValue) {
          expect(headerValue).not.toContain(apiKey);
        }
      }
    }
  });

  test('should prevent public pages from performing write operations', async ({ page }) => {
    // This test would navigate to a public share page
    // and attempt to perform write operations
    // For now, we'll verify the page loads
    
    await page.goto('/public/case/test-slug');
    
    // Check that write endpoints are not accessible from public pages
    // This would require mocking the API responses
    const writeEndpoints = ['/api/case/test-case-123/run', '/api/case/test-case-123'];
    
    for (const endpoint of writeEndpoints) {
      const response = await page.request.post(endpoint).catch(() => null);
      
      if (response) {
        // Should be blocked (401, 403, or 404)
        expect([401, 403, 404]).toContain(response.status());
      }
    }
  });
});

