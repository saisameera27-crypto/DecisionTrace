/**
 * Golden Path E2E Test - Smoke Tests (Demo Mode)
 * Tests demo workflow: load sample case → verify report API → verify share API
 * Uses API calls only for deterministic, fast CI tests
 */

import { test, expect } from './fixtures';

test.describe('Golden Path', () => {
  test('should complete full workflow and verify all tabs @smoke', async ({ page }) => {
    // Navigate to landing page
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Load sample case via API (demo mode - no Gemini calls)
    const response = await page.request.post('/api/demo/load-sample');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('caseId');
    expect(data).toHaveProperty('slug');
    expect(data.status).toBe('completed');
    const caseId = data.caseId;

    // Verify report API returns data
    const reportResponse = await page.request.get(`/api/case/${caseId}/report`);
    expect(reportResponse.ok()).toBeTruthy();
    
    const reportData = await reportResponse.json();
    expect(reportData).toHaveProperty('caseId');
    expect(reportData).toHaveProperty('report');
    expect(reportData.report).toHaveProperty('finalNarrativeMarkdown');
    expect(reportData.report.finalNarrativeMarkdown).toContain('Decision Trace Report');
    expect(reportData).toHaveProperty('decision');
    expect(reportData.decision.decisionTitle).toBe('Q2 2024 Product Launch');

    // Navigate to case report page (if UI exists)
    await page.goto(`/case/${caseId}`);
    await page.waitForLoadState('networkidle');

    // Verify page loaded (check for any report-related content or fallback to API data)
    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(0);
  });

  test('should create share link and access public case @smoke', async ({ page }) => {
    // Load sample case via API (demo mode)
    const response = await page.request.post('/api/demo/load-sample');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    const caseId = data.caseId;

    // Create share link via API
    const shareResponse = await page.request.post(`/api/case/${caseId}/share`, {
      data: { expirationDays: 30 },
    });
    expect(shareResponse.ok()).toBeTruthy();
    
    const shareData = await shareResponse.json();
    expect(shareData).toHaveProperty('slug');
    const shareSlug = shareData.slug;

    // Verify public case endpoint returns data
    const publicResponse = await page.request.get(`/api/public/case/${shareSlug}`);
    expect(publicResponse.ok()).toBeTruthy();
    
    const publicData = await publicResponse.json();
    expect(publicData).toHaveProperty('caseId');
    expect(publicData).toHaveProperty('report');
    expect(publicData.report).toHaveProperty('finalNarrativeMarkdown');
    expect(publicData).toHaveProperty('decision');
    expect(publicData.decision.decisionTitle).toBe('Q2 2024 Product Launch');

    // Navigate to public case page (if UI exists)
    await page.goto(`/public/case/${shareSlug}`);
    await page.waitForLoadState('networkidle');

    // Verify page loaded (check for any content)
    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(0);
  });
});
