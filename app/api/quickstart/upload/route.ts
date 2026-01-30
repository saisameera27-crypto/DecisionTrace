import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getGeminiFilesClient } from '@/lib/gemini-files';
import { isDemoMode } from '@/lib/demo-mode';

/**
 * QuickStart Upload API Route
 * 
 * Convenience endpoint that combines case creation and file upload in one call.
 * 
 * Accepts multipart form-data:
 * - file (required): The document file to upload
 * - title (optional): Case title (auto-generated if missing)
 * 
 * Behavior:
 * - Creates a Case in infer mode (inferMode: true)
 * - Auto-generates title if missing
 * - Uploads file to Gemini Files (reuses existing upload logic)
 * - Creates CaseDocument record linked to the case
 * 
 * Returns JSON 201: { caseId, artifactId, fileName }
 */
export async function POST(request: NextRequest) {
  let prisma: ReturnType<typeof getPrismaClient> | null = null;

  try {
    prisma = getPrismaClient();

    // Check DB readiness
    try {
      await prisma.case.count();
    } catch (countError: any) {
      const countErrorMessage = countError?.message || '';
      const isCountDBError = 
        countErrorMessage.includes('does not exist') ||
        countErrorMessage.includes('table') ||
        countErrorMessage.includes('relation') ||
        countError?.code === '42P01' ||
        countError?.code === 'P2025';
      
      if (isCountDBError) {
        return NextResponse.json(
          {
            error: 'Database tables are not initialized. Run migrations.',
            code: 'DB_NOT_INITIALIZED',
          },
          { status: 503 }
        );
      }
      throw countError;
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string | null;

    // Validate file is provided
    if (!file) {
      return NextResponse.json(
        {
          error: 'File is required',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // Generate title if missing
    let caseTitle = title?.trim() || '';
    if (!caseTitle) {
      const dateStr = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      caseTitle = `Untitled Decision Case - ${dateStr}`;
    }

    // Generate slug from title
    const slug = caseTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100) + '-' + Date.now().toString(36);

    // Step 1: Create case in infer mode
    const metadataObject = {
      decisionContext: '',
      stakeholders: '',
      evidence: '',
      risks: '',
      desiredOutput: 'full',
      inferredMode: true,
      createdAt: new Date().toISOString(),
    };
    const metadataJson = JSON.stringify(metadataObject);

    const newCase = await prisma.case.create({
      data: {
        title: caseTitle,
        status: 'pending',
        slug: slug,
        metadata: metadataJson,
      },
    });

    // Step 2: Upload file and create document record
    let documentId: string;
    let geminiFileUri: string | null = null;

    try {
      if (isDemoMode()) {
        // In demo mode, create document without Gemini upload
        const document = await prisma.caseDocument.create({
          data: {
            caseId: newCase.id,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type || 'text/plain',
            status: 'completed',
            content: await file.text().catch(() => null),
            metadata: JSON.stringify({
              demo: true,
            }),
          },
        });
        documentId = document.id;
      } else {
        // In live mode, upload to Gemini Files API
        const geminiFilesClient = getGeminiFilesClient();
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        
        try {
          const geminiFile = await geminiFilesClient.uploadFile(
            fileBuffer,
            file.type || 'text/plain',
            file.name
          );
          geminiFileUri = geminiFile.uri;

          // Create document record
          const document = await prisma.caseDocument.create({
            data: {
              caseId: newCase.id,
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
          documentId = document.id;
        } catch (geminiError: any) {
          // Gemini upload failed - clean up case and return 502
          console.error('Gemini upload error:', {
            message: geminiError?.message || 'Unknown error',
            code: geminiError?.code || 'UNKNOWN',
          });

          // Clean up the case since upload failed
          try {
            await prisma.case.delete({ where: { id: newCase.id } });
          } catch (deleteError) {
            console.error('Failed to clean up case after Gemini upload error:', deleteError);
          }

          return NextResponse.json(
            {
              error: 'Gemini file upload failed',
              code: 'GEMINI_UPLOAD_FAILED',
              message: geminiError?.message || 'Failed to upload file to Gemini',
            },
            { status: 502 }
          );
        }
      }
    } catch (docError: any) {
      // If document creation fails, clean up the case
      try {
        await prisma.case.delete({ where: { id: newCase.id } });
      } catch (deleteError) {
        // Log but don't fail
        console.error('Failed to clean up case after document creation error:', deleteError);
      }

      throw docError;
    }

    // Success response
    return NextResponse.json(
      {
        caseId: newCase.id,
        artifactId: documentId,
        fileName: file.name,
      },
      { status: 201 }
    );
  } catch (error: any) {
    // Log error without leaking secrets
    console.error('QuickStart upload error:', {
      message: error?.message || 'Unknown error',
      code: error?.code || 'UNKNOWN',
      name: error?.name || 'Error',
    });

    // Check for database initialization errors
    const errorMessage = error?.message || '';
    const isDBUninitialized = 
      errorMessage.includes('does not exist') ||
      errorMessage.includes('table') ||
      errorMessage.includes('relation') ||
      error?.code === '42P01' ||
      error?.code === 'P2025';
    
    if (isDBUninitialized) {
      return NextResponse.json(
        {
          error: 'Database tables are not initialized. Run migrations.',
          code: 'DB_NOT_INITIALIZED',
        },
        { status: 503 }
      );
    }

    // Check for validation errors
    if (error?.code === 'VALIDATION_ERROR' || errorMessage.includes('required')) {
      return NextResponse.json(
        {
          error: errorMessage || 'Validation error',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // All other errors - return generic error message
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

