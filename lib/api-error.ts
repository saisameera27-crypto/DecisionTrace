/**
 * Framework-agnostic API Error Handling
 * Provides error normalization and response formatting without framework dependencies
 */

import { isDBInitError, DBInitError } from './prisma';
import { isHttpError, HttpError } from './errors';

/**
 * Standard API error structure
 */
export interface ApiError {
  code: string;
  message: string;
  status: number;
  hint?: string;
  details?: any;
}

/**
 * Normalize any error into a standard ApiError structure
 * Framework-agnostic - works with any error type
 * Preserves err.status and err.code when present
 */
export function normalizeError(error: unknown): ApiError {
  // Handle HttpError instances first (preserves status and code)
  if (isHttpError(error)) {
    return {
      code: error.code,
      message: error.message,
      status: error.status,
      details: error.details,
    };
  }

  // Handle DB initialization errors
  if (isDBInitError(error)) {
    const dbError = error as DBInitError;
    return {
      code: dbError.code,
      message: dbError.message,
      status: 500,
      hint: dbError.hint,
    };
  }

  // Handle Error instances - check for status and code properties
  if (error instanceof Error) {
    const err = error as any;
    return {
      code: err.code || 'SERVER_ERROR',
      message: err.message,
      status: err.status || 500, // Preserve status if present
      ...(process.env.NODE_ENV === 'development' && {
        details: {
          stack: err.stack,
        },
      }),
    };
  }

  // Handle error objects with status/code
  if (error && typeof error === 'object' && 'message' in error) {
    const err = error as any;
    return {
      code: err.code || 'SERVER_ERROR',
      message: err.message || 'An error occurred',
      status: err.status || 500, // Preserve status if present
      hint: err.hint,
      details: err.details,
    };
  }

  // Fallback for unknown error types
  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unknown error occurred',
    status: 500,
  };
}

/**
 * Convert an error to a standard error response format
 * Returns { status, body } that can be used with any framework
 */
export function toErrorResponse(error: unknown): { status: number; body: any } {
  const apiError = normalizeError(error);

  const body: any = {
    code: apiError.code,
    message: apiError.message,
  };

  if (apiError.hint) {
    body.hint = apiError.hint;
  }

  if (apiError.details) {
    body.details = apiError.details;
  }

  // For development, include stack trace if available
  if (process.env.NODE_ENV === 'development' && error instanceof Error && error.stack) {
    body.stack = error.stack;
  }

  return {
    status: apiError.status,
    body,
  };
}

/**
 * Get helpful hint for Prisma error codes
 */
export function getPrismaErrorHint(code: string): string {
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

/**
 * Wrap an async function that uses Prisma with DB error handling
 * Ensures DB errors are properly formatted
 * Framework-agnostic - throws normalized errors
 */
export async function withDBHandler<T>(fn: () => Promise<T>): Promise<T> {
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

