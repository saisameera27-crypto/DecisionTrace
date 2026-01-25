import { NextResponse } from 'next/server';
import { getPrismaClient } from '../../../../lib/prisma';

/**
 * Demo: Load Sample Case
 * Creates a pre-populated sample case with completed report for demo/testing
 * Allowed in test/CI mode or when DEMO_MODE is enabled
 * CSRF/public-write protection exempted in test/mock mode
 */
export async function POST() {
  // Allow in test/CI mode or when DEMO_MODE is enabled
  const isTestMode = process.env.NODE_ENV === 'test' || process.env.CI === 'true';
  const isMockMode = process.env.GEMINI_TEST_MODE === 'mock';
  const isDemoMode = process.env.DEMO_MODE === 'true';
  
  if (!isTestMode && !isMockMode && !isDemoMode) {
    return NextResponse.json({
      code: 'DEMO_ENDPOINT_DISABLED',
      message: 'This endpoint is only available in test/CI mode, mock mode, or when DEMO_MODE is enabled',
    }, { status: 403 });
  }

  try {
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
    await prisma.caseStep.createMany({
      data: [
        { caseId: sampleCase.id, stepNumber: 1, status: 'completed' },
        { caseId: sampleCase.id, stepNumber: 2, status: 'completed' },
        { caseId: sampleCase.id, stepNumber: 3, status: 'completed' },
        { caseId: sampleCase.id, stepNumber: 4, status: 'completed' },
        { caseId: sampleCase.id, stepNumber: 5, status: 'completed' },
        { caseId: sampleCase.id, stepNumber: 6, status: 'completed' },
      ],
    });

    return NextResponse.json({
      success: true,
      caseId: sampleCase.id,
      slug: sampleCase.slug,
      title: sampleCase.title,
      status: sampleCase.status,
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error loading sample case:', error);
    return NextResponse.json({
      code: 'DEMO_LOAD_FAILED',
      message: String(error?.message || error || 'Unknown error'),
    }, { status: 500 });
  }
}
