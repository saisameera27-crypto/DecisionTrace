import { NextResponse } from 'next/server';
import { getPrismaClient } from '../../../../lib/prisma';

/**
 * Demo: Load Sample Case
 * Creates a pre-populated sample case with completed report for demo/testing
 */
export async function POST() {
  try {
    const prisma = getPrismaClient();

    // Create a sample case with completed report
    const sampleCase = await prisma.case.create({
      data: {
        title: 'Sample Decision Case - Q2 2024 Product Launch',
        status: 'completed',
        slug: `sample-${Date.now()}`,
        report: {
          create: {
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
        },
        decision: {
          create: {
            decisionTitle: 'Q2 2024 Product Launch',
            decisionDate: '2024-03-15',
            decisionMaker: 'Sarah Chen',
            decisionStatus: 'APPROVED',
            decisionRationale: 'Strong market demand and available resources support this launch timeline.',
          },
        },
        steps: {
          createMany: [
            { stepNumber: 1, status: 'completed', stepName: 'Document Processing' },
            { stepNumber: 2, status: 'completed', stepName: 'Decision Extraction' },
            { stepNumber: 3, status: 'completed', stepName: 'Context Analysis' },
            { stepNumber: 4, status: 'completed', stepName: 'Outcome Analysis' },
            { stepNumber: 5, status: 'completed', stepName: 'Risk Assessment' },
            { stepNumber: 6, status: 'completed', stepName: 'Report Generation' },
          ],
        },
      },
      include: {
        report: true,
        decision: true,
        steps: true,
      },
    });

    return NextResponse.json({
      success: true,
      caseId: sampleCase.id,
      slug: sampleCase.slug,
      title: sampleCase.title,
      status: sampleCase.status,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error loading sample case:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to load sample case',
      message: error.message,
    }, { status: 500 });
  }
}
