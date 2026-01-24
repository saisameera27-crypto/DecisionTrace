/**
 * Example Integration Test
 * Demonstrates how to use the integration test harness
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import {
  setupIntegrationTests,
  teardownIntegrationTests,
  resetTestDatabase,
  createTestCase,
  callFilesUpload,
  callCaseRun,
  callCaseReport,
  callCaseEvents,
  callPublicCase,
  parseJsonResponse,
  assertResponseStatus,
  validateStreamResponse,
  getTestPrismaClient,
} from './_harness';

// Mock route handlers (replace with actual imports when routes exist)
const mockFilesUploadHandler = async (req: any) => {
  const body = await req.json();
  return new Response(JSON.stringify({
    documentId: 'doc_123',
    fileName: body.fileName,
  }), { status: 201 });
};

const mockCaseRunHandler = async (req: any, context: any) => {
  return new Response(JSON.stringify({
    caseId: context.params.id,
    status: 'processing',
  }), { status: 200 });
};

const mockCaseReportHandler = async (req: any, context: any) => {
  return new Response(JSON.stringify({
    caseId: context.params.id,
    report: { summary: 'Test report' },
  }), { status: 200 });
};

const mockCaseEventsHandler = async (req: any, context: any) => {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('event: test\n'));
      controller.close();
    },
  });
  
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' },
  });
};

const mockPublicCaseHandler = async (req: any, context: any) => {
  return new Response(JSON.stringify({
    slug: context.params.slug,
    public: true,
  }), { status: 200 });
};

describe('Integration Test Harness Examples', () => {
  beforeAll(async () => {
    await setupIntegrationTests();
  });

  afterAll(async () => {
    await teardownIntegrationTests();
  });

  beforeEach(async () => {
    await resetTestDatabase();
  });

  describe('Database Helpers', () => {
    it('should create a test case', async () => {
      const { id, slug } = await createTestCase({
        title: 'Test Decision Case',
        status: 'draft',
      });

      expect(id).toBeDefined();
      expect(slug).toBeDefined();
      expect(slug).toContain('test-case');
    });

    it('should reset database before each test', async () => {
      // Create a case
      await createTestCase();
      
      // Reset should clear it
      await resetTestDatabase();
      
      const client = getTestPrismaClient();
      if (!client) {
        // Skip test if Prisma is not available (e.g., SQLite with Postgres schema)
        console.warn('Prisma not available, skipping database test');
        return;
      }
      
      const count = await client.case.count();
      expect(count).toBe(0);
    });
  });

  describe('Route Handler Helpers', () => {
    it('should call files upload handler', async () => {
      const response = await callFilesUpload(mockFilesUploadHandler, {
        name: 'test-document.txt',
        content: 'Test file content',
        type: 'text/plain',
      });

      assertResponseStatus(response, 201);
      const data = await parseJsonResponse(response);
      expect(data).toHaveProperty('documentId');
      expect(data.fileName).toBe('test-document.txt');
    });

    it('should call case run handler', async () => {
      const { id } = await createTestCase();
      
      const response = await callCaseRun(mockCaseRunHandler, id, {
        resumeFromStep: 4,
      });

      assertResponseStatus(response, 200);
      const data = await parseJsonResponse(response);
      expect(data.caseId).toBe(id);
      expect(data.status).toBe('processing');
    });

    it('should call case report handler', async () => {
      const { id } = await createTestCase();
      
      const response = await callCaseReport(mockCaseReportHandler, id);

      assertResponseStatus(response, 200);
      const data = await parseJsonResponse(response);
      expect(data.caseId).toBe(id);
      expect(data.report).toBeDefined();
    });

    it('should call case events handler and validate stream', async () => {
      const { id } = await createTestCase();
      
      const { response, stream } = await callCaseEvents(mockCaseEventsHandler, id);

      assertResponseStatus(response, 200);
      const isValidStream = await validateStreamResponse(stream);
      expect(isValidStream).toBe(true);
    });

    it('should call public case handler', async () => {
      const { slug } = await createTestCase({
        slug: 'public-test-case',
      });
      
      const response = await callPublicCase(mockPublicCaseHandler, slug);

      assertResponseStatus(response, 200);
      const data = await parseJsonResponse(response);
      expect(data.slug).toBe('public-test-case');
      expect(data.public).toBe(true);
    });
  });

  describe('End-to-End Workflow', () => {
    it('should complete full case workflow', async () => {
      // 1. Create case
      const { id, slug } = await createTestCase({
        title: 'Full Workflow Test',
      });

      // 2. Upload file
      const uploadResponse = await callFilesUpload(mockFilesUploadHandler, {
        name: 'workflow-doc.txt',
        content: 'Workflow test content',
      });
      assertResponseStatus(uploadResponse, 201);

      // 3. Run case analysis
      const runResponse = await callCaseRun(mockCaseRunHandler, id);
      assertResponseStatus(runResponse, 200);

      // 4. Get report
      const reportResponse = await callCaseReport(mockCaseReportHandler, id);
      assertResponseStatus(reportResponse, 200);

      // 5. Access public case
      const publicResponse = await callPublicCase(mockPublicCaseHandler, slug);
      assertResponseStatus(publicResponse, 200);
    });
  });
});

