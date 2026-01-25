import { NextResponse } from 'next/server';
import { getPrismaClient } from '../../../../lib/prisma';

/**
 * Demo: Load Sample Case
 * Creates a pre-populated sample case with completed report for demo/testing
 * 
 * Security: In test/mock mode (NODE_ENV === "test" OR GEMINI_TEST_MODE === "mock"),
 * this endpoint skips all auth, CSRF, and write protection checks.
 * 
 * CI-safe: Uses getPrismaClient() factory to respect DATABASE_URL and PRISMA_SCHEMA_TARGET.
 * Always returns structured JSON responses, never throws uncaught errors.
 */
export async function POST() {
  // Check if endpoint is enabled (test/mock mode or DEMO_MODE)
  const isTestMode = process.env.NODE_ENV === 'test' || process.env.CI === 'true';
  const isMockMode = process.env.GEMINI_TEST_MODE === 'mock';
  const isDemoMode = process.env.DEMO_MODE === 'true';
  
  // In test/mock mode: skip all auth, CSRF, and write protection checks
  if (!isTestMode && !isMockMode && !isDemoMode) {
    return NextResponse.json({
      code: 'DEMO_ENDPOINT_DISABLED',
      message: 'This endpoint is only available in test/CI mode, mock mode, or when DEMO_MODE is enabled',
    }, { status: 403 });
  }

  // Wrap entire handler in try/catch to prevent uncaught errors
  try {
    // Use Prisma client factory (respects DATABASE_URL and PRISMA_SCHEMA_TARGET)
    const prisma = getPrismaClient();

    // Create case
    const sampleCase = await prisma.case.create({
      data: {
        title: 'Sample Decision Case - Q2 2024 Product Launch',
        status: 'completed',
        slug: `sample-${Date.now()}`,
      },
    });

    // Create report
    await prisma.report.create({
      data: {
        caseId: sampleCase.id,
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

    // Create steps (separate from case creation for SQLite compatibility)
    // Step 2 contains decision data that will be used by the report API
    const step2DecisionData = {
      caseId: sampleCase.id,
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
        { caseId: sampleCase.id, stepNumber: 1, status: 'completed', data: JSON.stringify({ step: 1 }) },
        { caseId: sampleCase.id, stepNumber: 2, status: 'completed', data: JSON.stringify(step2DecisionData) },
        { caseId: sampleCase.id, stepNumber: 3, status: 'completed', data: JSON.stringify({ step: 3 }) },
        { caseId: sampleCase.id, stepNumber: 4, status: 'completed', data: JSON.stringify({ step: 4 }) },
        { caseId: sampleCase.id, stepNumber: 5, status: 'completed', data: JSON.stringify({ step: 5 }) },
        { caseId: sampleCase.id, stepNumber: 6, status: 'completed', data: JSON.stringify({ step: 6 }) },
      ],
    });

    // Always return 200 with { caseId } when demo seed exists
    return NextResponse.json({
      caseId: sampleCase.id,
    }, { status: 200 });
  } catch (error: any) {
    // On error, return structured JSON response (never throw uncaught errors)
    console.error('Error loading sample case:', error);
    return NextResponse.json(
      { code: 'DEMO_LOAD_FAILED', message: String(error) },
      { status: 500 }
    );
  }
}
