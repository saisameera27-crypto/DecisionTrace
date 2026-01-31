import { NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/demo-mode';
import { randomUUID } from 'crypto';
import { extractTextFromUpload } from '@/lib/quickstart/extract-text';

// Force Node.js runtime (required for Buffer operations)
export const runtime = 'nodejs';

/**
 * QuickStart Upload API Route
 * 
 * Simple upload endpoint that extracts text from uploaded file.
 * Does NOT write to database - only uploads and extracts text.
 * 
 * Accepts multipart form-data:
 * - file (required): The document file to upload
 * 
 * Returns JSON 200: { ok: true, previewText, fileName, mimeType, size, ... }
 * Returns JSON 400: { error: "File is required", code: "FILE_MISSING" } if file missing
 * Returns JSON 422: { error: "...", code: "VALIDATION_ERROR" } if file type unsupported or empty text
 * Returns JSON 422: { error: "...", code: "EXTRACTION_FAILED" } if extraction fails
 * Returns JSON 500: { error: "Document upload failed", code: "UPLOAD_FAILED" } on error
 */
export async function POST(request: Request) {
  try {
    // Parse form data safely (multipart/form-data)
    const formData = await request.formData();
    const file = formData.get('file');

    // Strict guard: file must exist and be a File instance
    // Missing file → 400 Bad Request
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        {
          error: 'File is required',
          code: 'FILE_MISSING',
        },
        { status: 400 }
      );
    }

    // CRITICAL: Always read files as binary bytes, never use file.text() for binary files
    // This ensures DOCX/PDF files are handled correctly as binary data
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const mimeType = file.type || 'text/plain';
    const filename = file.name;

    // Extract text using the library function
    let extractionResult: { text: string; warnings?: string[] };
    try {
      extractionResult = await extractTextFromUpload({
        filename,
        mimeType,
        bytes,
      });
    } catch (extractError: any) {
      console.error('[QUICKSTART UPLOAD] Text extraction failed:', {
        message: extractError?.message || 'Unknown error',
        mimeType,
        filename,
      });
      return NextResponse.json(
        {
          error: extractError?.message || 'Failed to extract text from file',
          code: 'EXTRACTION_FAILED',
        },
        { status: 422 }
      );
    }

    // Validate that extraction yielded non-empty text
    // Empty text or unsupported type → 422 Unprocessable Entity
    const extractedText = extractionResult.text;
    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json(
        {
          error: 'Could not extract readable text from this file.',
          code: 'VALIDATION_ERROR',
        },
        { status: 422 }
      );
    }

    // Limit extracted text to 200k characters for storage
    // extractedText is guaranteed to be a normal UTF-8 string (never binary)
    const limitedText = extractedText.slice(0, 200_000);

    // Generate documentId without DB (using crypto.randomUUID)
    const documentId = randomUUID();

    // Check if in demo mode
    const demoMode = isDemoMode();

    // Generate preview text (first 2000 characters)
    const previewText = limitedText.slice(0, 2000);

    // Return success JSON on upload with required fields
    // extractedText is always a normal UTF-8 string (never binary garbage)
    return NextResponse.json(
      {
        ok: true,
        previewText: previewText, // Required field
        fileName: filename, // Required field (camelCase)
        mimeType: mimeType, // Required field
        size: file.size, // Required field
        // Additional fields for backward compatibility
        success: true,
        documentId: documentId,
        extractedText: limitedText, // UTF-8 string, never binary
        mode: demoMode ? 'demo' : 'live',
        filename: filename, // Keep for backward compatibility
        preview: previewText, // Keep for backward compatibility
      },
      { status: 200 }
    );
  } catch (error: any) {
    // Wrap handler in try/catch and on failure return 500 JSON
    console.error('[QUICKSTART UPLOAD] Error:', {
      message: error?.message || 'Unknown error',
      stack: error?.stack || 'No stack trace',
    });

    return NextResponse.json(
      {
        error: 'Document upload failed',
        code: 'UPLOAD_FAILED',
      },
      { status: 500 }
    );
  }
}

// GET handler returns helpful error for accidental browser navigation
export async function GET() {
  return NextResponse.json(
    {
      error: 'Use POST with multipart/form-data',
      code: 'METHOD_NOT_ALLOWED',
    },
    { status: 405 }
  );
}
