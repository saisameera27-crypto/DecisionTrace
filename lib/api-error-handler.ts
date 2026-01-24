/**
 * API Route Error Handler Utility
 * Provides consistent error handling for API routes, especially for DB errors
 * 
 * Framework-agnostic version - exports pure helpers that return {status, body}
 * For Next.js route handlers, wrap the result with NextResponse.json()
 * 
 * Example:
 *   const { status, body } = toErrorResponse(error);
 *   return NextResponse.json(body, { status });
 */

// Export framework-agnostic error handling
import { toErrorResponse as toErrorResponseImpl } from './api-error';

export {
  normalizeError,
  toErrorResponse,
  getPrismaErrorHint,
  withDBHandler,
  type ApiError,
} from './api-error';

/**
 * Legacy export name for backward compatibility
 * Returns { status, body } - wrap with NextResponse.json() in route handlers
 * @deprecated Use toErrorResponse() directly
 */
export function handleAPIError(error: unknown, defaultMessage: string = 'An error occurred'): { status: number; body: any } {
  const { status, body } = toErrorResponseImpl(error);
  
  // If no message was found, use default
  if (!body.message || body.message === 'An unknown error occurred') {
    body.message = defaultMessage;
  }
  
  return { status, body };
}

