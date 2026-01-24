#!/usr/bin/env node
/**
 * Budget + Quota Sanity Check
 * Verifies Gemini API rate limits and cost estimates for judge flow
 */

import * as https from 'https';
import * as http from 'http';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

/**
 * Gemini API Rate Limits (as of 2024)
 * These are typical limits - verify with your actual Gemini API plan
 */
const GEMINI_RATE_LIMITS = {
  requestsPerMinute: 60,
  requestsPerDay: 1500,
  tokensPerMinute: 1_000_000,
  tokensPerDay: 50_000_000,
};

/**
 * Gemini API Pricing (Gemini 1.5 Pro)
 */
const GEMINI_PRICING = {
  inputTokensPerMillion: 1.25,  // $1.25 per 1M input tokens
  outputTokensPerMillion: 5.00, // $5.00 per 1M output tokens
};

/**
 * Estimated tokens per step (conservative estimates)
 */
const ESTIMATED_TOKENS_PER_STEP = {
  step1: { input: 5000, output: 2000 },   // Document analysis
  step2: { input: 8000, output: 3000 },   // Evidence extraction
  step3: { input: 6000, output: 2500 },   // Risk assessment
  step4: { input: 5000, output: 2000 },   // Decision analysis
  step5: { input: 4000, output: 1500 },   // Impact assessment
  step6: { input: 3000, output: 2000 },   // Final report
};

/**
 * Judge flow estimates
 */
const JUDGE_FLOW_ESTIMATES = {
  casesPerDay: 10,           // Conservative estimate
  documentsPerCase: 3,       // Average documents per case
  pagesPerDocument: 5,       // Average pages per document
  tokensPerPage: 1000,       // Rough estimate
};

/**
 * Calculate cost for one case
 */
function calculateCaseCost(): {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  costPerStep: Array<{ step: number; cost: number }>;
} {
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  const costPerStep: Array<{ step: number; cost: number }> = [];

  Object.entries(ESTIMATED_TOKENS_PER_STEP).forEach(([stepName, tokens]: [string, { input: number; output: number }], index: number) => {
    const stepNum = index + 1;
    totalInputTokens += tokens.input;
    totalOutputTokens += tokens.output;
    
    const stepCost = calculateCostEstimate(tokens.input, tokens.output);
    costPerStep.push({ step: stepNum, cost: stepCost });
  });

  const totalCost = calculateCostEstimate(totalInputTokens, totalOutputTokens);

  return {
    totalInputTokens,
    totalOutputTokens,
    totalCost,
    costPerStep,
  };
}

/**
 * Calculate cost estimate
 */
function calculateCostEstimate(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1_000_000) * GEMINI_PRICING.inputTokensPerMillion;
  const outputCost = (outputTokens / 1_000_000) * GEMINI_PRICING.outputTokensPerMillion;
  return inputCost + outputCost;
}

/**
 * Check rate limits
 */
function checkRateLimits(casesPerDay: number): {
  withinLimits: boolean;
  warnings: string[];
  recommendations: string[];
} {
  const warnings: string[] = [];
  const recommendations: string[] = [];
  
  const caseCost = calculateCaseCost();
  const totalTokensPerCase = caseCost.totalInputTokens + caseCost.totalOutputTokens;
  const totalTokensPerDay = totalTokensPerCase * casesPerDay;
  const totalRequestsPerDay = casesPerDay * 6; // 6 steps per case

  // Check request limits
  if (totalRequestsPerDay > GEMINI_RATE_LIMITS.requestsPerDay) {
    warnings.push(
      `⚠️  Daily requests (${totalRequestsPerDay}) exceed limit (${GEMINI_RATE_LIMITS.requestsPerDay})`
    );
    recommendations.push('Consider implementing request queuing or rate limiting');
  }

  // Check token limits
  if (totalTokensPerDay > GEMINI_RATE_LIMITS.tokensPerDay) {
    warnings.push(
      `⚠️  Daily tokens (${totalTokensPerDay.toLocaleString()}) exceed limit (${GEMINI_RATE_LIMITS.tokensPerDay.toLocaleString()})`
    );
    recommendations.push('Consider upgrading API plan or implementing token budgeting');
  }

  // Check per-minute limits
  const tokensPerMinute = totalTokensPerCase;
  if (tokensPerMinute > GEMINI_RATE_LIMITS.tokensPerMinute) {
    warnings.push(
      `⚠️  Tokens per minute (${tokensPerMinute.toLocaleString()}) exceed limit (${GEMINI_RATE_LIMITS.tokensPerMinute.toLocaleString()})`
    );
    recommendations.push('Implement request throttling between steps');
  }

  return {
    withinLimits: warnings.length === 0,
    warnings,
    recommendations,
  };
}

/**
 * Make HTTP request
 */
function makeRequest(url: string): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const req = client.request(
      {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode || 200,
            body,
          });
        });
      }
    );

    req.on('error', reject);
    req.end();
  });
}

/**
 * Main function
 */
