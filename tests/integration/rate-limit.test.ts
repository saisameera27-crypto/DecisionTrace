/**
 * Integration Tests: Rate Limiting
 * Tests rate limiting with IP-based tracking and proper headers
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  callRouteHandler,
  createTestRequest,
  parseJsonResponse,
  assertResponseStatus,
} from './_harness';

import { getClientIP, checkRateLimit, resetRateLimitStore } from '@/lib/rate-limit';

// Rate limit configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per window

/**
 * Mock API handler with rate limiting
 */
async function mockRateLimitedHandler(req: Request): Promise<Response> {
  try {
    // Get current time (works with fake timers)
    // Use Date.now() which will use fake timer when setSystemTime is called
    const now = Date.now();

    // Get client IP using the rate limit module
    const ip = getClientIP(req);

    // Check rate limit
    const rateLimit = checkRateLimit(ip, RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS, now);

    // Build rate limit headers
    const headers = new Headers();
    headers.set('X-RateLimit-Limit', String(RATE_LIMIT_MAX_REQUESTS));
    headers.set('X-RateLimit-Remaining', String(rateLimit.remaining));
    headers.set('X-RateLimit-Reset', String(Math.ceil(rateLimit.resetAt / 1000))); // Unix timestamp in seconds

    if (!rateLimit.allowed) {
      // Rate limit exceeded
      if (rateLimit.retryAfter !== undefined) {
        headers.set('Retry-After', String(rateLimit.retryAfter));
      }

      return new Response(
        JSON.stringify({
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: rateLimit.retryAfter,
        }),
        {
          status: 429,
          headers,
        }
      );
    }

    // Request allowed
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Request processed',
        ip,
        requestCount: rateLimit.remaining + 1,
      }),
      {
        status: 200,
        headers,
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        stack: process.env.NODE_ENV === 'test' ? error.stack : undefined,
      }),
      { status: 500 }
    );
  }
}

