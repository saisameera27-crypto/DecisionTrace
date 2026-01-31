import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getGeminiFilesClient } from '@/lib/gemini-files';
import { isDemoMode } from '@/lib/demo-mode';

// Force Node.js runtime
export const runtime = 'nodejs';

/**
 * QuickStart Text API Route
 * 
 * Accepts text input directly and creates a document/artifact in the database.
 * Works exactly like the upload flow after extraction - creates CaseDocument.
 * 
 * Accepts JSON body:
 * - text (required): The text content to analyze (max 5000 words)
 * 
 * Returns JSON 200: { ok: true, documentId, preview, ... }
 * Returns JSON 400: { error: "Text is required", code: "MISSING_TEXT" } if text missing
 * Returns JSON 422: { error: "Text cannot be empty", code: "EMPTY_TEXT" } if empty/whitespace
 * Returns JSON 422: { error: "Text exceeds 5000 words", code: "WORD_LIMIT_EXCEEDED", limit: 5000 } if too long
 * Returns JSON 500: { error: "Text processing failed", code: "PROCESSING_FAILED" } on error
 */
export async function POST(request: NextRequest) {
  try {
    // Parse JSON body
    const body = await request.json();
    const text = body.text;

    // Validate text exists
    if (text === undefined || text === null || typeof text !== 'string') {
      return NextResponse.json(
        {
          error: 'Text is required',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // Validate text is not empty/whitespace
    if (text.trim().length === 0) {
      return NextResponse.json(
        {
          error: 'Text cannot be empty',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // Count words (split on whitespace)
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    const wordCount = words.length;

    // Validate word count (max 5000 words)
    if (wordCount > 5000) {
      return NextResponse.json(
        {
          error: `Text exceeds 5000 words (${wordCount} words). Please reduce to 5000 words or less.`,
          code: 'VALIDATION_ERROR',
          limit: 5000,
        },
        { status: 400 }
      );
    }

    // Limit text to 200k characters for storage (same as upload route)
    const limitedText = text.trim().slice(0, 200_000);
    const textSize = new TextEncoder().encode(limitedText).length;

    // Get Prisma client
    const prisma = getPrismaClient();
    const demoMode = isDemoMode();

    let documentId: string;
    let geminiFileUri: string | null = null;

    // Create document/artifact exactly like upload flow
    if (demoMode) {
      // Demo mode: create document with text content stored directly
      const document = await prisma.caseDocument.create({
        data: {
          caseId: 'pending', // Will be updated when case is created
          fileName: 'text-input.txt',
          fileSize: textSize,
          mimeType: 'text/plain',
          status: 'completed',
          content: limitedText, // Store text content for demo
          metadata: JSON.stringify({
            demo: true,
            source: 'quickstart-text',
          }),
        },
      });
      documentId = document.id;
    } else {
      // Live mode: upload to Gemini Files API, then create document
      const geminiFilesClient = getGeminiFilesClient();
      const textBuffer = Buffer.from(limitedText, 'utf-8');
      
      const geminiFile = await geminiFilesClient.uploadFile(
        textBuffer,
        'text/plain',
        'text-input.txt'
      );

      geminiFileUri = geminiFile.uri;

      // Store document in database
      // Store both geminiFileUri (for Gemini API) and content (as fallback for direct text analysis)
      const document = await prisma.caseDocument.create({
        data: {
          caseId: 'pending', // Will be updated when case is created
          fileName: 'text-input.txt',
          fileSize: textSize,
          mimeType: 'text/plain',
          status: 'completed',
          geminiFileUri: geminiFile.uri,
          content: limitedText, // Store text content as fallback (orchestrator can use documentText)
          metadata: JSON.stringify({
            geminiFileUri: geminiFile.uri,
            geminiFileName: geminiFile.name,
            source: 'quickstart-text',
          }),
        },
      });
      documentId = document.id;
    }

    // Generate preview text (first 2000 characters)
    const previewText = limitedText.slice(0, 2000);

    // Return success JSON with same shape as upload route
    return NextResponse.json(
      {
        ok: true,
        success: true,
        documentId: documentId,
        artifactId: documentId, // Alias for backward compatibility
        preview: previewText,
        previewText: previewText, // Required field
        fileName: 'text-input.txt',
        filename: 'text-input.txt', // Keep for backward compatibility
        mimeType: 'text/plain',
        size: textSize,
        extractedText: limitedText, // UTF-8 string
        geminiFileUri: geminiFileUri, // Only in live mode
        mode: demoMode ? 'demo' : 'live',
      },
      { status: 200 }
    );
  } catch (error: any) {
    // Wrap handler in try/catch and on failure return 500 JSON
    console.error('[QUICKSTART TEXT] Error:', {
      message: error?.message || 'Unknown error',
      stack: error?.stack || 'No stack trace',
      code: error?.code || 'UNKNOWN',
    });

    return NextResponse.json(
      {
        error: error?.message || 'Text processing failed',
        code: 'SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}

// GET handler returns helpful error for accidental browser navigation
export async function GET() {
  return NextResponse.json(
    {
      error: 'Use POST with JSON body { text: "..." }',
      code: 'METHOD_NOT_ALLOWED',
    },
    { status: 405 }
  );
}
