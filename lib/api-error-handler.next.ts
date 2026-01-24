/**
 * Next.js-specific API Error Handler
 * Wraps framework-agnostic error handling with Next.js NextResponse types
 * 
 * This file should only be imported in Next.js route handlers.
 * For tests and framework-agnostic code, use './api-error' instead.
 */

// Conditional import - only available in Next.js environment
let NextResponse: any;
try {
  const nextServer = require('next/server');
  NextResponse = nextServer.NextResponse;
} catch {
  // Next.js not available - provide a mock for type checking
  NextResponse = class MockNextResponse {
    static json(body: any, init?: { status?: number }) {
      return {
        status: init?.status || 200,
        json: async () => body,
        text: async () => JSON.stringify(body),
      };
    }
  };
}

import { toErrorResponse, withDBHandler } from './api-error';

/**
 * Handle errors in Next.js API routes and return NextResponse
 * 
 * @param error - The error that occurred
 * @param defaultMessage - Default error message if error doesn't have one
 * @returns NextResponse with error JSON
 */
export function respondError(error: unknown, defaultMessage: string = 'An error occurred'): any {
  const { status, body } = toErrorResponse(error);
  
  // If no message was found, use default
  if (!body.message || body.message === 'An unknown error occurred') {
    body.message = defaultMessage;
  }
  
  return NextResponse.json(body, { status });
}

/**
 * Wrap a Next.js API route handler with error handling
 * Catches errors and returns proper JSON error responses
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error) {
      return respondError(error);
    }
  }) as T;
}

/**
 * Re-export framework-agnostic withDBHandler for convenience
 */
export { withDBHandler } from './api-error';

/**
 * Legacy export name for backward compatibility
 * @deprecated Use respondError instead
 */
export function handleAPIError(error: unknown, defaultMessage: string = 'An error occurred'): any {
  return respondError(error, defaultMessage);
}

