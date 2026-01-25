import { NextResponse } from 'next/server';
import { getPrismaClient } from '../../../../lib/prisma';
import { normalizeDecisionData } from '../../../../lib/report-normalizer';

/**
 * Get case report
 * Returns report data with decision information from step 2
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const prisma = getPrismaClient();
    const caseId = params.id;

    // Find case with report and steps
    const case_ = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        report: true,
        steps: {
          orderBy: { stepNumber: 'asc' },
        },
      },
    });

    if (!case_) {
      return NextResponse.json(
        { code: 'CASE_NOT_FOUND', message: 'Case not found' },
        { status: 404 }
      );
    }

    if (!case_.report) {
      return NextResponse.json(
        { code: 'REPORT_NOT_FOUND', message: 'Report not found. Complete analysis first.' },
        { status: 404 }
      );
    }

    // Extract decision data from step 2
    const step2 = case_.steps.find((s) => s.stepNumber === 2);
    const decision = step2 && step2.data
      ? normalizeDecisionData(JSON.parse(step2.data))
      : null;

    return NextResponse.json({
      caseId: case_.id,
      report: {
        finalNarrativeMarkdown: case_.report.finalNarrativeMarkdown,
        mermaidDiagram: case_.report.mermaidDiagram,
        tokensUsed: case_.report.tokensUsed,
        durationMs: case_.report.durationMs,
        createdAt: case_.report.createdAt.toISOString(),
      },
      decision,
    });
  } catch (error: any) {
    console.error('Error loading case report:', error);
    return NextResponse.json(
      { code: 'REPORT_LOAD_FAILED', message: String(error?.message || error || 'Unknown error') },
      { status: 500 }
    );
  }
}

