/**
 * Helper functions to generate valid step fixtures that satisfy current schemas
 * 
 * These helpers prevent fixture drift - if schemas change, these functions must be updated,
 * making it obvious what needs to change rather than silently breaking tests.
 */

import type { z } from 'zod';
import { step1Schema, step2Schema } from '@/lib/schema-validators';

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;

/**
 * Generate a valid Step 1 fixture that satisfies step1Schema
 * 
 * Step 1 Schema requires:
 * - document_id (string)
 * - normalizedEntities (people, organizations, products, dates)
 * - extractedClaims (array with evidence anchors)
 * - contradictions (array)
 * - missingInfo (array)
 * - extracted_at (ISO datetime string)
 * - Optional: document_type, file_name, file_size, mime_type
 */
export function makeValidStep1(overrides?: Partial<Step1Data['data']>): Step1Data {
  const now = new Date().toISOString();
  
  const defaultData: Step1Data['data'] = {
    document_id: 'doc_12345',
    normalizedEntities: {
      people: ['Sarah Chen', 'John Smith'],
      organizations: ['Acme Corp', 'Healthcare Partners'],
      products: ['Project Phoenix', 'Mobile App Platform'],
      dates: ['2024-03-15', 'Q2 2024'],
    },
    extractedClaims: [
      {
        claim: 'Market research indicates strong demand for healthcare mobile applications',
        evidenceAnchor: {
          excerpt: 'Market research',
          chunkIndex: 0,
          page: 1,
          line: 5,
        },
        category: 'fact' as const,
      },
      {
        claim: 'Engineering team has available capacity for new project',
        evidenceAnchor: {
          excerpt: 'Team capacity',
          chunkIndex: 1,
        },
        category: 'assumption' as const,
      },
    ],
    contradictions: [
      {
        statement1: 'Budget allocated is $2.5M',
        statement2: 'Budget constraints require $1.5M maximum',
        description: 'Budget allocation conflicts with stated constraints',
        evidenceAnchor1: {
          excerpt: 'Budget $2.5M',
          chunkIndex: 2,
        },
        evidenceAnchor2: {
          excerpt: 'Budget $1.5M max',
          chunkIndex: 3,
        },
      },
    ],
    missingInfo: [
      {
        information: 'Detailed timeline for regulatory compliance review',
        whyNeeded: 'Required to assess project feasibility and timeline',
        category: 'timeline' as const,
      },
      {
        information: 'Stakeholder approval status',
        whyNeeded: 'Needed to confirm decision authority',
        category: 'stakeholder' as const,
      },
    ],
    extracted_at: now,
    document_type: 'decision_memo',
    file_name: '01_launch_decision_memo.txt',
    file_size: 2048,
    mime_type: 'text/plain',
  };

  return {
    step: 1,
    status: 'success' as const,
    data: {
      ...defaultData,
      ...overrides,
    },
    errors: [],
    warnings: [],
  };
}

/**
 * Generate a valid Step 2 fixture that satisfies step2Schema
 * 
 * Step 2 Schema requires:
 * - case_id (string)
 * - document_id (string)
 * - inferredDecision (string)
 * - decisionType (enum)
 * - decisionOwnerCandidates (array)
 * - decisionCriteria (array)
 * - confidence (object with score and reasons)
 * - extracted_at (ISO datetime string)
 * - Optional legacy fields: decision_title, decision_date, decision_maker, etc.
 */
export function makeValidStep2(overrides?: Partial<Step2Data['data']>): Step2Data {
  const now = new Date().toISOString();
  
  const defaultData: Step2Data['data'] = {
    case_id: 'case_67890',
    document_id: 'doc_12345',
    inferredDecision: 'Launch of a new mobile application targeting the healthcare sector in Q2 2024',
    decisionType: 'product_launch' as const,
    decisionOwnerCandidates: [
      {
        name: 'Sarah Chen',
        role: 'VP of Product',
        confidence: 0.85,
        evidenceAnchor: {
          excerpt: 'Sarah Chen VP',
          chunkIndex: 0,
          page: 1,
        },
      },
    ],
    decisionCriteria: [
      {
        criterion: 'Market demand and opportunity size',
        inferredFrom: 'Extracted claims about market research and addressable market',
        evidenceAnchor: {
          excerpt: 'Market research',
          chunkIndex: 0,
        },
      },
      {
        criterion: 'Team capacity and readiness',
        inferredFrom: 'Claims about engineering team availability',
        evidenceAnchor: {
          excerpt: 'Team capacity',
          chunkIndex: 1,
        },
      },
    ],
    confidence: {
      score: 0.75,
      reasons: [
        'Clear market opportunity identified',
        'Decision owner clearly identified',
        'Some missing information about timeline and approval status',
      ],
    },
    extracted_at: now,
    // Legacy fields (optional)
    decision_title: 'Q2 2024 Product Launch - Project Phoenix',
    decision_date: '2024-03-15',
    decision_maker: 'Sarah Chen',
    decision_maker_role: 'VP of Product',
    decision_status: 'APPROVED',
    decision_summary: 'Launch of Project Phoenix mobile application targeting healthcare sector in Q2 2024',
    context: {
      market_opportunity: '$50B addressable market',
      budget_allocated: '$2.5M',
      timeline: 'Q2 2024 (April-June)',
    },
    rationale: [
      'Market opportunity: $50B addressable market',
      'Competitive advantage: Proprietary AI technology',
      'Team readiness: Engineering team has capacity',
      'Customer validation: 15 pilot customers expressed strong interest',
    ],
    risks_identified: [
      'Regulatory compliance requirements (HIPAA)',
      'Longer sales cycles than anticipated',
      'Potential technical challenges with integration',
      'Market saturation concerns',
    ],
    mitigation_strategies: [
      'Engage legal team early for compliance review',
      'Extend runway by 3 months for sales cycle',
      'Allocate 20% buffer for technical debt',
      'Conduct additional market research',
    ],
    expected_outcomes: {
      users_6_months: 10000,
      arr_by_q2: 500000,
      customer_satisfaction: 85,
      break_even_month: 9,
    },
  };

  return {
    step: 2,
    status: 'success' as const,
    data: {
      ...defaultData,
      ...overrides,
    },
    errors: [],
    warnings: [],
  };
}
