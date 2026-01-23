/**
 * Playwright Test Fixtures
 * Provides setup/teardown and helper utilities for E2E tests
 */

import { test as base, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Define custom fixture types
type CustomFixtures = {
  mockAPI: {};
  testDocument: { path: string; content: string };
};

// Test fixtures
export const test = base.extend<CustomFixtures>({
  // Mock API responses
  mockAPI: async ({ page }, use) => {
    // Setup API route mocking
    await page.route('**/api/**', async (route) => {
      const url = route.request().url();
      const method = route.request().method();

      // Mock responses based on route
      if (url.includes('/api/case') && method === 'POST') {
        // Create case
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-case-123',
            slug: 'test-case-slug-123',
            title: 'Test Case',
            status: 'draft',
          }),
        });
      } else if (url.includes('/api/files/upload') && method === 'POST') {
        // File upload
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            documentId: 'doc-123',
            geminiFileUri: 'gs://gemini-files/test-123',
          }),
        });
      } else if (url.includes('/api/case') && url.includes('/run') && method === 'POST') {
        // Run orchestrator
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            caseId: 'test-case-123',
            stepsCompleted: 6,
            stepsSkipped: 0,
            stepsFailed: 0,
          }),
        });
      } else if (url.includes('/api/case') && url.includes('/report') && method === 'GET') {
        // Get report
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            caseId: 'test-case-123',
            title: 'Test Case',
            status: 'completed',
            report: {
              finalNarrativeMarkdown: '# Test Report\n\nThis is a test report.',
              mermaidDiagram: 'graph TD\n    A[Start] --> B[End]',
              tokensUsed: 1500,
              durationMs: 2000,
            },
            decision: {
              caseId: 'test-case-123',
              decisionTitle: 'Q2 2024 Product Launch',
              decisionDate: '2024-03-15',
              decisionMaker: 'Sarah Chen',
              decisionStatus: 'APPROVED',
            },
            steps: [
              { stepNumber: 1, status: 'completed' },
              { stepNumber: 2, status: 'completed' },
              { stepNumber: 3, status: 'completed' },
              { stepNumber: 4, status: 'completed' },
              { stepNumber: 5, status: 'completed' },
              { stepNumber: 6, status: 'completed' },
            ],
          }),
        });
      } else {
        // Default response
        await route.continue();
      }
    });

    await use({});
  },

  // Load test document
  testDocument: async ({}, use) => {
    const docPath = path.join(process.cwd(), 'test-data', 'docs', 'positive', '01_launch_decision_memo.txt');
    const content = fs.readFileSync(docPath, 'utf-8');
    await use({ path: docPath, content });
  },
});

export { expect };

