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

    // Destructure required fields with defaults
    title = body.title || '';
    decisionContext = body.decisionContext || '';
    stakeholders = body.stakeholders || '';
    evidence = body.evidence || '';
    risks = body.risks || '';
    desiredOutput = body.desiredOutput || 'full';

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

    if (!decisionContext || !decisionContext.trim()) {
      return NextResponse.json(
        {
          error: 'Decision context is required',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // Check if database is initialized
    try {
      prisma = getPrismaClient();
    } catch (dbError: any) {
      // Check for database initialization errors
      const errorMessage = dbError?.message || '';
      const isDBUninitialized = 
        errorMessage.includes('does not exist') ||
        errorMessage.includes('table') ||
        errorMessage.includes('relation') ||
        dbError?.code === '42P01' ||
        dbError?.code === 'P2025';
      
      if (isDBUninitialized) {
        // In demo mode, attempt auto-initialization if enabled
        const isDemo = isDemoMode();
        const autoInitEnabled = process.env.AUTO_INIT_DB === 'true';
        
        if (isDemo && autoInitEnabled) {
          // Attempt lightweight initialization for demo mode
          try {
            console.log('🔄 Demo mode: Attempting automatic database initialization...');
            
            // Determine which schema to use based on DATABASE_URL
            const dbUrl = process.env.DATABASE_URL || '';
            const isSQLite = dbUrl.startsWith('file:');
            const schemaFile = isSQLite 
              ? 'prisma/schema.sqlite.prisma'
              : 'prisma/schema.postgres.prisma';
            
            // Generate Prisma client
            execSync(`npx prisma generate --schema=${schemaFile}`, {
              env: process.env,
              stdio: 'pipe',
              cwd: process.cwd(),
            });
            
            // Push schema to database
            execSync(`npx prisma db push --schema=${schemaFile} --accept-data-loss`, {
              env: process.env,
              stdio: 'pipe',
              cwd: process.cwd(),
            });
            
            console.log('✅ Demo mode: Database initialized successfully');
            
            // Retry getting Prisma client after initialization
            prisma = getPrismaClient();
          } catch (initError: any) {
            // Auto-init failed, return helpful error message
            console.error('Demo mode: Auto-initialization failed:', initError.message);
            return NextResponse.json(
              {
                error: 'Database tables are not initialized. For demo mode, please redeploy with migrations enabled, or set AUTO_INIT_DB=true to enable automatic initialization.',
                code: 'DB_NOT_INITIALIZED',
                hint: 'In demo mode, database initialization can be automated. Set AUTO_INIT_DB=true and redeploy, or ensure migrations run during deployment.',
              },
              { status: 503 }
            );
          }
        } else if (isDemo) {
          // Demo mode but auto-init not enabled - return clearer message
          return NextResponse.json(
            {
              error: 'Database tables are not initialized. For hackathon demo, please redeploy with migrations enabled.',
              code: 'DB_NOT_INITIALIZED',
              hint: 'To enable automatic initialization in demo mode, set AUTO_INIT_DB=true. Otherwise, ensure migrations run during deployment.',
            },
            { status: 503 }
          );
        } else {
          // Production mode - never auto-init unless explicitly enabled
          return NextResponse.json(
            {
              error: 'Database tables are not initialized. Run migrations.',
              code: 'DB_NOT_INITIALIZED',
            },
            { status: 503 }
          );
        }
      }
      // Re-throw to be caught by outer catch
      throw dbError;
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
    const errorMessage = error?.message || '';
    const isDBUninitialized = 
      errorMessage.includes('does not exist') ||
      errorMessage.includes('table') ||
      errorMessage.includes('relation') ||
      error?.code === '42P01' ||
      error?.code === 'P2025';
    
    if (isDBUninitialized) {
      const isDemo = isDemoMode();
      const autoInitEnabled = process.env.AUTO_INIT_DB === 'true';
      
      if (isDemo && autoInitEnabled) {
        // Attempt auto-initialization even if it failed during getPrismaClient()
        try {
          console.log('🔄 Demo mode: Attempting automatic database initialization (retry)...');
          
          const dbUrl = process.env.DATABASE_URL || '';
          const isSQLite = dbUrl.startsWith('file:');
          const schemaFile = isSQLite 
            ? 'prisma/schema.sqlite.prisma'
            : 'prisma/schema.postgres.prisma';
          
          execSync(`npx prisma generate --schema=${schemaFile}`, {
            env: process.env,
            stdio: 'pipe',
            cwd: process.cwd(),
          });
          
          execSync(`npx prisma db push --schema=${schemaFile} --accept-data-loss`, {
            env: process.env,
            stdio: 'pipe',
            cwd: process.cwd(),
          });
          
          console.log('✅ Demo mode: Database initialized successfully (retry)');
          
          // Retry the operation - use only in-scope variables
          prisma = getPrismaClient();
          
          // Ensure we have the required variables (they should be set from body parsing above)
          if (!title || !title.trim()) {
            return NextResponse.json(
              {
                error: 'Title is required',
                code: 'VALIDATION_ERROR',
              },
              { status: 400 }
            );
          }
          
          if (!decisionContext || !decisionContext.trim()) {
            return NextResponse.json(
              {
                error: 'Decision context is required',
                code: 'VALIDATION_ERROR',
              },
              { status: 400 }
            );
          }
          
          // Generate slug from title
          slug = title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 100) + '-' + Date.now().toString(36);
          
          // Use only in-scope variables - no shorthand object properties
          const retryTrimmedTitle = title.trim();
          const retryTrimmedDecisionContext = decisionContext.trim();
          const retryTrimmedStakeholders = stakeholders.trim();
          const retryTrimmedEvidence = evidence.trim();
          const retryTrimmedRisks = risks.trim();
          // Explicit property mappings (not shorthand) - all variables declared at function scope
          const retryMetadataObject = {
            decisionContext: retryTrimmedDecisionContext,
            stakeholders: retryTrimmedStakeholders,
            evidence: retryTrimmedEvidence,
            risks: retryTrimmedRisks,
            desiredOutput: desiredOutput, // Explicit mapping from function-scoped variable (line 25, assigned line 49)
            createdAt: new Date().toISOString(),
          };
          const retryMetadataJson = JSON.stringify(retryMetadataObject);
          
          const newCase = await prisma.case.create({
            data: {
              title: retryTrimmedTitle,
              status: 'pending',
              slug: slug,
              metadata: retryMetadataJson,
            },
          });
          
          return NextResponse.json({
            caseId: newCase.id,
            slug: newCase.slug,
            message: 'Case created successfully. Call /api/case/[id]/generate to generate the report.',
          }, { status: 201 });
        } catch (initError: any) {
          console.error('Demo mode: Auto-initialization failed (retry):', initError.message);
          return NextResponse.json(
            {
              error: 'Database tables are not initialized. For demo mode, please redeploy with migrations enabled, or set AUTO_INIT_DB=true to enable automatic initialization.',
              code: 'DB_NOT_INITIALIZED',
              hint: 'In demo mode, database initialization can be automated. Set AUTO_INIT_DB=true and redeploy, or ensure migrations run during deployment.',
            },
            { status: 503 }
          );
        }
      } else if (isDemo) {
        return NextResponse.json(
          {
            error: 'Database tables are not initialized. For hackathon demo, please redeploy with migrations enabled.',
            code: 'DB_NOT_INITIALIZED',
            hint: 'To enable automatic initialization in demo mode, set AUTO_INIT_DB=true. Otherwise, ensure migrations run during deployment.',
          },
          { status: 503 }
        );
      } else {
        return NextResponse.json(
          {
            error: 'Database tables are not initialized. Run migrations.',
            code: 'DB_NOT_INITIALIZED',
          },
          { status: 503 }
        );
      }
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


