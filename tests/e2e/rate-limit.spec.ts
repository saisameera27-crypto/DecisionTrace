/**
 * Rate Limiting E2E Tests
 * Tests UI handling of 429 rate limit responses
 */

import { test, expect } from './fixtures';
import * as path from 'path';

test.describe('Rate Limiting', () => {
  test('should handle 429 rate limit gracefully', async ({ page, mockAPI, testDocument }) => {
    let requestCount = 0;

    // Mock rate limit on run endpoint
    await page.route('**/api/case/*/run', async (route) => {
      requestCount++;
      
      if (requestCount <= 2) {
        // First 2 requests get 429
        await route.fulfill({
          status: 429,
          contentType: 'application/json',
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 60),
          },
          body: JSON.stringify({
            error: 'Too many requests',
            message: 'Rate limit exceeded. Please try again later.',
            retryAfter: 60,
          }),
        });
      } else {
        // Third request succeeds
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            caseId: 'test-case-123',
            stepsCompleted: 6,
          }),
        });
      }
    });

    // Navigate and start workflow
    await page.goto('/');
    await page.click('text=Create Case');
    await page.fill('input[name="title"]', 'Rate Limit Test Case');
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=Case created', { timeout: 5000 });

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testDocument.path);
    await page.waitForSelector('text=Upload complete', { timeout: 10000 });

    // Try to run analysis (will hit rate limit)
    await page.click('text=Run Analysis');

    // Wait for rate limit error message
    await page.waitForSelector('text=Rate limit exceeded', { timeout: 10000 });

    // Verify error message is displayed
    await expect(page.locator('text=Too many requests')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Please try again later')).toBeVisible();

    // Verify retry information is shown
    await expect(
      page.locator('text=Retry after').or(page.locator('text=60 seconds'))
    ).toBeVisible({ timeout: 5000 });

    // Wait a bit and retry (should succeed on third attempt)
    await page.waitForTimeout(1000);
    await page.locator('text=Retry').or(page.locator('text=Run Analysis')).click();

    // Wait for success
    await page.waitForSelector('text=Analysis Complete', { timeout: 30000 });

    // Verify analysis completed successfully
    await expect(page.locator('text=Analysis Complete')).toBeVisible({ timeout: 5000 });
  });

  test('should show rate limit headers in error message', async ({ page, mockAPI }) => {
    // Mock rate limit response
    await page.route('**/api/**', async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        headers: {
          'Retry-After': '45',
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 45),
        },
        body: JSON.stringify({
          error: 'Too many requests',
          retryAfter: 45,
        }),
      });
    });

    await page.goto('/');
    
    // Trigger any API call
    await page.click('text=Create Case');
    await page.fill('input[name="title"]', 'Test');
    await page.click('button[type="submit"]');

    // Verify rate limit error is shown
    await page.waitForSelector('text=Rate limit exceeded', { timeout: 5000 });
    
    // Verify rate limit information is displayed
    await expect(page.locator('text=10 requests')).toBeVisible({ timeout: 5000 });
  });
});

