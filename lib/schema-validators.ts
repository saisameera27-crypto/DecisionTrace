/**
 * Zod Schema Validators for Decision Trace Steps
 * Defines validation schemas for all 6 steps of the decision trace process
 */

import { z } from 'zod';

/**
 * Step 1 Schema: Decision Inference + Categorization (Forensic Analysis)
 * Validates forensic analysis results with verbatim quotes and fragment classification
 * 
 * Step 1 performs:
 * - Decision inference (identifies all decision candidates)
 * - Fragment categorization (evidence, assumptions, risks, stakeholder signals)
 * - Verbatim quote extraction (no summarization)
 */
export const step1Schema = z.object({
  step: z.literal(1),
  status: z.enum(['success', 'error', 'partial_success']),
  data: z.object({
    document_id: z.string().min(1, 'Document ID is required'),
    // Forensic analysis results
    has_clear_decision: z.boolean(),
    decision_candidates: z.array(z.object({
      decision_text: z.string().min(1, 'Decision text must be verbatim quote'),
      type: z.enum(['explicit', 'implicit']),
      confidence: z.number().min(0).max(1),
    })).default([]),
    fragments: z.array(z.object({
      quote: z.string().min(1, 'Quote must be verbatim from document'),
      classification: z.enum(['evidence', 'assumption', 'risk', 'stakeholder_signal']),
      context: z.string().optional(), // Optional surrounding text (verbatim)
      decision_candidate_index: z.number().nullable().optional(), // Index into decision_candidates array
    })).default([]),
    no_decision_message: z.string().optional(), // Only present if has_clear_decision is false
    extracted_at: z.string().datetime({ message: 'Invalid ISO datetime format' }),
    // Legacy metadata fields (optional for backward compatibility)
    document_type: z.string().optional(),
    file_name: z.string().optional(),
    file_size: z.number().int().positive().optional(),
    mime_type: z.string().optional(),
  }),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
});

/**
 * Step 2 Schema: Decision Extraction (Forensic Analysis)
 * Validates forensic analysis results with verbatim quotes and fragment classification
 * 
 * This schema enforces:
 * - ALL decision candidates identified (explicit or implicit)
 * - Evidence fragments as verbatim quotes (no summarization)
 * - Classification into: evidence, assumptions, risks, stakeholder signals
 * - Explicit statement if no clear decision exists
 */
export const step2Schema = z.object({
  step: z.literal(2),
  status: z.enum(['success', 'error', 'partial_success']),
  data: z.object({
    case_id: z.string().min(1, 'Case ID is required'),
    document_id: z.string().min(1, 'Document ID is required'),
    // Forensic analysis results
    has_clear_decision: z.boolean(),
    decision_candidates: z.array(z.object({
      decision_text: z.string().min(1, 'Decision text must be verbatim quote'),
      type: z.enum(['explicit', 'implicit']),
      confidence: z.number().min(0).max(1),
    })).default([]),
    fragments: z.array(z.object({
      quote: z.string().min(1, 'Quote must be verbatim from document'),
      classification: z.enum(['evidence', 'assumption', 'risk', 'stakeholder_signal']),
      context: z.string().optional(), // Optional surrounding text (verbatim)
      decision_candidate_index: z.number().nullable().optional(), // Index into decision_candidates array
    })).default([]),
    no_decision_message: z.string().optional(), // Only present if has_clear_decision is false
    // Legacy fields for backward compatibility (derived from forensic analysis)
    decision_title: z.string().nullable().optional(), // Derived from first decision_candidate if exists
    decision_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
    decision_maker: z.string().optional(), // Extracted from stakeholder_signal fragments
    decision_maker_role: z.string().nullable().optional(),
    decision_status: z.string().optional(),
    decision_summary: z.string().nullable().optional(), // Can be null if no clear decision
    context: z.record(z.string(), z.unknown()).default({}),
    rationale: z.array(z.string()).default([]), // Derived from evidence fragments
    risks_identified: z.array(z.string()).default([]), // Derived from risk fragments
    mitigation_strategies: z.array(z.string()).default([]),
    expected_outcomes: z.record(z.string(), z.unknown()).nullable().optional(),
    confidence_score: z.number().min(0).max(1, 'Confidence score must be between 0 and 1').optional(),
    extracted_at: z.string().datetime({ message: 'Invalid ISO datetime format' }),
  }),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
});

/**
 * Step 3 Schema: Context Analysis
 * Validates context and background analysis
 */
