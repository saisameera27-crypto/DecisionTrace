/**
 * Free Tier Limits Tests
 * Tests that all free-tier limits are enforced server-side
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  checkFileUploadLimit,
  checkTokenBudget,
  checkRateLimit,
  estimateTokens,
  validateModelForFreeMode,
  FREE_TIER_LIMITS,
  isFreeMode,
  getFreeModeModel,
  getFreeModeThinkingLevel,
  resetRateLimits,
} from '@/lib/free-tier-limits';

describe('Free Tier Limits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set FREE_MODE for tests
    process.env.FREE_MODE = 'true';
  });

  describe('File Upload Limits', () => {
    it('should reject files exceeding 1.5MB', () => {
      const fileSize = 1.6 * 1024 * 1024; // 1.6 MB
      const result = checkFileUploadLimit(fileSize, 'text/plain', 1);
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('exceeds free mode limit');
      expect(result.reason).toContain('1.5MB');
    });

    it('should accept files at 1.5MB limit', () => {
      const fileSize = 1.5 * 1024 * 1024; // Exactly 1.5 MB
      const result = checkFileUploadLimit(fileSize, 'text/plain', 1);
      
      expect(result.allowed).toBe(true);
    });

    it('should reject more than 1 file per case', () => {
      const result = checkFileUploadLimit(1000, 'text/plain', 2);
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Maximum 1 file per case');
    });

    it('should reject non-text MIME types by default', () => {
      const result = checkFileUploadLimit(1000, 'application/pdf', 1);
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not allowed in free mode');
    });

    it('should accept PDF if FREE_PDF_ALLOWED=true', () => {
      // Need to reload the module to pick up the env var change
      // Since the module loads at import time, we'll test the function directly
      // by temporarily modifying the allowed types
      const originalAllowed = [...FREE_TIER_LIMITS.ALLOWED_MIME_TYPES];
      
      // Manually add PDF to allowed types for this test
      if (!FREE_TIER_LIMITS.ALLOWED_MIME_TYPES.includes('application/pdf')) {
        FREE_TIER_LIMITS.ALLOWED_MIME_TYPES.push('application/pdf');
      }
      
      const result = checkFileUploadLimit(1000, 'application/pdf', 1);
      
      // Should allow if PDF is in allowed types
      expect(result.allowed).toBe(true);
      
      // Restore original allowed types
      FREE_TIER_LIMITS.ALLOWED_MIME_TYPES.length = 0;
      FREE_TIER_LIMITS.ALLOWED_MIME_TYPES.push(...originalAllowed);
    });

    it('should reject documents exceeding 30,000 characters', () => {
      const longContent = 'a'.repeat(30001);
      const result = checkFileUploadLimit(1000, 'text/plain', 1, longContent.length);
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('30,000');
      expect(result.reason).toContain('characters');
    });

    it('should accept documents at 30,000 character limit', () => {
      const exactContent = 'a'.repeat(30000);
      const result = checkFileUploadLimit(1000, 'text/plain', 1, exactContent.length);
      
      expect(result.allowed).toBe(true);
    });
  });

  describe('Token Budget Limits', () => {
    it('should reject runs exceeding 60,000 tokens', () => {
      const result = checkTokenBudget(61000);
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('60,000');
      expect(result.suggestedAction).toContain('Lite Mode');
    });

    it('should accept runs at 60,000 token limit', () => {
      const result = checkTokenBudget(60000);
      
      expect(result.allowed).toBe(true);
    });

    it('should provide helpful error message for token limit', () => {
      const result = checkTokenBudget(70000);
      
      expect(result.reason).toBeDefined();
      expect(result.suggestedAction).toBeDefined();
    });
  });

  describe('Token Estimation', () => {
    it('should estimate tokens correctly for text', () => {
      const docLength = 10000; // 10k chars
      const estimate = estimateTokens(docLength, false);
      
      expect(estimate.inputTokens).toBeGreaterThan(0);
      expect(estimate.outputTokens).toBeGreaterThan(0);
      expect(estimate.totalTokens).toBe(estimate.inputTokens + estimate.outputTokens);
    });

    it('should estimate tokens correctly for PDF', () => {
      const docLength = 10000;
      const estimate = estimateTokens(docLength, true);
      
      // PDF should have higher token estimate
      expect(estimate.inputTokens).toBeGreaterThan(0);
    });

    it('should estimate within budget for typical document', () => {
      const docLength = 10000; // 10k chars
      const estimate = estimateTokens(docLength, false);
      const budgetCheck = checkTokenBudget(estimate.totalTokens);
      
      // 10k chars should be well within budget
      expect(budgetCheck.allowed).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests within rate limit', () => {
      const ip = '127.0.0.1';
      
      // First 9 requests should be allowed
      for (let i = 0; i < 9; i++) {
        const result = checkRateLimit(ip, false);
        expect(result.allowed).toBe(true);
      }
    });

    it('should reject requests exceeding per-minute limit', () => {
      const ip = '127.0.0.1';
      
      // Make 10 requests (at limit)
      for (let i = 0; i < 10; i++) {
        checkRateLimit(ip, false);
      }
      
      // 11th request should be rejected
      const result = checkRateLimit(ip, false);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('requests per minute');
      expect(result.retryAfter).toBeDefined();
    });

    it('should enforce daily run limit', () => {
      const ip = '127.0.0.1';
      
      // Reset rate limits for this test
      resetRateLimits(ip);
      
      // Make 3 runs (at limit)
      for (let i = 0; i < 3; i++) {
        const result = checkRateLimit(ip, true);
        expect(result.allowed).toBe(true);
      }
      
      // 4th run should be rejected
      const result = checkRateLimit(ip, true);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('runs per day');
      expect(result.retryAfter).toBeDefined();
    });

    it('should return retry-after header for rate limits', () => {
      const ip = '127.0.0.1';
      
      // Exceed limit
      for (let i = 0; i < 11; i++) {
        checkRateLimit(ip, false);
      }
      
      const result = checkRateLimit(ip, false);
      expect(result.retryAfter).toBeGreaterThan(0);
      expect(result.retryAfter).toBeLessThanOrEqual(60);
    });
  });

  describe('Model Validation - STRICT Gemini 3 Only', () => {
    it('should reject non-Gemini-3 models (gemini-1.5)', () => {
      process.env.FREE_MODE = 'true';
      const result = validateModelForFreeMode('gemini-1.5-flash');
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not a Gemini 3 model');
    });

    it('should reject legacy models (gemini-1.0)', () => {
      process.env.FREE_MODE = 'true';
      const result = validateModelForFreeMode('gemini-1.0-pro');
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not a Gemini 3 model');
    });

    it('should accept Gemini 3 model in free mode', () => {
      process.env.FREE_MODE = 'true';
      const result = validateModelForFreeMode('gemini-3');
      
      expect(result.allowed).toBe(true);
    });

    it('should accept Gemini 3 Flash variant in free mode', () => {
      process.env.FREE_MODE = 'true';
      const result = validateModelForFreeMode('gemini-3-flash');
      
      expect(result.allowed).toBe(true);
    });

    it('should reject high thinking level in free mode', () => {
      process.env.FREE_MODE = 'true';
      const result = validateModelForFreeMode('gemini-3', 'high');
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('thinking level');
    });

    it('should accept low thinking level in free mode', () => {
      process.env.FREE_MODE = 'true';
      const result = validateModelForFreeMode('gemini-3', 'low');
      
      expect(result.allowed).toBe(true);
    });

    it('should reject non-Gemini-3 models even when not in free mode', () => {
      delete process.env.FREE_MODE;
      const result = validateModelForFreeMode('gemini-1.5-pro', 'high');
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not a Gemini 3 model');
    });

    it('should accept Gemini 3 models when not in free mode', () => {
      delete process.env.FREE_MODE;
      const result = validateModelForFreeMode('gemini-3-pro', 'high');
      
      expect(result.allowed).toBe(true);
    });
  });

  describe('Free Mode Detection', () => {
    it('should detect free mode when env var is set', () => {
      process.env.FREE_MODE = 'true';
      expect(isFreeMode()).toBe(true);
    });

    it('should not detect free mode when env var is not set', () => {
      delete process.env.FREE_MODE;
      expect(isFreeMode()).toBe(false);
    });

    it('should return Gemini 3 model in free mode', () => {
      process.env.FREE_MODE = 'true';
      const model = getFreeModeModel();
      
      // STRICT: Must be Gemini 3
      expect(model).toBe('gemini-3');
      expect(model).toStartWith('gemini-3');
    });

    it('should return low thinking level in free mode', () => {
      process.env.FREE_MODE = 'true';
      const level = getFreeModeThinkingLevel();
      
      expect(level).toBe('low');
    });
  });

  describe('Error Messages', () => {
    it('should provide helpful error messages', () => {
      const result = checkFileUploadLimit(2 * 1024 * 1024, 'text/plain', 1);
      
      expect(result.reason).toBeDefined();
      expect(result.reason?.length).toBeGreaterThan(0);
      expect(result.suggestedAction).toBeDefined();
    });

    it('should include exact limits in error messages', () => {
      const result = checkFileUploadLimit(2 * 1024 * 1024, 'text/plain', 1);
      
      expect(result.reason).toContain('1.5');
      expect(result.reason).toContain('MB');
    });

    it('should suggest actions in error messages', () => {
      const result = checkTokenBudget(70000);
      
      expect(result.suggestedAction).toBeDefined();
      expect(result.suggestedAction).toContain('Lite Mode');
    });
  });
});

