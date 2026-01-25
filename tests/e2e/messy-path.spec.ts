/**
 * Messy Path E2E Tests
 * Tests error cases: conflicts and missing evidence
 */

import { test, expect } from './fixtures';
import * as path from 'path';

test.describe('Messy Path', () => {
  test('should show conflicts filter with email thread @smoke', async ({ page, mockAPI }) => {
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

    const emailThreadPath = path.join(process.cwd(), 'test-data', 'docs', 'positive', '02_email_thread_hiring.txt');
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

  test('should show missing evidence UI with tiny note', async ({ page, mockAPI }) => {
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
            decisionTitle: 'Tiny Note Decision',
          },
          steps: [
            {
              stepNumber: 2,
              status: 'completed',
              data: JSON.stringify({
                claims: [
                  { id: '1', claim: 'Claim without evidence', evidence: null, strength: 'missing' },
                  { id: '2', claim: 'Another claim', evidence: null, strength: 'missing' },
                ],
              }),
            },
          ],
        }),
      });
    });

    // Navigate and upload tiny note
    await page.goto('/');
    await page.click('text=Create Case');
    await page.fill('input[name="title"]', 'Tiny Note Case');
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=Case created', { timeout: 5000 });

    const tinyNotePath = path.join(process.cwd(), 'test-data', 'docs', 'negative', '01_tiny_note.txt');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(tinyNotePath);
    await page.waitForSelector('text=Upload complete', { timeout: 10000 });

    await page.click('text=Run Analysis');
    await page.waitForSelector('text=Analysis Complete', { timeout: 30000 });

    // Navigate to Evidence tab
    await page.click('text=Evidence');

    // Click Missing Evidence filter
    await page.click('text=Missing Evidence');

    // Verify missing evidence UI is shown
    await expect(page.locator('text=Claim without evidence')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Another claim')).toBeVisible();

    // Verify missing evidence indicator
    await expect(page.locator('text=No evidence').or(page.locator('text=Missing')).first()).toBeVisible();

    // Verify warning message
    await expect(
      page.locator('text=Missing Evidence').or(page.locator('text=Evidence required'))
    ).toBeVisible();
  });
});

