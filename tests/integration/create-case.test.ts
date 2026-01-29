import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/case/create/route';
import { execSync } from 'node:child_process';
import {
  setupIntegrationTests,
  resetTestDatabase,
  parseJsonResponse,
  assertResponseStatus,
} from './_harness';

/**
 * Integration tests for POST /api/case/create endpoint
 */
describe('Create Case API', () => {
  beforeAll(async () => {
    // Ensure database schema is initialized
    try {
      process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'file:/tmp/test-decision-trace.db';
      process.env.PRISMA_SCHEMA_TARGET = 'sqlite';
      
      execSync('npx prisma db push --schema=prisma/schema.sqlite.prisma --accept-data-loss', {
        env: process.env,
        stdio: 'pipe',
        cwd: process.cwd(),
      });
    } catch (error: any) {
      // Schema push might fail if tables already exist - that's okay
      console.warn('Schema push warning (may be expected):', error.message);
    }
    
    await setupIntegrationTests();
  });

  beforeEach(async () => {
    await resetTestDatabase();
  });

  describe('Success path', () => {
    it('should create a case and return 201 with caseId', async () => {
      const requestBody = {
        title: 'Test Decision Case',
        decisionContext: 'This is a test decision context',
        stakeholders: 'Team A, Team B',
        evidence: 'Evidence point 1\nEvidence point 2',
        risks: 'Risk 1\nRisk 2',
        desiredOutput: 'full',
      };

      const request = new NextRequest('http://localhost:3000/api/case/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await parseJsonResponse(response);

      // Assert status is 201
      await assertResponseStatus(response, 201);
      expect(response.status).toBe(201);

      // Assert Content-Type includes application/json
      const contentType = response.headers.get('content-type');
      expect(contentType).toContain('application/json');

      // Assert response JSON contains caseId
      expect(data).toHaveProperty('caseId');
      expect(typeof data.caseId).toBe('string');
      expect(data.caseId.length).toBeGreaterThan(0);

      // Assert response also contains slug and message
      expect(data).toHaveProperty('slug');
      expect(data).toHaveProperty('message');
    });

    it('should create a case with minimal required fields', async () => {
      const requestBody = {
        title: 'Minimal Test Case',
      };

      const request = new NextRequest('http://localhost:3000/api/case/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await parseJsonResponse(response);

      // Assert status is 201
      await assertResponseStatus(response, 201);
      expect(response.status).toBe(201);

      // Assert Content-Type includes application/json
      const contentType = response.headers.get('content-type');
      expect(contentType).toContain('application/json');

      // Assert response JSON contains caseId
      expect(data).toHaveProperty('caseId');
      expect(typeof data.caseId).toBe('string');
    });
  });

  describe('Failure path - validation errors', () => {
    it('should return 400 when title is missing', async () => {
      const requestBody = {
        decisionContext: 'Some context',
        // title is missing
      };

      const request = new NextRequest('http://localhost:3000/api/case/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await parseJsonResponse(response);

      // Assert status is 400
      await assertResponseStatus(response, 400);
      expect(response.status).toBe(400);

      // Assert Content-Type includes application/json
      const contentType = response.headers.get('content-type');
      expect(contentType).toContain('application/json');

      // Assert JSON contains code and error
      expect(data).toHaveProperty('code');
      expect(data).toHaveProperty('error');
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data.error).toContain('Title is required');
    });

    it('should return 400 when title is empty string', async () => {
      const requestBody = {
        title: '',
        decisionContext: 'Some context',
      };

      const request = new NextRequest('http://localhost:3000/api/case/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await parseJsonResponse(response);

      // Assert status is 400
      await assertResponseStatus(response, 400);
      expect(response.status).toBe(400);

      // Assert JSON contains code and error
      expect(data).toHaveProperty('code');
      expect(data).toHaveProperty('error');
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when title is only whitespace', async () => {
      const requestBody = {
        title: '   ',
        decisionContext: 'Some context',
      };

      const request = new NextRequest('http://localhost:3000/api/case/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await parseJsonResponse(response);

      // Assert status is 400
      await assertResponseStatus(response, 400);
      expect(response.status).toBe(400);

      // Assert JSON contains code and error
      expect(data).toHaveProperty('code');
      expect(data).toHaveProperty('error');
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when request body is invalid JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/case/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json{',
      });

      const response = await POST(request);
      const data = await parseJsonResponse(response);

      // Assert status is 400
      await assertResponseStatus(response, 400);
      expect(response.status).toBe(400);

      // Assert Content-Type includes application/json
      const contentType = response.headers.get('content-type');
      expect(contentType).toContain('application/json');

      // Assert JSON contains code and error
      expect(data).toHaveProperty('code');
      expect(data).toHaveProperty('error');
      expect(data.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Failure path - database errors', () => {
    it('should return 503 when database is not initialized', async () => {
      // Mock getPrismaClient to throw a database error
      const prismaModule = await import('@/lib/prisma');
      const { vi } = await import('vitest');
      
      const mockPrismaError: any = new Error('relation "Case" does not exist');
      mockPrismaError.code = '42P01';
      
      const mockPrisma = {
        case: {
          create: vi.fn().mockRejectedValue(mockPrismaError),
        },
      };
      
      vi.spyOn(prismaModule, 'getPrismaClient').mockReturnValue(mockPrisma as any);

      try {
        const requestBody = {
          title: 'Test Case',
        };

        const request = new NextRequest('http://localhost:3000/api/case/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        const response = await POST(request);
        const data = await parseJsonResponse(response);

        // Assert status is 503
        await assertResponseStatus(response, 503);
        expect(response.status).toBe(503);

        // Assert JSON contains code and error
        expect(data).toHaveProperty('code');
        expect(data).toHaveProperty('error');
        expect(data.code).toBe('DB_NOT_INITIALIZED');
      } finally {
        vi.restoreAllMocks();
      }
    });
  });
});

