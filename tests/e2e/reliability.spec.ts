/**
 * Reliability E2E Tests
 * Tests resume functionality after step failure
 */

import { test, expect } from './fixtures';
import * as path from 'path';

test.describe('Reliability', () => {
  test('should resume analysis after step failure', async ({ page, mockAPI, testDocument }) => {
    let runAttempt = 0;

    // Mock orchestrator to fail on first run, succeed on resume
    await page.route('**/api/case/*/run', async (route) => {
      runAttempt++;
      
      if (runAttempt === 1) {
        // First run fails at step 3
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            caseId: 'test-case-123',
            failedAtStep: 3,
            stepsCompleted: 2,
            stepsFailed: 1,
            error: 'Step 3 failed',
          }),
        });
      } else {
        // Resume succeeds
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            caseId: 'test-case-123',
            stepsCompleted: 4,
            stepsSkipped: 2,
            stepsFailed: 0,
          }),
        });
      }
    });

    // Mock steps endpoint to show failed step
    await page.route('**/api/case/*/steps', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          steps: [
            { stepNumber: 1, status: 'completed' },
            { stepNumber: 2, status: 'completed' },
            { stepNumber: 3, status: 'failed', errors: ['Step 3 failed'] },
            { stepNumber: 4, status: 'pending' },
            { stepNumber: 5, status: 'pending' },
            { stepNumber: 6, status: 'pending' },
          ],
        }),
      });
    });

    // Navigate and start workflow
    await page.goto('/');
    await page.click('text=Create Case');
    await page.fill('input[name="title"]', 'Resume Test Case');
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=Case created', { timeout: 5000 });

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testDocument.path);
    await page.waitForSelector('text=Upload complete', { timeout: 10000 });

    // Run analysis (will fail)
    await page.click('text=Run Analysis');
    await page.waitForSelector('text=Analysis Failed', { timeout: 30000 });

    // Verify failure message
    await expect(page.locator('text=Step 3 failed')).toBeVisible({ timeout: 5000 });

    // Verify resume button is visible
    const resumeButton = page.locator('text=Resume').or(page.locator('button:has-text("Resume")'));
    await expect(resumeButton).toBeVisible();

    // Click resume button
    await resumeButton.click();

    // Wait for resume to complete
    await page.waitForSelector('text=Analysis Complete', { timeout: 30000 });

    // Verify all steps completed
    await expect(page.locator('text=All steps completed')).toBeVisible({ timeout: 5000 });
  });
});

