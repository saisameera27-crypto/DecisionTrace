/**
 * Unit Tests for QuickStart Text API Route
 * Tests the /api/quickstart/text endpoint
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { NextRequest } from 'next/server';

// Mock demo-mode
vi.mock('@/lib/demo-mode', () => ({
  isDemoMode: vi.fn(() => false),
}));

// Dynamic import of route handler - will be loaded AFTER mocks are set up
let POST: typeof import('@/app/api/quickstart/text/route').POST;

describe('QuickStart Text API Route', () => {
  beforeAll(async () => {
    const routeModule = await import('@/app/api/quickstart/text/route');
    POST = routeModule.POST;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createTextRequest(text: string): NextRequest {
    return new NextRequest('http://localhost:3000/api/quickstart/text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });
  }

  function countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  describe('Text validation', () => {
    it('should return 400 if text is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/quickstart/text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('TEXT_MISSING');
      expect(data.error).toBe('Text is required');
    });

    it('should return 400 if text is empty string', async () => {
      const request = createTextRequest('');

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('TEXT_MISSING');
    });

    it('should return 400 if text is only whitespace', async () => {
      const request = createTextRequest('   \n\n  ');

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('TEXT_MISSING');
    });

    it('should return 422 if text exceeds 5000 words', async () => {
      // Create text with 5001 words
      const longText = Array(5001).fill('word').join(' ');
      const request = createTextRequest(longText);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data.error).toContain('exceeds 5000 words');
    });

    it('should accept text with exactly 5000 words', async () => {
      const text = Array(5000).fill('word').join(' ');
      const request = createTextRequest(text);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.documentId).toBeDefined();
    });
  });

  describe('Text processing', () => {
    it('should return success response with correct shape', async () => {
      const text = 'This is a test document with some content.';
      const request = createTextRequest(text);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.documentId).toBeDefined();
      expect(data.extractedText).toBe(text);
      expect(data.previewText).toBeDefined();
      expect(data.fileName).toBe('text-input.txt');
      expect(data.mimeType).toBe('text/plain');
      expect(data.size).toBeGreaterThan(0);
    });

    it('should limit text to 200k characters', async () => {
      const longText = 'a'.repeat(300_000);
      const request = createTextRequest(longText);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.extractedText.length).toBe(200_000);
    });

    it('should generate preview text (first 2000 characters)', async () => {
      const text = 'a'.repeat(5000);
      const request = createTextRequest(text);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.previewText.length).toBe(2000);
      expect(data.previewText).toBe(text.slice(0, 2000));
    });
  });

  describe('Word counting', () => {
    it('should count words correctly', async () => {
      const text = 'This is a test with five words.';
      const request = createTextRequest(text);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Verify text was processed (word count validation passed)
      expect(data.extractedText).toBe(text);
    });

    it('should handle multiple spaces between words', async () => {
      const text = 'word1    word2     word3';
      const request = createTextRequest(text);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.extractedText).toBe(text);
    });
  });
});

