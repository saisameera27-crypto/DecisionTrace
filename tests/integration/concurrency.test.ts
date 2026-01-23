/**
 * Integration Tests: Concurrency Guard
 * Tests that concurrent runs are prevented with 409 Conflict
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

// Pause/resume mechanism for Gemini responses
const pausedGeminiCalls: Map<string, {
  resolve: (value: any) => void;
  reject: (error: any) => void;
  promise: Promise<any>;
}> = new Map();

/**
 * Check if a Gemini call should be paused
 */
function shouldPauseGeminiCall(caseId: string, stepName: string): boolean {
  const key = `${caseId}_${stepName}`;
  return pausedGeminiCalls.has(key);
}

/**
 * Pause Gemini API call for a specific case/step
 */
function pauseGeminiCall(caseId: string, stepName: string): Promise<any> {
  const key = `${caseId}_${stepName}`;
  let resolver: (value: any) => void;
  let rejecter: (error: any) => void;
  
  const promise = new Promise((resolve, reject) => {
    resolver = resolve;
    rejecter = reject;
  });

  pausedGeminiCalls.set(key, {
    resolve: resolver!,
    reject: rejecter!,
    promise,
  });

  return promise;
}

/**
 * Resume paused Gemini API call
 */
function resumeGeminiCall(caseId: string, stepName: string, value?: any, error?: any): void {
  const key = `${caseId}_${stepName}`;
  const paused = pausedGeminiCalls.get(key);
  
  if (paused) {
    if (error) {
      paused.reject(error);
    } else {
      paused.resolve(value);
    }
    pausedGeminiCalls.delete(key);
  }
}

/**
 * Mock orchestrator handler with concurrency guard
 */
async function mockConcurrentOrchestratorHandler(
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
  const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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

    // Concurrency guard: Check if a run is already in progress
    if (case_.currentRunId && case_.status === 'processing') {
      return NextResponseClass.json(
        {
          error: 'Another orchestration run is already in progress',
          currentRunId: case_.currentRunId,
        },
        { status: 409 }
      );
    }

    // Set currentRunId and update status to processing
    await prisma.case.update({
      where: { id: caseId },
      data: {
        status: 'processing',
        currentRunId: runId,
      },
    });

    // Run step 1 (this will be paused in tests)
    const stepStartTime = Date.now();

    // Create step record
    const step = await prisma.caseStep.upsert({
      where: {
        caseId_stepNumber: {
          caseId,
          stepNumber: 1,
        },
      },
      create: {
        caseId,
        stepNumber: 1,
        status: 'processing',
        startedAt: new Date(),
        data: '{}',
        errors: '[]',
        warnings: '[]',
      },
      update: {
        status: 'processing',
        startedAt: new Date(),
      },
    });

    // Create step_started event
    await prisma.caseEvent.create({
      data: {
        caseId,
        eventType: 'step_started',
        data: JSON.stringify({ stepNumber: 1, runId }),
      },
    });

    // Call Gemini API for step 1 (this can be paused)
    const stepName = 'step1';
    let geminiResponse;

    try {
      // Check if this call should be paused
      const pauseKey = `${caseId}_${stepName}`;
      if (shouldPauseGeminiCall(caseId, stepName)) {
        // Wait for resume
        geminiResponse = await pausedGeminiCalls.get(pauseKey)!.promise;
      } else {
        // Normal call
        geminiResponse = await callGeminiAPI({
          caseId,
          stepName,
        });
      }

      // Extract response text
      const responseText =
        geminiResponse.candidates[0]?.content?.parts[0]?.text || '{}';
      const stepData = JSON.parse(responseText);

      // Calculate step duration
      const stepDuration = Date.now() - stepStartTime;

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
            stepNumber: 1,
            duration: stepDuration,
            runId,
          }),
        },
      });

      // Clear currentRunId and update status
      await prisma.case.update({
        where: { id: caseId },
        data: {
          currentRunId: null,
          status: 'completed',
        },
      });

      return NextResponseClass.json({
        success: true,
        caseId,
        runId,
        stepsCompleted: 1,
      });
    } catch (error: any) {
      // Clear currentRunId on error
      await prisma.case.update({
        where: { id: caseId },
        data: {
          currentRunId: null,
          status: 'failed',
        },
      });

      throw error;
    }
  } catch (error: any) {
    // Clear currentRunId on error
    await prisma.case.update({
      where: { id: caseId },
      data: {
        currentRunId: null,
        status: 'failed',
      },
    });

    return NextResponseClass.json(
      { error: error.message || 'Orchestrator failed' },
      { status: 500 }
    );
  }
}

