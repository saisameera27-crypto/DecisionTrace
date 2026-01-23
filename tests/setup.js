/**
 * Test setup file - runs before all tests
 * Sets up mocks and test environment
 */

import { vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Ensure fetch is available (Node 18+ has native fetch, but we ensure it's available)
if (typeof globalThis.fetch === 'undefined') {
  // If fetch is not available, we could use undici or node-fetch
  // But Node 22+ has native fetch, so this is mainly for compatibility
  console.warn('⚠️  Fetch not available - Node 18+ required for native fetch');
}

// Mock Gemini API by default - tests run without real API key
const mockGeminiAPI = () => {
  // Store original fetch if it exists
  const originalFetch = globalThis.fetch;
  
  // Mock fetch for Gemini API calls
  globalThis.fetch = vi.fn((url, options) => {
    // If it's a Gemini API call, return mocked response
    if (typeof url === 'string' && url.includes('generativelanguage.googleapis.com')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => {
          // Try to load recorded response if available
          const recordedPath = path.join(process.cwd(), 'test-data', 'gemini', 'recorded', 'default.json');
          if (fs.existsSync(recordedPath)) {
            const recorded = JSON.parse(fs.readFileSync(recordedPath, 'utf-8'));
            return recorded;
          }
          // Default mock response
          return {
            candidates: [{
              content: {
                parts: [{ text: 'Mocked Gemini API response' }]
              }
            }]
          };
        },
        text: async () => 'Mocked Gemini API response'
      });
    }
    // For other URLs, use real fetch (Node 22+ has native fetch)
    if (originalFetch) {
      return originalFetch(url, options);
    }
    // Fallback if fetch is not available (shouldn't happen on Node 18+)
    throw new Error('Fetch not available and URL is not a Gemini API call');
  });
};

// Setup environment
process.env.NODE_ENV = 'test';
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'mock-api-key-for-testing';

// Initialize mocks
mockGeminiAPI();

// Global test utilities
global.loadTestData = (relativePath) => {
  const fullPath = path.join(process.cwd(), 'test-data', relativePath);
  if (fs.existsSync(fullPath)) {
    return JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
  }
  throw new Error(`Test data not found: ${fullPath}`);
};

global.loadRecordedGeminiResponse = (filename) => {
  const fullPath = path.join(process.cwd(), 'test-data', 'gemini', 'recorded', filename);
  if (fs.existsSync(fullPath)) {
    return JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
  }
  throw new Error(`Recorded Gemini response not found: ${fullPath}`);
};

console.log('✅ Test setup complete - Gemini API mocked by default');
console.log(`✅ Node.js version: ${process.version}`);
console.log(`✅ Fetch available: ${typeof globalThis.fetch !== 'undefined'}`);

