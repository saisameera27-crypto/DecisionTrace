/**
 * Prisma Seed Script for E2E Tests
 * Seeds the database with demo cases for testing
 * 
 * Aligned with report/share APIs:
 * - Case with status "completed"
 * - Report row with ALL required columns used by report loader
 * - CaseStep rows for steps 1–6 (step 2 includes decision data)
 * - Public slug (Share) for easy testing
 * 
 * Deterministic and runnable multiple times (idempotent).
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Upsert Case (deterministic slug)
  const demoCase = await prisma.case.upsert({
    where: { slug: 'demo-sample-case' },
    update: {
      title: 'Sample Decision Case - Q2 2024 Product Launch',
      status: 'completed',
    },
    create: {
      title: 'Sample Decision Case - Q2 2024 Product Launch',
      status: 'completed',
      slug: 'demo-sample-case',
    },
  });

  // 2. Upsert Report (explicit, not nested - all required columns)
  await prisma.report.upsert({
    where: { caseId: demoCase.id },
    update: {
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

  // 3. Delete existing steps for idempotency
  await prisma.caseStep.deleteMany({
    where: { caseId: demoCase.id },
  });

  // 4. Create steps 1–6 via createMany (step 2 includes decision data for report API)
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

  // 5. Create public slug (Share) - optional but preferred for testing
  // Delete existing shares for this case to ensure idempotency
  await prisma.share.deleteMany({
    where: { caseId: demoCase.id },
  });

  // Create a deterministic share slug for demo/testing
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 365); // Expires in 1 year

  await prisma.share.create({
    data: {
      caseId: demoCase.id,
      slug: 'demo-sample-case-share',
      expiresAt,
    },
  });

  console.log('✅ Created/updated demo case:', demoCase.id);
  console.log('✅ Created demo share slug: demo-sample-case-share');
  console.log('🌱 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

