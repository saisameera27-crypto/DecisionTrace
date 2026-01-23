/**
 * Retry Logic for API Calls
 * Implements exponential backoff retry strategy for handling rate limits and server errors
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableStatusCodes?: number[];
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
}

/**
 * Default retry options
 */
const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 1000, // 1 second
  maxDelayMs: 30000, // 30 seconds cap
  backoffMultiplier: 2,
  retryableStatusCodes: [429, 500, 502, 503, 504], // Rate limit and server errors
};

/**
 * Check if an error is retryable based on status code
 */
function isRetryableError(error: any, retryableStatusCodes: number[]): boolean {
  // Check if error has a status code
  const statusCode = error?.status || error?.statusCode || error?.response?.status;
  
  if (statusCode === undefined) {
    // If no status code, assume it's a network error and retry
    return true;
  }
  
  return retryableStatusCodes.includes(statusCode);
}

/**
 * Calculate delay for exponential backoff
 */
function calculateDelay(
  attempt: number,
  initialDelayMs: number,
  maxDelayMs: number,
  backoffMultiplier: number
): number {
  const delay = initialDelayMs * Math.pow(backoffMultiplier, attempt);
  return Math.min(delay, maxDelayMs);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * 
 * @param fn - Function to retry (should return a Promise)
 * @param options - Retry configuration options
 * @returns Promise that resolves with the result or rejects after max retries
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (error: any) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if we should retry
      if (attempt === config.maxRetries) {
        // Max retries reached
        throw lastError;
      }
      
      // Check if error is retryable
      if (!isRetryableError(error, config.retryableStatusCodes)) {
        // Non-retryable error (e.g., 400 Bad Request)
        throw lastError;
      }
      
      // Calculate delay for next attempt
      const delay = calculateDelay(
        attempt,
        config.initialDelayMs,
        config.maxDelayMs,
        config.backoffMultiplier
      );
      
      // Wait before retrying
      await sleep(delay);
    }
  }
  
  // Should never reach here, but TypeScript needs it
  throw lastError || new Error('Retry failed');
}

/**
 * Retry a function and return a result object instead of throwing
 */
export async function retryWithBackoffSafe<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let attempts = 0;
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    attempts = attempt + 1;
    try {
      const data = await fn();
      return {
        success: true,
        data,
        attempts,
      };
    } catch (error: any) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if we should retry
      if (attempt === config.maxRetries) {
        // Max retries reached
        return {
          success: false,
          error: lastError,
          attempts,
        };
      }
      
      // Check if error is retryable
      if (!isRetryableError(error, config.retryableStatusCodes)) {
        // Non-retryable error (e.g., 400 Bad Request)
        return {
          success: false,
          error: lastError,
          attempts,
        };
      }
      
      // Calculate delay for next attempt
      const delay = calculateDelay(
        attempt,
        config.initialDelayMs,
        config.maxDelayMs,
        config.backoffMultiplier
      );
      
      // Wait before retrying
      await sleep(delay);
    }
  }
  
  // Should never reach here, but TypeScript needs it
  return {
    success: false,
    error: lastError || new Error('Retry failed'),
    attempts,
  };
}

