/**
 * Golden Path E2E Test
 * Tests complete workflow: create case → upload → run → verify all tabs
 */

import { test, expect } from './fixtures';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Golden Path', () => {
  test('should complete full workflow and verify all tabs', async ({ page, mockAPI, testDocument }) => {
    // Navigate to application
    await page.goto('/');

    // 1. Create case
    await page.click('text=Create Case');
    await page.fill('input[name="title"]', 'Q2 2024 Product Launch Decision');
    await page.click('button[type="submit"]');

    // Wait for case creation
    await page.waitForSelector('text=Case created', { timeout: 5000 });

    // 2. Upload document
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testDocument.path);

    // Wait for upload to complete
    await page.waitForSelector('text=Upload complete', { timeout: 10000 });

    // 3. Run orchestrator
    await page.click('text=Run Analysis');
    
    // Wait for analysis to complete
    await page.waitForSelector('text=Analysis Complete', { timeout: 30000 });

    // 4. Verify all 7 tabs render and contain expected elements
    const tabs = [
      { name: 'Overview', expected: ['Decision Title', 'Decision Date', 'Decision Maker'] },
      { name: 'Evidence', expected: ['Evidence Table', 'Filter'] },
      { name: 'Risks', expected: ['Risk Heatmap', 'Risk Matrix'] },
      { name: 'Stakeholders', expected: ['Stakeholder List'] },
      { name: 'Timeline', expected: ['Timeline View'] },
      { name: 'Diagram', expected: ['Mermaid Diagram'] },
      { name: 'Export', expected: ['Download PDF', 'Download SVG', 'Download JSON'] },
    ];

    for (const tab of tabs) {
      await page.click(`text=${tab.name}`);
      
      // Verify tab is active
      await expect(page.locator(`[role="tab"][aria-selected="true"]`)).toContainText(tab.name);

      // Verify expected elements are present
      for (const element of tab.expected) {
        await expect(page.locator(`text=${element}`).first()).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should export PDF, SVG, and JSON', async ({ page, mockAPI, testDocument }) => {
    // Setup download listener
    const downloadPromises: Promise<string>[] = [];
    
    page.on('download', async (download) => {
      const fileName = download.suggestedFilename();
      const filePath = path.join('/tmp', fileName);
      await download.saveAs(filePath);
      downloadPromises.push(Promise.resolve(filePath));
    });

    // Navigate and complete workflow
    await page.goto('/');
    await page.click('text=Create Case');
    await page.fill('input[name="title"]', 'Export Test Case');
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=Case created', { timeout: 5000 });

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testDocument.path);
    await page.waitForSelector('text=Upload complete', { timeout: 10000 });

    await page.click('text=Run Analysis');
    await page.waitForSelector('text=Analysis Complete', { timeout: 30000 });

    // Navigate to Export tab
    await page.click('text=Export');

    // Test PDF export
    const pdfPromise = page.waitForEvent('download', { timeout: 10000 });
    await page.click('text=Download PDF');
    const pdfDownload = await pdfPromise;
    expect(pdfDownload.suggestedFilename()).toMatch(/\.pdf$/i);

    // Test SVG export
    const svgPromise = page.waitForEvent('download', { timeout: 10000 });
    await page.click('text=Download SVG');
    const svgDownload = await svgPromise;
    expect(svgDownload.suggestedFilename()).toMatch(/\.svg$/i);

    // Test JSON export
    const jsonPromise = page.waitForEvent('download', { timeout: 10000 });
    await page.click('text=Download JSON');
    const jsonDownload = await jsonPromise;
    expect(jsonDownload.suggestedFilename()).toMatch(/\.json$/i);
  });

  test('should create share link and access public case', async ({ page, mockAPI, testDocument }) => {
    // Mock share creation
    await page.route('**/api/case/*/share', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          shareId: 'share-123',
          slug: 'test-share-slug-123',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          url: '/public/case/test-share-slug-123',
        }),
      });
    });

    // Mock public case endpoint
    await page.route('**/api/public/case/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          caseId: 'test-case-123',
          title: 'Test Case',
          report: {
            finalNarrativeMarkdown: '# Public Report',
            mermaidDiagram: 'graph TD\n    A --> B',
          },
          decision: {
            decisionTitle: 'Q2 2024 Product Launch',
          },
        }),
      });
    });

    // Navigate and complete workflow
    await page.goto('/');
    await page.click('text=Create Case');
    await page.fill('input[name="title"]', 'Share Test Case');
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=Case created', { timeout: 5000 });

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testDocument.path);
    await page.waitForSelector('text=Upload complete', { timeout: 10000 });

    await page.click('text=Run Analysis');
    await page.waitForSelector('text=Analysis Complete', { timeout: 30000 });

    // Create share link
    await page.click('text=Share');
    await page.click('text=Create Share Link');
    
    // Wait for share link to be created
    await page.waitForSelector('text=Share link created', { timeout: 5000 });
    
    // Get share URL
    const shareUrl = await page.locator('input[readonly]').inputValue();
    expect(shareUrl).toContain('/public/case/');

    // Open share link in new page
    const sharePage = await page.context().newPage();
    await sharePage.goto(shareUrl);

    // Verify public case page loads
    await expect(sharePage.locator('text=Public Report')).toBeVisible({ timeout: 5000 });
    await expect(sharePage.locator('text=Q2 2024 Product Launch')).toBeVisible();

    await sharePage.close();
  });
});

