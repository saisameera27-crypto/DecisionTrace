#!/usr/bin/env node
/**
 * Smoke Test Script for Staging/Production
 * Tests critical endpoints to ensure the application is functioning correctly
 */

import * as https from 'https';
import * as http from 'http';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  statusCode?: number;
  duration?: number;
}

const results: TestResult[] = [];
const BASE_URL = process.env.BASE_URL || process.env.SMOKE_TEST_URL || 'http://localhost:3000';

/**
 * Make HTTP request
 */
function makeRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  } = {}
): Promise<{ statusCode: number; body: string; headers: Record<string, string> }> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    const req = client.request(requestOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        const headers: Record<string, string> = {};
        Object.keys(res.headers).forEach((key: string) => {
          headers[key] = String(res.headers[key] || '');
        });
        resolve({
          statusCode: res.statusCode || 200,
          body,
          headers,
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

/**
 * Run a test and record the result
 */
async function runTest(
  name: string,
  testFn: () => Promise<void>
): Promise<void> {
  const startTime = Date.now();
  try {
    await testFn();
    const duration = Date.now() - startTime;
    results.push({ name, passed: true, duration });
    console.log(`✅ PASS: ${name} (${duration}ms)`);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    results.push({
      name,
      passed: false,
      error: error.message || String(error),
      duration,
    });
    console.error(`❌ FAIL: ${name} - ${error.message || error}`);
  }
}

/**
 * Test health endpoint
 */
async function testHealth(): Promise<void> {
  const response = await makeRequest(`${BASE_URL}/api/health`);
  if (response.statusCode !== 200) {
    throw new Error(`Expected status 200, got ${response.statusCode}`);
  }
  const data = JSON.parse(response.body);
  if (!data.status || data.status !== 'ok') {
    throw new Error(`Expected status 'ok', got ${data.status}`);
  }
}

/**
 * Test demo sample case loading
 */
async function testLoadSample(): Promise<string> {
  const response = await makeRequest(`${BASE_URL}/api/demo/load-sample`, {
    method: 'POST',
  });
  if (response.statusCode !== 200 && response.statusCode !== 201) {
    throw new Error(`Expected status 200/201, got ${response.statusCode}`);
  }
  const data = JSON.parse(response.body);
  if (!data.caseId && !data.id) {
    throw new Error('Response missing caseId or id');
  }
  return data.caseId || data.id;
}

/**
 * Test report page endpoint
 */
async function testReportPage(caseId: string): Promise<void> {
  const response = await makeRequest(`${BASE_URL}/api/case/${caseId}/report`);
  if (response.statusCode !== 200) {
    throw new Error(`Expected status 200, got ${response.statusCode}`);
  }
  const data = JSON.parse(response.body);
  if (!data.caseId && !data.report) {
    throw new Error('Response missing caseId or report');
  }
}

/**
 * Test export endpoints (JSON bundle)
 */
async function testExportJSON(caseId: string): Promise<void> {
  const response = await makeRequest(`${BASE_URL}/api/case/${caseId}/export`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ format: 'json' }),
  });
  if (response.statusCode !== 200) {
    throw new Error(`Expected status 200, got ${response.statusCode}`);
  }
  const data = JSON.parse(response.body);
  if (!data.caseId && !data.data) {
    throw new Error('Export response missing caseId or data');
  }
}

/**
 * Test public slug endpoint
 */
async function testPublicSlug(slug: string): Promise<void> {
  const response = await makeRequest(`${BASE_URL}/api/public/case/${slug}`);
  if (response.statusCode !== 200 && response.statusCode !== 410) {
    // 410 is acceptable if link is expired
    throw new Error(`Expected status 200 or 410, got ${response.statusCode}`);
  }
  if (response.statusCode === 200) {
    const data = JSON.parse(response.body);
    if (!data.caseId && !data.report) {
      throw new Error('Public case response missing caseId or report');
    }
  }
}

/**
 * Main smoke test function
 */
async function runSmokeTests(): Promise<void> {
  console.log(`\n🚀 Starting smoke tests against: ${BASE_URL}\n`);

  let sampleCaseId: string | undefined;
  let sampleSlug: string | undefined;

  // 1. Health check
  await runTest('Health Check', testHealth);

  // 2. Load sample case
  await runTest('Load Sample Case', async () => {
    const response = await makeRequest(`${BASE_URL}/api/demo/load-sample`, {
      method: 'POST',
    });
    if (response.statusCode !== 200 && response.statusCode !== 201) {
      throw new Error(`Expected status 200/201, got ${response.statusCode}`);
    }
    const data = JSON.parse(response.body);
    sampleCaseId = data.caseId || data.id;
    sampleSlug = data.slug;
    if (!sampleCaseId) {
      throw new Error('Response missing caseId or id');
    }
  });

  if (!sampleCaseId) {
    console.error('\n⚠️  Cannot continue without sample case ID\n');
    return;
  }

  // 3. Report page endpoint
  await runTest(`Report Page (case: ${sampleCaseId})`, () =>
    testReportPage(sampleCaseId!)
  );

  // 4. Export JSON bundle
  await runTest(`Export JSON Bundle (case: ${sampleCaseId})`, () =>
    testExportJSON(sampleCaseId!)
  );

  // 5. Public slug endpoint (if slug available)
  if (sampleSlug) {
    await runTest(`Public Slug Endpoint (slug: ${sampleSlug})`, () =>
      testPublicSlug(sampleSlug!)
    );
  } else {
    // Try to create a share link first
    await runTest(`Create Share Link (case: ${sampleCaseId})`, async () => {
      const response = await makeRequest(`${BASE_URL}/api/case/${sampleCaseId}/share`, {
        method: 'POST',
        body: JSON.stringify({ expirationDays: 30 }),
      });
      if (response.statusCode !== 201) {
        throw new Error(`Expected status 201, got ${response.statusCode}`);
      }
      const data = JSON.parse(response.body);
      sampleSlug = data.slug;
      if (!sampleSlug) {
        throw new Error('Share link response missing slug');
      }
    });

    if (sampleSlug) {
      await runTest(`Public Slug Endpoint (slug: ${sampleSlug})`, () =>
        testPublicSlug(sampleSlug!)
      );
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Smoke Test Summary');
  console.log('='.repeat(60));

  const passed = results.filter((r: TestResult) => r.passed).length;
  const failed = results.filter((r: TestResult) => !r.passed).length;
  const total = results.length;

  results.forEach((result: TestResult) => {
    const icon = result.passed ? '✅' : '❌';
    const duration = result.duration ? ` (${result.duration}ms)` : '';
    console.log(`${icon} ${result.name}${duration}`);
    if (!result.passed && result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  console.log('='.repeat(60));
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
  console.log('='.repeat(60) + '\n');

  // Exit with appropriate code
  if (failed > 0) {
    console.error(`❌ Smoke tests failed: ${failed} test(s) failed\n`);
    process.exit(1);
  } else {
    console.log(`✅ All smoke tests passed!\n`);
    process.exit(0);
  }
}

// Run smoke tests
runSmokeTests().catch((error) => {
  console.error('Fatal error running smoke tests:', error);
  process.exit(1);
});

