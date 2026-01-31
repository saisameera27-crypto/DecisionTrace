import { NextRequest, NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/demo-mode';
import { randomUUID } from 'crypto';
import mammoth from 'mammoth';
import pdfParseLib from 'pdf-parse';

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
 * Returns JSON 422: { error: "Could not extract readable text from this file.", code: "UNSUPPORTED_PREVIEW" } if extraction yields empty text
 * Returns JSON 500: { error: "Document upload failed", code: "UPLOAD_FAILED" } on error
 */

/**
 * Extract text from file buffer based on file type
 * 
 * IMPORTANT: This function receives a binary Buffer and never uses TextDecoder or .text()
 * - DOCX files: Uses mammoth library which works with binary buffers
 * - PDF files: Uses pdf-parse library which works with binary buffers
 * - TXT/MD files: Converts binary buffer to UTF-8 string using Buffer.toString('utf-8')
 * 
 * @param buffer - Binary buffer from file.arrayBuffer() → Buffer.from()
 * @param mimeType - MIME type of the file
 * @param filename - Filename (used as fallback for type detection)
 * @returns UTF-8 string of extracted text
 */
async function extractTextFromFile(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<string> {
  // Check if DOCX file (binary format - ZIP archive)
  const isDocx =
    mimeType.includes('officedocument.wordprocessingml.document') ||
    filename.toLowerCase().endsWith('.docx');

  if (isDocx) {
    // DOCX is a binary format (ZIP archive) - must use mammoth, never TextDecoder
    try {
      const result = await mammoth.extractRawText({ buffer });
      // mammoth returns UTF-8 string from binary DOCX
      return result.value || '';
    } catch (error: any) {
      console.error('[DOCX EXTRACTION] Error:', error?.message);
      throw new Error(`Failed to extract text from DOCX: ${error?.message || 'Unknown error'}`);
    }
  }

  // Check if PDF file (binary format)
  const isPdf = mimeType === 'application/pdf' || filename.toLowerCase().endsWith('.pdf');

  if (isPdf) {
    // PDF is a binary format - must use pdf-parse, never TextDecoder
    try {
      // pdf-parse is a function when imported, works with binary Buffer
      const pdfData = await (pdfParseLib as any)(buffer);
      // pdf-parse returns UTF-8 string from binary PDF
      return pdfData.text || '';
    } catch (error: any) {
      console.error('[PDF EXTRACTION] Error:', error?.message);
      throw new Error(`Failed to extract text from PDF: ${error?.message || 'Unknown error'}`);
    }
  }

  // Default: TXT/MD or other text files - these are already text, just decode UTF-8
  // For text files, Buffer.toString('utf-8') is safe and correct
  try {
    return buffer.toString('utf-8');
  } catch (error: any) {
    console.error('[TEXT EXTRACTION] Error:', error?.message);
    throw new Error(`Failed to extract text: ${error?.message || 'Unknown error'}`);
  }
}
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

    // CRITICAL: Always read files as binary buffer, never use file.text() for binary files
    // This ensures DOCX/PDF files are handled correctly as binary data
    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || 'text/plain';
    const filename = file.name;

    // Extract text based on file type (DOCX, PDF, or TXT/MD)
    // For DOCX/PDF: Uses specialized libraries (mammoth/pdf-parse) that work with binary buffers
    // For TXT/MD: Converts buffer to UTF-8 string
    // NEVER uses file.text() or TextDecoder for binary files
    let extractedText: string;
    try {
      extractedText = await extractTextFromFile(buffer, mimeType, filename);
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
    // extractedText is always a UTF-8 string at this point (from mammoth/pdf-parse/buffer.toString)
    const trimmedText = extractedText.trim();
    if (!trimmedText || trimmedText.length === 0) {
      return NextResponse.json(
        {
          error: 'Could not extract readable text from this file.',
          code: 'UNSUPPORTED_PREVIEW',
        },
        { status: 422 }
      );
    }

    // Limit extracted text to 200k characters for storage
    // extractedText is guaranteed to be a normal UTF-8 string (never binary)
    const limitedText = trimmedText.slice(0, 200_000);

    // Generate documentId without DB (using crypto.randomUUID)
    const documentId = randomUUID();

    // Check if in demo mode
    const demoMode = isDemoMode();

    // Return success JSON on upload with required fields
    // extractedText is always a normal UTF-8 string (never binary garbage)
    return NextResponse.json(
      {
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
