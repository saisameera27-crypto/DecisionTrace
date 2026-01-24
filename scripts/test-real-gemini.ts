#!/usr/bin/env node
/**
 * Real Gemini Test Script
 * Manually test one real case with a real Gemini API key
 * 
 * Usage:
 *   GEMINI_API_KEY=your-key npm run test:real-gemini
 *   GEMINI_API_KEY=your-key BASE_URL=https://your-app.vercel.app npm run test:real-gemini
 */

import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY environment variable is required');
  console.error('Usage: GEMINI_API_KEY=your-key npm run test:real-gemini');
  process.exit(1);
}

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
  tokensUsed?: number;
  costEstimate?: number;
}

const results: TestResult[] = [];

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
 * Calculate cost estimate (Gemini API pricing)
 * Based on Gemini 1.5 Pro pricing as of 2024:
 * - Input: $1.25 per 1M tokens
 * - Output: $5.00 per 1M tokens
 */
function calculateCostEstimate(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1_000_000) * 1.25;
  const outputCost = (outputTokens / 1_000_000) * 5.00;
  return inputCost + outputCost;
}

/**
 * Run a test and record the result
 */
async function runTest(
  name: string,
  testFn: () => Promise<{ tokensUsed?: number; inputTokens?: number; outputTokens?: number }>
): Promise<void> {
  const startTime = Date.now();
  try {
    const result = await testFn();
    const duration = Date.now() - startTime;
    
    let costEstimate: number | undefined;
    if (result.inputTokens && result.outputTokens) {
      costEstimate = calculateCostEstimate(result.inputTokens, result.outputTokens);
    } else if (result.tokensUsed) {
      // Estimate 80% input, 20% output if only total is available
      costEstimate = calculateCostEstimate(
        result.tokensUsed * 0.8,
        result.tokensUsed * 0.2
      );
    }
    
    results.push({
      name,
      passed: true,
      duration,
      tokensUsed: result.tokensUsed,
      costEstimate,
    });
    
    const costStr = costEstimate ? ` ($${costEstimate.toFixed(6)})` : '';
    const tokensStr = result.tokensUsed ? ` [${result.tokensUsed} tokens]` : '';
    console.log(`✅ PASS: ${name} (${duration}ms)${tokensStr}${costStr}`);
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
 * Load a small test document
 */
function loadSmallTestDocument(): string {
  const filePath = path.join(
    process.cwd(),
    'test-data',
    'docs',
    'positive',
    '01_launch_decision_memo.txt'
  );
  
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf-8');
  }
  
  // Fallback: return a small test document
  return `Decision Memo: Launch New Feature

Context: We are considering launching a new feature for our product.

Decision: Approve the launch.

Rationale: The feature has been tested and is ready for production.`;
}

/**
 * Main test function
 */
async function runRealGeminiTest(): Promise<void> {
  console.log(`\n🚀 Real Gemini Test`);
  console.log(`Target: ${BASE_URL}`);
  // GEMINI_API_KEY is guaranteed to be defined due to check above
  const apiKey = GEMINI_API_KEY!;
  console.log(`API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}\n`);

  let caseId: string | undefined;
  const testDocument = loadSmallTestDocument();
  const documentSize = Buffer.byteLength(testDocument, 'utf-8');
  
  console.log(`📄 Test Document: ${documentSize} bytes\n`);

  // 1. Health check
  await runTest('Health Check', async () => {
    const response = await makeRequest(`${BASE_URL}/api/health`);
    if (response.statusCode !== 200) {
      throw new Error(`Expected status 200, got ${response.statusCode}`);
    }
    const data = JSON.parse(response.body);
    if (!data.status || data.status !== 'ok') {
      throw new Error(`Expected status 'ok', got ${data.status}`);
    }
    return {};
  });

  // 2. Create case
  await runTest('Create Case', async () => {
    const response = await makeRequest(`${BASE_URL}/api/case`, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Real Gemini Test Case',
        userId: 'test-user',
      }),
    });
    
    if (response.statusCode !== 201 && response.statusCode !== 200) {
      throw new Error(`Expected status 200/201, got ${response.statusCode}`);
    }
    
    const data = JSON.parse(response.body);
    caseId = data.id || data.caseId;
    
    if (!caseId) {
      throw new Error('Response missing caseId or id');
    }
    
    return {};
  });

  if (!caseId) {
    console.error('\n⚠️  Cannot continue without case ID\n');
    process.exit(1);
  }

  // 3. Upload document
  await runTest('Upload Document', async () => {
    // Create FormData-like request
    const boundary = `----WebKitFormBoundary${Date.now()}`;
    const formData = `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="test-doc.txt"\r\n` +
      `Content-Type: text/plain\r\n\r\n` +
      `${testDocument}\r\n` +
      `--${boundary}--\r\n`;
    
    const response = await makeRequest(`${BASE_URL}/api/files/upload?caseId=${caseId}`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: formData,
    });
    
    if (response.statusCode !== 201 && response.statusCode !== 200) {
      throw new Error(`Expected status 200/201, got ${response.statusCode}: ${response.body}`);
    }
    
    return {};
  });

  // 4. Run orchestrator (this will use real Gemini API)
  await runTest('Run Orchestrator (Real Gemini)', async () => {
    console.log('  ⏳ Running orchestrator with real Gemini API...');
    console.log('  ⚠️  This will consume API quota and incur costs!');
    
    const response = await makeRequest(`${BASE_URL}/api/case/${caseId}/run`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    
    if (response.statusCode !== 200 && response.statusCode !== 202) {
      throw new Error(`Expected status 200/202, got ${response.statusCode}: ${response.body}`);
    }
    
    // Poll for completion (simplified - in real implementation, use SSE)
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      const statusResponse = await makeRequest(`${BASE_URL}/api/case/${caseId}/report`);
      if (statusResponse.statusCode === 200) {
        const statusData = JSON.parse(statusResponse.body);
        if (statusData.status === 'completed' || statusData.report) {
          // Extract token usage if available
          const tokensUsed = statusData.tokensUsed || statusData.report?.tokensUsed;
          const inputTokens = statusData.inputTokens || statusData.report?.inputTokens;
          const outputTokens = statusData.outputTokens || statusData.report?.outputTokens;
          
          return {
            tokensUsed,
            inputTokens,
            outputTokens,
          };
        }
      }
      
      attempts++;
      process.stdout.write('.');
    }
    
    throw new Error('Orchestrator did not complete within timeout');
  });

  // 5. Get report
  await runTest('Get Report', async () => {
    const response = await makeRequest(`${BASE_URL}/api/case/${caseId}/report`);
    
    if (response.statusCode !== 200) {
      throw new Error(`Expected status 200, got ${response.statusCode}`);
    }
    
    const data = JSON.parse(response.body);
    if (!data.report && !data.caseId) {
      throw new Error('Response missing report or caseId');
    }
    
    return {};
  });

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Real Gemini Test Summary');
  console.log('='.repeat(60));

  const passed = results.filter((r: TestResult) => r.passed).length;
  const failed = results.filter((r: TestResult) => !r.passed).length;
  const total = results.length;
  const totalTokens = results.reduce((sum: number, r: TestResult) => sum + (r.tokensUsed || 0), 0);
  const totalCost = results.reduce((sum: number, r: TestResult) => sum + (r.costEstimate || 0), 0);

  results.forEach((result: TestResult) => {
    const icon = result.passed ? '✅' : '❌';
    const duration = result.duration ? ` (${result.duration}ms)` : '';
    const tokens = result.tokensUsed ? ` [${result.tokensUsed} tokens]` : '';
    const cost = result.costEstimate ? ` [$${result.costEstimate.toFixed(6)}]` : '';
    console.log(`${icon} ${result.name}${duration}${tokens}${cost}`);
    if (!result.passed && result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  console.log('='.repeat(60));
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
  if (totalTokens > 0) {
    console.log(`Total Tokens Used: ${totalTokens.toLocaleString()}`);
  }
  if (totalCost > 0) {
    console.log(`Total Cost Estimate: $${totalCost.toFixed(6)}`);
  }
  console.log('='.repeat(60) + '\n');

  // Exit with appropriate code
  if (failed > 0) {
    console.error(`❌ Real Gemini test failed: ${failed} test(s) failed\n`);
    process.exit(1);
  } else {
    console.log(`✅ All tests passed!\n`);
    if (totalCost > 0) {
      console.log(`💰 Cost Estimate: $${totalCost.toFixed(6)}`);
      console.log(`📊 Tokens Used: ${totalTokens.toLocaleString()}\n`);
    }
    process.exit(0);
  }
}

// Run tests
runRealGeminiTest().catch((error) => {
  console.error('Fatal error running real Gemini test:', error);
  process.exit(1);
});

