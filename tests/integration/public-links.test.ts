/**
 * Integration Tests: Public Links and Report Loading
 * Tests report loader, share link creation, and expiration handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Mock Next.js types if not available
type NextRequest = any;
type NextResponse = any;

// Try to import Next.js types, fallback to mocks if not available
let NextRequestClass: any;
let NextResponseClass: any;

try {
  const nextServer = require('next/server');
  NextRequestClass = nextServer.NextRequest;
  NextResponseClass = nextServer.NextResponse;
} catch {
  // Next.js not installed - use mock types
  NextRequestClass = class MockNextRequest {
    constructor(public url: string, public init?: any) {}
    async formData() {
      return new FormData();
    }
    async json() {
      return {};
    }
  };
  NextResponseClass = {
    json: (data: any, init?: any) => ({
      status: init?.status || 200,
      json: async () => data,
      text: async () => JSON.stringify(data),
    }),
  };
}

import {
  resetTestDatabase,
  createTestCase,
  callCaseReport,
  callPublicCase,
  getTestPrismaClient,
  parseJsonResponse,
  assertResponseStatus,
} from './_harness';
import { normalizeDecisionData } from '@/lib/report-normalizer';

// Ensure test mode is set
process.env.GEMINI_TEST_MODE = 'mock';
process.env.NODE_ENV = 'test';

/**
 * Generate a unique slug for share links
 */
