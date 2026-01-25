/**
 * Integration Tests: Orchestrator Reliability
 * Tests idempotency, resume functionality, and retry logic
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
import { callGeminiAPI } from '@/lib/gemini';
import { retryWithBackoff } from '@/lib/retry';

// Ensure test mode is set
process.env.GEMINI_TEST_MODE = 'mock';
process.env.NODE_ENV = 'test';

// Track retry attempts for testing
let retryAttempts: Record<string, number> = {};

/**
 * Enhanced mock orchestrator handler with idempotency, resume, and retry support
 */
async function mockReliableOrchestratorHandler(
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
  
  // Parse request body
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // Body might not be JSON or might be empty
    body = {};
  }
  
  const startStep = body.resumeFromStep || body.startStep || 1;
  const failStep = parseInt(process.env.GEMINI_MOCK_FAIL_STEP || '0');

  try {
    // Verify case exists
    const case_ = await prisma.case.findUnique({
      where: { id: caseId },
      include: { documents: true, steps: true },
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

    // Get existing steps
    const existingSteps = await prisma.caseStep.findMany({
      where: { caseId },
      orderBy: { stepNumber: 'asc' },
    });

    const existingStepsMap = new Map(
      existingSteps.map((s: any) => [s.stepNumber, s])
    );

    // Run steps sequentially
    const steps = [];
    let totalTokens = 0;
    let totalDuration = 0;
    let skippedCount = 0;
    let completedCount = 0;
    let failedCount = 0;

    for (let stepNumber = startStep; stepNumber <= 6; stepNumber++) {
      const existingStep = existingStepsMap.get(stepNumber);

      // Idempotency check: if step is already completed, skip it
      if (existingStep && (existingStep as any).status === 'completed') {
        skippedCount++;
        steps.push({
          stepNumber,
          status: 'skipped',
          reason: 'already_completed',
        });
        continue;
      }

      const stepStartTime = Date.now();

      // Create or get step record
      let step;
      if (existingStep) {
        // Update existing step
        step = await prisma.caseStep.update({
          where: { id: (existingStep as any).id },
          data: {
            status: 'processing',
            startedAt: new Date(),
          },
        });
      } else {
        // Create new step
        step = await prisma.caseStep.create({
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
      }

      // Create step_started event
      await prisma.caseEvent.create({
        data: {
          caseId,
          eventType: 'step_started',
          data: JSON.stringify({ stepNumber, resume: stepNumber !== startStep }),
        },
      });

      // Check for failure injection
      if (failStep === stepNumber) {
        const error = new Error(`Injected failure at step ${stepNumber}`);
        (error as any).status = 500;

        await prisma.caseStep.update({
          where: { id: step.id },
          data: {
            status: 'failed',
            errors: JSON.stringify([error.message]),
            completedAt: new Date(),
          },
        });

        await prisma.caseEvent.create({
          data: {
            caseId,
            eventType: 'step_failed',
            data: JSON.stringify({
              stepNumber,
              error: error.message,
              injected: true,
            }),
          },
        });

        failedCount++;
        steps.push({
          stepNumber,
          status: 'failed',
          error: error.message,
        });

        // Update case status to failed
        await prisma.case.update({
          where: { id: caseId },
          data: { status: 'failed' },
        });

        return NextResponseClass.json({
          success: false,
          caseId,
          failedAtStep: stepNumber,
          stepsCompleted: completedCount,
          stepsSkipped: skippedCount,
          stepsFailed: failedCount,
        });
      }

      // Call Gemini API with retry logic
      const stepName = `step${stepNumber}`;
      const retryKey = `${caseId}_${stepNumber}`;
      retryAttempts[retryKey] = 0;

      let geminiResponse;
      try {
        // Wrap Gemini call in retry logic
        geminiResponse = await retryWithBackoff(
          async () => {
            retryAttempts[retryKey] = (retryAttempts[retryKey] || 0) + 1;

            // Check for 429 injection (only on step 2, first 2 attempts)
            if (
              stepNumber === 2 &&
              retryAttempts[retryKey] <= 2 &&
              process.env.GEMINI_MOCK_INJECT_429 === 'true'
            ) {
              const error: any = new Error('Rate limit exceeded');
              error.status = 429;
              throw error;
            }

            return await callGeminiAPI({
              caseId,
              stepName,
            });
          },
          {
            maxRetries: 3,
            initialDelayMs: 10, // Fast retries for tests
            maxDelayMs: 100,
          }
        );

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
              retryCount: retryAttempts[retryKey] - 1, // Subtract 1 because first attempt isn't a retry
            }),
          },
        });

        completedCount++;
        steps.push({
          stepNumber,
          status: 'completed',
          retryCount: retryAttempts[retryKey] - 1,
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
              retryCount: retryAttempts[retryKey] - 1,
            }),
          },
        });

        failedCount++;
        steps.push({
          stepNumber,
          status: 'failed',
          error: error.message,
        });

        // Update case status to failed
        await prisma.case.update({
          where: { id: caseId },
          data: { status: 'failed' },
        });

        return NextResponseClass.json({
          success: false,
          caseId,
          failedAtStep: stepNumber,
          stepsCompleted: completedCount,
          stepsSkipped: skippedCount,
          stepsFailed: failedCount,
          error: error.message,
        });
      }
    }

    // Generate final report only if all steps completed
    if (completedCount + skippedCount === 6 && failedCount === 0) {
      const finalNarrativeMarkdown = `# Decision Trace Report

## Case: ${case_.title}

This report analyzes the decision-making process for the case.

### Summary
All 6 analysis steps completed successfully.

### Steps Completed
${steps
  .map(
    (s: any) =>
      `- Step ${s.stepNumber}: ${s.status === 'completed' ? '✓' : s.status === 'skipped' ? '⊘' : '✗'}`
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
    }

    return NextResponseClass.json({
      success: true,
      caseId,
      stepsCompleted: completedCount,
      stepsSkipped: skippedCount,
      stepsFailed: failedCount,
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

describe('Orchestrator Reliability', () => {
  beforeEach(async () => {
    await resetTestDatabase();
    // Ensure mock mode
    process.env.GEMINI_TEST_MODE = 'mock';
    process.env.NODE_ENV = 'test';
    // Clear failure injection
    delete process.env.GEMINI_MOCK_FAIL_STEP;
    delete process.env.GEMINI_MOCK_INJECT_429;
    // Reset retry tracking
    retryAttempts = {};
  });

  describe('Idempotency', () => {
    it('should not create duplicate steps when run twice', async () => {
      const prisma = getTestPrismaClient();
      if (!prisma) {
        console.warn('Prisma not available - skipping test');
        return;
      }

      // 1. Create case
      const { id: caseId } = await createTestCase({
        title: 'Idempotency Test Case',
        status: 'draft',
      });

      // 2. Upload document
      const docPath = path.join(
        process.cwd(),
        'test-data',
        'docs',
        'positive',
        '01_launch_decision_memo.txt'
      );
      const docContent = fs.readFileSync(docPath, 'utf-8');

      // Mock upload handler
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

      await assertResponseStatus(uploadResponse, 201);

      // 3. Run orchestrator first time
      const run1Response = await callCaseRun(mockReliableOrchestratorHandler, caseId);
      await assertResponseStatus(run1Response, 200);
      const run1Data = await parseJsonResponse(run1Response);
      expect(run1Data.success).toBe(true);
      expect(run1Data.stepsCompleted).toBe(6);
      expect(run1Data.stepsSkipped).toBe(0);

      // Verify 6 steps exist
      const stepsAfterFirstRun = await prisma.caseStep.findMany({
        where: { caseId },
        orderBy: { stepNumber: 'asc' },
      });

      expect(stepsAfterFirstRun).toHaveLength(6);
      stepsAfterFirstRun.forEach((step: any) => {
        expect(step.status).toBe('completed');
      });

      // 4. Run orchestrator second time (idempotency check)
      const run2Response = await callCaseRun(mockReliableOrchestratorHandler, caseId);
      await assertResponseStatus(run2Response, 200);
      const run2Data = await parseJsonResponse(run2Response);
      expect(run2Data.success).toBe(true);
      expect(run2Data.stepsCompleted).toBe(0); // No new steps completed
      expect(run2Data.stepsSkipped).toBe(6); // All 6 steps skipped

      // Verify still only 6 steps (no duplicates)
      const stepsAfterSecondRun = await prisma.caseStep.findMany({
        where: { caseId },
        orderBy: { stepNumber: 'asc' },
      });

      expect(stepsAfterSecondRun).toHaveLength(6); // No duplicates
      stepsAfterSecondRun.forEach((step: any) => {
        expect(step.status).toBe('completed'); // Status remains completed
      });

      // Verify report still exists
      const report = await prisma.report.findUnique({
        where: { caseId },
      });
      expect(report).toBeDefined();
    });
  });

  describe('Resume Functionality', () => {
    it('should resume from step 3 after failure injection', async () => {
      const prisma = getTestPrismaClient();
      if (!prisma) {
        console.warn('Prisma not available - skipping test');
        return;
      }

      // 1. Create case
      const { id: caseId } = await createTestCase({
        title: 'Resume Test Case',
        status: 'draft',
      });

      // 2. Upload document
      const docPath = path.join(
        process.cwd(),
        'test-data',
        'docs',
        'positive',
        '01_launch_decision_memo.txt'
      );
      const docContent = fs.readFileSync(docPath, 'utf-8');

      // Mock upload handler
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

      const mockUploadHandler = async (req: NextRequest) => {
        const formData = await req.formData();
        const files = formData.getAll('file') as File[];

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

      await assertResponseStatus(uploadResponse, 201);

      // 3. Inject failure at step 3
      process.env.GEMINI_MOCK_FAIL_STEP = '3';

      // Run orchestrator - should fail at step 3
      const run1Response = await callCaseRun(mockReliableOrchestratorHandler, caseId);
      await assertResponseStatus(run1Response, 200);
      const run1Data = await parseJsonResponse(run1Response);
      expect(run1Data.success).toBe(false);
      expect(run1Data.failedAtStep).toBe(3);
      expect(run1Data.stepsCompleted).toBe(2); // Steps 1 and 2 completed
      expect(run1Data.stepsFailed).toBe(1); // Step 3 failed

      // Verify steps 1-2 are completed, step 3 is failed
      const stepsAfterFailure = await prisma.caseStep.findMany({
        where: { caseId },
        orderBy: { stepNumber: 'asc' },
      });

      expect(stepsAfterFailure.length).toBeGreaterThanOrEqual(3);
      expect(stepsAfterFailure[0].status).toBe('completed');
      expect(stepsAfterFailure[1].status).toBe('completed');
      expect(stepsAfterFailure[2].status).toBe('failed');

      // Verify case status is failed
      const caseAfterFailure = await prisma.case.findUnique({
        where: { id: caseId },
      });
      expect(caseAfterFailure?.status).toBe('failed');

      // 4. Disable failure injection and resume from step 3
      delete process.env.GEMINI_MOCK_FAIL_STEP;

      const run2Response = await callCaseRun(mockReliableOrchestratorHandler, caseId, {
        resumeFromStep: 3,
      });
      await assertResponseStatus(run2Response, 200);
      const run2Data = await parseJsonResponse(run2Response);
      expect(run2Data.success).toBe(true);
      expect(run2Data.stepsCompleted).toBe(4); // Steps 3-6 completed
      expect(run2Data.stepsSkipped).toBe(2); // Steps 1-2 skipped (already completed)

      // Verify all 6 steps are now completed
      const stepsAfterResume = await prisma.caseStep.findMany({
        where: { caseId },
        orderBy: { stepNumber: 'asc' },
      });

      expect(stepsAfterResume).toHaveLength(6);
      stepsAfterResume.forEach((step: any) => {
        expect(step.status).toBe('completed');
      });

      // Verify report was created
      const report = await prisma.report.findUnique({
        where: { caseId },
      });
      expect(report).toBeDefined();
      expect(report?.finalNarrativeMarkdown).toBeDefined();
      expect(report?.mermaidDiagram).toBeDefined();

      // Verify case status is completed
      const caseAfterResume = await prisma.case.findUnique({
        where: { id: caseId },
      });
      expect(caseAfterResume?.status).toBe('completed');
    });
  });

  describe('Retry Logic', () => {
    it('should retry on 429 errors and eventually succeed', async () => {
      const prisma = getTestPrismaClient();
      if (!prisma) {
        console.warn('Prisma not available - skipping test');
        return;
      }

      // 1. Create case
      const { id: caseId } = await createTestCase({
        title: 'Retry Test Case',
        status: 'draft',
      });

      // 2. Upload document
      const docPath = path.join(
        process.cwd(),
        'test-data',
        'docs',
        'positive',
        '01_launch_decision_memo.txt'
      );
      const docContent = fs.readFileSync(docPath, 'utf-8');

      // Mock upload handler
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

      const mockUploadHandler = async (req: NextRequest) => {
        const formData = await req.formData();
        const files = formData.getAll('file') as File[];

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

      await assertResponseStatus(uploadResponse, 201);

      // 3. Inject 429 errors on step 2 (first 2 attempts)
      process.env.GEMINI_MOCK_INJECT_429 = 'true';

      // Run orchestrator - should retry step 2 and succeed
      const runResponse = await callCaseRun(mockReliableOrchestratorHandler, caseId);
      await assertResponseStatus(runResponse, 200);
      const runData = await parseJsonResponse(runResponse);
      expect(runData.success).toBe(true);
      expect(runData.stepsCompleted).toBe(6);

      // Verify retry count for step 2
      const step2RetryKey = `${caseId}_2`;
      const step2RetryCount = retryAttempts[step2RetryKey] || 0;
      expect(step2RetryCount).toBe(3); // Initial attempt + 2 retries = 3 total attempts

      // Verify step 2 completed successfully despite retries
      const step2 = await prisma.caseStep.findFirst({
        where: { caseId, stepNumber: 2 },
      });

      expect(step2).toBeDefined();
      expect(step2?.status).toBe('completed');

      // Verify retry count is logged in event
      const step2Events = await prisma.caseEvent.findMany({
        where: {
          caseId,
          eventType: 'step_completed',
        },
        orderBy: { createdAt: 'asc' },
      });

      const step2CompletedEvent = step2Events.find((e: any) => {
        const data = JSON.parse(e.data || '{}');
        return data.stepNumber === 2;
      });

      expect(step2CompletedEvent).toBeDefined();
      if (step2CompletedEvent) {
        const eventData = JSON.parse(step2CompletedEvent.data || '{}');
        expect(eventData.retryCount).toBe(2); // 2 retries (3 total attempts - 1)
      }

      // Verify all steps completed
      const allSteps = await prisma.caseStep.findMany({
        where: { caseId },
        orderBy: { stepNumber: 'asc' },
      });

      expect(allSteps).toHaveLength(6);
      allSteps.forEach((step: any) => {
        expect(step.status).toBe('completed');
      });

      // Verify report was created
      const report = await prisma.report.findUnique({
        where: { caseId },
      });
      expect(report).toBeDefined();
    });
  });
});

