/**
 * Gemini API Mock Helper
 * Provides utilities for mocking Gemini API responses in tests
 */

import * as fs from 'fs';
import * as path from 'path';
import { vi } from 'vitest';

/**
 * Load a recorded Gemini API response from test-data
 * @param {string} filename - Name of the recorded response file
 * @returns {Promise<Object>} The recorded API response
 */
export function loadRecordedResponse(filename) {
  const filePath = path.join(process.cwd(), 'test-data', 'gemini', 'recorded', filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Recorded response not found: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

/**
 * Mock Gemini API to return a specific recorded response
 * @param {string} filename - Name of the recorded response file
 */
export function mockGeminiResponse(filename) {
  const response = loadRecordedResponse(filename);
  
  global.fetch = vi.fn((url) => {
    if (typeof url === 'string' && url.includes('generativelanguage.googleapis.com')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => response,
        text: async () => JSON.stringify(response)
      });
    }
    // Use real fetch for other URLs
    return fetch(url);
  });
  
  return response;
}

/**
 * Mock Gemini API to return a custom response
 * @param {Object} response - Custom response object
 */
export function mockGeminiCustomResponse(response) {
  global.fetch = vi.fn((url) => {
    if (typeof url === 'string' && url.includes('generativelanguage.googleapis.com')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => response,
        text: async () => JSON.stringify(response)
      });
    }
    return fetch(url);
  });
}

/**
 * Mock Gemini API error response
 * @param {number} status - HTTP status code
 * @param {string} message - Error message
 */
export function mockGeminiError(status = 500, message = 'Internal Server Error') {
  global.fetch = vi.fn((url) => {
    if (typeof url === 'string' && url.includes('generativelanguage.googleapis.com')) {
      return Promise.resolve({
        ok: false,
        status,
        json: async () => ({ error: { message } }),
        text: async () => JSON.stringify({ error: { message } })
      });
    }
    return fetch(url);
  });
}

/**
 * Reset Gemini API mock to default behavior
 */
export function resetGeminiMock() {
  vi.restoreAllMocks();
}

/**
 * Get all available recorded responses
 * @returns {string[]} Array of filenames
 */
export function getRecordedResponses() {
  const dirPath = path.join(process.cwd(), 'test-data', 'gemini', 'recorded');
  if (!fs.existsSync(dirPath)) {
    return [];
  }
  return fs.readdirSync(dirPath).filter(file => file.endsWith('.json'));
}

