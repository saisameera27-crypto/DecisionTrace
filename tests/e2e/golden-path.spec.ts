/**
 * Golden Path E2E Test - Smoke Tests (QuickStart Flow)
 * Tests QuickStart workflow: submit text → run analysis → verify report
 * Validates user-visible behavior, not backend internals
 */

import { test, expect } from './fixtures';

// Inline fixture text (no file system access needed)
const FIXTURE_TEXT = `Hiring Decision Thread - Product Manager Role

From: Sarah Chen <sarah@company.com>
To: Hiring Team
Subject: Re: Product Manager Candidate - John Smith

I think we should hire John. He has 5 years of experience and worked at Google.

From: Mike Johnson <mike@company.com>
To: Hiring Team
Subject: Re: Product Manager Candidate - John Smith

Wait, I heard he only has 3 years of experience. Also, he worked at Microsoft, not Google.

From: Sarah Chen <sarah@company.com>
To: Hiring Team
Subject: Re: Product Manager Candidate - John Smith

Actually, let me check my notes... I might have mixed up the candidates.

From: Lisa Wang <lisa@company.com>
To: Hiring Team
Subject: Re: Product Manager Candidate - John Smith

We need to decide by Friday. What's the budget for this role?

From: Mike Johnson <mike@company.com>
To: Hiring Team
Subject: Re: Product Manager Candidate - John Smith

Budget is $150k. But we also have another candidate - Maria Garcia - who might be a better fit.

From: Sarah Chen <sarah@company.com>
To: Hiring Team
Subject: Re: Product Manager Candidate - John Smith

I haven't reviewed Maria's resume yet. Can someone send it?

Decision needed: Should we hire John Smith or Maria Garcia for the Product Manager role?
Budget: $150k
Deadline: Friday
Missing info: Maria's resume, John's actual work history verification`;

test.describe('Golden Path', () => {
  test('should complete QuickStart workflow and verify report @smoke', async ({ page }) => {
    // Navigate directly to QuickStart page
    await page.goto('/quick', { waitUntil: 'domcontentloaded' });
    
    // Wait for page title to ensure page is loaded
    await expect(page.locator('h1:has-text("Quick Start")')).toBeVisible({ timeout: 10000 });
    
    // Wait for QuickStart page to be ready (wait for textarea to be visible)
    await expect(page.locator('[data-testid="qs-textarea"]')).toBeVisible({ timeout: 10000 });

    // Fill textarea with fixture text
    await page.fill('[data-testid="qs-textarea"]', FIXTURE_TEXT);

    // Diagnostic logging before waiting for readiness marker
    console.log('QuickStart URL:', page.url());
    const body = await page.textContent('body');
    console.log('Body snippet:', body?.slice(0, 1200));
    
    // Log readiness state if present
    if (await page.locator('[data-testid="qs-not-ready"]').count()) {
      console.log('Not ready text:', await page.locator('[data-testid="qs-not-ready"]').textContent());
    }

    // Expect readiness marker to appear immediately (based on textarea content, not API)
    await expect(page.locator('[data-testid="qs-upload-ok"]')).toBeVisible({ timeout: 10000 });

    // Expect run button to be enabled (based on textarea content)
    const runButton = page.locator('[data-testid="qs-run"]');
    await expect(runButton).toBeEnabled({ timeout: 10000 });
    
    // Verify button is actually enabled and visible
    const isEnabled = await runButton.isEnabled();
    const isVisible = await runButton.isVisible();
    console.log('Run button state - enabled:', isEnabled, 'visible:', isVisible);
    
    if (!isEnabled) {
      // Check disabled reason
      const disabledReason = page.locator('[data-testid="qs-run-disabled-reason"]');
      if (await disabledReason.count() > 0) {
        const reason = await disabledReason.textContent();
        console.error('Run button disabled. Reason:', reason);
        throw new Error(`Run button is disabled: ${reason}`);
      }
    }

    // Click run button and wait for navigation
    console.log('Clicking Run button...');
    console.log('URL before click:', page.url());
    
    // Set up console error listener
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.error('Browser console error:', msg.text());
      }
    });

    // Click run and wait for navigation or report (give success path priority)
    await page.click('[data-testid="qs-run"]');
    console.log('Run button clicked. Waiting for navigation or report...');

    // Wait for either URL change or report root (client-side routing); then check for errors only if we failed
    const navTimeout = 30000;
    try {
      await Promise.race([
        page.waitForURL(/\/case\/[^/]+/, { timeout: navTimeout, waitUntil: 'domcontentloaded' }),
        page.locator('[data-testid="report-root"]').waitFor({ state: 'visible', timeout: navTimeout }),
      ]);
      console.log('Navigation/report OK. Current URL:', page.url());
    } catch {
      // On timeout, check for inline error message to report a clear failure
      const errorElement = page.locator('[data-testid="qs-upload-error"], [data-testid="qs-save-error"]');
      if (await errorElement.count() > 0) {
        const errorText = await errorElement.first().textContent();
        console.error('Error after clicking Run:', errorText);
        throw new Error(`Run button failed: ${errorText}`);
      }
      console.log('Navigation failed. URL:', page.url(), 'Console errors:', consoleErrors);
      throw new Error(`Navigation failed. URL: ${page.url()}, Console errors: ${consoleErrors.join(', ')}`);
    }

    if (consoleErrors.length > 0) {
      console.error('Console errors detected:', consoleErrors);
    }

    // Verify report page renders with stable UI assertions (wait for specific elements, not networkidle)
    await expect(page.locator('[data-testid="report-root"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="report-header"]')).toBeVisible();
    // Verify "Decision Trace Report" heading exists in header (use getByRole for more specific matching)
    await expect(page.locator('[data-testid="report-header"]').getByRole('heading', { name: 'Decision Trace Report' }).first()).toBeVisible();
    
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
    // Navigate directly to QuickStart page
    await page.goto('/quick', { waitUntil: 'domcontentloaded' });
    
    // Wait for page title to ensure page is loaded
    await expect(page.locator('h1:has-text("Quick Start")')).toBeVisible({ timeout: 10000 });
    
    // Wait for QuickStart page to be ready (wait for demo link to be visible)
    await expect(page.locator('[data-testid="qs-demo-link"]')).toBeVisible({ timeout: 10000 });

    // Click demo link
    await page.click('[data-testid="qs-demo-link"]');

    // Wait for navigation to case page (report is shown at /case/:id)
    await page.waitForURL(/\/case\/[^/]+/, { timeout: 30000 });

    // Verify report page renders using stable UI assertions (wait for specific elements, not networkidle)
    await expect(page.locator('[data-testid="report-root"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="report-header"]')).toBeVisible();
    // Verify "Decision Trace Report" heading exists in header (use getByRole for more specific matching)
    await expect(page.locator('[data-testid="report-header"]').getByRole('heading', { name: 'Decision Trace Report' }).first()).toBeVisible();
    
    // Assert Overview tab is visible (default active tab)
    await expect(page.locator('[data-testid="tab-overview"]')).toBeVisible();
  });
});