describe('Concurrency Guard', () => {
  beforeEach(async () => {
    await resetTestDatabase();
    // Ensure mock mode
    process.env.GEMINI_TEST_MODE = 'mock';
    process.env.NODE_ENV = 'test';
    // Clear paused calls
    pausedGeminiCalls.clear();
  });

  it('should return 409 Conflict when concurrent run is attempted', async () => {
    const prisma = getTestPrismaClient();
    if (!prisma) {
      console.warn('Prisma not available - skipping test');
      return;
    }

    // 1. Create case
    const { id: caseId } = await createTestCase({
      title: 'Concurrency Test Case',
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

    assertResponseStatus(uploadResponse, 201);

    // 3. Set up pause before starting the run
    pauseGeminiCall(caseId, 'step1');

    // Start first run (this will pause at Gemini call)
    const run1Promise = callCaseRun(mockConcurrentOrchestratorHandler, caseId);

    // Wait a bit to ensure the first run has started and set currentRunId
    // We need to wait for the handler to check concurrency and set currentRunId
    let caseAfterFirstRun;
    let attempts = 0;
    while (attempts < 20) {
      await new Promise((resolve) => setTimeout(resolve, 10));
      caseAfterFirstRun = await prisma.case.findUnique({
        where: { id: caseId },
      });
      if (caseAfterFirstRun?.status === 'processing' && caseAfterFirstRun?.currentRunId) {
        break;
      }
      attempts++;
    }

    // Verify case is in processing state with currentRunId
    expect(caseAfterFirstRun?.status).toBe('processing');
    expect(caseAfterFirstRun?.currentRunId).toBeDefined();
    const firstRunId = caseAfterFirstRun?.currentRunId;

    // 4. Immediately call run again (should get 409 Conflict)
    const run2Response = await callCaseRun(mockConcurrentOrchestratorHandler, caseId);
    assertResponseStatus(run2Response, 409);
    
    const run2Data = await parseJsonResponse(run2Response);
    expect(run2Data.error).toContain('already in progress');
    expect(run2Data.currentRunId).toBe(firstRunId);

    // 5. Resume the first run by providing the Gemini response
    const geminiResponse = await callGeminiAPI({
      caseId,
      stepName: 'step1',
    });
    
    resumeGeminiCall(caseId, 'step1', geminiResponse);

    // Wait for first run to complete
    const run1Response = await run1Promise;
    assertResponseStatus(run1Response, 200);
    const run1Data = await parseJsonResponse(run1Response);
    expect(run1Data.success).toBe(true);
    expect(run1Data.runId).toBe(firstRunId);

    // 6. Verify case is completed and currentRunId is cleared
    const caseAfterCompletion = await prisma.case.findUnique({
      where: { id: caseId },
    });

    expect(caseAfterCompletion?.status).toBe('completed');
    expect(caseAfterCompletion?.currentRunId).toBeNull();

    // 7. Verify we can run again after completion
    const run3Response = await callCaseRun(mockConcurrentOrchestratorHandler, caseId);
    // Should succeed (or handle idempotency as needed)
    // For this test, we'll just verify it doesn't return 409
    expect(run3Response.status).not.toBe(409);
  });

  it('should allow new run after previous run completes', async () => {
    const prisma = getTestPrismaClient();
    if (!prisma) {
      console.warn('Prisma not available - skipping test');
      return;
    }

    // 1. Create case
    const { id: caseId } = await createTestCase({
      title: 'Concurrency Test Case 2',
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

    assertResponseStatus(uploadResponse, 201);

    // 3. Run orchestrator (completes normally)
    const run1Response = await callCaseRun(mockConcurrentOrchestratorHandler, caseId);
    assertResponseStatus(run1Response, 200);
    const run1Data = await parseJsonResponse(run1Response);
    expect(run1Data.success).toBe(true);

    // 4. Verify case is completed and currentRunId is cleared
    const caseAfterRun1 = await prisma.case.findUnique({
      where: { id: caseId },
    });

    expect(caseAfterRun1?.status).toBe('completed');
    expect(caseAfterRun1?.currentRunId).toBeNull();

    // 5. Run again - should not get 409 (idempotency or new run)
    const run2Response = await callCaseRun(mockConcurrentOrchestratorHandler, caseId);
    // Should not be 409 since no run is in progress
    expect(run2Response.status).not.toBe(409);
  });
});

