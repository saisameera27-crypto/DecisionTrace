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
 * Build prompt for Step 1: Document Digest
 * 
 * This prompt instructs Gemini to:
 * - Normalize entities (people, orgs, products, dates)
 * - Extract claims with evidence anchors (citations)
 * - Identify contradictions
 * - List missing information
 * - Generate NEW structure and reasoning, NOT copy-paste paragraphs
 * - Use citations/anchors with source excerpts (<= 20 words) and stable identifiers
 */
export function buildForensicAnalysisPrompt(documentText: string): string {
  return `You are a document analysis expert. Your task is to create a structured "Document Digest" that synthesizes and analyzes the input document WITHOUT copying or paraphrasing large sections.

CRITICAL RULES:
1. DO NOT copy-paste paragraphs from the input
2. DO NOT paraphrase long sections (>30% overlap with input)
3. Generate NEW structure, abstractions, and reasoning
4. Use citations/anchors: for each claim include a source excerpt (<= 20 words) and stable identifier (chunkIndex, page, or line if available)
5. If any field would contain >30% direct overlap with raw input, rewrite it with abstraction/summary instead

Document text:
${documentText}

Your task:

1. Normalize entities:
   - Extract and normalize people names (standardize format)
   - Extract organizations (companies, departments, teams)
   - Extract products/services mentioned
   - Extract dates (normalize to ISO format or consistent format)

2. Extract claims with evidence anchors:
   - For each significant claim, provide a brief description (NOT a copy-paste)
   - Include evidence anchor: source excerpt (<= 20 words) + stable identifier (chunkIndex, page, or line)
   - Categorize: fact, assumption, requirement, or constraint

3. Identify contradictions:
   - Find conflicting statements
   - Provide brief descriptions (NOT verbatim quotes)
   - Include evidence anchors for both conflicting statements

4. List missing information:
   - What information is NOT present but would be needed for decision analysis
   - Categorize: context, evidence, stakeholder, timeline, outcome, or other

Return JSON in this exact format:
{
  "normalizedEntities": {
    "people": ["normalized name 1", "normalized name 2"],
    "organizations": ["org 1", "org 2"],
    "products": ["product 1", "product 2"],
    "dates": ["2024-03-15", "Q2 2024"]
  },
  "extractedClaims": [
    {
      "claim": "Brief synthesized claim description (NOT copy-paste)",
      "evidenceAnchor": {
        "excerpt": "source excerpt <= 20 words",
        "chunkIndex": 0,
        "page": 1,
        "line": 5
      },
      "category": "fact" | "assumption" | "requirement" | "constraint"
    }
  ],
  "contradictions": [
    {
      "statement1": "Brief description of first statement",
      "statement2": "Brief description of conflicting statement",
      "description": "Explanation of contradiction",
      "evidenceAnchor1": {
        "excerpt": "source excerpt <= 20 words",
        "chunkIndex": 0
      },
      "evidenceAnchor2": {
        "excerpt": "source excerpt <= 20 words",
        "chunkIndex": 1
      }
    }
  ],
  "missingInfo": [
    {
      "information": "What information is missing",
      "whyNeeded": "Why this information is needed",
      "category": "context" | "evidence" | "stakeholder" | "timeline" | "outcome" | "other"
    }
  ]
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
  })).default([]),
  fragments: z.array(z.object({
    quote: z.string().min(1, 'Quote is required'),
    classification: z.enum(['evidence', 'assumption', 'risk', 'stakeholder_signal']),
    context: z.string().optional(),
  })).default([]),
  no_decision_message: z.string().optional(),
});

export type ForensicAnalysisResult = z.infer<typeof forensicAnalysisSchema>;

