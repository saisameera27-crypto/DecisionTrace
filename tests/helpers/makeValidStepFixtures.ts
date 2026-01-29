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
 * - has_clear_decision (boolean)
 * - decision_candidates (array, default [])
 * - fragments (array, default [])
 * - extracted_at (ISO datetime string)
 * - Optional: document_type, file_name, file_size, mime_type
 */
export function makeValidStep1(overrides?: Partial<Step1Data['data']>): Step1Data {
  const now = new Date().toISOString();
  
  const defaultData: Step1Data['data'] = {
    document_id: 'doc_12345',
    has_clear_decision: true,
    decision_candidates: [
      {
        decision_text: "We have decided to launch 'Project Phoenix' - a new mobile application targeting the healthcare sector in Q2 2024",
        type: 'explicit' as const,
      },
    ],
    fragments: [
      {
        quote: 'Market research shows strong demand for healthcare mobile apps',
        classification: 'evidence' as const,
        context: 'Market research shows strong demand for healthcare mobile apps, with 15 pilot customers expressing strong interest',
      },
      {
        quote: '$50B addressable market',
        classification: 'evidence' as const,
        context: 'Market opportunity: $50B addressable market',
      },
      {
        quote: 'Engineering team has capacity',
        classification: 'assumption' as const,
        context: 'Team readiness: Engineering team has capacity',
      },
      {
        quote: 'Regulatory compliance requirements (HIPAA)',
        classification: 'risk' as const,
        context: 'Regulatory compliance requirements (HIPAA) must be addressed',
      },
      {
        quote: 'Sarah Chen, VP of Product',
        classification: 'stakeholder_signal' as const,
        context: 'Decision Maker: Sarah Chen, VP of Product',
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
 * - has_clear_decision (boolean)
 * - decision_candidates (array, default [])
 * - fragments (array, default [])
 * - extracted_at (ISO datetime string)
 * - Optional legacy fields: decision_title, decision_date, decision_maker, etc.
 */
export function makeValidStep2(overrides?: Partial<Step2Data['data']>): Step2Data {
  const now = new Date().toISOString();
  
  const defaultData: Step2Data['data'] = {
    case_id: 'case_67890',
    document_id: 'doc_12345',
    has_clear_decision: true,
    decision_candidates: [
      {
        decision_text: "We have decided to launch 'Project Phoenix' - a new mobile application targeting the healthcare sector in Q2 2024",
        type: 'explicit' as const,
      },
    ],
    fragments: [
      {
        quote: 'Market research shows strong demand for healthcare mobile apps',
        classification: 'evidence' as const,
        context: 'Market research shows strong demand for healthcare mobile apps, with 15 pilot customers expressing strong interest',
      },
      {
        quote: '$50B addressable market',
        classification: 'evidence' as const,
        context: 'Market opportunity: $50B addressable market',
      },
      {
        quote: 'Engineering team has capacity',
        classification: 'assumption' as const,
        context: 'Team readiness: Engineering team has capacity',
      },
      {
        quote: 'Regulatory compliance requirements (HIPAA)',
        classification: 'risk' as const,
        context: 'Regulatory compliance requirements (HIPAA) must be addressed',
      },
      {
        quote: 'Sarah Chen, VP of Product',
        classification: 'stakeholder_signal' as const,
        context: 'Decision Maker: Sarah Chen, VP of Product',
      },
    ],
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
