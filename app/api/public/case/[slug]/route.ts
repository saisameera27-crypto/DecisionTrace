import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { normalizeDecisionData } from '@/lib/report-normalizer';

/**
 * Get public case by share slug
 * Returns report data when share link is valid and not expired
 */
export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const prisma = getPrismaClient();
    const slug = params.slug;

    // Find share by slug
    const share = await prisma.share.findUnique({
      where: { slug },
      include: {
        case: {
          include: {
            report: true,
            steps: {
              orderBy: { stepNumber: 'asc' },
            },
          },
        },
      },
    });

    if (!share) {
      return NextResponse.json(
        { code: 'SHARE_NOT_FOUND', message: 'Share link not found' },
        { status: 404 }
      );
    }

    // Check expiration
    const now = new Date();
    if (share.expiresAt < now) {
      // Update accessedAt for tracking
      await prisma.share.update({
        where: { id: share.id },
        data: { accessedAt: now },
      });

      return NextResponse.json(
        {
          code: 'SHARE_EXPIRED',
          message: 'Share link has expired',
          expiredAt: share.expiresAt.toISOString(),
        },
        { status: 410 }
      );
    }

    // Update accessedAt
    await prisma.share.update({
      where: { id: share.id },
      data: { accessedAt: now },
    });

    // Return report data
    const case_ = share.case;
    if (!case_.report) {
      return NextResponse.json(
        { code: 'REPORT_NOT_FOUND', message: 'Report not found' },
        { status: 404 }
      );
    }

    // Find step 2 data for decision view
    const step2 = case_.steps.find((s: { stepNumber: number }) => s.stepNumber === 2);
    const decision = step2 && step2.data
      ? normalizeDecisionData(JSON.parse(step2.data))
      : null;

    return NextResponse.json({
      caseId: case_.id,
      title: case_.title,
      report: {
        finalNarrativeMarkdown: case_.report.finalNarrativeMarkdown,
        mermaidDiagram: case_.report.mermaidDiagram,
        tokensUsed: case_.report.tokensUsed,
        durationMs: case_.report.durationMs,
        createdAt: case_.report.createdAt.toISOString(),
      },
      decision,
      expiresAt: share.expiresAt.toISOString(),
      accessedAt: now.toISOString(),
    });
  } catch (error: any) {
    console.error('Error loading public case:', error);
    return NextResponse.json(
      { code: 'PUBLIC_CASE_LOAD_FAILED', message: String(error) },
      { status: 500 }
    );
  }
}

