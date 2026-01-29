import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { isDemoMode } from '@/lib/demo-mode';
import { execSync } from 'child_process';

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
  // Declare variables in function scope so they're accessible in catch block
  // Use getPrismaClient() from @/lib/prisma (consistent with all other API routes)
  let prisma: ReturnType<typeof getPrismaClient> | null = null;
  let title: string = '';
  let decisionContext: string = '';
  let stakeholders: string = '';
  let evidence: string = '';
  let risks: string = '';
  let desiredOutput: string = 'full';
  let slug: string = '';

  try {
    // 1) Parse JSON safely - do NOT fail if body is empty
    let body: any = {};
    try {
      body = await request.json();
    } catch (parseError: any) {
      // If JSON parsing fails, use empty object - don't fail the request
      body = {};
    }

    // 2) Check DB readiness BEFORE validating request fields
    try {
      prisma = getPrismaClient();
      
      // Run a tiny query to verify database tables exist
      // This will throw if tables don't exist or DB is not initialized
      try {
        await prisma.case.count();
      } catch (countError: any) {
        // If count() throws, check if it's a DB initialization error
        const countErrorMessage = countError?.message || '';
        const isCountDBError = 
          countErrorMessage.includes('does not exist') ||
          countErrorMessage.includes('table') ||
          countErrorMessage.includes('relation') ||
          countError?.code === '42P01' ||
          countError?.code === 'P2025';
        
        if (isCountDBError) {
          // Return DB_NOT_INITIALIZED error immediately (before field validation)
          return NextResponse.json(
            {
              error: 'Database tables are not initialized. Run migrations.',
              code: 'DB_NOT_INITIALIZED',
            },
            { status: 503 }
          );
        }
        // Re-throw if it's not a DB initialization error
        throw countError;
      }
    } catch (dbError: any) {
      // Check for database initialization errors from getPrismaClient() or count()
      const errorMessage = dbError?.message || '';
      const isDBUninitialized = 
        errorMessage.includes('does not exist') ||
        errorMessage.includes('table') ||
        errorMessage.includes('relation') ||
        dbError?.code === '42P01' ||
        dbError?.code === 'P2025';
      
      if (isDBUninitialized) {
        // Return DB_NOT_INITIALIZED error immediately (before field validation)
        return NextResponse.json(
          {
            error: 'Database tables are not initialized. Run migrations.',
            code: 'DB_NOT_INITIALIZED',
          },
          { status: 503 }
        );
      }
      // Re-throw other DB errors to be caught by outer catch
      throw dbError;
    }

    // 3) Only after DB is confirmed reachable, validate fields
    // Destructure required fields with defaults
    title = body.title || '';
    decisionContext = body.decisionContext || '';
    stakeholders = body.stakeholders || '';
    evidence = body.evidence || '';
    risks = body.risks || '';
    desiredOutput = body.desiredOutput || 'full';

    // Validate required fields - only title is required
    if (!title || !title.trim()) {
      return NextResponse.json(
        {
          error: 'Title is required',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // decisionContext defaults to "" if missing (already handled above)

    // Generate slug from title
    slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100) + '-' + Date.now().toString(36);

    // Create case (without report generation - that happens in /api/case/[id]/generate)
    // Use only in-scope variables - no shorthand object properties
    const trimmedTitle = title.trim();
    const trimmedDecisionContext = decisionContext.trim();
    const trimmedStakeholders = stakeholders.trim();
    const trimmedEvidence = evidence.trim();
    const trimmedRisks = risks.trim();
    // Explicit property mappings (not shorthand) - all variables declared above
    const metadataObject = {
      decisionContext: trimmedDecisionContext,
      stakeholders: trimmedStakeholders,
      evidence: trimmedEvidence,
      risks: trimmedRisks,
      desiredOutput: desiredOutput, // Explicit mapping from function-scoped variable (line 25, assigned line 49)
      createdAt: new Date().toISOString(),
    };
    const metadataJson = JSON.stringify(metadataObject);

    const newCase = await prisma.case.create({
      data: {
        title: trimmedTitle,
        status: 'pending', // Set to pending - report will be generated separately
        slug: slug,
        metadata: metadataJson,
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
    
    // Check for database initialization errors (from prisma.case.create() call)
    // Note: DB readiness is checked upfront, but this handles errors during case creation
    const errorMessage = error?.message || '';
    const isDBUninitialized = 
      errorMessage.includes('does not exist') ||
      errorMessage.includes('table') ||
      errorMessage.includes('relation') ||
      error?.code === '42P01' ||
      error?.code === 'P2025';
    
    if (isDBUninitialized) {
      // Return DB_NOT_INITIALIZED error
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


