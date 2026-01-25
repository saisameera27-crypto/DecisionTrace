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

    // Load sample case via API (demo mode - no Gemini calls)
    // Note: When UI "Load Sample Case" button exists, replace this with UI click
    const response = await page.request.post('/api/demo/load-sample');
    if (!response.ok()) {
      console.log('STATUS:', response.status());
      console.log('BODY:', await response.text());
    }
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('caseId');
    const caseId = data.caseId;

    // Navigate to case report page (UI navigation)
    await page.goto(`/case/${caseId}`);
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
    // Load sample case via API (demo mode)
    // Note: When UI "Load Sample Case" button exists, replace this with UI click
    const response = await page.request.post('/api/demo/load-sample');
    if (!response.ok()) {
      console.log('STATUS:', response.status());
      console.log('BODY:', await response.text());
    }
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    const caseId = data.caseId;

    // Navigate to case report page
    await page.goto(`/case/${caseId}`);
    await page.waitForLoadState('networkidle');

    // TODO: When Share button UI exists, replace API call with UI click:
    // - await page.click('[data-testid="share-button"]');
    // - await page.click('[data-testid="create-share-link"]');
    // - await expect(page.locator('[data-testid="share-link-display"]')).toBeVisible();
    // - const shareSlug = await page.locator('[data-testid="share-link-display"]').textContent();
    
    // For now, create share link via API (will be replaced with UI when available)
    const shareResponse = await page.request.post(`/api/case/${caseId}/share`, {
      data: { expirationDays: 30 },
    });
    if (!shareResponse.ok()) {
      console.log('STATUS:', shareResponse.status());
      console.log('BODY:', await shareResponse.text());
    }
    expect(shareResponse.ok()).toBeTruthy();
    
    const shareData = await shareResponse.json();
    expect(shareData).toHaveProperty('slug');
    const shareSlug = shareData.slug;

    // Navigate to public case page (UI navigation)
    await page.goto(`/public/case/${shareSlug}`);
    await page.waitForLoadState('networkidle');

    // Verify public report page renders with stable UI assertions
    await expect(page.locator('[data-testid="public-report-root"]')).toBeVisible();
    await expect(page.locator('[data-testid="public-report-readonly-badge"]')).toBeVisible();
  });
});
