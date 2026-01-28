import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { isDemoMode } from '@/lib/demo-mode';

/**
 * Demo: Load Sample Case
 * Returns seeded demo case for hackathon demos
 * 
 * In DEMO_MODE, this endpoint:
 * - Returns the seeded demo case (slug: 'demo-sample-case')
 * - Creates it if it doesn't exist (idempotent)
 * - No authentication required
 * 
 * Supports both GET and POST for easy access
 * 
 * CI-safe: Uses getPrismaClient() factory to respect DATABASE_URL and PRISMA_SCHEMA_TARGET.
 * Always returns structured JSON responses, never throws uncaught errors.
 */
async function loadSampleCase() {
  // Check if endpoint is enabled (test/mock mode or DEMO_MODE)
  const isTestMode = process.env.NODE_ENV === 'test' || process.env.CI === 'true';
  const isMockMode = process.env.GEMINI_TEST_MODE === 'mock';
  const demoModeEnabled = isDemoMode();
  
  // In test/mock/demo mode: skip all auth, CSRF, and write protection checks
  if (!isTestMode && !isMockMode && !demoModeEnabled) {
    return NextResponse.json({
      code: 'DEMO_ENDPOINT_DISABLED',
      message: 'This endpoint is only available in test/CI mode, mock mode, or when DEMO_MODE is enabled',
    }, { status: 403 });
  }

  // Wrap entire handler in try/catch to prevent uncaught errors
  try {
    // Use Prisma client factory (respects DATABASE_URL and PRISMA_SCHEMA_TARGET)
    const prisma = getPrismaClient();

    // Use seeded demo case (idempotent - creates if doesn't exist)
    // This matches the case created by prisma/seed.ts
    const demoCase = await prisma.case.upsert({
      where: { slug: 'demo-sample-case' },
      update: {
        // Keep existing case
      },
      create: {
        title: 'Sample Decision Case - Q2 2024 Product Launch',
        status: 'completed',
        slug: 'demo-sample-case',
      },
    });

    // Ensure report exists (idempotent)
    await prisma.report.upsert({
      where: { caseId: demoCase.id },
      update: {
        // Keep existing report
      },
      create: {
        caseId: demoCase.id,
        finalNarrativeMarkdown: `# Decision Trace Report

## Decision Overview
**Title**: Q2 2024 Product Launch Decision
**Date**: March 15, 2024
**Decision Maker**: Sarah Chen
**Status**: APPROVED

## Summary
This decision involved launching a new product line in Q2 2024. The decision was made after careful analysis of market conditions, resource availability, and strategic alignment.

## Key Evidence
- Market research showing strong demand
- Financial projections indicating profitability
- Resource allocation plan approved

## Risks Identified
- Market competition
- Supply chain delays
- Resource constraints

## Stakeholders
- Product Team
- Marketing Team
- Executive Leadership`,
        mermaidDiagram: `graph TD
    A[Decision: Q2 2024 Launch] --> B[Market Analysis]
    A --> C[Resource Planning]
    B --> D[Approved]
    C --> D
    D --> E[Implementation]`,
        tokensUsed: 1500,
        durationMs: 2000,
      },
    });

    // Ensure steps exist (idempotent - delete and recreate for consistency)
    await prisma.caseStep.deleteMany({
      where: { caseId: demoCase.id },
    });
    
    // Create steps (separate from case creation for SQLite compatibility)
    // Step 2 contains decision data that will be used by the report API
    const step2DecisionData = {
      caseId: demoCase.id,
      documentId: 'demo-doc-1',
      decisionTitle: 'Q2 2024 Product Launch',
      decisionDate: '2024-03-15',
      decisionMaker: 'Sarah Chen',
      decisionMakerRole: 'Product Manager',
      decisionStatus: 'APPROVED',
      decisionSummary: 'Decision to launch new product line in Q2 2024',
      context: {
        marketConditions: 'favorable',
        resourceAvailability: 'confirmed',
      },
      rationale: [
        'Market research showing strong demand',
        'Financial projections indicating profitability',
        'Resource allocation plan approved',
      ],
      risksIdentified: [
        'Market competition',
        'Supply chain delays',
        'Resource constraints',
      ],
      mitigationStrategies: [
        'Competitive analysis completed',
        'Supplier contracts secured',
        'Resource plan approved',
      ],
      expectedOutcomes: {
        revenue: 'positive',
        marketShare: 'increased',
      },
      confidenceScore: 0.85,
      extractedAt: new Date().toISOString(),
    };

    await prisma.caseStep.createMany({
      data: [
        { caseId: demoCase.id, stepNumber: 1, status: 'completed', data: JSON.stringify({ step: 1 }) },
        { caseId: demoCase.id, stepNumber: 2, status: 'completed', data: JSON.stringify(step2DecisionData) },
        { caseId: demoCase.id, stepNumber: 3, status: 'completed', data: JSON.stringify({ step: 3 }) },
        { caseId: demoCase.id, stepNumber: 4, status: 'completed', data: JSON.stringify({ step: 4 }) },
        { caseId: demoCase.id, stepNumber: 5, status: 'completed', data: JSON.stringify({ step: 5 }) },
        { caseId: demoCase.id, stepNumber: 6, status: 'completed', data: JSON.stringify({ step: 6 }) },
      ],
    });

    // Create public share slug if it doesn't exist (for easy testing)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 365); // Expires in 1 year
    
    await prisma.share.upsert({
      where: { slug: 'demo-sample-case-share' },
      update: {
        // Keep existing share
      },
      create: {
        caseId: demoCase.id,
        slug: 'demo-sample-case-share',
        expiresAt,
      },
    });

    // Always return 200 with { caseId } when demo seed exists
    return NextResponse.json({
      caseId: demoCase.id,
      slug: demoCase.slug,
      shareSlug: 'demo-sample-case-share',
    }, { status: 200 });
  } catch (error: any) {
    // On error, return structured JSON response (never throw uncaught errors)
    console.error('Error loading sample case:', error);
    
    // Extract error message properly
    const errorMessage = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
    const errorCode = error?.code || '';
    
    // Detect missing table errors:
    // - Postgres error code 42P01: "relation does not exist"
    // - Prisma error messages containing "does not exist" or "table"
    // - Error messages containing "relation" and "does not exist"
    const isTableMissingError = 
      errorCode === '42P01' ||
      errorCode === 'P2025' ||
      errorMessage.includes('does not exist') ||
      (errorMessage.includes('table') && errorMessage.includes('does not exist')) ||
      (errorMessage.includes('relation') && errorMessage.includes('does not exist')) ||
      (errorMessage.includes('Table') && errorMessage.includes('does not exist'));
    
    if (isTableMissingError) {
      return NextResponse.json(
        {
          error: 'DB_NOT_INITIALIZED',
          message: 'Database tables are not initialized. Run migrations.',
        },
        { status: 503 } // Service Unavailable
      );
    }
    
    // Other errors - extract message properly
    const errorMsg = error?.message || (typeof error === 'string' ? error : error?.toString() || 'Unknown error');
    return NextResponse.json(
      { code: 'DEMO_LOAD_FAILED', message: errorMsg },
      { status: 500 }
    );
  }
}

export async function GET() {
  return loadSampleCase();
}

export async function POST() {
  return loadSampleCase();
}
