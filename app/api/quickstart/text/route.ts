import { NextRequest, NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/demo-mode';
import { randomUUID } from 'crypto';

// Force Node.js runtime
export const runtime = 'nodejs';

/**
 * QuickStart Text API Route
 * 
 * Accepts text input directly (replaces file upload)
 * Does NOT write to database - only stores text
 * 
 * Accepts JSON body:
 * - text (required): The text content to analyze (max 5000 words)
 * 
 * Returns JSON 200: { ok: true, previewText, fileName, mimeType, size, ... }
 * Returns JSON 400: { error: "Text is required", code: "TEXT_MISSING" } if text missing
 * Returns JSON 422: { error: "Text exceeds 5000 words", code: "VALIDATION_ERROR" } if too long
 * Returns JSON 500: { error: "Text processing failed", code: "PROCESSING_FAILED" } on error
 */
export async function POST(request: NextRequest) {
  try {
    // Parse JSON body
    const body = await request.json();
    const text = body.text;

    // Validate text exists
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        {
          error: 'Text is required',
          code: 'TEXT_MISSING',
        },
        { status: 400 }
      );
    }

    // Count words (simple word count: split by whitespace)
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    const wordCount = words.length;

    // Validate word count (max 5000 words)
    if (wordCount > 5000) {
      return NextResponse.json(
        {
          error: `Text exceeds 5000 words (${wordCount} words). Please reduce to 5000 words or less.`,
          code: 'VALIDATION_ERROR',
        },
        { status: 422 }
      );
    }

    // Limit text to 200k characters for storage (same as upload route)
    const limitedText = text.trim().slice(0, 200_000);

    // Generate documentId without DB (using crypto.randomUUID)
    const documentId = randomUUID();

    // Check if in demo mode
    const demoMode = isDemoMode();

    // Generate preview text (first 2000 characters)
    const previewText = limitedText.slice(0, 2000);

    // Return success JSON with same shape as upload route
    return NextResponse.json(
      {
        ok: true,
        previewText: previewText, // Required field
        fileName: 'text-input.txt', // Default filename
        mimeType: 'text/plain', // Default mime type
        size: new TextEncoder().encode(limitedText).length, // Size in bytes
        // Additional fields for backward compatibility
        success: true,
        documentId: documentId,
        extractedText: limitedText, // UTF-8 string
        mode: demoMode ? 'demo' : 'live',
        filename: 'text-input.txt', // Keep for backward compatibility
        preview: previewText, // Keep for backward compatibility
      },
      { status: 200 }
    );
  } catch (error: any) {
    // Wrap handler in try/catch and on failure return 500 JSON
    console.error('[QUICKSTART TEXT] Error:', {
      message: error?.message || 'Unknown error',
      stack: error?.stack || 'No stack trace',
    });

    return NextResponse.json(
      {
        error: 'Text processing failed',
        code: 'PROCESSING_FAILED',
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

