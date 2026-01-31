/**
 * Unit Tests for QuickStart Text Extraction Library
 * Tests detectFileKind and extractTextFromUpload functions
 * 
 * Note: These are fast unit tests that don't use Request/FormData
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import { NextRequest } from 'next/server';
import { Buffer } from 'node:buffer';
import { detectFileKind, extractTextFromUpload } from '@/lib/quickstart/extract-text';

// CRITICAL: Mocks must be declared BEFORE importing the route handler module
// Mock mammoth - extractRawText returns { value: string, messages: [] }
vi.mock('mammoth', () => ({
  default: {
    extractRawText: vi.fn().mockResolvedValue({
      value: 'Extracted DOCX text',
      messages: [],
    }),
  },
}));

// Mock pdf-parse - it's a function that returns { text: string }
vi.mock('pdf-parse', () => ({
  default: vi.fn().mockResolvedValue({
    text: 'Extracted PDF text',
  }),
}));

// Mock demo-mode
vi.mock('@/lib/demo-mode', () => ({
  isDemoMode: vi.fn(() => false),
}));

// Import mocked modules
import mammoth from 'mammoth';
import pdfParseLib from 'pdf-parse';

// Dynamic import of route handler - will be loaded AFTER mocks are set up
let POST: typeof import('@/app/api/quickstart/upload/route').POST;

describe('QuickStart Text Extraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mocks to default return values
    vi.mocked(mammoth.extractRawText).mockResolvedValue({
      value: 'Extracted DOCX text',
      messages: [],
    });
    vi.mocked(pdfParseLib as any).mockResolvedValue({
      text: 'Extracted PDF text',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('detectFileKind', () => {
    it('should detect DOCX by MIME type', () => {
      expect(detectFileKind('document.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('docx');
    });

    it('should detect DOCX by filename extension', () => {
      expect(detectFileKind('document.docx', 'application/octet-stream')).toBe('docx');
      expect(detectFileKind('file.docx')).toBe('docx');
    });

    it('should detect PDF by MIME type', () => {
      expect(detectFileKind('document.pdf', 'application/pdf')).toBe('pdf');
    });

    it('should detect PDF by filename extension', () => {
      expect(detectFileKind('document.pdf', 'application/octet-stream')).toBe('pdf');
      expect(detectFileKind('file.pdf')).toBe('pdf');
    });

    it('should detect MD by MIME type', () => {
      expect(detectFileKind('readme.md', 'text/markdown')).toBe('md');
    });

    it('should detect MD by filename extension', () => {
      expect(detectFileKind('readme.md')).toBe('md');
    });

    it('should detect TXT by MIME type', () => {
      expect(detectFileKind('file.txt', 'text/plain')).toBe('txt');
    });

    it('should detect TXT by filename extension', () => {
      expect(detectFileKind('file.txt')).toBe('txt');
    });

    it('should default text/* MIME types to txt', () => {
      expect(detectFileKind('file.unknown', 'text/html')).toBe('txt');
      expect(detectFileKind('file.unknown', 'text/csv')).toBe('txt');
    });

    it('should return unknown for unrecognized files', () => {
      expect(detectFileKind('file.xyz', 'application/octet-stream')).toBe('unknown');
      expect(detectFileKind('file.xyz')).toBe('unknown');
    });
  });

  describe('extractTextFromUpload - TXT files', () => {
    it('should extract text from TXT file bytes', async () => {
      const testContent = 'This is a plain text file.\n\nWith multiple lines.\n\nAnd UTF-8 characters: é, ñ, 中文';
      const bytes = new TextEncoder().encode(testContent);

      const result = await extractTextFromUpload({
        filename: 'test.txt',
        mimeType: 'text/plain',
        bytes,
      });

      expect(result.text).toBe(testContent);
      expect(result.warnings).toBeUndefined();
    });

    it('should trim whitespace from extracted text', async () => {
      const testContent = '  Text with spaces  \n\n';
      const bytes = new TextEncoder().encode(testContent);

      const result = await extractTextFromUpload({
        filename: 'test.txt',
        bytes,
      });

      expect(result.text).toBe('Text with spaces');
    });

    it('should return empty string for empty file', async () => {
      const bytes = new Uint8Array(0);

      const result = await extractTextFromUpload({
        filename: 'empty.txt',
        bytes,
      });

      expect(result.text).toBe('');
    });
  });

  describe('extractTextFromUpload - MD files', () => {
    it('should extract text from MD file bytes', async () => {
      const testContent = '# Markdown File\n\nThis is **bold** text.';
      const bytes = new TextEncoder().encode(testContent);

      const result = await extractTextFromUpload({
        filename: 'test.md',
        mimeType: 'text/markdown',
        bytes,
      });

      expect(result.text).toBe(testContent);
      expect(result.warnings).toBeUndefined();
    });
  });

  describe('extractTextFromUpload - DOCX files', () => {
    it('should extract text from DOCX using mammoth', async () => {
      const testContent = 'This is a test DOCX document.\n\nIt contains multiple paragraphs.';
      const docxBytes = new Uint8Array([0x50, 0x4B, 0x03, 0x04]); // Minimal DOCX header

      vi.mocked(mammoth.extractRawText).mockResolvedValue({
        value: testContent,
        messages: [],
      });

      const result = await extractTextFromUpload({
        filename: 'test.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        bytes: docxBytes,
      });

      expect(result.text).toBe(testContent);
      expect(mammoth.extractRawText).toHaveBeenCalled();
      expect(mammoth.extractRawText).toHaveBeenCalledWith({
        buffer: expect.any(Buffer),
      });
    });

    it('should include warnings from mammoth messages', async () => {
      const docxBytes = new Uint8Array([0x50, 0x4B, 0x03, 0x04]);

      vi.mocked(mammoth.extractRawText).mockResolvedValue({
        value: 'Extracted text',
        messages: [
          { type: 'warning', message: 'Warning 1' } as any,
          { type: 'error', message: 'Error message' } as any,
        ],
      });

      const result = await extractTextFromUpload({
        filename: 'test.docx',
        bytes: docxBytes,
      });

      expect(result.text).toBe('Extracted text');
      expect(result.warnings).toEqual(['Warning 1', 'Error message']);
    });

    it('should handle DOCX extraction errors', async () => {
      const docxBytes = new Uint8Array([0x50, 0x4B, 0x03, 0x04]);

      vi.mocked(mammoth.extractRawText).mockRejectedValue(
        new Error('Invalid DOCX structure')
      );

      await expect(
        extractTextFromUpload({
          filename: 'invalid.docx',
          bytes: docxBytes,
        })
      ).rejects.toThrow('Failed to extract text from DOCX');
    });

    it('should return empty string if mammoth returns empty text', async () => {
      const docxBytes = new Uint8Array([0x50, 0x4B, 0x03, 0x04]);

      vi.mocked(mammoth.extractRawText).mockResolvedValue({
        value: '   \n\n  ', // Whitespace only
        messages: [],
      });

      const result = await extractTextFromUpload({
        filename: 'empty.docx',
        bytes: docxBytes,
      });

      expect(result.text).toBe('');
    });
  });

  describe('extractTextFromUpload - PDF files', () => {
    it('should extract text from PDF using pdf-parse', async () => {
      const testContent = 'Extracted PDF text content';
      const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF header

      vi.mocked(pdfParseLib as any).mockResolvedValue({
        text: testContent,
        info: {},
        metadata: {},
      });

      const result = await extractTextFromUpload({
        filename: 'test.pdf',
        mimeType: 'application/pdf',
        bytes: pdfBytes,
      });

      expect(result.text).toBe(testContent);
      expect(pdfParseLib).toHaveBeenCalled();
      expect(pdfParseLib).toHaveBeenCalledWith(expect.any(Buffer));
    });

    it('should handle PDF extraction errors', async () => {
      const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

      vi.mocked(pdfParseLib as any).mockRejectedValue(
        new Error('Invalid PDF structure')
      );

      await expect(
        extractTextFromUpload({
          filename: 'invalid.pdf',
          bytes: pdfBytes,
        })
      ).rejects.toThrow('Failed to extract text from PDF');
    });

    it('should return empty string if pdf-parse returns empty text', async () => {
      const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

      vi.mocked(pdfParseLib as any).mockResolvedValue({
        text: '   \n\n  ', // Whitespace only
      });

      const result = await extractTextFromUpload({
        filename: 'empty.pdf',
        bytes: pdfBytes,
      });

      expect(result.text).toBe('');
    });
  });

  describe('extractTextFromUpload - Unknown files', () => {
    it('should attempt UTF-8 decoding for unknown file types', async () => {
      const testContent = 'Plain text content';
      const bytes = new TextEncoder().encode(testContent);

      const result = await extractTextFromUpload({
        filename: 'file.unknown',
        mimeType: 'application/octet-stream',
        bytes,
      });

      expect(result.text).toBe(testContent);
      expect(result.warnings).toEqual(['File type unknown, attempted UTF-8 decoding']);
    });

    it('should reject unknown binary files', async () => {
      // Binary data with non-printable characters
      const bytes = new Uint8Array([0x00, 0x01, 0x02, 0xFF, 0xFE]);

      await expect(
        extractTextFromUpload({
          filename: 'file.bin',
          mimeType: 'application/octet-stream',
          bytes,
        })
      ).rejects.toThrow('Unsupported file type');
    });
  });
});

describe('QuickStart Upload Route Handler', () => {
  // Dynamically import the route handler AFTER all mocks are set up
  beforeAll(async () => {
    const routeModule = await import('@/app/api/quickstart/upload/route');
    POST = routeModule.POST;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mocks to default return values
    vi.mocked(mammoth.extractRawText).mockResolvedValue({
      value: 'Extracted DOCX text',
      messages: [],
    });
    vi.mocked(pdfParseLib as any).mockResolvedValue({
      text: 'Extracted PDF text',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Create a real File object using Node 20 Web APIs
   * Ensures File has arrayBuffer() method for route handler
   * Uses type cast for tests to avoid TypeScript BlobPart errors with Uint8Array
   */
  function createRealFile(
    content: string | Uint8Array,
    filename: string,
    mimeType: string
  ): File {
    if (typeof content === 'string') {
      // For strings, encode to Uint8Array then create File with cast
      const bytes = new TextEncoder().encode(content);
      return new File([bytes as unknown as BlobPart], filename, { type: mimeType });
    } else {
      // For Uint8Array, create File with cast
      return new File([content as unknown as BlobPart], filename, { type: mimeType });
    }
  }

  /**
   * Create a NextRequest with real FormData containing a real File
   * Ensures formData() resolves immediately and File has arrayBuffer() method
   * Uses real File objects that implement arrayBuffer() correctly
   */
  function createUploadRequest(file: File): NextRequest {
    // Store the original File - Node.js 20+ native File has arrayBuffer()
    const storedFile = file;
    
    // Create FormData with the File
    const formData = new FormData();
    formData.append('file', storedFile);
    
    // Create NextRequest with FormData body
    const request = new NextRequest('http://localhost:3000/api/quickstart/upload', {
      method: 'POST',
      body: formData,
    });
    
    // Override formData() to return FormData immediately with File that has arrayBuffer()
    // This ensures formData() resolves immediately (no hanging) and File methods are preserved
    request.formData = async () => {
      // Return a new FormData with the stored File to ensure it has arrayBuffer()
      const resultFormData = new FormData();
      resultFormData.append('file', storedFile);
      return resultFormData;
    };
    
    return request;
  }

  describe('TXT file upload', () => {
    it('should extract text from TXT file and return success', async () => {
      const testContent = 'This is a plain text file.\n\nWith multiple lines.';
      const file = createRealFile(testContent, 'test.txt', 'text/plain');
      const request = createUploadRequest(file);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.extractedText).toBe(testContent);
      expect(data.filename).toBe('test.txt');
      expect(data.mimeType).toBe('text/plain');
      expect(data.preview).toBe(testContent.slice(0, 2000));
      expect(data.documentId).toBeDefined();
    });
  });

  describe('MD file upload', () => {
    it('should extract text from MD file and return success', async () => {
      const testContent = '# Markdown File\n\nThis is **bold** text.';
      const file = createRealFile(testContent, 'test.md', 'text/markdown');
      const request = createUploadRequest(file);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.extractedText).toBe(testContent);
      expect(data.filename).toBe('test.md');
    });
  });

  describe('DOCX file upload', () => {
    it('should extract text from DOCX using mammoth and return success', async () => {
      const testContent = 'This is a test DOCX document.\n\nIt contains multiple paragraphs.';
      // Minimal DOCX bytes (ZIP header)
      const docxBytes = new Uint8Array([0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00]);
      const file = createRealFile(
        docxBytes,
        'test.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );

      vi.mocked(mammoth.extractRawText).mockResolvedValue({
        value: testContent,
        messages: [],
      });

      const request = createUploadRequest(file);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.extractedText).toBe(testContent);
      expect(data.filename).toBe('test.docx');
      expect(mammoth.extractRawText).toHaveBeenCalled();
    });

    it('should return 422 if DOCX extraction yields empty text', async () => {
      const docxBytes = new Uint8Array([0x50, 0x4B, 0x03, 0x04]);
      const file = createRealFile(
        docxBytes,
        'empty.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );

      vi.mocked(mammoth.extractRawText).mockResolvedValue({
        value: '', // Empty text
        messages: [],
      });

      const request = createUploadRequest(file);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.code).toBe('EMPTY_PREVIEW');
      expect(data.error).toContain('Could not extract readable text');
    });
  });

  describe('PDF file upload', () => {
    it('should extract text from PDF using pdf-parse and return success', async () => {
      const testContent = 'Extracted PDF text content';
      // Minimal PDF bytes (%PDF header)
      const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34]);
      const file = createRealFile(pdfBytes, 'test.pdf', 'application/pdf');

      vi.mocked(pdfParseLib as any).mockResolvedValue({
        text: testContent,
        info: {},
        metadata: {},
      });

      const request = createUploadRequest(file);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.extractedText).toBe(testContent);
      expect(data.filename).toBe('test.pdf');
      expect(pdfParseLib).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should return 400 if file is missing', async () => {
      const formData = new FormData();
      // No file appended
      const request = new NextRequest('http://localhost:3000/api/quickstart/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('FILE_MISSING');
      expect(data.error).toBe('File is required');
    });

    it('should return 422 for empty text files', async () => {
      const file = createRealFile('', 'empty.txt', 'text/plain');
      const request = createUploadRequest(file);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.code).toBe('EMPTY_PREVIEW');
    });

    it('should return 422 if extraction fails', async () => {
      const docxBytes = new Uint8Array([0x50, 0x4B, 0x03, 0x04]);
      const file = createRealFile(
        docxBytes,
        'invalid.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );

      vi.mocked(mammoth.extractRawText).mockRejectedValue(
        new Error('Invalid DOCX structure')
      );

      const request = createUploadRequest(file);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.code).toBe('EXTRACTION_FAILED');
      expect(data.error).toContain('Failed to extract text from DOCX');
    });
  });
});
