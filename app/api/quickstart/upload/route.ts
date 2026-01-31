import { NextRequest, NextResponse } from 'next/server';
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
 * Returns JSON 200: { success: true, filename, mimeType, size, preview, extractedText, documentId }
 * Returns JSON 400: { error: "...", code: "VALIDATION_ERROR" } if file missing
 * Returns JSON 422: { error: "Could not extract readable text from this file.", code: "EMPTY_PREVIEW" } if extraction yields empty text
 * Returns JSON 500: { error: "Document upload failed", code: "UPLOAD_FAILED" } on error
 */
export async function POST(request: NextRequest) {
  try {
    // Parse form data safely
    const formData = await request.formData();
    const file = formData.get('file');

    // Strict guard: file must exist and be a File instance
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        {
          error: 'File upload is required. Please upload a document to analyze.',
          code: 'VALIDATION_ERROR',
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
    const extractedText = extractionResult.text;
    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json(
        {
          error: 'Could not extract readable text from this file.',
          code: 'EMPTY_PREVIEW',
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

    // Return success JSON on upload with required fields
    // extractedText is always a normal UTF-8 string (never binary garbage)
    return NextResponse.json(
      {
        ok: true,
        success: true,
        documentId: documentId,
        extractedText: limitedText, // UTF-8 string, never binary
        mode: demoMode ? 'demo' : 'live',
        filename: filename,
        mimeType: mimeType,
        size: file.size,
        preview: limitedText.slice(0, 2000), // UTF-8 string preview
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
      error: 'Use POST',
      message: 'This endpoint requires POST method. Use POST /api/quickstart/upload to upload a document.',
      code: 'METHOD_NOT_ALLOWED',
    },
    { status: 405 }
  );
}
