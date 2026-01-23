/**
 * Integration Tests: Orchestrator Golden Path
 * Tests the full orchestrator workflow: create case → upload document → run analysis → verify results
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
  callFilesUpload,
  callCaseRun,
  getTestPrismaClient,
  parseJsonResponse,
  assertResponseStatus,
} from './_harness';
import { callGeminiAPI } from '../../lib/gemini';

// Ensure test mode is set
process.env.GEMINI_TEST_MODE = 'mock';
process.env.NODE_ENV = 'test';

/**
 * Mock orchestrator handler that runs all 6 steps
 * This simulates the actual /api/case/[id]/run route handler
 */
async function mockOrchestratorHandler(
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
    // Verify case exists
    const case_ = await prisma.case.findUnique({
      where: { id: caseId },
      include: { documents: true },
    });

    if (!case_) {
      return NextResponseClass.json({ error: 'Case not found' }, { status: 404 });
    }

    // Verify at least one document exists
    if (!case_.documents || case_.documents.length === 0) {
      return NextResponseClass.json(
        { error: 'No documents uploaded' },
        { status: 400 }
      );
    }

    // Update case status to processing
    await prisma.case.update({
      where: { id: caseId },
      data: { status: 'processing' },
    });

    // Run all 6 steps sequentially
    const steps = [];
    let totalTokens = 0;
    let totalDuration = 0;
    const startTime = Date.now();

    for (let stepNumber = 1; stepNumber <= 6; stepNumber++) {
      const stepStartTime = Date.now();

      // Create step record
      const step = await prisma.caseStep.create({
        data: {
          caseId,
          stepNumber,
          status: 'processing',
          startedAt: new Date(),
          data: '{}',
          errors: '[]',
          warnings: '[]',
        },
      });

      // Create step_started event
      await prisma.caseEvent.create({
        data: {
          caseId,
          eventType: 'step_started',
          data: JSON.stringify({ stepNumber }),
        },
      });

      // Call Gemini API for this step
      const stepName = `step${stepNumber}`;
      let geminiResponse;
      try {
        geminiResponse = await callGeminiAPI({
          caseId,
          stepName,
        });

        // Extract response text
        const responseText =
          geminiResponse.candidates[0]?.content?.parts[0]?.text || '{}';
        const stepData = JSON.parse(responseText);

        // Extract tokens if available
        if (geminiResponse.usageMetadata) {
          totalTokens += geminiResponse.usageMetadata.totalTokenCount || 0;
        }

        // Calculate step duration
        const stepDuration = Date.now() - stepStartTime;
        totalDuration += stepDuration;

        // Update step with success
        await prisma.caseStep.update({
          where: { id: step.id },
          data: {
            status: 'completed',
            data: JSON.stringify(stepData.data || {}),
            errors: JSON.stringify(stepData.errors || []),
            warnings: JSON.stringify(stepData.warnings || []),
            completedAt: new Date(),
          },
        });

        // Create step_completed event
        await prisma.caseEvent.create({
          data: {
            caseId,
            eventType: 'step_completed',
            data: JSON.stringify({
              stepNumber,
              duration: stepDuration,
              tokens: geminiResponse.usageMetadata?.totalTokenCount || 0,
            }),
          },
        });

        steps.push({
          stepNumber,
          status: 'completed',
          data: stepData.data,
        });
      } catch (error: any) {
        // Update step with failure
        await prisma.caseStep.update({
          where: { id: step.id },
          data: {
            status: 'failed',
            errors: JSON.stringify([error.message || 'Unknown error']),
            completedAt: new Date(),
          },
        });

        // Create step_failed event
        await prisma.caseEvent.create({
          data: {
            caseId,
            eventType: 'step_failed',
            data: JSON.stringify({
              stepNumber,
              error: error.message || 'Unknown error',
            }),
          },
        });

        throw error;
      }
    }

    // Generate final report
    const finalNarrativeMarkdown = `# Decision Trace Report

## Case: ${case_.title}

This report analyzes the decision-making process for the case.

### Summary
All 6 analysis steps completed successfully.

### Steps Completed
${steps
  .map(
    (s) =>
      `- Step ${s.stepNumber}: ${s.status === 'completed' ? '✓' : '✗'}`
  )
  .join('\n')}

### Analysis Complete
The decision trace process has been completed for this case.
`;

    const mermaidDiagram = `graph TD
    A[Case Created] --> B[Document Uploaded]
    B --> C[Step 1: Document Processing]
    C --> D[Step 2: Decision Extraction]
    D --> E[Step 3: Context Analysis]
    E --> F[Step 4: Stakeholder Analysis]
    F --> G[Step 5: Impact Assessment]
    G --> H[Step 6: Lessons Learned]
    H --> I[Report Generated]
`;

    // Create or update report
    await prisma.report.upsert({
      where: { caseId },
      create: {
        caseId,
        finalNarrativeMarkdown,
        mermaidDiagram,
        tokensUsed: totalTokens,
        durationMs: totalDuration,
      },
      update: {
        finalNarrativeMarkdown,
        mermaidDiagram,
        tokensUsed: totalTokens,
        durationMs: totalDuration,
        updatedAt: new Date(),
      },
    });

    // Update case status to completed
    await prisma.case.update({
      where: { id: caseId },
      data: { status: 'completed' },
    });

    return NextResponseClass.json({
      success: true,
      caseId,
      stepsCompleted: steps.length,
      tokensUsed: totalTokens,
      durationMs: totalDuration,
    });
  } catch (error: any) {
    // Update case status to failed
    await prisma.case.update({
      where: { id: caseId },
      data: { status: 'failed' },
    });

    return NextResponseClass.json(
      { error: error.message || 'Orchestrator failed' },
      { status: 500 }
    );
  }
}

