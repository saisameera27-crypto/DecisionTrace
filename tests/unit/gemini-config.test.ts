/**
 * Gemini 3 Config Tests
 * Tests strict enforcement of Gemini 3 model usage
 */

import { describe, it, expect } from 'vitest';
import {
  GEMINI_MODEL,
  ALLOWED_MODELS,
  BLOCKED_MODELS,
  isGemini3Model,
  validateGemini3Model,
  getDefaultGemini3Model,
  isBlockedModel,
} from '@/lib/gemini/config';

describe('Gemini 3 Config - Strict Enforcement', () => {
  describe('Model Constants', () => {
    it('should have gemini-3 as the default model', () => {
      expect(GEMINI_MODEL).toBe('gemini-3');
    });

    it('should only include Gemini 3 variants in ALLOWED_MODELS', () => {
      ALLOWED_MODELS.forEach(model => {
        expect(model.startsWith('gemini-3')).toBe(true);
      });
    });

    it('should include blocked legacy models', () => {
      expect(BLOCKED_MODELS).toContain('gemini-1.0');
      expect(BLOCKED_MODELS).toContain('gemini-1.5');
      expect(BLOCKED_MODELS).toContain('gemini-1.5-flash');
    });
  });

  describe('isGemini3Model', () => {
    it('should return true for gemini-3', () => {
      expect(isGemini3Model('gemini-3')).toBe(true);
    });

    it('should return true for gemini-3 variants', () => {
      expect(isGemini3Model('gemini-3-flash')).toBe(true);
      expect(isGemini3Model('gemini-3-flash-preview')).toBe(true);
      expect(isGemini3Model('gemini-3-pro')).toBe(true);
      expect(isGemini3Model('gemini-3-pro-preview')).toBe(true);
    });

    it('should return false for gemini-1.5', () => {
      expect(isGemini3Model('gemini-1.5-flash')).toBe(false);
      expect(isGemini3Model('gemini-1.5-pro')).toBe(false);
    });

    it('should return false for gemini-1.0', () => {
      expect(isGemini3Model('gemini-1.0-pro')).toBe(false);
    });

    it('should return false for non-Gemini models', () => {
      expect(isGemini3Model('gpt-4')).toBe(false);
      expect(isGemini3Model('claude-3')).toBe(false);
    });
  });

  describe('isBlockedModel', () => {
    it('should return true for blocked models', () => {
      expect(isBlockedModel('gemini-1.5-flash')).toBe(true);
      expect(isBlockedModel('gemini-1.5-pro')).toBe(true);
      expect(isBlockedModel('gemini-1.0-pro')).toBe(true);
    });

    it('should return false for Gemini 3 models', () => {
      expect(isBlockedModel('gemini-3')).toBe(false);
      expect(isBlockedModel('gemini-3-flash')).toBe(false);
      expect(isBlockedModel('gemini-3-pro')).toBe(false);
    });
  });

  describe('validateGemini3Model', () => {
    it('should accept gemini-3', () => {
      expect(() => validateGemini3Model('gemini-3')).not.toThrow();
      expect(validateGemini3Model('gemini-3')).toBe('gemini-3');
    });

    it('should accept gemini-3 variants', () => {
      expect(() => validateGemini3Model('gemini-3-flash')).not.toThrow();
      expect(() => validateGemini3Model('gemini-3-pro')).not.toThrow();
      expect(() => validateGemini3Model('gemini-3-flash-preview')).not.toThrow();
    });

    it('should throw error for gemini-1.5', () => {
      expect(() => validateGemini3Model('gemini-1.5-flash')).toThrow();
      expect(() => validateGemini3Model('gemini-1.5-pro')).toThrow();
    });

    it('should throw error for gemini-1.0', () => {
      expect(() => validateGemini3Model('gemini-1.0-pro')).toThrow();
    });

    it('should throw error for blocked models', () => {
      expect(() => validateGemini3Model('gemini-1.5-flash')).toThrow(/blocked|not allowed/);
      expect(() => validateGemini3Model('gemini-1.5-pro')).toThrow(/blocked|not allowed/);
    });

    it('should throw error for non-Gemini models', () => {
      expect(() => validateGemini3Model('gpt-4')).toThrow('not a Gemini 3 model');
      expect(() => validateGemini3Model('claude-3')).toThrow('not a Gemini 3 model');
    });

    it('should return default model for empty string', () => {
      const result = validateGemini3Model('');
      expect(result).toBe('gemini-3');
    });
  });

  describe('getDefaultGemini3Model', () => {
    it('should return gemini-3', () => {
      expect(getDefaultGemini3Model()).toBe('gemini-3');
    });

    it('should match GEMINI_MODEL constant', () => {
      expect(getDefaultGemini3Model()).toBe(GEMINI_MODEL);
    });
  });

  describe('Error Messages', () => {
    it('should provide clear error for blocked models', () => {
      try {
        validateGemini3Model('gemini-1.5-flash');
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.message).toContain('not allowed');
        expect(error.message).toContain('Only Gemini 3 models');
        expect(error.message).toContain('gemini-3');
      }
    });

    it('should provide clear error for non-Gemini-3 models', () => {
      try {
        validateGemini3Model('gemini-2.0');
        expect.fail('Should have thrown');
      } catch (error: any) {
        // Blocked models use "not allowed", non-Gemini-3 use "not a Gemini 3 model"
        expect(error.message).toMatch(/not allowed|not a Gemini 3 model/);
        expect(error.message).toContain('Only Gemini 3 models');
        expect(error.message).toContain('gemini-3');
      }
    });
  });
});

