/**
 * Unit Tests for QuickStart Text API Route
 * Tests the /api/quickstart/text endpoint
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { NextRequest } from 'next/server';

// Mock Prisma client
const mockPrismaClient = {
  caseDocument: {
    create: vi.fn(),
  },
};

vi.mock('@/lib/prisma', () => ({
  getPrismaClient: vi.fn(() => mockPrismaClient),
}));

// Mock Gemini Files client
const mockGeminiFilesClient = {
  uploadFile: vi.fn(),
};

vi.mock('@/lib/gemini-files', () => ({
  getGeminiFilesClient: vi.fn(() => mockGeminiFilesClient),
}));

// Mock demo-mode
const mockIsDemoMode = vi.fn(() => false);
vi.mock('@/lib/demo-mode', () => ({
  isDemoMode: () => mockIsDemoMode(),
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
    // Set up default mocks
    mockIsDemoMode.mockReturnValue(false);
    mockPrismaClient.caseDocument.create.mockResolvedValue({
      id: 'test-document-id',
      caseId: 'pending',
      fileName: 'text-input.txt',
      fileSize: 100,
      mimeType: 'text/plain',
      status: 'completed',
    });
    mockGeminiFilesClient.uploadFile.mockResolvedValue({
      uri: 'gs://gemini-files/test-file',
      name: 'text-input.txt',
      mimeType: 'text/plain',
    });
    // Set DATABASE_URL for tests
    process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./tmp/test.db';
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
      expect(data.code).toBe('MISSING_TEXT');
      expect(data.error).toBe('Text is required');
    });

    it('should return 422 if text is empty string', async () => {
      const request = createTextRequest('');

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.code).toBe('EMPTY_TEXT');
    });

    it('should return 422 if text is only whitespace', async () => {
      const request = createTextRequest('   \n\n  ');

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.code).toBe('EMPTY_TEXT');
    });

    it('should return 422 if text exceeds 5000 words', async () => {
      // Create text with 5001 words
      const longText = Array(5001).fill('word').join(' ');
      const request = createTextRequest(longText);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.code).toBe('WORD_LIMIT_EXCEEDED');
      expect(data.limit).toBe(5000);
      expect(data.error).toContain('exceeds 5000 words');
    });

    it('should accept text with exactly 5000 words', async () => {
      const text = Array(5000).fill('word').join(' ');
      const request = createTextRequest(text);
      
      // Mock successful document creation
      mockPrismaClient.caseDocument.create.mockResolvedValue({
        id: 'test-doc-5000',
        caseId: 'pending',
        fileName: 'text-input.txt',
        fileSize: text.length,
        mimeType: 'text/plain',
        status: 'completed',
      });

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
      
      // Mock successful document creation
      mockPrismaClient.caseDocument.create.mockResolvedValue({
        id: 'test-doc-123',
        caseId: 'pending',
        fileName: 'text-input.txt',
        fileSize: text.length,
        mimeType: 'text/plain',
        status: 'completed',
      });

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
      
      mockPrismaClient.caseDocument.create.mockResolvedValue({
        id: 'test-doc-long',
        caseId: 'pending',
        fileName: 'text-input.txt',
        fileSize: 200_000,
        mimeType: 'text/plain',
        status: 'completed',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.extractedText.length).toBe(200_000);
    });

    it('should generate preview text (first 2000 characters)', async () => {
      const text = 'a'.repeat(5000);
      const request = createTextRequest(text);
      
      mockPrismaClient.caseDocument.create.mockResolvedValue({
        id: 'test-doc-preview',
        caseId: 'pending',
        fileName: 'text-input.txt',
        fileSize: text.length,
        mimeType: 'text/plain',
        status: 'completed',
      });

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
      
      mockPrismaClient.caseDocument.create.mockResolvedValue({
        id: 'test-doc-words',
        caseId: 'pending',
        fileName: 'text-input.txt',
        fileSize: text.length,
        mimeType: 'text/plain',
        status: 'completed',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Verify text was processed (word count validation passed)
      expect(data.extractedText).toBe(text);
    });

    it('should handle multiple spaces between words', async () => {
      const text = 'word1    word2     word3';
      const request = createTextRequest(text);
      
      mockPrismaClient.caseDocument.create.mockResolvedValue({
        id: 'test-doc-spaces',
        caseId: 'pending',
        fileName: 'text-input.txt',
        fileSize: text.length,
        mimeType: 'text/plain',
        status: 'completed',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.extractedText).toBe(text);
    });
  });
});

