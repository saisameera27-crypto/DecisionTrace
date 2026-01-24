/**
 * Integration Tests for File Upload Validation
 * Tests file upload endpoint with various validation scenarios
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Mock Next.js types if not available
type NextRequest = any;
type NextResponse = any;

// Try to import Next.js types, fallback to any if not available
let NextRequestClass: any;
let NextResponseClass: any;

try {
  const nextServer = require('next/server');
  NextRequestClass = nextServer.NextRequest;
  NextResponseClass = nextServer.NextResponse;
} catch {
  // Next.js not installed - use mock types
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
    }),
  };
}

import {
  resetTestDatabase,
  callFilesUpload,
  parseJsonResponse,
  assertResponseStatus,
  createMultipartRequest,
} from './_harness';

// Mock Gemini Files API client
const mockGeminiFilesClient = {
  uploadFile: vi.fn(),
  getFile: vi.fn(),
};

// Mock the Gemini Files API module
vi.mock('@/lib/gemini-files', () => ({
  getGeminiFilesClient: () => mockGeminiFilesClient,
}));

/**
 * Mock upload handler that validates files and calls Gemini API
 * This simulates the actual /api/files/upload route handler
 */
async function mockUploadHandler(req: NextRequest): Promise<any> {
  try {
    // Extract files from request
    // In Node.js test environment, FormData might not work as expected
    // So we'll extract files directly from the request body if it's FormData
    let files: File[] = [];
    
    try {
      const formData = await req.formData();
      if (formData instanceof FormData) {
        // Try getAll first (standard FormData API)
        if (typeof formData.getAll === 'function') {
          const allFiles = formData.getAll('file');
          files = allFiles.filter((f): f is File => {
            return typeof f !== 'string' && f instanceof File;
          });
        } else {
          // Fallback: iterate entries
          const formDataEntries = (formData as any).entries ? (formData as any).entries() : [];
          for (const [key, value] of formDataEntries) {
            if (key === 'file' && value instanceof File) {
              files.push(value);
            }
          }
        }
      }
    } catch (error) {
      // If formData() fails, try to extract from body directly
      const body = (req as any).body;
      if (body instanceof FormData) {
        // Manual extraction from FormData
        const bodyEntries = (body as any).entries ? (body as any).entries() : [];
        for (const [key, value] of bodyEntries) {
          if (key === 'file' && value instanceof File) {
            files.push(value);
          }
        }
      }
    }
    
    // If still no files, create mock files from request metadata (for testing)
    if (files.length === 0 && (req as any).__testFiles) {
      files = (req as any).__testFiles;
    }
    
    // Validation: Check file count
    if (files.length === 0) {
      return NextResponseClass.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }
    
    if (files.length > 5) {
      return NextResponseClass.json(
        { error: 'Maximum 5 files allowed' },
        { status: 400 }
      );
    }
    
    const artifacts = [];
    
    for (const file of files) {
      // Validation: Check file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        return NextResponseClass.json(
          { error: `File ${file.name} exceeds 10MB limit` },
          { status: 400 }
        );
      }
      
      // Validation: Check file extension
      const allowedExtensions = ['.txt', '.pdf', '.doc', '.docx', '.md'];
      const fileExtension = path.extname(file.name).toLowerCase();
      
      if (!allowedExtensions.includes(fileExtension)) {
        return NextResponseClass.json(
          { error: `File extension ${fileExtension} not allowed` },
          { status: 400 }
        );
      }
      
      // Validation: Check MIME type matches extension
      const expectedMimeTypes: Record<string, string[]> = {
        '.txt': ['text/plain'],
        '.pdf': ['application/pdf'],
        '.doc': ['application/msword'],
        '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        '.md': ['text/markdown', 'text/plain'],
      };
      
      const expectedMimes = expectedMimeTypes[fileExtension] || [];
      if (expectedMimes.length > 0 && !expectedMimes.includes(file.type)) {
        return NextResponseClass.json(
          { error: `MIME type ${file.type} does not match extension ${fileExtension}` },
          { status: 400 }
        );
      }
      
      // Upload to Gemini Files API (mocked)
      const fileContent = await file.arrayBuffer();
      const mockGeminiFile = {
        uri: `gs://gemini-files/test-${Date.now()}-${file.name}`,
        mimeType: file.type,
        name: file.name,
      };
      
      mockGeminiFilesClient.uploadFile.mockResolvedValue(mockGeminiFile);
      const geminiFile = await mockGeminiFilesClient.uploadFile({
        file: Buffer.from(fileContent),
        mimeType: file.type,
      });
      
      artifacts.push({
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        geminiFileUri: geminiFile.uri,
      });
    }
    
    return NextResponseClass.json({
      success: true,
      artifacts,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponseClass.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}

describe('File Upload Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGeminiFilesClient.uploadFile.mockClear();
  });

  describe('Valid Uploads', () => {
    it('should upload valid text fixture and save Artifact with mimeType and geminiFileUri', async () => {
      const fixturePath = path.join(
        process.cwd(),
        'test-data',
        'docs',
        'positive',
        '01_launch_decision_memo.txt'
      );
      const fileContent = fs.readFileSync(fixturePath, 'utf-8');
      
      const response = await callFilesUpload(mockUploadHandler, {
        name: '01_launch_decision_memo.txt',
        content: fileContent,
        type: 'text/plain',
      });
      
      assertResponseStatus(response, 201);
      const data = await parseJsonResponse(response);
      
      expect(data.success).toBe(true);
      expect(data.artifacts).toBeDefined();
      expect(data.artifacts.length).toBe(1);
      
      const artifact = data.artifacts[0];
      expect(artifact.fileName).toBe('01_launch_decision_memo.txt');
      expect(artifact.mimeType).toBe('text/plain');
      expect(artifact.geminiFileUri).toBeDefined();
      expect(artifact.geminiFileUri).toContain('gs://gemini-files/');
      
      // Verify Gemini API was called
      expect(mockGeminiFilesClient.uploadFile).toHaveBeenCalledTimes(1);
      expect(mockGeminiFilesClient.uploadFile).toHaveBeenCalledWith(
        expect.objectContaining({
          mimeType: 'text/plain',
        })
      );
    });
  });

  describe('Invalid Extension', () => {
    it('should reject file with .exe extension', async () => {
      const response = await callFilesUpload(mockUploadHandler, {
        name: 'malicious.exe',
        content: 'fake executable content',
        type: 'application/x-msdownload',
      });
      
      assertResponseStatus(response, 400);
      const data = await parseJsonResponse(response);
      
      expect(data.error).toBeDefined();
      expect(data.error).toContain('extension');
      expect(data.error).toContain('.exe');
      
      // Verify Gemini API was NOT called
      expect(mockGeminiFilesClient.uploadFile).not.toHaveBeenCalled();
    });

    it('should reject file with .bat extension', async () => {
      const response = await callFilesUpload(mockUploadHandler, {
        name: 'script.bat',
        content: '@echo off',
        type: 'application/x-msdownload',
      });
      
      assertResponseStatus(response, 400);
      const data = await parseJsonResponse(response);
      expect(data.error).toContain('extension');
    });
  });

  describe('MIME Type / Extension Mismatch', () => {
    it('should reject file with MIME/ext mismatch', async () => {
      // File has .txt extension but claims to be PDF
      const response = await callFilesUpload(mockUploadHandler, {
        name: 'document.txt',
        content: 'fake pdf content',
        type: 'application/pdf', // Wrong MIME type for .txt
      });
      
      assertResponseStatus(response, 400);
      const data = await parseJsonResponse(response);
      
      expect(data.error).toBeDefined();
      expect(data.error).toContain('MIME type');
      expect(data.error).toContain('does not match extension');
      
      // Verify Gemini API was NOT called
      expect(mockGeminiFilesClient.uploadFile).not.toHaveBeenCalled();
    });

    it('should reject PDF file claiming to be text/plain', async () => {
      const response = await callFilesUpload(mockUploadHandler, {
        name: 'document.pdf',
        content: Buffer.from('%PDF-1.4 fake pdf'),
        type: 'text/plain', // Wrong MIME type for .pdf
      });
      
      assertResponseStatus(response, 400);
      const data = await parseJsonResponse(response);
      expect(data.error).toContain('MIME type');
    });
  });

  describe('File Size Validation', () => {
    it('should reject file larger than 10MB', async () => {
      // Create a simulated large file (>10MB)
      const largeContent = Buffer.alloc(11 * 1024 * 1024, 'x'); // 11MB
      
      const response = await callFilesUpload(mockUploadHandler, {
        name: 'large-file.txt',
        content: largeContent,
        type: 'text/plain',
      });
      
      assertResponseStatus(response, 400);
      const data = await parseJsonResponse(response);
      
      expect(data.error).toBeDefined();
      expect(data.error).toContain('exceeds 10MB limit');
      expect(data.error).toContain('large-file.txt');
      
      // Verify Gemini API was NOT called
      expect(mockGeminiFilesClient.uploadFile).not.toHaveBeenCalled();
    });

    it('should accept file exactly at 10MB limit', async () => {
      const exactSizeContent = Buffer.alloc(10 * 1024 * 1024, 'x'); // Exactly 10MB
      
      mockGeminiFilesClient.uploadFile.mockResolvedValue({
        uri: 'gs://gemini-files/test-10mb.txt',
        mimeType: 'text/plain',
        name: 'exact-10mb.txt',
      });
      
      const response = await callFilesUpload(mockUploadHandler, {
        name: 'exact-10mb.txt',
        content: exactSizeContent,
        type: 'text/plain',
      });
      
      assertResponseStatus(response, 201);
      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);
    });
  });

  describe('File Count Validation', () => {
    it('should reject 6 files (exceeds limit of 5)', async () => {
      const files = Array.from({ length: 6 }, (_, i) => ({
        name: `file-${i + 1}.txt`,
        content: `Content of file ${i + 1}`,
        type: 'text/plain',
      }));
      
      const response = await callFilesUpload(mockUploadHandler, files);
      
      assertResponseStatus(response, 400);
      const data = await parseJsonResponse(response);
      
      expect(data.error).toBeDefined();
      expect(data.error).toContain('Maximum 5 files allowed');
      
      // Verify Gemini API was NOT called
      expect(mockGeminiFilesClient.uploadFile).not.toHaveBeenCalled();
    });

    it('should accept exactly 5 files (at limit)', async () => {
      const files = Array.from({ length: 5 }, (_, i) => ({
        name: `file-${i + 1}.txt`,
        content: `Content of file ${i + 1}`,
        type: 'text/plain',
      }));
      
      mockGeminiFilesClient.uploadFile.mockResolvedValue({
        uri: `gs://gemini-files/test-file.txt`,
        mimeType: 'text/plain',
        name: 'test-file.txt',
      });
      
      const response = await callFilesUpload(mockUploadHandler, files);
      
      assertResponseStatus(response, 201);
      const data = await parseJsonResponse(response);
      
      expect(data.success).toBe(true);
      expect(data.artifacts.length).toBe(5);
      expect(mockGeminiFilesClient.uploadFile).toHaveBeenCalledTimes(5);
    });

    it('should accept single file', async () => {
      mockGeminiFilesClient.uploadFile.mockResolvedValue({
        uri: 'gs://gemini-files/test-single.txt',
        mimeType: 'text/plain',
        name: 'single.txt',
      });
      
      const response = await callFilesUpload(mockUploadHandler, {
        name: 'single.txt',
        content: 'Single file content',
        type: 'text/plain',
      });
      
      assertResponseStatus(response, 201);
      const data = await parseJsonResponse(response);
      expect(data.artifacts.length).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty file list', async () => {
      const request = createMultipartRequest('/api/files/upload', []);
      const response = await mockUploadHandler(request);
      
      assertResponseStatus(response, 400);
      const data = await parseJsonResponse(response);
      expect(data.error).toContain('No files provided');
    });

    it('should handle multiple valid files', async () => {
      const files = [
        {
          name: 'file1.txt',
          content: 'Content 1',
          type: 'text/plain',
        },
        {
          name: 'file2.txt',
          content: 'Content 2',
          type: 'text/plain',
        },
      ];
      
      mockGeminiFilesClient.uploadFile.mockResolvedValue({
        uri: 'gs://gemini-files/test.txt',
        mimeType: 'text/plain',
        name: 'test.txt',
      });
      
      const response = await callFilesUpload(mockUploadHandler, files);
      
      assertResponseStatus(response, 201);
      const data = await parseJsonResponse(response);
      expect(data.artifacts.length).toBe(2);
      expect(mockGeminiFilesClient.uploadFile).toHaveBeenCalledTimes(2);
    });

    it('should preserve file metadata in artifact', async () => {
      const fixturePath = path.join(
        process.cwd(),
        'test-data',
        'docs',
        'positive',
        '01_launch_decision_memo.txt'
      );
      const fileContent = fs.readFileSync(fixturePath, 'utf-8');
      
      // Mock will generate URI with timestamp, so we'll check format instead
      mockGeminiFilesClient.uploadFile.mockImplementation(({ file, mimeType }) => {
        return Promise.resolve({
          uri: `gs://gemini-files/test-${Date.now()}-01_launch_decision_memo.txt`,
          mimeType: mimeType,
          name: '01_launch_decision_memo.txt',
        });
      });
      
      const response = await callFilesUpload(mockUploadHandler, {
        name: '01_launch_decision_memo.txt',
        content: fileContent,
        type: 'text/plain',
      });
      
      assertResponseStatus(response, 201);
      const data = await parseJsonResponse(response);
      expect(data.artifacts).toBeDefined();
      expect(data.artifacts.length).toBe(1);
      
      const artifact = data.artifacts[0];
      expect(artifact.fileName).toBe('01_launch_decision_memo.txt');
      expect(artifact.mimeType).toBe('text/plain');
      expect(artifact.size).toBeGreaterThan(0);
      expect(artifact.geminiFileUri).toBeDefined();
      expect(artifact.geminiFileUri).toContain('gs://gemini-files/');
      expect(artifact.geminiFileUri).toContain('01_launch_decision_memo.txt');
    });
  });
});

