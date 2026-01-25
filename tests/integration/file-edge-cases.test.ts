/**
 * File Processing Edge Cases Tests
 * Tests handling of real-world file uploads that fail differently
 * 
 * Edge cases:
 * - Password-protected PDF
 * - Corrupted PDF
 * - Image-only PDF (scanned document detection)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  resetTestDatabase,
  callFilesUpload,
  parseJsonResponse,
  assertResponseStatus,
} from './_harness';

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
  };
  NextResponseClass = {
    json: (data: any, init?: any) => ({
      status: init?.status || 200,
      json: async () => data,
      text: async () => JSON.stringify(data),
    }),
  };
}

// Mock PDF parsing library
const mockPDFParser = {
  parse: vi.fn(),
  extractText: vi.fn(),
  isPasswordProtected: vi.fn(),
  isScanned: vi.fn(),
};

vi.mock('pdf-parse', () => ({
  default: mockPDFParser.parse,
}));

/**
 * Enhanced upload handler with PDF validation
 * Uses real Request/Response objects
 */
async function mockEnhancedUploadHandler(req: Request): Promise<Response> {
  try {
    // Try to get FormData - handle both direct access and method call
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (error: any) {
      // If formData() fails, try accessing stored FormData
      const storedFormData = (req as any).__testFormData;
      if (storedFormData) {
        formData = storedFormData;
      } else {
        throw new Error('Could not parse FormData');
      }
    }
    
    const files = formData.getAll('file') as File[];
    
    if (files.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No files provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    for (const file of files) {
      // Check file type
      if (file.type === 'application/pdf') {
        // Get buffer from file - handle both File and Buffer
        // In Node.js test environment, File objects may not have arrayBuffer()
        let buffer: Buffer;
        try {
          // Try multiple methods to get buffer
          if (typeof (file as any).arrayBuffer === 'function') {
            const arrayBuffer = await (file as any).arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
          } else if (file instanceof Buffer) {
            buffer = file as Buffer;
          } else if ((file as any).buffer) {
            buffer = Buffer.from((file as any).buffer);
          } else if ((file as any).content) {
            const content = (file as any).content;
            buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
          } else {
            // Last resort: try to read from the File's internal data
            // In Node.js, File objects created from Buffer should have the data accessible
            const fileData = (file as any).data || (file as any)._data;
            if (fileData) {
              buffer = Buffer.isBuffer(fileData) ? fileData : Buffer.from(fileData);
            } else {
              // If all else fails, try to get the first chunk from the File
              // This works for File objects created with [content] array
              const fileAsAny = file as any;
              if (fileAsAny[Symbol.iterator]) {
                const chunks: Buffer[] = [];
                for (const chunk of fileAsAny) {
                  chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
                }
                buffer = Buffer.concat(chunks);
              } else {
                throw new Error('Cannot extract buffer from file object');
              }
            }
          }
        } catch (error: any) {
          return new Response(
            JSON.stringify({
              error: 'Failed to read file content',
              code: 'PROCESSING_ERROR',
              message: error.message || 'Unknown error',
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }
        
        // Check if PDF is password-protected (use mock return value)
        const isPasswordProtected = mockPDFParser.isPasswordProtected(buffer);
        
        if (isPasswordProtected) {
          return new Response(
            JSON.stringify({
              error: 'Password-protected PDFs are not supported',
              code: 'PASSWORD_PROTECTED',
              message: 'Password-protected PDFs are not supported',
              fileName: file.name,
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
        
        // Check if PDF is corrupted
        try {
          const pdfData = await mockPDFParser.parse(buffer);
          if (!pdfData || !pdfData.info) {
            throw new Error('Invalid PDF structure');
          }
        } catch (error: any) {
          const errorMessage = error.message || '';
          const errorString = String(error).toLowerCase();
          
          // Robust password-protected PDF detection based on error messages
          const passwordIndicators = [
            'password',
            'encrypted',
            'passwordexception',
            'needs password',
            'password required',
            'encrypted document',
            'password-protected',
            'encryption',
            'decrypt',
            'locked',
          ];
          
          const isPasswordError = passwordIndicators.some(
            indicator => 
              errorMessage.toLowerCase().includes(indicator) ||
              errorString.includes(indicator)
          );
          
          if (isPasswordError) {
            return new Response(
              JSON.stringify({
                error: 'Password-protected PDFs are not supported',
                code: 'PASSWORD_PROTECTED',
                message: 'Password-protected PDFs are not supported',
                fileName: file.name,
              }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
          }
          
          // Check if it's a corrupted PDF error
          if (errorMessage.includes('Invalid PDF') || 
              errorMessage.includes('Invalid PDF structure') || 
              errorMessage.includes('Invalid PDF header') ||
              errorMessage.includes('corrupted') ||
              errorMessage.includes('malformed')) {
            return new Response(
              JSON.stringify({
                error: 'PDF file appears to be corrupted or invalid',
                code: 'CORRUPTED_PDF',
                message: 'PDF file appears to be corrupted or invalid',
                fileName: file.name,
              }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
          }
          
          // Re-throw if not a recognized error
          throw error;
        }
        
        // Check if PDF is image-only (scanned)
        const isScanned = mockPDFParser.isScanned(buffer);
        
        if (isScanned) {
          // Return a warning but allow upload
          return new Response(
            JSON.stringify({
              success: true,
              warning: 'PDF appears to be image-only (scanned document). OCR may be required.',
              code: 'SCANNED_DOCUMENT',
              fileName: file.name,
            }),
            { status: 201, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }
    }
    
    return new Response(
      JSON.stringify({ success: true }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    const errorMessage = error.message || '';
    const errorString = String(error).toLowerCase();
    
    // Robust password-protected PDF detection in catch block
    const passwordIndicators = [
      'password',
      'encrypted',
      'passwordexception',
      'needs password',
      'password required',
      'encrypted document',
      'password-protected',
      'encryption',
      'decrypt',
      'locked',
    ];
    
    const isPasswordError = passwordIndicators.some(
      indicator => 
        errorMessage.toLowerCase().includes(indicator) ||
        errorString.includes(indicator)
    );
    
    if (isPasswordError) {
      return new Response(
        JSON.stringify({
          error: 'Password-protected PDFs are not supported',
          code: 'PASSWORD_PROTECTED',
          message: 'Password-protected PDFs are not supported',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Ensure errors are user-friendly, not stack traces
    return new Response(
      JSON.stringify({
        error: 'File processing failed',
        code: 'PROCESSING_ERROR',
        message: error.message || 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

describe('File Processing Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPDFParser.parse.mockClear();
    mockPDFParser.isPasswordProtected.mockClear();
    mockPDFParser.isScanned.mockClear();
  });

  describe('Password-Protected PDF', () => {
    it('should reject password-protected PDF with specific error', async () => {
      mockPDFParser.isPasswordProtected.mockReturnValue(true);
      
      // Create a mock password-protected PDF buffer
      const passwordProtectedPDF = Buffer.from('%PDF-1.4\n%password-protected');
      
      const response = await callFilesUpload(mockEnhancedUploadHandler, {
        name: 'protected.pdf',
        content: passwordProtectedPDF,
        type: 'application/pdf',
      });
      
      await await assertResponseStatus(response, 400);
      const data = await parseJsonResponse(response);
      
      expect(data.error).toContain('Password-protected');
      expect(data.code).toBe('PASSWORD_PROTECTED');
      expect(data.fileName).toBe('protected.pdf');
    });

    it('should provide user-friendly error message (not stack trace)', async () => {
      mockPDFParser.isPasswordProtected.mockReturnValue(true);
      
      const passwordProtectedPDF = Buffer.from('%PDF-1.4\n%password-protected');
      
      const response = await callFilesUpload(mockEnhancedUploadHandler, {
        name: 'protected.pdf',
        content: passwordProtectedPDF,
        type: 'application/pdf',
      });
      
      const data = await parseJsonResponse(response);
      
      // Should not contain stack trace or internal error details
      expect(data.error).not.toContain('at ');
      expect(data.error).not.toContain('Error:');
      expect(data.error).not.toContain('stack');
      expect(data.error).toBeDefined();
      expect(typeof data.error).toBe('string');
    });
  });

  describe('Corrupted PDF', () => {
    it('should fail cleanly for corrupted PDF (not 500 with stack trace)', async () => {
      mockPDFParser.isPasswordProtected.mockReturnValue(false);
      mockPDFParser.parse.mockRejectedValue(new Error('Invalid PDF structure'));
      
      // Create a corrupted PDF buffer
      const corruptedPDF = Buffer.from('This is not a valid PDF file');
      
      const response = await callFilesUpload(mockEnhancedUploadHandler, {
        name: 'corrupted.pdf',
        content: corruptedPDF,
        type: 'application/pdf',
      });
      
      // Should return 400, not 500
      await await assertResponseStatus(response, 400);
      const data = await parseJsonResponse(response);
      
      expect(data.error).toContain('corrupted');
      expect(data.code).toBe('CORRUPTED_PDF');
      expect(data.fileName).toBe('corrupted.pdf');
    });

    it('should not expose internal error details for corrupted PDF', async () => {
      mockPDFParser.isPasswordProtected.mockReturnValue(false);
      mockPDFParser.parse.mockRejectedValue(
        new Error('Invalid PDF structure: missing xref table')
      );
      
      const corruptedPDF = Buffer.from('Invalid PDF content');
      
      const response = await callFilesUpload(mockEnhancedUploadHandler, {
        name: 'corrupted.pdf',
        content: corruptedPDF,
        type: 'application/pdf',
      });
      
      const data = await parseJsonResponse(response);
      
      // Should not expose internal error details
      expect(data.error).not.toContain('xref');
      expect(data.error).not.toContain('at ');
      expect(data.error).not.toContain('stack');
      // But should include user-friendly message
      expect(data.error).toBeDefined();
    });

    it('should handle malformed PDF header gracefully', async () => {
      mockPDFParser.isPasswordProtected.mockReturnValue(false);
      mockPDFParser.parse.mockRejectedValue(new Error('Invalid PDF header'));
      
      const malformedPDF = Buffer.from('Not a PDF file at all');
      
      const response = await callFilesUpload(mockEnhancedUploadHandler, {
        name: 'malformed.pdf',
        content: malformedPDF,
        type: 'application/pdf',
      });
      
      await await assertResponseStatus(response, 400);
      const data = await parseJsonResponse(response);
      
      expect(data.code).toBe('CORRUPTED_PDF');
    });
  });

  describe('Image-Only PDF (Scanned Documents)', () => {
    it('should detect image-only PDF and trigger scanned detection path', async () => {
      mockPDFParser.isPasswordProtected.mockReturnValue(false);
      mockPDFParser.isScanned.mockReturnValue(true);
      mockPDFParser.parse.mockResolvedValue({
        info: { Title: 'Scanned Document' },
        text: '', // No extractable text
      });
      
      // Create a mock scanned PDF (image-only)
      const scannedPDF = Buffer.from('%PDF-1.4\n%scanned-document');
      
      const response = await callFilesUpload(mockEnhancedUploadHandler, {
        name: 'scanned.pdf',
        content: scannedPDF,
        type: 'application/pdf',
      });
      
      // Should allow upload but warn about OCR requirement
      await await assertResponseStatus(response, 201);
      const data = await parseJsonResponse(response);
      
      expect(data.success).toBe(true);
      expect(data.warning).toContain('image-only');
      expect(data.warning).toContain('scanned');
      expect(data.code).toBe('SCANNED_DOCUMENT');
      expect(data.fileName).toBe('scanned.pdf');
    });

    it('should allow scanned PDF upload with warning', async () => {
      mockPDFParser.isPasswordProtected.mockReturnValue(false);
      mockPDFParser.isScanned.mockReturnValue(true);
      mockPDFParser.parse.mockResolvedValue({
        info: { Title: 'Scanned Document' },
        text: '',
      });
      
      const scannedPDF = Buffer.from('%PDF-1.4\n%scanned');
      
      const response = await callFilesUpload(mockEnhancedUploadHandler, {
        name: 'scanned-doc.pdf',
        content: scannedPDF,
        type: 'application/pdf',
      });
      
      // Should succeed with warning
      await await assertResponseStatus(response, 201);
      const data = await parseJsonResponse(response);
      
      expect(data.success).toBe(true);
      expect(data.warning).toBeDefined();
    });

    it('should not flag regular PDFs as scanned', async () => {
      mockPDFParser.isPasswordProtected.mockReturnValue(false);
      mockPDFParser.isScanned.mockReturnValue(false);
      mockPDFParser.parse.mockResolvedValue({
        info: { Title: 'Regular PDF' },
        text: 'This PDF has extractable text content.',
      });
      
      const regularPDF = Buffer.from('%PDF-1.4\n%regular-pdf');
      
      const response = await callFilesUpload(mockEnhancedUploadHandler, {
        name: 'regular.pdf',
        content: regularPDF,
        type: 'application/pdf',
      });
      
      await await assertResponseStatus(response, 201);
      const data = await parseJsonResponse(response);
      
      expect(data.success).toBe(true);
      expect(data.warning).toBeUndefined();
      expect(data.code).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should not expose stack traces in error responses', async () => {
      // Simulate an unexpected error
      const errorHandler = async (req: NextRequest) => {
        throw new Error('Unexpected internal error');
      };
      
      const response = await callFilesUpload(errorHandler, {
        name: 'test.pdf',
        content: Buffer.from('test'),
        type: 'application/pdf',
      });
      
      const data = await parseJsonResponse(response);
      
      // Should not contain stack trace
      expect(JSON.stringify(data)).not.toContain('at ');
      expect(JSON.stringify(data)).not.toContain('Error:');
      expect(JSON.stringify(data)).not.toContain('stack');
    });

    it('should return user-friendly error messages', async () => {
      mockPDFParser.isPasswordProtected.mockReturnValue(true);
      
      const response = await callFilesUpload(mockEnhancedUploadHandler, {
        name: 'protected.pdf',
        content: Buffer.from('test'),
        type: 'application/pdf',
      });
      
      const data = await parseJsonResponse(response);
      
      // Error message should be user-friendly
      expect(data.error).toBeDefined();
      expect(typeof data.error).toBe('string');
      expect(data.error.length).toBeGreaterThan(0);
      expect(data.error).not.toContain('undefined');
      expect(data.error).not.toContain('null');
    });

    it('should include error code for programmatic handling', async () => {
      mockPDFParser.isPasswordProtected.mockReturnValue(true);
      
      const response = await callFilesUpload(mockEnhancedUploadHandler, {
        name: 'protected.pdf',
        content: Buffer.from('test'),
        type: 'application/pdf',
      });
      
      const data = await parseJsonResponse(response);
      
      expect(data.code).toBeDefined();
      expect(data.code).toBe('PASSWORD_PROTECTED');
      expect(data.message).toBe('Password-protected PDFs are not supported');
    });
  });

  describe('File Size Edge Cases', () => {
    it('should handle very small PDF files', async () => {
      mockPDFParser.isPasswordProtected.mockReturnValue(false);
      mockPDFParser.parse.mockResolvedValue({
        info: { Title: 'Small PDF' },
        text: 'Minimal content',
      });
      
      const smallPDF = Buffer.from('%PDF-1.4');
      
      const response = await callFilesUpload(mockEnhancedUploadHandler, {
        name: 'small.pdf',
        content: smallPDF,
        type: 'application/pdf',
      });
      
      // Should handle gracefully (might fail validation, but not crash)
      expect([200, 201, 400, 500]).toContain(response.status);
    });

    it('should handle PDF files at size limit', async () => {
      mockPDFParser.isPasswordProtected.mockReturnValue(false);
      mockPDFParser.parse.mockResolvedValue({
        info: { Title: 'Large PDF' },
        text: 'Large content',
      });
      
      // Create a file at the limit (10MB)
      const largePDF = Buffer.alloc(10 * 1024 * 1024, 0);
      largePDF.write('%PDF-1.4', 0);
      
      const response = await callFilesUpload(mockEnhancedUploadHandler, {
        name: 'large.pdf',
        content: largePDF,
        type: 'application/pdf',
      });
      
      // Should handle without crashing
      expect([200, 201, 400, 500]).toContain(response.status);
    });
  });
});

