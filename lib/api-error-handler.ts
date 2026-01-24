/**
 * API Route Error Handler Utility
 * Provides consistent error handling for API routes, especially for DB errors
 * 
 * @deprecated This file is kept for backward compatibility.
 * For new code, import from './api-error-handler.next' for Next.js routes
 * or './api-error' for framework-agnostic error handling.
 */

// Re-export from Next.js-specific handler for backward compatibility
export {
  respondError,
  handleAPIError,
  withErrorHandling,
  withDBHandler,
} from './api-error-handler.next';

// Re-export framework-agnostic utilities
export {
  normalizeError,
  toErrorResponse,
  getPrismaErrorHint,
  type ApiError,
} from './api-error';

