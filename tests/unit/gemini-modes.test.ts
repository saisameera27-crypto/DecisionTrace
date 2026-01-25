/**
 * Unit Tests for Gemini Client Test Modes
 * Tests mock, replay, and live mode functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { callGeminiAPI, uploadFileToGemini, GeminiCallOptions } from '@/lib/gemini';
import * as fs from 'fs';
import * as path from 'path';

describe('Gemini Client Test Modes', () => {
  const originalEnv = process.env;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    process.env = originalEnv;
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('Mock Mode', () => {
    it('should return deterministic canned JSON for step1', async () => {
      process.env.GEMINI_TEST_MODE = 'mock';
      
      const response = await callGeminiAPI({
        stepName: 'step1',
      });
      
      expect(response).toBeDefined();
      expect(response.candidates).toBeDefined();
      expect(response.candidates.length).toBeGreaterThan(0);
      expect(response.candidates[0].content.parts[0].text).toBeDefined();
      
      // Verify it contains step1 data
      const text = response.candidates[0].content.parts[0].text;
      const parsed = JSON.parse(text);
      expect(parsed.step).toBe(1);
    });

    it('should return deterministic canned JSON for step2', async () => {
      process.env.GEMINI_TEST_MODE = 'mock';
      
      const response = await callGeminiAPI({
        stepName: 'step2',
      });
      
      const text = response.candidates[0].content.parts[0].text;
      const parsed = JSON.parse(text);
      expect(parsed.step).toBe(2);
      expect(parsed.data).toHaveProperty('case_id');
    });

    it('should return step fixtures for steps 1-6', async () => {
      process.env.GEMINI_TEST_MODE = 'mock';
      
      for (let step = 1; step <= 6; step++) {
        const response = await callGeminiAPI({
          stepName: `step${step}`,
        });
        
        const text = response.candidates[0].content.parts[0].text;
        const parsed = JSON.parse(text);
        expect(parsed.step).toBe(step);
      }
    });

    it('should fallback to default.json for unknown step', async () => {
      process.env.GEMINI_TEST_MODE = 'mock';
      
      const response = await callGeminiAPI({
        stepName: 'unknown_step',
      });
      
      expect(response).toBeDefined();
      expect(response.candidates).toBeDefined();
    });
  });

  describe('Replay Mode', () => {
    it('should look up response by caseId and stepName', async () => {
      process.env.GEMINI_TEST_MODE = 'replay';
      
      // Create a replay fixture
      const replayDir = path.join(process.cwd(), 'test-data', 'gemini', 'recorded', 'replay');
      if (!fs.existsSync(replayDir)) {
        fs.mkdirSync(replayDir, { recursive: true });
      }
      
      const replayFile = path.join(replayDir, 'test_case_step2.json');
      const mockReplayResponse = {
        candidates: [{
          content: {
            parts: [{ text: JSON.stringify({ step: 2, replay: true }) }],
            role: 'model',
          },
          finishReason: 'STOP',
          index: 0,
        }],
        usageMetadata: {
          promptTokenCount: 50,
          candidatesTokenCount: 100,
          totalTokenCount: 150,
        },
      };
      
      fs.writeFileSync(replayFile, JSON.stringify(mockReplayResponse, null, 2));
      
      const response = await callGeminiAPI({
        caseId: 'test_case',
        stepName: 'step2',
      });
      
      expect(response).toBeDefined();
      const text = response.candidates[0].content.parts[0].text;
      const parsed = JSON.parse(text);
      expect(parsed.replay).toBe(true);
      
      // Cleanup
      fs.unlinkSync(replayFile);
    });

    it('should fallback to mock if replay not found', async () => {
      process.env.GEMINI_TEST_MODE = 'replay';
      
      const response = await callGeminiAPI({
        caseId: 'nonexistent_case',
        stepName: 'step1',
      });
      
      // Should fallback to mock
      expect(response).toBeDefined();
      const text = response.candidates[0].content.parts[0].text;
      const parsed = JSON.parse(text);
      expect(parsed.step).toBe(1);
    });

    it('should throw error if caseId or stepName missing', async () => {
      process.env.GEMINI_TEST_MODE = 'replay';
      
      await expect(
        callGeminiAPI({ stepName: 'step1' })
      ).rejects.toThrow('caseId and stepName required');
      
      await expect(
        callGeminiAPI({ caseId: 'case_123' })
      ).rejects.toThrow('caseId and stepName required');
    });
  });

  describe('Live Mode', () => {
    it('should throw error if GEMINI_API_KEY not set', async () => {
      process.env.GEMINI_TEST_MODE = 'live';
      delete process.env.GEMINI_API_KEY;
      
      await expect(
        callGeminiAPI({ stepName: 'step1' })
      ).rejects.toThrow('GEMINI_API_KEY is required');
    });

    it('should prevent test modes (mock/replay) in production', async () => {
      process.env.GEMINI_TEST_MODE = 'mock';
      process.env.NODE_ENV = 'production';
      
      await expect(
        callGeminiAPI({ stepName: 'step1' })
      ).rejects.toThrow('Test modes are not allowed in production');
    });

    it('should allow live mode in production (but require API key)', async () => {
      process.env.GEMINI_TEST_MODE = 'live';
      process.env.NODE_ENV = 'production';
      delete process.env.GEMINI_API_KEY;
      
      // Should require API key even in production
      await expect(
        callGeminiAPI({ stepName: 'step1' })
      ).rejects.toThrow('GEMINI_API_KEY is required');
    });
  });

  describe('File Upload', () => {
    it('should return mock file URI in mock mode', async () => {
      process.env.GEMINI_TEST_MODE = 'mock';
      
      const result = await uploadFileToGemini(
        Buffer.from('test content'),
        'text/plain',
        'test.txt'
      );
      
      expect(result.uri).toBeDefined();
      expect(result.uri).toContain('gs://gemini-files/');
      expect(result.mimeType).toBe('text/plain');
      expect(result.name).toBe('test.txt');
    });

    it('should return mock file URI in replay mode', async () => {
      process.env.GEMINI_TEST_MODE = 'replay';
      
      const result = await uploadFileToGemini(
        Buffer.from('test content'),
        'text/plain',
        'test.txt'
      );
      
      expect(result.uri).toBeDefined();
      expect(result.uri).toContain('gs://gemini-files/');
    });

    it('should prevent test modes in production for file upload', async () => {
      process.env.GEMINI_TEST_MODE = 'mock';
      process.env.NODE_ENV = 'production';
      
      await expect(
        uploadFileToGemini(Buffer.from('test'), 'text/plain', 'test.txt')
      ).rejects.toThrow('Test modes are not allowed in production');
    });
  });

  describe('Default Behavior', () => {
    it('should default to mock mode in test environment', async () => {
      delete process.env.GEMINI_TEST_MODE;
      process.env.NODE_ENV = 'test';
      
      const response = await callGeminiAPI({
        stepName: 'step1',
      });
      
      expect(response).toBeDefined();
      const text = response.candidates[0].content.parts[0].text;
      const parsed = JSON.parse(text);
      expect(parsed.step).toBe(1);
    });
  });
});

