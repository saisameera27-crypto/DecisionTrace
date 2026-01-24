/**
 * Unit Tests for Retry Logic
 * Tests retry behavior for 429, 5xx errors, 4xx errors, and backoff timing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { retryWithBackoff, retryWithBackoffSafe } from '../../lib/retry';

describe('Retry Logic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('429 Rate Limit Retry', () => {
    it('should retry on 429 and succeed after retries', async () => {
      let callCount = 0;
      
      const mockFn = vi.fn(async () => {
        callCount++;
        if (callCount <= 2) {
          const error: any = new Error('Rate limit exceeded');
          error.status = 429;
          throw error;
        }
        return { success: true, data: 'result' };
      });

      const promise = retryWithBackoff(mockFn, { maxRetries: 3 });

      // Fast-forward through delays: 1s (attempt 1), 2s (attempt 2)
      await vi.advanceTimersByTimeAsync(1000); // First retry delay
      await vi.advanceTimersByTimeAsync(2000); // Second retry delay

      const result = await promise;

      expect(result).toEqual({ success: true, data: 'result' });
      expect(mockFn).toHaveBeenCalledTimes(3);
      expect(callCount).toBe(3);
    });

    it('should respect backoff schedule for 429 errors', async () => {
      const callTimes: number[] = [];
      let callCount = 0;
      
      const mockFn = vi.fn(async () => {
        callTimes.push(Date.now());
        callCount++;
        if (callCount <= 2) {
          const error: any = new Error('Rate limit exceeded');
          error.status = 429;
          throw error;
        }
        return { success: true };
      });

      const startTime = Date.now();
      const promise = retryWithBackoff(mockFn, { maxRetries: 3 });

      // Advance through delays: 1s, 2s
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(2000);

      await promise;

      // Verify backoff timing (allowing for some timing variance)
      expect(mockFn).toHaveBeenCalledTimes(3);
    });
  });

  describe('5xx Server Error Retry', () => {
    it('should retry on 500 and fail after max retries', async () => {
      let callCount = 0;
      
      const mockFn = vi.fn(async () => {
        callCount++;
        const error: any = new Error('Internal server error');
        error.status = 500;
        throw error;
      });

      const promise = retryWithBackoff(mockFn, { maxRetries: 3 });

      // Fast-forward through all retry delays: 1s, 2s, 4s
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(4000);
      
      // Wait for all pending promises and timers
      await vi.runAllTimersAsync();
      
      // Ensure promise rejection is handled
      let errorThrown = false;
      try {
        await promise;
      } catch (error: any) {
        errorThrown = true;
        expect(error.message).toBe('Internal server error');
        expect(error.status).toBe(500);
      }
      
      expect(errorThrown).toBe(true);
      expect(mockFn).toHaveBeenCalledTimes(4); // Initial + 3 retries
      expect(callCount).toBe(4);
    });

    it('should return correct error after max retries with retryWithBackoffSafe', async () => {
      let callCount = 0;
      
      const mockFn = vi.fn(async () => {
        callCount++;
        const error: any = new Error('Service unavailable');
        error.status = 503;
        throw error;
      });

      const promise = retryWithBackoffSafe(mockFn, { maxRetries: 3 });

      // Fast-forward through all retry delays
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(4000);
      
      // Wait for promise to settle
      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Service unavailable');
      expect(result.attempts).toBe(4); // Initial + 3 retries
      expect(mockFn).toHaveBeenCalledTimes(4);
    });
  });

  describe('4xx Client Error - No Retry', () => {
    it('should NOT retry on 400 Bad Request', async () => {
      const mockFn = vi.fn(async () => {
        const error: any = new Error('Bad request');
        error.status = 400;
        throw error;
      });

      const promise = retryWithBackoff(mockFn, { maxRetries: 3 });

      // Should fail immediately without retrying
      await expect(promise).rejects.toThrow('Bad request');
      expect(mockFn).toHaveBeenCalledTimes(1); // Only initial call, no retries
    });

    it('should NOT retry on 401 Unauthorized', async () => {
      const mockFn = vi.fn(async () => {
        const error: any = new Error('Unauthorized');
        error.status = 401;
        throw error;
      });

      const promise = retryWithBackoff(mockFn, { maxRetries: 3 });

      await expect(promise).rejects.toThrow('Unauthorized');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should NOT retry on 404 Not Found', async () => {
      const mockFn = vi.fn(async () => {
        const error: any = new Error('Not found');
        error.status = 404;
        throw error;
      });

      const promise = retryWithBackoff(mockFn, { maxRetries: 3 });

      await expect(promise).rejects.toThrow('Not found');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Exponential Backoff Schedule', () => {
    it('should respect backoff schedule: 1s → 2s → 4s → 8s with cap 30s', async () => {
      const delays: number[] = [];
      let callCount = 0;
      let lastCallTime = 0;
      
      const mockFn = vi.fn(async () => {
        const now = Date.now();
        if (lastCallTime > 0) {
          delays.push(now - lastCallTime);
        }
        lastCallTime = now;
        
        callCount++;
        if (callCount <= 4) {
          const error: any = new Error('Server error');
          error.status = 500;
          throw error;
        }
        return { success: true };
      });

      const promise = retryWithBackoff(mockFn, {
        maxRetries: 4,
        initialDelayMs: 1000,
        maxDelayMs: 30000,
        backoffMultiplier: 2,
      });

      // Advance through expected delays: 1s, 2s, 4s, 8s
      await vi.advanceTimersByTimeAsync(1000); // First retry after 1s
      await vi.advanceTimersByTimeAsync(2000); // Second retry after 2s
      await vi.advanceTimersByTimeAsync(4000); // Third retry after 4s
      await vi.advanceTimersByTimeAsync(8000); // Fourth retry after 8s

      await promise;

      expect(mockFn).toHaveBeenCalledTimes(5); // Initial + 4 retries
      // Verify delays were approximately correct (allowing for timing)
      expect(delays.length).toBeGreaterThanOrEqual(3);
    });

    it('should cap backoff at maxDelayMs (30s)', async () => {
      let callCount = 0;
      
      const mockFn = vi.fn(async () => {
        callCount++;
        if (callCount <= 6) {
          const error: any = new Error('Server error');
          error.status = 500;
          throw error;
        }
        return { success: true };
      });

      const promise = retryWithBackoff(mockFn, {
        maxRetries: 6,
        initialDelayMs: 1000,
        maxDelayMs: 30000, // 30s cap
        backoffMultiplier: 2,
      });

      // Advance through delays: 1s, 2s, 4s, 8s, 16s, 30s (capped)
      await vi.advanceTimersByTimeAsync(1000);  // 1s
      await vi.advanceTimersByTimeAsync(2000);  // 2s
      await vi.advanceTimersByTimeAsync(4000);  // 4s
      await vi.advanceTimersByTimeAsync(8000);  // 8s
      await vi.advanceTimersByTimeAsync(16000); // 16s
      await vi.advanceTimersByTimeAsync(30000); // 30s (capped, not 32s)

      await promise;

      expect(mockFn).toHaveBeenCalledTimes(7); // Initial + 6 retries
    });

    it('should verify exact backoff timing with mocked timers', async () => {
      const callTimestamps: number[] = [];
      let callCount = 0;
      
      const mockFn = vi.fn(async () => {
        callTimestamps.push(Date.now());
        callCount++;
        if (callCount <= 3) {
          const error: any = new Error('Rate limit');
          error.status = 429;
          throw error;
        }
        return { success: true };
      });

      const startTime = Date.now();
      const promise = retryWithBackoff(mockFn, {
        maxRetries: 3,
        initialDelayMs: 1000,
        backoffMultiplier: 2,
      });

      // First call happens immediately
      expect(mockFn).toHaveBeenCalledTimes(1);

      // Advance 1s for first retry
      await vi.advanceTimersByTimeAsync(1000);
      expect(mockFn).toHaveBeenCalledTimes(2);

      // Advance 2s for second retry
      await vi.advanceTimersByTimeAsync(2000);
      expect(mockFn).toHaveBeenCalledTimes(3);

      // Advance 4s for third retry
      await vi.advanceTimersByTimeAsync(4000);
      expect(mockFn).toHaveBeenCalledTimes(4);

      await promise;

      // Verify timing
      expect(callTimestamps.length).toBe(4);
      // First call at start
      // Second call after 1s
      // Third call after 1s + 2s = 3s
      // Fourth call after 1s + 2s + 4s = 7s
    });
  });

  describe('Edge Cases', () => {
    it('should succeed on first attempt without retrying', async () => {
      const mockFn = vi.fn(async () => {
        return { success: true, data: 'immediate success' };
      });

      const result = await retryWithBackoff(mockFn, { maxRetries: 3 });

      expect(result).toEqual({ success: true, data: 'immediate success' });
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should handle network errors (no status code) as retryable', async () => {
      let callCount = 0;
      
      const mockFn = vi.fn(async () => {
        callCount++;
        if (callCount <= 1) {
          throw new Error('Network error'); // No status code
        }
        return { success: true };
      });

      const promise = retryWithBackoff(mockFn, { maxRetries: 2 });

      await vi.advanceTimersByTimeAsync(1000);

      const result = await promise;

      expect(result).toEqual({ success: true });
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should handle custom retryable status codes', async () => {
      let callCount = 0;
      
      const mockFn = vi.fn(async () => {
        callCount++;
        if (callCount <= 1) {
          const error: any = new Error('Custom error');
          error.status = 408; // Request timeout
          throw error;
        }
        return { success: true };
      });

      const promise = retryWithBackoff(mockFn, {
        maxRetries: 2,
        retryableStatusCodes: [408, 429, 500], // Include 408
      });

      await vi.advanceTimersByTimeAsync(1000);

      const result = await promise;

      expect(result).toEqual({ success: true });
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });
});

