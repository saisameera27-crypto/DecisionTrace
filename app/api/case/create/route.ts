import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { isDemoMode } from '@/lib/demo-mode';
import { execSync } from 'child_process';
import { z } from 'zod';

/**
 * Zod schema for Upload/Infer mode (inferMode = true)
 * Requires: documentId OR fileUri
 * Optional: title (auto-generated if missing)
 */
const inferModeSchema = z.object({
  inferMode: z.literal(true),
  documentId: z.string().min(1, 'Document ID is required').optional(),
  fileUri: z.string().min(1, 'File URI is required').optional(),
  title: z.string().optional(),
  decisionContext: z.string().optional(),
  stakeholders: z.string().optional(),
  evidence: z.string().optional(),
  risks: z.string().optional(),
  desiredOutput: z.string().default('full'),
}).refine(
  (data) => data.documentId || data.fileUri,
  {
    message: 'File upload is required. Please provide either documentId or fileUri.',
    path: ['documentId'],
  }
);

/**
 * Zod schema for Manual mode (inferMode = false)
 * Requires: title, decisionContext
 * Optional: all other fields, no file required
 */
const manualModeSchema = z.object({
  inferMode: z.literal(false),
  title: z.string().trim().min(1, 'Title is required'),
  decisionContext: z.string().trim().min(1, 'Decision context is required'),
  documentId: z.string().optional(),
  fileUri: z.string().optional(),
  stakeholders: z.string().optional(),
  evidence: z.string().optional(),
  risks: z.string().optional(),
  desiredOutput: z.string().default('full'),
});

/**
 * Union schema that validates based on inferMode
 */
const createCaseSchema = z.discriminatedUnion('inferMode', [
  inferModeSchema,
  manualModeSchema,
]);

/**
 * Create Case API Route
 * 
 * Creates a new case from user-provided decision details.
 * 
 * Supports two modes:
 * 1. Upload/Infer mode (default): Requires file upload, title optional
 * 2. Manual mode: Requires title + decisionContext, no file required
 * 
 * This endpoint ONLY creates the case and returns the caseId immediately.
 * Report generation happens separately via POST /api/case/[id]/generate
 * 
 * Returns the created case ID for routing to report generation.
 */
// GET handler returns helpful error for accidental browser navigation
export async function GET() {
  return NextResponse.json(
    {
      error: 'Use POST',
      message: 'This endpoint requires POST method. Use POST /api/case/create to create a case.',
      code: 'METHOD_NOT_ALLOWED',
    },
    { status: 405 }
  );
}

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

    // 3) Only after DB is confirmed reachable, validate fields with Zod
    // Default inferMode to true if not provided
    const inferMode = body.inferMode !== undefined ? body.inferMode : true;
    const bodyWithInferMode = { 
      ...body, 
      inferMode: inferMode as true | false // Ensure it's a literal type
    };

    // Validate request body with Zod schema
    const validationResult = createCaseSchema.safeParse(bodyWithInferMode);
    
    if (!validationResult.success) {
      // Extract first error message for user-friendly response
      const firstError = validationResult.error.issues[0];
      const errorMessage = firstError?.message || 'Validation error';
      const errorPath = firstError?.path?.join('.') || 'unknown';
      
      // Provide mode-specific error messages
      let userMessage = errorMessage;
      if (inferMode && errorPath.includes('documentId')) {
        userMessage = 'File upload is required. Please upload a document to analyze.';
      } else if (!inferMode && errorPath === 'title') {
        userMessage = 'Title is required in manual mode.';
      } else if (!inferMode && errorPath === 'decisionContext') {
        userMessage = 'Decision context is required in manual mode.';
      }
      
      return NextResponse.json(
        {
          error: userMessage,
          code: 'VALIDATION_ERROR',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;
    
    // Extract validated fields
    const documentId = validatedData.documentId || null;
    const fileUri = validatedData.fileUri || null;
    title = validatedData.title || '';
    decisionContext = validatedData.decisionContext || '';
    stakeholders = validatedData.stakeholders || '';
    evidence = validatedData.evidence || '';
    risks = validatedData.risks || '';
    desiredOutput = validatedData.desiredOutput || 'full';
    const inferredMode = validatedData.inferMode;

    // Generate title and slug based on mode
    if (!title.trim()) {
      if (inferredMode) {
        // Auto-generate title for infer mode
        const dateStr = new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        title = `Untitled Decision Case - ${dateStr}`;
      } else {
        // Manual mode requires title (shouldn't reach here due to Zod validation)
        title = 'Untitled Decision Case';
      }
    }
    
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
      desiredOutput: desiredOutput,
      documentId: documentId, // Include document ID if file was uploaded
      fileUri: fileUri || null, // Include file URI if provided
      inferredMode: inferredMode, // Flag for inferred decision mode
      createdAt: new Date().toISOString(),
    };
    const metadataJson = JSON.stringify(metadataObject);

    const newCase = await prisma.case.create({
      data: {
        title: trimmedTitle || 'Inferred Decision', // Use provided title or default
        status: 'pending', // Set to pending - report will be generated separately
        slug: slug,
        metadata: metadataJson,
      },
    });

    // If documentId was provided, update the document to link it to this case
    if (documentId) {
      try {
        await prisma.caseDocument.update({
          where: { id: documentId },
          data: { caseId: newCase.id },
        });
      } catch (updateError) {
        // Log but don't fail - document might not exist or might already be linked
        console.warn('Could not link document to case:', updateError);
      }
    }

    // Success response - return immediately with caseId
    return NextResponse.json({
      ok: true,
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


