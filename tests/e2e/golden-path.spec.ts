/**
 * Golden Path E2E Test - Smoke Tests (QuickStart Flow)
 * Tests QuickStart workflow: upload file → run analysis → verify report
 * Validates user-visible behavior, not backend internals
 */

import { test, expect } from './fixtures';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

// ESM-safe __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test.describe('Golden Path', () => {
  test('should complete QuickStart workflow and verify report @smoke', async ({ page }) => {
    // Navigate to landing page
    await page.goto('/');

    // Navigate to QuickStart page
    await page.goto('/quick');
    
    // Wait for QuickStart page to be ready (wait for upload button to be visible)
    await expect(page.locator('[data-testid="qs-upload"]')).toBeVisible({ timeout: 10000 });

    // Upload fixture file - set file directly on the hidden file input
    // The file input is hidden but we can set files on it directly
    const fileInput = page.locator('input[type="file"]');
    // Wait for file input to be attached to DOM
    await expect(fileInput).toBeAttached({ timeout: 5000 });
    // Resolve to absolute path: from tests/e2e/ go up to project root, then to fixtures/
    const fixturePath = resolve(__dirname, '../../fixtures/messy-hiring-thread.txt');
    await fileInput.setInputFiles(fixturePath);

    // Wait for upload status to appear
    await expect(page.locator('[data-testid="qs-status"]')).toContainText('Uploaded', { timeout: 10000 });

    // Click run button
    await page.click('[data-testid="qs-run"]');

    // Wait for navigation to case page (report is shown at /case/:id)
    await page.waitForURL(/\/case\/[^/]+/, { timeout: 30000 });

    // Verify report page renders with stable UI assertions (wait for specific elements, not networkidle)
    await expect(page.locator('[data-testid="report-root"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="report-header"]')).toBeVisible();
    await expect(page.locator('text=Decision Trace Report')).toBeVisible();
    
    // Assert Overview tab is visible (default active tab)
    await expect(page.locator('[data-testid="tab-overview"]')).toBeVisible();
    
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

    // Navigate to QuickStart page
    await page.goto('/quick');
    
    // Wait for QuickStart page to be ready (wait for demo link to be visible)
    await expect(page.locator('[data-testid="qs-demo-link"]')).toBeVisible({ timeout: 10000 });

    // Click demo link
    await page.click('[data-testid="qs-demo-link"]');

    // Wait for navigation to case page (report is shown at /case/:id)
    await page.waitForURL(/\/case\/[^/]+/, { timeout: 30000 });

    // Verify report page renders using stable UI assertions (wait for specific elements, not networkidle)
    await expect(page.locator('[data-testid="report-root"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="report-header"]')).toBeVisible();
    await expect(page.locator('text=Decision Trace Report')).toBeVisible();
    
    // Assert Overview tab is visible (default active tab)
    await expect(page.locator('[data-testid="tab-overview"]')).toBeVisible();
  });
});
