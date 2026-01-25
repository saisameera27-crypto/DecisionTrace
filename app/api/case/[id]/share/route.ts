import { NextResponse } from 'next/server';
import { getPrismaClient } from '../../../../lib/prisma';

/**
 * Generate a unique slug for share links
 */
function generateShareSlug(): string {
  return `share_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Create share link for a case
 * POST /api/case/[id]/share
 * Body: { expirationDays?: number } (default: 30)
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const prisma = getPrismaClient();
    const caseId = params.id;

    // Parse request body for expiration days (default 30)
    let expirationDays = 30;
    try {
      const body = await request.json().catch(() => ({}));
      expirationDays = body.expirationDays || 30;
    } catch {
      // Body parsing failed, use default
    }

    // Verify case exists and has a report
    const case_ = await prisma.case.findUnique({
      where: { id: caseId },
      include: { report: true },
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
        { status: 400 }
      );
    }

    // Generate unique slug
    const slug = generateShareSlug();

    // Calculate expiration timestamp
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expirationDays);

    // Create share link
    const share = await prisma.share.create({
      data: {
        caseId,
        slug,
        expiresAt,
      },
    });

    return NextResponse.json({
      success: true,
      shareId: share.id,
      slug: share.slug,
      expiresAt: share.expiresAt.toISOString(),
      url: `/public/case/${share.slug}`,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating share link:', error);
    return NextResponse.json(
      { code: 'SHARE_CREATE_FAILED', message: String(error?.message || error || 'Unknown error') },
      { status: 500 }
    );
  }
}

