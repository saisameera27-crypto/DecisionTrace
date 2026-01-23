/**
 * Example Integration Test
 * Tests interactions between components and API integrations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { mockGeminiResponse, resetGeminiMock } from '../helpers/gemini-mock.js';
import * as fs from 'fs';
import * as path from 'path';

describe('Decision Analysis - Integration Tests', () => {
  beforeEach(() => {
    resetGeminiMock();
  });

  it('should analyze decision documents end-to-end', async () => {
    // Mock Gemini API with recorded response
    mockGeminiResponse('analysis-1.json');
    
    // Load test document
    const testDoc = JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), 'test-data', 'docs', 'positive', 'decision-1.json'),
        'utf-8'
      )
    );
    
    // Load expected normalized output
    const expectedOutput = JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), 'test-data', 'expected', 'normalized', 'decision-1.json'),
        'utf-8'
      )
    );
    
    // Example integration test logic
    // const result = await analyzeDecision(testDoc);
    // expect(result).toEqual(expectedOutput);
    
    expect(testDoc).toBeDefined();
    expect(expectedOutput).toBeDefined();
  });

  it('should handle API payloads correctly', () => {
    // Load API payload from test-data/api/payloads/
    const payload = JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), 'test-data', 'api', 'payloads', 'request-1.json'),
        'utf-8'
      )
    );
    
    // Test payload structure
    expect(payload).toBeDefined();
    // Add your actual integration test logic here
  });
});

