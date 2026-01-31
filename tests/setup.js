/**
 * Test setup file - runs before all tests
 * Sets up mocks and test environment
 */

import { vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Node.js 20+ has native File, Blob, FormData, Headers, Request, Response
// These are already available in globalThis, but we ensure they're not overridden
// Node.js 22+ has native fetch as well

// Verify native Web APIs are available (Node.js 20+)
if (!globalThis.File) {
  throw new Error('File is not available - Node.js 20+ required');
}
if (!globalThis.Blob) {
  throw new Error('Blob is not available - Node.js 20+ required');
}
if (!globalThis.FormData) {
  throw new Error('FormData is not available - Node.js 20+ required');
}

// jsdom environment may override native File, so we ensure Node.js native File is used
// Store native File before jsdom potentially overrides it
const NativeFile = globalThis.File;
const NativeBlob = globalThis.Blob;
const NativeFormData = globalThis.FormData;

// After jsdom loads, restore native implementations if they were overridden
// This ensures File.arrayBuffer() works correctly
if (NativeFile && typeof NativeFile.prototype.arrayBuffer === 'function') {
  // Restore native File if it has arrayBuffer()
  globalThis.File = NativeFile;
  globalThis.Blob = NativeBlob;
  globalThis.FormData = NativeFormData;
}

// Ensure fetch is available (Node.js 18+ has native fetch)
if (!globalThis.fetch) {
  // Fallback to undici if native fetch is not available
  try {
    const { fetch: undiciFetch } = require('undici');
    globalThis.fetch = undiciFetch;
  } catch (e) {
    console.warn('⚠️  Fetch not available - Node.js 18+ required for native fetch');
  }
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

// Ensure tmp/ directory exists for SQLite databases
const tmpDir = path.join(process.cwd(), 'tmp');
fs.mkdirSync(tmpDir, { recursive: true });

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

