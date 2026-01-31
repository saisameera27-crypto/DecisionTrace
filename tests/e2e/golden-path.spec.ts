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
    await expect(page.locator('[data-testid="qs-run"]')).toBeEnabled({ timeout: 10000 });

    // Click run button
    await page.click('[data-testid="qs-run"]');

    // Wait for navigation to case page (report is shown at /case/:id)
    await page.waitForURL(/\/case\/[^/]+/, { timeout: 30000 });

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
