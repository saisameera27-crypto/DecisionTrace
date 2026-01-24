/**
 * API Route Error Handler Utility
 * Provides consistent error handling for API routes, especially for DB errors
 */

import { NextResponse } from 'next/server';
import { isDBInitError, DBInitError } from '../lib/prisma';

/**
 * Handle errors in API routes and return appropriate JSON responses
 * 
 * @param error - The error that occurred
 * @param defaultMessage - Default error message if error doesn't have one
 * @returns NextResponse with error JSON
 */
export function handleAPIError(error: unknown, defaultMessage: string = 'An error occurred'): NextResponse {
  // Handle DB initialization errors
  if (isDBInitError(error)) {
    return NextResponse.json(
      {
        code: error.code,
        message: error.message,
        hint: error.hint,
      },
      { status: 500 }
    );
  }
  
  // Handle other errors
  const message = error instanceof Error ? error.message : defaultMessage;
  const status = (error as any)?.status || 500;
  
  return NextResponse.json(
    {
      error: message,
      ...(process.env.NODE_ENV === 'development' && error instanceof Error && {
        stack: error.stack,
      }),
    },
    { status }
  );
}

/**
 * Wrap an API route handler with error handling
 * Catches errors and returns proper JSON error responses
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleAPIError(error);
    }
  }) as T;
}

/**
 * Wrap an async function that uses Prisma with DB error handling
 * Ensures DB errors are properly formatted
 */
export async function withDBHandler<T>(
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (isDBInitError(error)) {
      throw error;
    }
    // Check if it's a Prisma error that should be converted
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as any;
      if (prismaError.code?.startsWith('P')) {
        // Prisma error code (P1001, P1003, etc.)
        throw {
          code: 'DB_INIT_ERROR',
          message: prismaError.message || 'Database operation failed',
          hint: getPrismaErrorHint(prismaError.code),
        } as DBInitError;
      }
    }
    throw error;
  }
}

/**
 * Get helpful hint for Prisma error codes
 */
function getPrismaErrorHint(code: string): string {
  const hints: Record<string, string> = {
    P1001: 'Cannot reach database server. Verify DATABASE_URL and ensure the database is running.',
    P1003: 'Database does not exist. Create the database or check DATABASE_URL.',
    P1008: 'Operations timed out. Check database performance and network connectivity.',
    P1017: 'Server closed the connection. Database may be restarting or overloaded.',
    P2002: 'Unique constraint violation. A record with this value already exists.',
    P2025: 'Record not found. The requested record does not exist.',
  };
  
  return hints[code] || 'Check your database connection and configuration.';
}

