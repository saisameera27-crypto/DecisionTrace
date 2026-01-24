/**
 * HTTP Error Classes and Helpers
 * Provides structured error types for API routes with proper status codes
 */

/**
 * HTTP Error class with status code, error code, and message
 */
export class HttpError extends Error {
  status: number;
  code: string;
  details?: any;

  constructor(status: number, code: string, message: string, details?: any) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HttpError);
    }
  }
}

/**
 * Create a 400 Bad Request error
 */
export function badRequest(code: string, message: string, details?: any): HttpError {
  return new HttpError(400, code, message, details);
}

/**
 * Create a 401 Unauthorized error
 */
export function unauthorized(code: string = 'UNAUTHORIZED', message: string = 'Unauthorized', details?: any): HttpError {
  return new HttpError(401, code, message, details);
}

/**
 * Create a 403 Forbidden error
 */
export function forbidden(code: string = 'FORBIDDEN', message: string = 'Forbidden', details?: any): HttpError {
  return new HttpError(403, code, message, details);
}

/**
 * Create a 404 Not Found error
 */
export function notFound(code: string = 'NOT_FOUND', message: string = 'Not found', details?: any): HttpError {
  return new HttpError(404, code, message, details);
}

/**
 * Create a 409 Conflict error
 */
export function conflict(code: string = 'CONFLICT', message: string = 'Conflict', details?: any): HttpError {
  return new HttpError(409, code, message, details);
}

/**
 * Create a 429 Too Many Requests error
 */
export function tooManyRequests(code: string = 'RATE_LIMIT_EXCEEDED', message: string = 'Too many requests', details?: any): HttpError {
  return new HttpError(429, code, message, details);
}

/**
 * Create a 500 Internal Server Error
 */
export function internalError(code: string = 'INTERNAL_ERROR', message: string = 'Internal server error', details?: any): HttpError {
  return new HttpError(500, code, message, details);
}

/**
 * Check if an error is an HttpError instance
 */
export function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError;
}

