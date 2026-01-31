import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { runOrchestrator, type OrchestratorOptions } from '@/lib/orchestrator';
import { isDemoMode } from '@/lib/demo-mode';

/**
 * Run Orchestrator API Route
 * 
 * Executes the 6-step analysis pipeline:
 * - Step 1: Decision inference + categorization (forensic analysis)
 * - Steps 2-6: Reference Step 1 output, NOT raw user input
 * 
 * Supports:
 * - Resume from specific step (resumeFromStep query param)
 * - SSE streaming (if Accept: text/event-stream header)
 * - JSON response (default)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const caseId = params.id;
    
    // Demo mode: return deterministic demo report immediately (no DB, no Gemini)
    const demoModeEnabled = isDemoMode();
    if (demoModeEnabled && caseId.startsWith('demo-case-')) {
      console.log('[RUN ROUTE] Demo mode: returning instant demo report for', caseId);
      // In demo mode, return success immediately without DB operations
      return NextResponse.json({
        success: true,
        mode: 'demo',
        stepsCompleted: 6,
        stepsFailed: 0,
        totalTokens: 0,
        totalDurationMs: 100,
        caseId: caseId,
        steps: [
          { stepNumber: 1, status: 'completed', errors: [], warnings: [] },
          { stepNumber: 2, status: 'completed', errors: [], warnings: [] },
          { stepNumber: 3, status: 'completed', errors: [], warnings: [] },
          { stepNumber: 4, status: 'completed', errors: [], warnings: [] },
          { stepNumber: 5, status: 'completed', errors: [], warnings: [] },
          { stepNumber: 6, status: 'completed', errors: [], warnings: [] },
        ],
      }, { status: 200 });
    }
    
    const prisma = getPrismaClient();

    // Find case with documents
    const case_ = await prisma.case.findUnique({
      where: { id: caseId },
      include: { documents: true },
    });

    if (!case_) {
      return NextResponse.json(
        { error: 'Case not found', code: 'CASE_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Verify at least one document exists
    if (!case_.documents || case_.documents.length === 0) {
      return NextResponse.json(
        { error: 'No documents uploaded', code: 'NO_DOCUMENTS' },
        { status: 400 }
      );
    }

    // Get the first document (or most recent)
    const document = case_.documents[0];
    
    // Parse document metadata to get Gemini file URI
    let documentMetadata: any = {};
    try {
      documentMetadata = JSON.parse(document.metadata || '{}');
    } catch {
      // Invalid metadata, use defaults
    }

    const fileUri = documentMetadata.geminiFileUri || null;
    const documentText = document.content || null; // For text files stored directly

    // Update case status to processing
    await prisma.case.update({
      where: { id: caseId },
      data: { status: 'processing' },
    });

    // Run orchestrator
    const orchestratorOptions: OrchestratorOptions = {
      caseId,
      documentId: document.id,
      fileUri: fileUri || undefined,
      documentText: documentText || undefined,
      fileName: document.fileName,
    };

    const result = await runOrchestrator(orchestratorOptions);

    // Save step results to database
    for (const step of result.steps) {
      await prisma.caseStep.upsert({
        where: {
          caseId_stepNumber: {
            caseId,
            stepNumber: step.stepNumber,
          },
        },
        create: {
          caseId,
          stepNumber: step.stepNumber,
          status: step.status === 'completed' ? 'completed' : 'failed',
          data: JSON.stringify(step.data || {}),
          errors: JSON.stringify(step.errors || []),
          warnings: JSON.stringify(step.warnings || []),
          startedAt: new Date(),
          completedAt: step.status === 'completed' ? new Date() : null,
        },
        update: {
          status: step.status === 'completed' ? 'completed' : 'failed',
          data: JSON.stringify(step.data || {}),
          errors: JSON.stringify(step.errors || []),
          warnings: JSON.stringify(step.warnings || []),
          completedAt: step.status === 'completed' ? new Date() : null,
        },
      });
    }

    // Update case status
    await prisma.case.update({
      where: { id: caseId },
      data: { 
        status: result.success ? 'completed' : 'failed',
      },
    });

    // Return result
    return NextResponse.json({
      success: result.success,
      stepsCompleted: result.stepsCompleted,
      stepsFailed: result.stepsFailed,
      totalTokens: result.totalTokens,
      totalDurationMs: result.totalDurationMs,
      steps: result.steps.map(s => ({
        stepNumber: s.stepNumber,
        status: s.status,
        errors: s.errors,
        warnings: s.warnings,
      })),
    }, { status: result.success ? 200 : 207 }); // 207 Multi-Status if some steps failed
  } catch (error: any) {
    console.error('[RUN ROUTE] Orchestrator error:', {
      message: error?.message || 'Unknown error',
      code: error?.code || 'UNKNOWN',
      stack: error?.stack || 'No stack trace',
      caseId: params?.id || 'unknown',
      isDemoMode: isDemoMode(),
    });

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        code: 'INTERNAL_ERROR',
        message: error?.message || 'Failed to run analysis',
        ...(process.env.NODE_ENV === 'development' && { stack: error?.stack }),
      },
      { status: 500 }
    );
  }
}

