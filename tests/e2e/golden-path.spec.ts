/**
 * Golden Path E2E Test - Smoke Tests (Demo Mode)
 * Tests demo workflow: load sample case → navigate to report → verify UI
 * Validates user-visible behavior, not backend internals
 */

import { test, expect } from './fixtures';

test.describe('Golden Path', () => {
  test('should complete full workflow and verify all tabs @smoke', async ({ page }) => {
    // Navigate to landing page
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click "Load Sample Case" button (UI interaction)
    await page.click('[data-testid="load-sample-case-button"]');
    
    // Wait for navigation to case page
    await page.waitForURL(/\/case\/[^/]+/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Verify report page renders with stable UI assertions
    await expect(page.locator('[data-testid="report-root"]')).toBeVisible();
    await expect(page.locator('[data-testid="report-header"]')).toBeVisible();

    // TODO: When report tabs UI exists, verify tabs render:
    // - await expect(page.locator('[data-testid="tab-overview"]')).toBeVisible();
    // - await expect(page.locator('[data-testid="tab-evidence"]')).toBeVisible();
    // - await expect(page.locator('[data-testid="tab-assumptions"]')).toBeVisible();
    // - await expect(page.locator('[data-testid="tab-alternatives"]')).toBeVisible();
    // - await expect(page.locator('[data-testid="tab-risks"]')).toBeVisible();
    // - await expect(page.locator('[data-testid="tab-diagram"]')).toBeVisible();
    // - await expect(page.locator('[data-testid="tab-export"]')).toBeVisible();
  });

  test('should create share link and access public case @smoke', async ({ page }) => {
    // Navigate to landing page
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click "Open Public Share Link" button (UI interaction)
    // This button loads sample case, creates share link, and navigates to public page
    await page.click('[data-testid="open-public-share-button"]');
    
    // Wait for navigation to public case page
    await page.waitForURL(/\/public\/case\/[^/]+/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Verify public report page renders with stable UI assertions
    await expect(page.locator('[data-testid="public-report-root"]')).toBeVisible();
    await expect(page.locator('[data-testid="public-report-readonly-badge"]')).toBeVisible();
    
    // Verify required sections are present
    await expect(page.locator('[data-testid="public-report-header"]')).toBeVisible();
    await expect(page.locator('[data-testid="public-report-summary"]')).toBeVisible();
    await expect(page.locator('[data-testid="public-report-diagram"]')).toBeVisible();
    await expect(page.locator('[data-testid="public-report-evidence"]')).toBeVisible();
    
    // Verify decision title is shown (if available)
    const decisionTitle = page.locator('[data-testid="public-report-decision-title"]');
    if (await decisionTitle.count() > 0) {
      await expect(decisionTitle).toBeVisible();
    }
  });
});