async function runBudgetCheck(): Promise<void> {
  console.log('\n💰 Budget + Quota Sanity Check\n');
  console.log('='.repeat(60));

  // 1. Check health endpoint
  console.log('\n1. Checking deployment health...');
  try {
    const healthResponse = await makeRequest(`${BASE_URL}/api/health`);
    if (healthResponse.statusCode === 200) {
      console.log('✅ Deployment is healthy');
    } else {
      console.log(`⚠️  Health check returned status ${healthResponse.statusCode}`);
    }
  } catch (error: any) {
    console.log(`❌ Health check failed: ${error.message}`);
    console.log('   Make sure the deployment URL is correct');
  }

  // 2. Calculate costs
  console.log('\n2. Cost Estimates:');
  console.log('-'.repeat(60));
  
  const caseCost = calculateCaseCost();
  console.log(`\nPer Case:`);
  console.log(`  Input Tokens:  ${caseCost.totalInputTokens.toLocaleString()}`);
  console.log(`  Output Tokens: ${caseCost.totalOutputTokens.toLocaleString()}`);
  console.log(`  Total Tokens:  ${(caseCost.totalInputTokens + caseCost.totalOutputTokens).toLocaleString()}`);
  console.log(`  Cost:          $${caseCost.totalCost.toFixed(6)}`);
  
  console.log(`\nPer Step:`);
  caseCost.costPerStep.forEach(({ step, cost }: { step: number; cost: number }) => {
    console.log(`  Step ${step}: $${cost.toFixed(6)}`);
  });

  // 3. Judge flow estimates
  console.log(`\n3. Judge Flow Estimates (${JUDGE_FLOW_ESTIMATES.casesPerDay} cases/day):`);
  console.log('-'.repeat(60));
  
  const dailyCost = caseCost.totalCost * JUDGE_FLOW_ESTIMATES.casesPerDay;
  const monthlyCost = dailyCost * 30;
  const yearlyCost = dailyCost * 365;
  
  console.log(`\nDaily:`);
  console.log(`  Cases:        ${JUDGE_FLOW_ESTIMATES.casesPerDay}`);
  console.log(`  Total Tokens: ${((caseCost.totalInputTokens + caseCost.totalOutputTokens) * JUDGE_FLOW_ESTIMATES.casesPerDay).toLocaleString()}`);
  console.log(`  Cost:         $${dailyCost.toFixed(4)}`);
  
  console.log(`\nMonthly:`);
  console.log(`  Cost:         $${monthlyCost.toFixed(2)}`);
  
  console.log(`\nYearly:`);
  console.log(`  Cost:         $${yearlyCost.toFixed(2)}`);

  // 4. Rate limit checks
  console.log(`\n4. Rate Limit Checks:`);
  console.log('-'.repeat(60));
  
  const rateLimitCheck = checkRateLimits(JUDGE_FLOW_ESTIMATES.casesPerDay);
  
  if (rateLimitCheck.withinLimits) {
    console.log('✅ All rate limits are within bounds');
  } else {
    console.log('⚠️  Rate limit warnings:');
    rateLimitCheck.warnings.forEach((warning: string) => {
      console.log(`  ${warning}`);
    });
  }

  if (rateLimitCheck.recommendations.length > 0) {
    console.log('\nRecommendations:');
    rateLimitCheck.recommendations.forEach((rec: string) => {
      console.log(`  • ${rec}`);
    });
  }

  // 5. Token/page caps
  console.log(`\n5. Token/Page Caps:`);
  console.log('-'.repeat(60));
  
  const maxTokensPerCase = caseCost.totalInputTokens + caseCost.totalOutputTokens;
  const maxPagesPerCase = JUDGE_FLOW_ESTIMATES.documentsPerCase * JUDGE_FLOW_ESTIMATES.pagesPerDocument;
  
  console.log(`\nPer Case Limits:`);
  console.log(`  Max Tokens: ${maxTokensPerCase.toLocaleString()}`);
  console.log(`  Max Pages:  ${maxPagesPerCase}`);
  
  // Check if we have token/page caps in place
  console.log(`\nProduction Caps (verify these are implemented):`);
  console.log(`  • Max tokens per request: ${GEMINI_RATE_LIMITS.tokensPerMinute.toLocaleString()}`);
  console.log(`  • Max pages per document: ${JUDGE_FLOW_ESTIMATES.pagesPerDocument * 2} (recommended)`);
  console.log(`  • Max documents per case: ${JUDGE_FLOW_ESTIMATES.documentsPerCase * 2} (recommended)`);

  // 6. Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary');
  console.log('='.repeat(60));
  
  console.log(`\n✅ Cost per case: $${caseCost.totalCost.toFixed(6)}`);
  console.log(`✅ Daily cost (${JUDGE_FLOW_ESTIMATES.casesPerDay} cases): $${dailyCost.toFixed(4)}`);
  console.log(`✅ Monthly cost: $${monthlyCost.toFixed(2)}`);
  
  if (rateLimitCheck.withinLimits) {
    console.log(`✅ Rate limits: Within bounds`);
  } else {
    console.log(`⚠️  Rate limits: ${rateLimitCheck.warnings.length} warning(s)`);
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
}

// Run budget check
runBudgetCheck().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

