/**
 * Messy Path E2E Tests
 * Tests error cases: conflicts and missing evidence
 */

import { test, expect } from './fixtures';
import * as path from 'path';

test.describe('Messy Path', () => {
  test('should show conflicts filter with email thread', async ({ page, mockAPI }) => {
    // Mock report with conflicts
    await page.route('**/api/case/*/report', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          caseId: 'test-case-123',
          report: {
            finalNarrativeMarkdown: '# Report with Conflicts',
          },
          decision: {
            decisionTitle: 'Hiring Decision',
          },
          steps: [
            {
              stepNumber: 2,
              status: 'completed',
              data: JSON.stringify({
                conflicts: [
                  { id: '1', claim: 'Candidate A is best', conflicts: true },
                  { id: '2', claim: 'Candidate B is best', conflicts: true },
                ],
              }),
            },
          ],
        }),
      });
    });

    // Navigate and upload email thread
    await page.goto('/');
    await page.click('text=Create Case');
    await page.fill('input[name="title"]', 'Hiring Decision');
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=Case created', { timeout: 5000 });

    const emailThreadPath = path.join(__dirname, '../../fixtures/messy-hiring-thread.txt');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(emailThreadPath);
    await page.waitForSelector('text=Upload complete', { timeout: 10000 });

    await page.click('text=Run Analysis');
    await page.waitForSelector('text=Analysis Complete', { timeout: 30000 });

    // Navigate to Evidence tab
    await page.click('text=Evidence');

    // Click Conflicts filter
    await page.click('text=Conflicts');

    // Verify conflicts are shown
    await expect(page.locator('text=Candidate A is best')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Candidate B is best')).toBeVisible();

    // Verify row count shows conflicts
    const rowCount = page.locator('[data-testid="row-count"]');
    await expect(rowCount).toContainText('2');
  });

  test('should show missing evidence UI with product launch notes', async ({ page, mockAPI }) => {
    // Mock report with missing evidence
    await page.route('**/api/case/*/report', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          caseId: 'test-case-123',
          report: {
            finalNarrativeMarkdown: '# Report with Missing Evidence',
          },
          decision: {
            decisionTitle: 'Product Launch Decision',
          },
          steps: [
            {
              stepNumber: 2,
              status: 'completed',
              data: JSON.stringify({
                claims: [
                  { id: '1', claim: 'Infrastructure cost unknown', evidence: null, strength: 'missing' },
                  { id: '2', claim: 'Competitor marketing spend unknown', evidence: null, strength: 'missing' },
                ],
              }),
            },
          ],
        }),
      });
    });

    // Navigate to QuickStart and upload product launch notes
    await page.goto('/quick');
    await page.waitForLoadState('networkidle');

    const productLaunchPath = path.join(__dirname, '../../fixtures/messy-product-launch-notes.txt');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(productLaunchPath);
    await page.waitForSelector('[data-testid="qs-status"]', { timeout: 10000 });

    await page.click('[data-testid="qs-run"]');
    await page.waitForURL(/\/case\/[^/]+\/report/, { timeout: 30000 });

    // Navigate to Evidence tab
    await page.click('[data-testid="tab-evidence"]');

    // Verify missing evidence UI is shown
    await expect(page.locator('text=Infrastructure cost').or(page.locator('text=Missing')).first()).toBeVisible({ timeout: 5000 });
  });

  test('should detect conflicts and numeric disputes in vendor selection', async ({ page, mockAPI }) => {
    // Navigate to QuickStart and upload vendor selection document
    await page.goto('/quick');
    await page.waitForLoadState('networkidle');

    const vendorSelectionPath = path.join(__dirname, '../../fixtures/messy-vendor-selection.txt');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(vendorSelectionPath);
    await page.waitForSelector('[data-testid="qs-status"]', { timeout: 10000 });

    await page.click('[data-testid="qs-run"]');
    await page.waitForURL(/\/case\/[^/]+\/report/, { timeout: 30000 });

    // Verify report page renders
    await expect(page.locator('[data-testid="report-root"]')).toBeVisible();
    
    // Verify page contains conflict-related content (case-insensitive)
    const pageContent = await page.content();
    const hasConflict = /conflict/i.test(pageContent) || /dispute/i.test(pageContent) || /discrepancy/i.test(pageContent);
    expect(hasConflict).toBeTruthy();
  });
});

