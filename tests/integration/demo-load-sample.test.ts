/**
 * Test: Demo Load Sample - Database Initialization Error Handling
 * 
 * Tests that the /api/demo/load-sample endpoint properly handles
 * missing database tables and returns a user-friendly error.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST } from '@/app/api/demo/load-sample/route';

describe('Demo Load Sample - Database Initialization Errors', () => {
  beforeEach(() => {
    // Ensure we're in demo mode
    process.env.DEMO_MODE = 'true';
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    delete process.env.DEMO_MODE;
  });

  it('should return DB_NOT_INITIALIZED error when tables do not exist (Postgres error 42P01)', async () => {
    // Mock Prisma to throw a "table does not exist" error during database operation
    const mockPrismaError = {
      code: '42P01',
      message: 'relation "Case" does not exist',
      meta: {
        target: ['Case'],
      },
    };

    // Mock getPrismaClient to return a Prisma client that throws on operations
    const prismaModule = await import('@/lib/prisma');
    const mockPrisma = {
      case: {
        upsert: vi.fn().mockRejectedValue(mockPrismaError),
      },
    };
    vi.spyOn(prismaModule, 'getPrismaClient').mockReturnValue(mockPrisma as any);

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data).toEqual({
      error: 'DB_NOT_INITIALIZED',
      message: 'Database tables are not initialized. Run migrations.',
    });

    vi.restoreAllMocks();
  });

  it('should return DB_NOT_INITIALIZED error when error message contains "does not exist"', async () => {
    const mockPrismaError = {
      message: 'The table `public.Case` does not exist',
      code: 'P2025',
    };

    const prismaModule = await import('@/lib/prisma');
    const mockPrisma = {
      case: {
        upsert: vi.fn().mockRejectedValue(mockPrismaError),
      },
    };
    vi.spyOn(prismaModule, 'getPrismaClient').mockReturnValue(mockPrisma as any);

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data).toEqual({
      error: 'DB_NOT_INITIALIZED',
      message: 'Database tables are not initialized. Run migrations.',
    });

    vi.restoreAllMocks();
  });

  it('should return DB_NOT_INITIALIZED error when error message contains "table" and "does not exist"', async () => {
    const mockPrismaError = {
      message: 'Table Case does not exist in the current database',
    };

    const prismaModule = await import('@/lib/prisma');
    const mockPrisma = {
      case: {
        upsert: vi.fn().mockRejectedValue(mockPrismaError),
      },
    };
    vi.spyOn(prismaModule, 'getPrismaClient').mockReturnValue(mockPrisma as any);

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data).toEqual({
      error: 'DB_NOT_INITIALIZED',
      message: 'Database tables are not initialized. Run migrations.',
    });

    vi.restoreAllMocks();
  });

  it('should return DB_NOT_INITIALIZED error when error message contains "relation" and "does not exist"', async () => {
    const mockPrismaError = {
      message: 'relation "public.Case" does not exist',
      code: '42P01',
    };

    const prismaModule = await import('@/lib/prisma');
    const mockPrisma = {
      case: {
        upsert: vi.fn().mockRejectedValue(mockPrismaError),
      },
    };
    vi.spyOn(prismaModule, 'getPrismaClient').mockReturnValue(mockPrisma as any);

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toBe('DB_NOT_INITIALIZED');
    expect(data.message).toBe('Database tables are not initialized. Run migrations.');

    vi.restoreAllMocks();
  });

  it('should return generic error for non-table-missing errors', async () => {
    const mockPrismaError = {
      message: 'Connection timeout',
      code: 'P1001',
    };

    const prismaModule = await import('@/lib/prisma');
    const mockPrisma = {
      case: {
        upsert: vi.fn().mockRejectedValue(mockPrismaError),
      },
    };
    vi.spyOn(prismaModule, 'getPrismaClient').mockReturnValue(mockPrisma as any);

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.code).toBe('DEMO_LOAD_FAILED');
    expect(data.message).toContain('Connection timeout');

    vi.restoreAllMocks();
  });

  // Note: GET handler removed - state-changing actions should only use POST
  // This prevents 405 errors and aligns with RESTful best practices
});

