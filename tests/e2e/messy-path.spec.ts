/**
 * Messy Path E2E Tests
 * Tests error cases: conflicts and missing evidence
 */

import { test, expect } from './fixtures';

// Inline fixture texts (no file system access needed)
const EMAIL_THREAD_TEXT = `Subject: Re: Hiring Decision - Engineering Manager Position

Hey team,

I've been reviewing the candidates and I think we should go with Sarah Chen. She has 10 years of experience and her references were glowing. The recruiter said she's the top candidate with a 95% match score.

But wait - John mentioned that we need someone who can start immediately. Sarah said she needs 2 months notice at her current job.

Also, the budget is tight. HR said we can only offer $150k max, but Sarah's asking for $180k. However, I heard from someone that the market rate is actually $200k for this role.

Mike from Finance said we have flexibility if it's the right candidate, but I'm not sure that's accurate given the Q4 budget review. The budget document shows $150k, but Mike claims we can go higher.`;

const PRODUCT_LAUNCH_TEXT = `Product Launch Decision Notes

We need to decide on the Q2 product launch. The team is split:
- Engineering says infrastructure costs are unknown
- Marketing says competitor spend is unknown
- Sales wants to launch ASAP but we don't have pricing finalized

Missing info: Infrastructure cost estimates, competitor marketing spend data, final pricing model.`;

const VENDOR_SELECTION_TEXT = `Vendor Selection Decision

We're choosing between Vendor A and Vendor B.

Vendor A claims: $50k/year, 99.9% uptime, 24/7 support
Vendor B claims: $45k/year, 99.95% uptime, business hours support

But wait - I heard Vendor A actually costs $60k and Vendor B is $55k. Also, Vendor A's uptime is actually 99.5% according to their SLA.

There's a conflict in the pricing and uptime claims.`;

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

    // Navigate to QuickStart and submit email thread text
    await page.goto('/quick');
    await page.waitForLoadState('networkidle');
    
    const textarea = page.locator('[data-testid="qs-text"]');
    await textarea.fill(EMAIL_THREAD_TEXT);
    await page.click('[data-testid="qs-save-text"]');
    await page.waitForSelector('[data-testid="qs-upload-ok"]', { timeout: 10000 });

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

    // Navigate to QuickStart and submit product launch notes text
    await page.goto('/quick');
    await page.waitForLoadState('networkidle');

    const textarea = page.locator('[data-testid="qs-text"]');
    await textarea.fill(PRODUCT_LAUNCH_TEXT);
    await page.click('[data-testid="qs-save-text"]');
    await page.waitForSelector('[data-testid="qs-upload-ok"]', { timeout: 10000 });

    await page.click('[data-testid="qs-run"]');
    await page.waitForURL(/\/case\/[^/]+\/report/, { timeout: 30000 });

    // Navigate to Evidence tab
    await page.click('[data-testid="tab-evidence"]');

    // Verify missing evidence UI is shown
    await expect(page.locator('text=Infrastructure cost').or(page.locator('text=Missing')).first()).toBeVisible({ timeout: 5000 });
  });

  test('should detect conflicts and numeric disputes in vendor selection', async ({ page, mockAPI }) => {
    // Navigate to QuickStart and submit vendor selection text
    await page.goto('/quick');
    await page.waitForLoadState('networkidle');

    const textarea = page.locator('[data-testid="qs-text"]');
    await textarea.fill(VENDOR_SELECTION_TEXT);
    await page.click('[data-testid="qs-save-text"]');
    await page.waitForSelector('[data-testid="qs-upload-ok"]', { timeout: 10000 });

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