describe('Rate Limiting', () => {
  beforeEach(() => {
    // Reset rate limit store using the test-only function
    resetRateLimitStore();
    
    // Use fake timers for deterministic testing
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Restore real timers
    vi.useRealTimers();
  });

  it('should allow 10 requests and return 429 on 11th request', async () => {
    const testIP = '192.168.1.100';
    const baseTime = 1000000; // Fixed base time for deterministic testing
    vi.setSystemTime(baseTime);

    // Make 10 requests (should all succeed) - using ip option
    const requests: Promise<Response>[] = [];
    for (let i = 0; i < 10; i++) {
      const request = createTestRequest('/api/test', {
        method: 'GET',
        ip: testIP, // Use ip option instead of manual header
      });
      requests.push(callRouteHandler(mockRateLimitedHandler, request));
    }

    const responses = await Promise.all(requests);

    // Verify all 10 requests succeeded
    for (let index = 0; index < responses.length; index++) {
      const response = responses[index];
      await assertResponseStatus(response, 200);
      
      // Check rate limit headers
      const headers = response.headers;
      expect(headers.get('X-RateLimit-Limit')).toBe('10');
      expect(headers.get('X-RateLimit-Remaining')).toBe(String(9 - index));
      expect(headers.get('X-RateLimit-Reset')).toBeDefined();
    }

    // Make 11th request (should fail with 429)
    const request11 = createTestRequest('/api/test', {
      method: 'GET',
      ip: testIP, // Use ip option
    });

    const response11 = await callRouteHandler(mockRateLimitedHandler, request11);
    await assertResponseStatus(response11, 429);

    // Verify 429 response
    const errorData = await parseJsonResponse(response11);
    expect(errorData.error).toBe('Too many requests');
    expect(errorData.message).toContain('Rate limit exceeded');

    // Verify Retry-After header
    const headers11 = response11.headers;
    const retryAfter = headers11.get('Retry-After');
    expect(retryAfter).toBeDefined();
    expect(parseInt(retryAfter!)).toBeGreaterThan(0);
    expect(parseInt(retryAfter!)).toBeLessThanOrEqual(60); // Should be <= 60 seconds

    // Verify rate limit headers on 429 response
    expect(headers11.get('X-RateLimit-Limit')).toBe('10');
    expect(headers11.get('X-RateLimit-Remaining')).toBe('0');
    expect(headers11.get('X-RateLimit-Reset')).toBeDefined();
  });

  it('should reset rate limit after window expires', async () => {
    const testIP = '192.168.1.200';
    const baseTime = 1000000; // Fixed base time for deterministic testing
    vi.setSystemTime(baseTime);

    // Make 10 requests
    for (let i = 0; i < 10; i++) {
      const request = createTestRequest('/api/test', {
        method: 'GET',
        ip: testIP,
      });
      const response = await callRouteHandler(mockRateLimitedHandler, request);
      await assertResponseStatus(response, 200);
    }

    // Verify 11th request fails
    const request11 = createTestRequest('/api/test', {
      method: 'GET',
      ip: testIP,
    });
    const response11 = await callRouteHandler(mockRateLimitedHandler, request11);
    await assertResponseStatus(response11, 429);

    // Advance time past the rate limit window (61 seconds)
    vi.setSystemTime(baseTime + 61 * 1000);

    // Make another request (should succeed - window reset)
    const requestAfterReset = createTestRequest('/api/test', {
      method: 'GET',
      ip: testIP,
    });
    const responseAfterReset = await callRouteHandler(mockRateLimitedHandler, requestAfterReset);
    await assertResponseStatus(responseAfterReset, 200);

    const headers = responseAfterReset.headers;
    expect(headers.get('X-RateLimit-Remaining')).toBe('9'); // 10 - 1 = 9
  });

  it('should track rate limits separately per IP', async () => {
    const ip1 = '192.168.1.10';
    const ip2 = '192.168.1.20';
    const baseTime = 1000000; // Fixed base time for deterministic testing
    vi.setSystemTime(baseTime);

    // Make 10 requests from IP1
    for (let i = 0; i < 10; i++) {
      const request = createTestRequest('/api/test', {
        method: 'GET',
        ip: ip1,
      });
      const response = await callRouteHandler(mockRateLimitedHandler, request);
      await assertResponseStatus(response, 200);
    }

    // Verify IP1 is rate limited
    const request1 = createTestRequest('/api/test', {
      method: 'GET',
      ip: ip1,
    });
    const response1 = await callRouteHandler(mockRateLimitedHandler, request1);
    await assertResponseStatus(response1, 429);

    // IP2 should still be able to make requests (separate rate limit)
    // Reset time to ensure IP2 gets a fresh window
    vi.setSystemTime(baseTime + 1000); // Small increment to ensure new window
    
    const request2 = createTestRequest('/api/test', {
      method: 'GET',
      ip: ip2,
    });
    const response2 = await callRouteHandler(mockRateLimitedHandler, request2);
    await assertResponseStatus(response2, 200);

    const headers2 = response2.headers;
    expect(headers2.get('X-RateLimit-Remaining')).toBe('9'); // IP2 has 9 remaining
  });

  it('should handle X-Forwarded-For with multiple IPs correctly', async () => {
    const testIP = '192.168.1.50';
    const forwardedChain = `${testIP}, 10.0.0.1, 172.16.0.1`;
    const baseTime = 1000000; // Fixed base time for deterministic testing
    vi.setSystemTime(baseTime);

    // Make 10 requests with X-Forwarded-For chain (using headers directly)
    for (let i = 0; i < 10; i++) {
      const request = createTestRequest('/api/test', {
        method: 'GET',
        headers: {
          'X-Forwarded-For': forwardedChain,
        },
      });
      const response = await callRouteHandler(mockRateLimitedHandler, request);
      await assertResponseStatus(response, 200);
    }

    // Verify 11th request fails (should use first IP in chain)
    const request11 = createTestRequest('/api/test', {
      method: 'GET',
      headers: {
        'X-Forwarded-For': forwardedChain,
      },
    });
    const response11 = await callRouteHandler(mockRateLimitedHandler, request11);
    await assertResponseStatus(response11, 429);

    // Verify that requests with same first IP are rate limited
    const requestSameIP = createTestRequest('/api/test', {
      method: 'GET',
      ip: testIP, // Same first IP
    });
    const responseSameIP = await callRouteHandler(mockRateLimitedHandler, requestSameIP);
    await assertResponseStatus(responseSameIP, 429);
  });

  it('should include all required rate limit headers', async () => {
    const testIP = '192.168.1.99';
    const baseTime = 1000000; // Fixed base time for deterministic testing
    vi.setSystemTime(baseTime);

    // Make a request
    const request = createTestRequest('/api/test', {
      method: 'GET',
      ip: testIP,
    });

    const response = await callRouteHandler(mockRateLimitedHandler, request);
    assertResponseStatus(response, 200);

    // Verify all rate limit headers are present
    const headers = response.headers;
    
    expect(headers.get('X-RateLimit-Limit')).toBe('10');
    expect(headers.get('X-RateLimit-Remaining')).toBeDefined();
    expect(headers.get('X-RateLimit-Reset')).toBeDefined();

    // Verify X-RateLimit-Reset is a valid Unix timestamp
    const resetTimestamp = parseInt(headers.get('X-RateLimit-Reset')!);
    expect(resetTimestamp).toBeGreaterThan(Math.floor(baseTime / 1000));
    expect(resetTimestamp).toBeLessThanOrEqual(Math.floor((baseTime + RATE_LIMIT_WINDOW_MS) / 1000));
  });
});

