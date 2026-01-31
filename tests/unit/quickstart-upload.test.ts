/**
 * Unit Tests for QuickStart Upload Route
 * Tests DOCX, PDF, and TXT file extraction
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/quickstart/upload/route';
import { NextRequest } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock mammoth
vi.mock('mammoth', () => ({
  default: {
    extractRawText: vi.fn(),
  },
}));

// Mock pdf-parse
vi.mock('pdf-parse', () => ({
  default: vi.fn(),
}));

// Mock demo-mode
vi.mock('@/lib/demo-mode', () => ({
  isDemoMode: vi.fn(() => false),
}));

// Import after mocks
import mammoth from 'mammoth';
import pdfParseLib from 'pdf-parse';

/**
 * Load a minimal DOCX fixture file
 * If fixture doesn't exist, create a minimal DOCX buffer for testing
 */
function loadDocxFixture(): Buffer {
  const fixturePath = path.join(__dirname, '../fixtures/minimal-test.docx');
  
  if (fs.existsSync(fixturePath)) {
    return fs.readFileSync(fixturePath);
  }
  
  // Fallback: Create a minimal DOCX structure
  // This is a ZIP file with minimal DOCX XML structure
  // For real tests, create a proper DOCX using Word or a library
  // This minimal version may not parse correctly with mammoth, but tests the code path
  const zipHeader = Buffer.from([0x50, 0x4B, 0x03, 0x04]); // PK header
  return zipHeader;
}

/**
 * Create a test file for FormData
 */
async function createTestFile(
  name: string,
  content: Buffer | string,
  mimeType: string
): Promise<File> {
  const buffer = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
  // Convert Buffer to Uint8Array for Blob compatibility
  const uint8Array = new Uint8Array(buffer);
  const blob = new Blob([uint8Array], { type: mimeType });
  return new File([blob], name, { type: mimeType });
}

/**
 * Create a NextRequest with FormData
 */
async function createUploadRequest(file: File): Promise<NextRequest> {
  const formData = new FormData();
  formData.append('file', file);
  
  return new NextRequest('http://localhost:3000/api/quickstart/upload', {
    method: 'POST',
    body: formData,
  });
}

describe('QuickStart Upload Route - File Extraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('DOCX Extraction', () => {
    it('should extract text from DOCX file using mammoth', async () => {
      const testContent = 'This is a test DOCX document.\n\nIt contains multiple paragraphs.\n\nAnd some text.';
      
      // Load or create minimal DOCX buffer
      const docxBuffer = loadDocxFixture();
      const file = await createTestFile('test.docx', docxBuffer, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      
      const request = await createUploadRequest(file);
      
      // Mock mammoth to return expected text
      vi.mocked(mammoth.extractRawText).mockResolvedValue({
        value: testContent,
        messages: [],
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.extractedText).toBe(testContent);
      expect(data.filename).toBe('test.docx');
      expect(data.mimeType).toContain('wordprocessingml');
      expect(data.preview).toBe(testContent.slice(0, 2000));
      expect(mammoth.extractRawText).toHaveBeenCalled();
      
      vi.mocked(mammoth.extractRawText).mockClear();
    });

    it('should detect DOCX by filename extension', async () => {
      const testContent = 'DOCX content by extension';
      const docxBuffer = loadDocxFixture();
      const file = await createTestFile('document.docx', docxBuffer, 'application/octet-stream'); // Wrong mime type
      
      const request = await createUploadRequest(file);
      
      vi.mocked(mammoth.extractRawText).mockResolvedValue({
        value: testContent,
        messages: [],
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockMammoth).toHaveBeenCalled(); // Should still use mammoth due to .docx extension
      
      mockMammoth.mockRestore();
    });

    it('should return 422 if DOCX extraction yields empty text', async () => {
      const docxBuffer = loadDocxFixture();
      const file = await createTestFile('empty.docx', docxBuffer, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      
      const request = await createUploadRequest(file);
      
      vi.mocked(mammoth.extractRawText).mockResolvedValue({
        value: '', // Empty text
        messages: [],
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(422);
      expect(data.code).toBe('UNSUPPORTED_PREVIEW');
      expect(data.error).toContain('Could not extract readable text');
      
      mockMammoth.mockRestore();
    });

    it('should handle DOCX extraction errors gracefully', async () => {
      const docxBuffer = Buffer.from('invalid docx content');
      const file = await createTestFile('invalid.docx', docxBuffer, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      
      const request = await createUploadRequest(file);
      
      vi.mocked(mammoth.extractRawText).mockRejectedValue(
        new Error('Invalid DOCX structure')
      );
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(422);
      expect(data.code).toBe('EXTRACTION_FAILED');
      expect(data.error).toContain('Failed to extract text from DOCX');
      
      mockMammoth.mockRestore();
    });
  });

  describe('TXT/MD Extraction', () => {
    it('should extract text from TXT file using UTF-8', async () => {
      const testContent = 'This is a plain text file.\n\nWith multiple lines.\n\nAnd UTF-8 characters: é, ñ, 中文';
      const file = await createTestFile('test.txt', testContent, 'text/plain');
      
      const request = await createUploadRequest(file);
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.extractedText).toBe(testContent);
      expect(data.filename).toBe('test.txt');
      expect(data.mimeType).toBe('text/plain');
    });

    it('should extract text from MD file', async () => {
      const testContent = '# Markdown File\n\nThis is **bold** text.';
      const file = await createTestFile('test.md', testContent, 'text/markdown');
      
      const request = await createUploadRequest(file);
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.extractedText).toBe(testContent);
    });
  });

  describe('PDF Extraction', () => {
    it('should extract text from PDF file using pdf-parse', async () => {
      // Create a minimal PDF buffer (PDF header + minimal structure)
      // Real PDFs are complex, so we'll mock pdf-parse for unit tests
      const pdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\nxref\n0 0\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF');
      const file = await createTestFile('test.pdf', pdfBuffer, 'application/pdf');
      
      const request = await createUploadRequest(file);
      
      (pdfParseLib as any).default.mockResolvedValue({
        text: 'Extracted PDF text content',
        info: {},
        metadata: {},
        version: '1.4',
        numpages: 1,
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.extractedText).toContain('Extracted PDF text');
      expect((pdfParseLib as any).default).toHaveBeenCalled();
      
      vi.mocked((pdfParseLib as any).default).mockClear();
    });

    it('should return 422 if PDF extraction yields empty text', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4\n%%EOF'); // Minimal empty PDF
      const file = await createTestFile('empty.pdf', pdfBuffer, 'application/pdf');
      
      const request = await createUploadRequest(file);
      
      (pdfParseLib as any).default.mockResolvedValue({
        text: '', // Empty text
        info: {},
        metadata: {},
        version: '1.4',
        numpages: 1,
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(422);
      expect(data.code).toBe('UNSUPPORTED_PREVIEW');
      expect(data.error).toContain('Could not extract readable text');
      
      mockPdfParse.mockRestore();
    });
  });

  describe('Error Handling', () => {
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
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data.error).toContain('File upload is required');
    });

    it('should return 422 for unsupported preview (empty text)', async () => {
      const file = await createTestFile('empty.txt', '', 'text/plain');
      const request = await createUploadRequest(file);
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(422);
      expect(data.code).toBe('UNSUPPORTED_PREVIEW');
    });
  });
});