export const step3Schema = z.object({
  step: z.literal(3),
  status: z.enum(['success', 'error', 'partial_success']),
  data: z.object({
    case_id: z.string().min(1, 'Case ID is required'),
    context_analysis: z.object({
      business_context: z.string().min(1, 'Business context is required'),
      market_conditions: z.string().optional(),
      organizational_factors: z.array(z.string()).default([]),
      external_factors: z.array(z.string()).default([]),
    }),
    stakeholders: z.array(z.object({
      name: z.string().min(1),
      role: z.string().optional(),
      influence: z.enum(['high', 'medium', 'low']).optional(),
    })).default([]),
    analysis_date: z.string().datetime({ message: 'Invalid ISO datetime format' }),
  }),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
});

/**
 * Step 4 Schema: Outcome Analysis
 * Validates analysis of decision outcomes and results
 */
export const step4Schema = z.object({
  step: z.literal(4),
  status: z.enum(['success', 'error', 'partial_success']),
  data: z.object({
    case_id: z.string().min(1, 'Case ID is required'),
    outcome_analysis: z.object({
      actual_outcomes: z.record(z.string(), z.unknown()).default({}),
      expected_vs_actual: z.object({
        metric: z.string(),
        expected: z.unknown(),
        actual: z.unknown(),
        variance: z.number().optional(),
      }).array().default([]),
      success_indicators: z.array(z.string()).default([]),
      failure_indicators: z.array(z.string()).default([]),
    }),
    impact_assessment: z.object({
      financial_impact: z.number().optional(),
      operational_impact: z.string().optional(),
      reputation_impact: z.string().optional(),
    }).optional(),
    analysis_date: z.string().datetime({ message: 'Invalid ISO datetime format' }),
  }),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
});

/**
 * Step 5 Schema: Root Cause Analysis
 * Validates root cause identification and analysis
 */
export const step5Schema = z.object({
  step: z.literal(5),
  status: z.enum(['success', 'error', 'partial_success']),
  data: z.object({
    case_id: z.string().min(1, 'Case ID is required'),
    root_causes: z.array(z.object({
      cause: z.string().min(1, 'Root cause description is required'),
      category: z.enum(['process', 'people', 'technology', 'external', 'strategy']),
      severity: z.enum(['critical', 'high', 'medium', 'low']),
      evidence: z.array(z.string()).default([]),
    })).min(1, 'At least one root cause is required'),
    contributing_factors: z.array(z.string()).default([]),
    analysis_date: z.string().datetime({ message: 'Invalid ISO datetime format' }),
  }),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
});

/**
 * Step 6 Schema: Lessons Learned and Recommendations
 * Validates final recommendations and lessons learned
 */
export const step6Schema = z.object({
  step: z.literal(6),
  status: z.enum(['success', 'error', 'partial_success']),
  data: z.object({
    case_id: z.string().min(1, 'Case ID is required'),
    lessons_learned: z.array(z.object({
      lesson: z.string().min(1, 'Lesson description is required'),
      category: z.enum(['process', 'decision_making', 'execution', 'monitoring']),
      priority: z.enum(['high', 'medium', 'low']),
    })).min(1, 'At least one lesson learned is required'),
    recommendations: z.array(z.object({
      recommendation: z.string().min(1, 'Recommendation is required'),
      priority: z.enum(['high', 'medium', 'low']),
      feasibility: z.enum(['high', 'medium', 'low']),
      expected_impact: z.string().optional(),
    })).min(1, 'At least one recommendation is required'),
    action_items: z.array(z.object({
      action: z.string().min(1, 'Action item is required'),
      owner: z.string().optional(),
      due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
      status: z.enum(['pending', 'in_progress', 'completed']).optional(),
    })).default([]),
    completion_date: z.string().datetime({ message: 'Invalid ISO datetime format' }),
  }),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
});

/**
 * Format Zod errors into friendly error messages
 */
export function formatZodError(error: z.ZodError): string[] {
  // Zod uses 'issues' property, not 'errors'
  const issues = error.issues || (error as any).errors || [];
  
  if (!Array.isArray(issues) || issues.length === 0) {
    return ['Validation error: Invalid error object'];
  }
  
  return issues.map((err: z.ZodIssue) => {
    const path = err.path && err.path.length > 0 ? err.path.join('.') : '';
    const message = err.message || 'Validation failed';
    
    if (path) {
      return `${path}: ${message}`;
    }
    return message;
  });
}

/**
 * Validate data against a schema and return formatted errors
 */
export function validateWithSchema<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    // result.error is a ZodError when success is false
    return { success: false, errors: formatZodError(result.error) };
  }
}

