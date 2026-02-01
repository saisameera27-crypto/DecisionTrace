import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getGeminiFilesClient } from '@/lib/gemini-files';
import { isDemoMode } from '@/lib/demo-mode';

/**
 * File Upload API Route
 * 
 * Uploads a file and optionally associates it with a case.
 * Returns documentId and geminiFileUri for use in case creation.
 */
export async function POST(request: NextRequest) {
  try {
    const prisma = getPrismaClient();
    
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const caseId = formData.get('caseId') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // In demo mode, create a mock document without uploading to Gemini
    if (isDemoMode()) {
      const document = await prisma.caseDocument.create({
        data: {
          caseId: caseId || 'demo-case', // Will be updated when case is created
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || 'text/plain',
          status: 'completed',
          content: await file.text().catch(() => null), // Store text content for demo
          metadata: JSON.stringify({
            demo: true,
          }),
        },
      });

      return NextResponse.json({
        success: true,
        documentId: document.id,
        geminiFileUri: null, // No Gemini URI in demo mode
      }, { status: 201 });
    }

    // In live mode, upload to Gemini Files API
    const geminiFilesClient = getGeminiFilesClient();
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const geminiFile = await geminiFilesClient.uploadFile(
      fileBuffer,
      file.type || 'text/plain',
      file.name
    );

    // Store document in database
    const document = await prisma.caseDocument.create({
      data: {
        caseId: caseId || 'pending', // Will be updated when case is created
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'text/plain',
        status: 'completed',
        geminiFileUri: geminiFile.uri,
        metadata: JSON.stringify({
          geminiFileUri: geminiFile.uri,
          geminiFileName: geminiFile.name,
        }),
      },
    });

    return NextResponse.json({
      ok: true,
      success: true,
      documentId: document.id,
      geminiFileUri: geminiFile.uri,
    }, { status: 201 });
  } catch (error: any) {
    console.error('File upload error:', {
      message: error?.message || 'Unknown error',
      code: error?.code || 'UNKNOWN',
    });

    return NextResponse.json(
      {
        error: 'Upload failed',
        detail: error?.message ?? String(error),
        code: 'UPLOAD_ERROR',
      },
      { status: 500 }
    );
  }
}

// OPTIONS handler for CORS preflight (prevents 405 on file upload)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

// GET handler returns helpful error for accidental browser navigation
export async function GET() {
  return NextResponse.json(
    {
      error: 'Use POST',
      message: 'This endpoint requires POST method. Use POST /api/files/upload to upload a file.',
      code: 'METHOD_NOT_ALLOWED',
    },
    { status: 405 }
  );
}