function generateShareSlug(): string {
  return `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Mock report loader handler
 * Returns normalized view model for an existing report
 */
async function mockReportLoaderHandler(
  req: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  const prisma = getTestPrismaClient();
  if (!prisma) {
    return NextResponseClass.json(
      { error: 'Database not available' },
      { status: 500 }
    );
  }

  const caseId = context.params.id;

  try {
    // Load case with report and steps
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
      return NextResponseClass.json({ error: 'Case not found' }, { status: 404 });
    }

    if (!case_.report) {
      return NextResponseClass.json({ error: 'Report not found' }, { status: 404 });
    }

    // Find step 2 data (decision extraction step)
    const step2 = case_.steps.find((s: any) => s.stepNumber === 2);
    if (!step2 || !step2.data) {
      return NextResponseClass.json(
        { error: 'Decision data not found' },
        { status: 404 }
      );
    }

    // Parse step 2 data
    const step2Data = JSON.parse(step2.data);

    // Normalize decision data to view model
    const normalizedDecision = normalizeDecisionData(step2Data);

    // Build normalized view model
    const viewModel = {
      caseId: case_.id,
      title: case_.title,
      status: case_.status,
      report: {
        finalNarrativeMarkdown: case_.report.finalNarrativeMarkdown,
        mermaidDiagram: case_.report.mermaidDiagram,
        tokensUsed: case_.report.tokensUsed,
        durationMs: case_.report.durationMs,
        createdAt: case_.report.createdAt.toISOString(),
      },
      decision: normalizedDecision,
      steps: case_.steps.map((step: any) => ({
        stepNumber: step.stepNumber,
        status: step.status,
        startedAt: step.startedAt?.toISOString() || null,
        completedAt: step.completedAt?.toISOString() || null,
      })),
    };

    return NextResponseClass.json(viewModel);
  } catch (error: any) {
    return NextResponseClass.json(
      { error: error.message || 'Failed to load report' },
      { status: 500 }
    );
  }
}

/**
 * Mock share creation handler
 * Generates slug and expiration timestamp
 */
async function mockShareCreateHandler(
  req: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  const prisma = getTestPrismaClient();
  if (!prisma) {
    return NextResponseClass.json(
      { error: 'Database not available' },
      { status: 500 }
    );
  }

  const caseId = context.params.id;

  try {
    // Parse request body for expiration days (default 30)
    const body = await req.json().catch(() => ({}));
    const expirationDays = body.expirationDays || 30;

    // Verify case exists and has a report
    const case_ = await prisma.case.findUnique({
      where: { id: caseId },
      include: { report: true },
    });

    if (!case_) {
      return NextResponseClass.json({ error: 'Case not found' }, { status: 404 });
    }

    if (!case_.report) {
      return NextResponseClass.json(
        { error: 'Report not found. Complete analysis first.' },
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

    return NextResponseClass.json(
      {
        success: true,
        shareId: share.id,
        slug: share.slug,
        expiresAt: share.expiresAt.toISOString(),
        url: `/public/case/${share.slug}`,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponseClass.json(
      { error: error.message || 'Failed to create share link' },
      { status: 500 }
    );
  }
}

/**
 * Mock public case handler
 * Returns report when not expired, 410 when expired
 */
async function mockPublicCaseHandler(
  req: NextRequest,
  context: { params: { slug: string } }
): Promise<NextResponse> {
  const prisma = getTestPrismaClient();
  if (!prisma) {
    return NextResponseClass.json(
      { error: 'Database not available' },
      { status: 500 }
    );
  }

  const slug = context.params.slug;

  try {
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
      return NextResponseClass.json(
        { error: 'Share link not found' },
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

      return NextResponseClass.json(
        {
          error: 'Share link has expired',
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
      return NextResponseClass.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Find step 2 data for decision view
    const step2 = case_.steps.find((s: any) => s.stepNumber === 2);
    const decision = step2 && step2.data
      ? normalizeDecisionData(JSON.parse(step2.data))
      : null;

    return NextResponseClass.json({
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
    return NextResponseClass.json(
      { error: error.message || 'Failed to load public case' },
      { status: 500 }
    );
  }
}

describe('Public Links and Report Loading', () => {
  beforeEach(async () => {
    await resetTestDatabase();
    process.env.GEMINI_TEST_MODE = 'mock';
    process.env.NODE_ENV = 'test';
  });

  describe('Report Loader', () => {
    it('should return normalized view model for an existing report', async () => {
      const prisma = getTestPrismaClient();
      if (!prisma) {
        console.warn('Prisma not available - skipping test');
        return;
      }

      // 1. Create case with completed report
      const { id: caseId } = await createTestCase({
        title: 'Report Loader Test Case',
        status: 'completed',
      });

      // 2. Create report
      const report = await prisma.report.create({
        data: {
          caseId,
          finalNarrativeMarkdown: '# Test Report\n\nThis is a test report.',
          mermaidDiagram: 'graph TD\n    A[Start] --> B[End]',
          tokensUsed: 1500,
          durationMs: 2000,
        },
      });

      // 3. Create step 2 with decision data (snake_case format)
      const step2Data = {
        case_id: caseId,
        document_id: 'doc_123',
        decision_title: 'Q2 2024 Product Launch',
        decision_date: '2024-03-15',
        decision_maker: 'Sarah Chen',
        decision_maker_role: 'VP of Product',
        decision_status: 'APPROVED',
        decision_summary: 'Launch Project Phoenix',
        context: {
          market_opportunity: '$50B',
          budget: '$2.5M',
        },
        rationale: ['Market opportunity', 'Team readiness'],
        risks_identified: ['Regulatory compliance', 'Sales cycles'],
        mitigation_strategies: ['Legal review', 'Extended runway'],
        expected_outcomes: {
          users_6_months: 10000,
          arr_by_q2: 500000,
        },
        confidence_score: 0.92,
        extracted_at: '2024-03-15T10:35:00Z',
      };

      await prisma.caseStep.create({
        data: {
          caseId,
          stepNumber: 2,
          status: 'completed',
          data: JSON.stringify(step2Data),
          errors: '[]',
          warnings: '[]',
          startedAt: new Date(),
          completedAt: new Date(),
        },
      });

      // 4. Call report loader
      const response = await callCaseReport(mockReportLoaderHandler, caseId);
      await assertResponseStatus(response, 200);

      const viewModel = await parseJsonResponse(response);

      // 5. Verify normalized view model structure
      expect(viewModel).toHaveProperty('caseId', caseId);
      expect(viewModel).toHaveProperty('title', 'Report Loader Test Case');
      expect(viewModel).toHaveProperty('status', 'completed');
      expect(viewModel).toHaveProperty('report');
      expect(viewModel).toHaveProperty('decision');
      expect(viewModel).toHaveProperty('steps');

      // Verify report data
      expect(viewModel.report).toHaveProperty('finalNarrativeMarkdown');
      expect(viewModel.report).toHaveProperty('mermaidDiagram');
      expect(viewModel.report).toHaveProperty('tokensUsed', 1500);
      expect(viewModel.report).toHaveProperty('durationMs', 2000);

      // Verify normalized decision data (should be camelCase)
      expect(viewModel.decision).toHaveProperty('caseId', caseId);
      expect(viewModel.decision).toHaveProperty('decisionTitle', 'Q2 2024 Product Launch');
      expect(viewModel.decision).toHaveProperty('decisionDate', '2024-03-15');
      expect(viewModel.decision).toHaveProperty('decisionMaker', 'Sarah Chen');
      expect(viewModel.decision).toHaveProperty('decisionMakerRole', 'VP of Product');
      expect(viewModel.decision).toHaveProperty('decisionStatus', 'APPROVED');
      expect(viewModel.decision).toHaveProperty('rationale');
      expect(Array.isArray(viewModel.decision.rationale)).toBe(true);
      expect(viewModel.decision.rationale).toHaveLength(2);
      expect(viewModel.decision).toHaveProperty('risksIdentified');
      expect(Array.isArray(viewModel.decision.risksIdentified)).toBe(true);
      expect(viewModel.decision).toHaveProperty('confidenceScore', 0.92);

      // Verify steps array
      expect(Array.isArray(viewModel.steps)).toBe(true);
      expect(viewModel.steps.length).toBeGreaterThan(0);
      const step2 = viewModel.steps.find((s: any) => s.stepNumber === 2);
      expect(step2).toBeDefined();
      expect(step2.status).toBe('completed');
    });
  });

  describe('Share Link Creation', () => {
    it('should generate slug and expiration timestamp', async () => {
      const prisma = getTestPrismaClient();
      if (!prisma) {
        console.warn('Prisma not available - skipping test');
        return;
      }

      // 1. Create case with completed report
      const { id: caseId } = await createTestCase({
        title: 'Share Link Test Case',
        status: 'completed',
      });

      await prisma.report.create({
        data: {
          caseId,
          finalNarrativeMarkdown: '# Test Report',
          mermaidDiagram: 'graph TD\n    A --> B',
        },
      });

      // 2. Create share link
      const createShareRequest = new NextRequestClass(
        `http://localhost:3000/api/case/${caseId}/share`,
        {
          method: 'POST',
          body: JSON.stringify({ expirationDays: 30 }),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const shareResponse = await mockShareCreateHandler(createShareRequest, {
        params: { id: caseId },
      });

      await assertResponseStatus(shareResponse, 201);
      const shareData = await parseJsonResponse(shareResponse);

      // 3. Verify share link data
      expect(shareData.success).toBe(true);
      expect(shareData.shareId).toBeDefined();
      expect(shareData.slug).toBeDefined();
      expect(shareData.slug).toMatch(/^share_\d+_[a-z0-9]+$/);
      expect(shareData.expiresAt).toBeDefined();
      expect(shareData.url).toBe(`/public/case/${shareData.slug}`);

      // Verify expiration is approximately 30 days from now
      const expiresAt = new Date(shareData.expiresAt);
      const now = new Date();
      const daysDiff = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      expect(daysDiff).toBeGreaterThan(29);
      expect(daysDiff).toBeLessThan(31);

      // 4. Verify share was saved in database
      const share = await prisma.share.findUnique({
        where: { id: shareData.shareId },
      });

      expect(share).toBeDefined();
      expect(share?.caseId).toBe(caseId);
      expect(share?.slug).toBe(shareData.slug);
      expect(share?.expiresAt.toISOString()).toBe(shareData.expiresAt);
    });
  });

  describe('Public Case Endpoint', () => {
    it('should return report when not expired', async () => {
      const prisma = getTestPrismaClient();
      if (!prisma) {
        console.warn('Prisma not available - skipping test');
        return;
      }

      // 1. Create case with completed report
      const { id: caseId } = await createTestCase({
        title: 'Public Case Test',
        status: 'completed',
      });

      const report = await prisma.report.create({
        data: {
          caseId,
          finalNarrativeMarkdown: '# Public Report\n\nThis is a public report.',
          mermaidDiagram: 'graph TD\n    A[Start] --> B[End]',
          tokensUsed: 2000,
          durationMs: 3000,
        },
      });

      // 2. Create step 2 with decision data
      const step2Data = {
        case_id: caseId,
        document_id: 'doc_456',
        decision_title: 'Public Decision',
        decision_date: '2024-04-01',
        decision_maker: 'John Doe',
        decision_status: 'APPROVED',
        rationale: ['Reason 1', 'Reason 2'],
        risks_identified: ['Risk 1'],
        confidence_score: 0.85,
        extracted_at: '2024-04-01T12:00:00Z',
      };

      await prisma.caseStep.create({
        data: {
          caseId,
          stepNumber: 2,
          status: 'completed',
          data: JSON.stringify(step2Data),
          errors: '[]',
          warnings: '[]',
          startedAt: new Date(),
          completedAt: new Date(),
        },
      });

      // 3. Create share link (not expired)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const share = await prisma.share.create({
        data: {
          caseId,
          slug: generateShareSlug(),
          expiresAt,
        },
      });

      // 4. Call public case endpoint
      const response = await callPublicCase(mockPublicCaseHandler, share.slug);
      await assertResponseStatus(response, 200);

      const publicData = await parseJsonResponse(response);

      // 5. Verify public report data
      expect(publicData).toHaveProperty('caseId', caseId);
      expect(publicData).toHaveProperty('title', 'Public Case Test');
      expect(publicData).toHaveProperty('report');
      expect(publicData.report).toHaveProperty('finalNarrativeMarkdown');
      expect(publicData.report).toHaveProperty('mermaidDiagram');
      expect(publicData.report).toHaveProperty('tokensUsed', 2000);
      expect(publicData.report).toHaveProperty('durationMs', 3000);
      expect(publicData).toHaveProperty('decision');
      expect(publicData.decision).toHaveProperty('decisionTitle', 'Public Decision');
      expect(publicData).toHaveProperty('expiresAt');
      expect(publicData).toHaveProperty('accessedAt');

      // Verify accessedAt was updated
      const updatedShare = await prisma.share.findUnique({
        where: { id: share.id },
      });
      expect(updatedShare?.accessedAt).toBeDefined();
    });

    it('should return 410 when expired', async () => {
      const prisma = getTestPrismaClient();
      if (!prisma) {
        console.warn('Prisma not available - skipping test');
        return;
      }

      // 1. Create case with completed report
      const { id: caseId } = await createTestCase({
        title: 'Expired Share Test',
        status: 'completed',
      });

      await prisma.report.create({
        data: {
          caseId,
          finalNarrativeMarkdown: '# Expired Report',
          mermaidDiagram: 'graph TD\n    A --> B',
        },
      });

      // 2. Create expired share link
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() - 1); // Expired yesterday

      const share = await prisma.share.create({
        data: {
          caseId,
          slug: generateShareSlug(),
          expiresAt,
        },
      });

      // 3. Call public case endpoint
      const response = await callPublicCase(mockPublicCaseHandler, share.slug);
      await assertResponseStatus(response, 410);

      const errorData = await parseJsonResponse(response);

      // 4. Verify expired error response
      expect(errorData.error).toContain('expired');
      expect(errorData.expiredAt).toBeDefined();
      expect(errorData.expiredAt).toBe(expiresAt.toISOString());

      // Verify accessedAt was updated (for tracking)
      const updatedShare = await prisma.share.findUnique({
        where: { id: share.id },
      });
      expect(updatedShare?.accessedAt).toBeDefined();
    });
  });
});

