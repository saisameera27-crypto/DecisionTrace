import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';

/**
 * Create Case API Route
 * 
 * Creates a new case from user-provided decision details.
 * 
 * This endpoint ONLY creates the case and returns the caseId immediately.
 * Report generation happens separately via POST /api/case/[id]/generate
 * 
 * Returns the created case ID for routing to report generation.
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body safely
    let body: any;
    try {
      body = await request.json();
    } catch (parseError: any) {
      return NextResponse.json(
        {
          error: 'Invalid JSON in request body',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    const {
      title,
      decisionContext,
      stakeholders,
      evidence,
      risks,
      desiredOutput = 'full',
    } = body;

    // Validate required fields
    if (!title || !title.trim()) {
      return NextResponse.json(
        {
          error: 'Title is required',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // Check if database is initialized
    let prisma;
    try {
      prisma = getPrismaClient();
    } catch (dbError: any) {
      // Check for database initialization errors
      const errorMessage = dbError?.message || '';
      if (
        errorMessage.includes('does not exist') ||
        errorMessage.includes('table') ||
        errorMessage.includes('relation') ||
        dbError?.code === '42P01' ||
        dbError?.code === 'P2025'
      ) {
        return NextResponse.json(
          {
            error: 'Database tables are not initialized. Run migrations.',
            code: 'DB_NOT_INITIALIZED',
          },
          { status: 503 }
        );
      }
      // Re-throw to be caught by outer catch
      throw dbError;
    }

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100) + '-' + Date.now().toString(36);

    // Create case (without report generation - that happens in /api/case/[id]/generate)
    const newCase = await prisma.case.create({
      data: {
        title: title.trim(),
        status: 'pending', // Set to pending - report will be generated separately
        slug,
        metadata: JSON.stringify({
          decisionContext: decisionContext?.trim() || '',
          stakeholders: stakeholders?.trim() || '',
          evidence: evidence?.trim() || '',
          risks: risks?.trim() || '',
          desiredOutput,
          createdAt: new Date().toISOString(),
        }),
      },
    });

    // Success response - return immediately with caseId
    return NextResponse.json({
      caseId: newCase.id,
      slug: newCase.slug,
      message: 'Case created successfully. Call /api/case/[id]/generate to generate the report.',
    }, { status: 201 });
  } catch (error: any) {
    // Log error without leaking secrets
    console.error('Create case error:', {
      message: error?.message || 'Unknown error',
      code: error?.code || 'UNKNOWN',
      name: error?.name || 'Error',
      // Do NOT log: API keys, tokens, passwords, or sensitive user data
    });
    
    // Check for database initialization errors
    const errorMessage = error?.message || '';
    if (
      errorMessage.includes('does not exist') ||
      errorMessage.includes('table') ||
      errorMessage.includes('relation') ||
      error?.code === '42P01' ||
      error?.code === 'P2025'
    ) {
      return NextResponse.json(
        {
          error: 'Database tables are not initialized. Run migrations.',
          code: 'DB_NOT_INITIALIZED',
        },
        { status: 503 }
      );
    }

    // Check for validation errors (shouldn't reach here, but safety check)
    if (error?.code === 'VALIDATION_ERROR' || errorMessage.includes('required')) {
      return NextResponse.json(
        {
          error: errorMessage || 'Validation error',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // All other errors - return generic error message (don't leak internal details)
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}