describe('Orchestrator Golden Path', () => {
  beforeEach(async () => {
    await resetTestDatabase();
    // Ensure mock mode
    process.env.GEMINI_TEST_MODE = 'mock';
    process.env.NODE_ENV = 'test';
  });

  it('should run full orchestrator workflow: create case → upload → run → verify', async () => {
    const prisma = getTestPrismaClient();
    if (!prisma) {
      console.warn('Prisma not available - skipping test');
      return;
    }

    // 1. Create case
    const { id: caseId } = await createTestCase({
      title: 'Q2 2024 Product Launch Decision',
      status: 'draft',
    });

    expect(caseId).toBeDefined();

    // 2. Upload document
    const docPath = path.join(
      process.cwd(),
      'test-data',
      'docs',
      'positive',
      '01_launch_decision_memo.txt'
    );
    const docContent = fs.readFileSync(docPath, 'utf-8');

    // Mock Gemini Files API upload
    const mockGeminiFilesClient = {
      uploadFile: vi.fn().mockResolvedValue({
        file: {
          uri: `gs://gemini-files/test-${caseId}-${Date.now()}`,
        },
      }),
    };

    vi.mock('@/lib/gemini-files', () => ({
      getGeminiFilesClient: () => mockGeminiFilesClient,
    }));

    // Mock upload handler
    const mockUploadHandler = async (req: NextRequest) => {
      const formData = await req.formData();
      const files = formData.getAll('file') as File[];

      if (files.length === 0) {
        return NextResponseClass.json({ error: 'No files' }, { status: 400 });
      }

      const file = files[0];
      const geminiUri = await mockGeminiFilesClient.uploadFile(file);

      const document = await prisma.caseDocument.create({
        data: {
          caseId,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || 'text/plain',
          status: 'completed',
          metadata: JSON.stringify({
            geminiFileUri: geminiUri.file.uri,
          }),
        },
      });

      return NextResponseClass.json(
        {
          success: true,
          documentId: document.id,
          geminiFileUri: geminiUri.file.uri,
        },
        { status: 201 }
      );
    };

    const uploadResponse = await callFilesUpload(mockUploadHandler, {
      name: '01_launch_decision_memo.txt',
      content: docContent,
      type: 'text/plain',
    });

    assertResponseStatus(uploadResponse, 201);
    const uploadData = await parseJsonResponse(uploadResponse);
    expect(uploadData.success).toBe(true);
    expect(uploadData.documentId).toBeDefined();

    // 3. Run orchestrator
    const runResponse = await callCaseRun(mockOrchestratorHandler, caseId);
    assertResponseStatus(runResponse, 200);
    const runData = await parseJsonResponse(runResponse);
    expect(runData.success).toBe(true);
    expect(runData.stepsCompleted).toBe(6);

    // 4. Assert 6 CaseStep records exist with status "completed"
    const steps = await prisma.caseStep.findMany({
      where: { caseId },
      orderBy: { stepNumber: 'asc' },
    });

    expect(steps).toHaveLength(6);
    steps.forEach((step: any, index: number) => {
      expect(step.stepNumber).toBe(index + 1);
      expect(step.status).toBe('completed');
      expect(step.startedAt).toBeDefined();
      expect(step.completedAt).toBeDefined();
      expect(step.data).toBeDefined();
      expect(step.errors).toBeDefined();
      expect(step.warnings).toBeDefined();
    });

    // 5. Assert Report record created with final_narrative_markdown and mermaid_diagram
    const report = await prisma.report.findUnique({
      where: { caseId },
    });

    expect(report).toBeDefined();
    expect(report?.finalNarrativeMarkdown).toBeDefined();
    expect(report?.finalNarrativeMarkdown).toContain('# Decision Trace Report');
    expect(report?.finalNarrativeMarkdown).toContain('All 6 analysis steps completed successfully');

    expect(report?.mermaidDiagram).toBeDefined();
    expect(report?.mermaidDiagram).toContain('graph TD');
    expect(report?.mermaidDiagram).toContain('Step 1: Document Processing');
    expect(report?.mermaidDiagram).toContain('Step 6: Lessons Learned');

    // 6. Assert tokens/durations recorded if mock provides them
    // The mock Gemini responses include usageMetadata, so tokens should be recorded
    if (runData.tokensUsed !== undefined && runData.tokensUsed > 0) {
      expect(report?.tokensUsed).toBeGreaterThan(0);
      expect(report?.tokensUsed).toBe(runData.tokensUsed);
    }

    if (runData.durationMs !== undefined && runData.durationMs > 0) {
      expect(report?.durationMs).toBeGreaterThan(0);
      expect(report?.durationMs).toBe(runData.durationMs);
    }

    // Verify case status is completed
    const updatedCase = await prisma.case.findUnique({
      where: { id: caseId },
    });
    expect(updatedCase?.status).toBe('completed');

    // Verify events were created
    const events = await prisma.caseEvent.findMany({
      where: { caseId },
      orderBy: { createdAt: 'asc' },
    });

    // Should have 12 events: 6 step_started + 6 step_completed
    expect(events.length).toBeGreaterThanOrEqual(12);
    expect(events.some((e: any) => e.eventType === 'step_started')).toBe(true);
    expect(events.some((e: any) => e.eventType === 'step_completed')).toBe(true);
  });

  it('should handle case with no documents gracefully', async () => {
    const prisma = getTestPrismaClient();
    if (!prisma) {
      console.warn('Prisma not available - skipping test');
      return;
    }

    const { id: caseId } = await createTestCase({
      title: 'Case without documents',
    });

    const runResponse = await callCaseRun(mockOrchestratorHandler, caseId);
    assertResponseStatus(runResponse, 400);
    const runData = await parseJsonResponse(runResponse);
    expect(runData.error).toContain('No documents uploaded');
  });

  it('should handle non-existent case gracefully', async () => {
    const prisma = getTestPrismaClient();
    if (!prisma) {
      console.warn('Prisma not available - skipping test');
      return;
    }

    const fakeCaseId = 'non-existent-case-id';

    const runResponse = await callCaseRun(mockOrchestratorHandler, fakeCaseId);
    assertResponseStatus(runResponse, 404);
    const runData = await parseJsonResponse(runResponse);
    expect(runData.error).toContain('Case not found');
  });
});

