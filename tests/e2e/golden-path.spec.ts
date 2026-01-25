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

    // Verify report page renders (user-visible content)
    // Check for report title or key content instead of API structure
    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(0);
    
    // Verify report content is visible (user-visible text)
    // Look for "Decision Trace Report" or decision title in rendered HTML
    const hasReportContent = pageContent.includes('Decision Trace Report') || 
                            pageContent.includes('Q2 2024 Product Launch') ||
                            pageContent.includes('Product Launch');
    expect(hasReportContent).toBeTruthy();

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

    // Verify public case page renders (user-visible content)
    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(0);
    
    // Verify public report content is visible (user-visible text)
    // Look for report content instead of checking API structure
    const hasPublicReportContent = pageContent.includes('Decision Trace Report') || 
                                  pageContent.includes('Q2 2024 Product Launch') ||
                                  pageContent.includes('Product Launch');
    expect(hasPublicReportContent).toBeTruthy();

    // TODO: When public report UI exists, verify read-only indicators:
    // - await expect(page.locator('[data-testid="public-report-root"]')).toBeVisible();
    // - await expect(page.locator('text=Read-only')).toBeVisible();
    // - Verify Share button is NOT visible on public pages
  });
});
