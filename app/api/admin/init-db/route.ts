import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { getPrismaClient } from '@/lib/prisma';

/**
 * Admin-only endpoint: Initialize Database
 * 
 * SECURITY:
 * - Requires ADMIN_INIT_TOKEN environment variable
 * - Validates x-admin-token header matches ADMIN_INIT_TOKEN
 * - Single-use for hackathon deployments
 * - NOT exposed in UI
 * 
 * OPERATIONS:
 * 1. Runs prisma migrate deploy (production schema)
 * 2. Seeds database with demo sample case
 * 
 * USAGE:
 * curl -X POST https://your-app.vercel.app/api/admin/init-db \
 *   -H "x-admin-token: your-admin-token-here"
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Validate admin token
    // Headers are case-insensitive in Next.js, but we check the exact header name
    const adminToken = request.headers.get('x-admin-token') || request.headers.get('X-Admin-Token');
    const expectedToken = process.env.ADMIN_INIT_TOKEN;

    if (!expectedToken) {
      console.error('ADMIN_INIT_TOKEN environment variable is not set');
      return NextResponse.json(
        { error: 'ADMIN_INIT_TOKEN not configured' },
        { status: 500 }
      );
    }

    if (!adminToken || adminToken !== expectedToken) {
      console.error('Invalid admin token provided');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Run Prisma migrations
    console.log('Running Prisma migrations...');
    try {
      execSync('npx prisma migrate deploy --schema=prisma/schema.postgres.prisma', {
        stdio: 'inherit',
        env: {
          ...process.env,
          DATABASE_URL: process.env.DATABASE_URL,
        },
      });
      console.log('✅ Migrations applied successfully');
    } catch (migrationError: any) {
      console.error('Migration failed:', migrationError);
      return NextResponse.json(
        {
          error: 'MIGRATION_FAILED',
          message: migrationError.message || 'Failed to run database migrations',
        },
        { status: 500 }
      );
    }

    // 3. Seed database with demo case
    console.log('Seeding database...');
    try {
      const prisma = getPrismaClient();

      // Upsert Case
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

      // Upsert Report
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

      // Delete existing steps for idempotency
      await prisma.caseStep.deleteMany({
        where: { caseId: demoCase.id },
      });

      // Create steps
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

      // Create share slug
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 365);

      await prisma.share.upsert({
        where: { slug: 'demo-sample-case-share' },
        update: {},
        create: {
          caseId: demoCase.id,
          slug: 'demo-sample-case-share',
          expiresAt,
        },
      });

      console.log('✅ Database seeded successfully');
    } catch (seedError: any) {
      console.error('Seeding failed:', seedError);
      return NextResponse.json(
        {
          error: 'SEED_FAILED',
          message: seedError.message || 'Failed to seed database',
        },
        { status: 500 }
      );
    }

    // 4. Return success
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: any) {
    console.error('Database initialization failed:', error);
    return NextResponse.json(
      {
        error: 'INIT_FAILED',
        message: error.message || 'Database initialization failed',
      },
      { status: 500 }
    );
  }
}

