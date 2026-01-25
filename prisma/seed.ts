/**
 * Prisma Seed Script for E2E Tests
 * Seeds the database with demo cases for testing
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create a demo case with completed report
  const demoCase = await prisma.case.upsert({
    where: { slug: 'demo-sample-case' },
    update: {},
    create: {
      title: 'Sample Decision Case - Q2 2024 Product Launch',
      status: 'completed',
      slug: 'demo-sample-case',
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
      steps: {
        createMany: {
          data: [
            { stepNumber: 1, status: 'completed' },
            { stepNumber: 2, status: 'completed' },
            { stepNumber: 3, status: 'completed' },
            { stepNumber: 4, status: 'completed' },
            { stepNumber: 5, status: 'completed' },
            { stepNumber: 6, status: 'completed' },
          ],
          skipDuplicates: true,
        },
      },
    },
  });

  console.log('✅ Created demo case:', demoCase.id);
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

