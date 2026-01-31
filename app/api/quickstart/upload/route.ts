import { NextRequest, NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/demo-mode';

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
 * Returns JSON 200: { success: true, filename, mimeType, size, preview }
 * Returns JSON 400: { error: "...", code: "VALIDATION_ERROR" } if file missing
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

    // Convert file → text without fancy parsing (for stability)
    const buffer = Buffer.from(await file.arrayBuffer());
    const text = buffer.toString('utf-8').slice(0, 200_000);

    // Check if in demo mode
    const demoMode = isDemoMode();

    // Return success JSON on upload
    return NextResponse.json(
      {
        success: true,
        mode: demoMode ? 'demo' : 'live',
        filename: file.name,
        mimeType: file.type || 'text/plain',
        size: file.size,
        preview: text.slice(0, 2000),
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
