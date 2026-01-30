/**
 * Golden Path E2E Test - Smoke Tests (QuickStart Flow)
 * Tests QuickStart workflow: upload file → run analysis → verify report
 * Validates user-visible behavior, not backend internals
 */

import { test, expect } from './fixtures';
import * as path from 'path';

test.describe('Golden Path', () => {
  test('should complete QuickStart workflow and verify report @smoke', async ({ page }) => {
    // Navigate to landing page
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to QuickStart page
    await page.goto('/quick');
    await page.waitForLoadState('networkidle');

    // Upload fixture file - set file directly on the hidden file input
    // The file input is hidden but we can set files on it directly
    const fileInput = page.locator('input[type="file"]');
    const fixturePath = path.join(__dirname, '../../fixtures/messy-hiring-thread.txt');
    await fileInput.setInputFiles(fixturePath);

    // Wait for upload status to appear
    await expect(page.locator('[data-testid="qs-status"]')).toContainText('Uploaded', { timeout: 10000 });

    // Click run button
    await page.click('[data-testid="qs-run"]');

    // Wait for navigation to report page
    await page.waitForURL(/\/case\/[^/]+\/report/, { timeout: 30000 });
    await page.waitForLoadState('networkidle');

    // Verify report page renders with stable UI assertions
    await expect(page.locator('[data-testid="report-root"]')).toBeVisible();
    await expect(page.locator('[data-testid="report-header"]')).toBeVisible();
    
    // Assert Evidence tab is visible (stable marker)
    await expect(page.locator('[data-testid="tab-evidence"]')).toBeVisible();

    // Assert page contains at least one of: "conflict", "assumption", "risk" (case-insensitive)
    const pageContent = await page.content();
    const hasConflict = /conflict/i.test(pageContent);
    const hasAssumption = /assumption/i.test(pageContent);
    const hasRisk = /risk/i.test(pageContent);
    
    expect(hasConflict || hasAssumption || hasRisk).toBeTruthy();
  });

  test('should complete demo path via QuickStart @smoke', async ({ page }) => {
    // Navigate to landing page
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to QuickStart page
    await page.goto('/quick');
    await page.waitForLoadState('networkidle');

    // Click demo link
    await page.click('[data-testid="qs-demo-link"]');

    // Wait for navigation to report page
    await page.waitForURL(/\/case\/[^/]+\/report/, { timeout: 30000 });
    await page.waitForLoadState('networkidle');

    // Verify report page renders
    await expect(page.locator('[data-testid="report-root"]')).toBeVisible();
    await expect(page.locator('[data-testid="report-header"]')).toBeVisible();
  });
});
