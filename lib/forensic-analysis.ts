/**
 * Decision Forensic Analysis
 * 
 * Analyzes unstructured documents to:
 * 1. Identify ALL decision candidates (explicit or implicit)
 * 2. Extract evidence fragments as verbatim quotes
 * 3. Classify fragments into: evidence, assumptions, risks, stakeholder signals
 * 4. Return structured JSON only (no summaries, paraphrasing, or invented facts)
 */

/**
 * Build prompt for forensic decision analysis
 * 
 * This prompt instructs Gemini to:
 * - Identify ALL decision candidates (explicit or implicit)
 * - Extract verbatim quotes (no summarization or paraphrasing)
 * - Classify fragments into evidence, assumptions, risks, stakeholder signals
 * - Return structured JSON only
 * - Explicitly state if no clear decision exists
 */
export function buildForensicAnalysisPrompt(documentText: string): string {
  return `You are a decision forensic analyst.

Input is an unstructured document containing notes, emails, fragments, or partial thoughts.

There may or may not be a clearly stated decision.

Your task:

1. Identify ALL decision candidates (explicit or implicit).

2. Extract evidence fragments as verbatim quotes.

3. Classify fragments into:
   - evidence
   - assumptions
   - risks
   - stakeholder signals

4. If no clear decision exists, say so explicitly.

DO NOT summarize.
DO NOT paraphrase.
DO NOT invent facts.

Return structured JSON only.

Document text:
${documentText}

Return JSON in this exact format:
{
  "has_clear_decision": boolean,
  "decision_candidates": [
    {
      "decision_text": "verbatim quote from document",
      "type": "explicit" | "implicit",
      "confidence": number (0-1)
    }
  ],
  "fragments": [
    {
      "quote": "exact verbatim quote from document",
      "classification": "evidence" | "assumption" | "risk" | "stakeholder_signal",
      "context": "surrounding text (verbatim) if helpful for understanding",
      "decision_candidate_index": number (index into decision_candidates array, or null if not associated)
    }
  ],
  "no_decision_message": string (only if has_clear_decision is false)
}`;
}

/**
 * Schema for forensic analysis response
 */
import { z } from 'zod';

export const forensicAnalysisSchema = z.object({
  has_clear_decision: z.boolean(),
  decision_candidates: z.array(z.object({
    decision_text: z.string().min(1, 'Decision text is required'),
    type: z.enum(['explicit', 'implicit']),
    confidence: z.number().min(0).max(1),
  })).default([]),
  fragments: z.array(z.object({
    quote: z.string().min(1, 'Quote is required'),
    classification: z.enum(['evidence', 'assumption', 'risk', 'stakeholder_signal']),
    context: z.string().optional(),
    decision_candidate_index: z.number().nullable().optional(),
  })).default([]),
  no_decision_message: z.string().optional(),
});

export type ForensicAnalysisResult = z.infer<typeof forensicAnalysisSchema>;

