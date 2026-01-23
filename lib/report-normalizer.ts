/**
 * Report Normalizer
 * Normalizes decision trace report data from various formats (snake_case, camelCase)
 * to a consistent view model format
 */

export interface NormalizedDecisionView {
  caseId: string;
  documentId: string;
  decisionTitle: string | null;
  decisionDate: string;
  decisionMaker: string;
  decisionMakerRole: string | null;
  decisionStatus: string;
  decisionSummary: string | null;
  context: Record<string, unknown>;
  rationale: string[];
  risksIdentified: string[];
  mitigationStrategies: string[];
  expectedOutcomes: Record<string, unknown> | null;
  confidenceScore: number;
  extractedAt: string;
}

/**
 * Convert snake_case to camelCase
 */
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert camelCase to snake_case
 */
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Normalize object keys from snake_case or camelCase to camelCase
 */
function normalizeKeys(obj: Record<string, any>): Record<string, any> {
  const normalized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Determine if key is snake_case or camelCase
    const isSnakeCase = key.includes('_');
    const normalizedKey = isSnakeCase ? snakeToCamel(key) : key;
    
    // Recursively normalize nested objects
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      normalized[normalizedKey] = normalizeKeys(value);
    } else {
      normalized[normalizedKey] = value;
    }
  }
  
  return normalized;
}

/**
 * Normalize step 2 decision data to a consistent view model
 * Handles both snake_case and camelCase input formats
 */
export function normalizeDecisionData(
  rawData: Record<string, any>
): NormalizedDecisionView {
  // Normalize keys to camelCase
  const normalized = normalizeKeys(rawData);
  
  // Extract and normalize fields with safe defaults
  return {
    caseId: normalized.caseId || normalized.case_id || '',
    documentId: normalized.documentId || normalized.document_id || '',
    decisionTitle: normalized.decisionTitle || normalized.decision_title || null,
    decisionDate: normalized.decisionDate || normalized.decision_date || '',
    decisionMaker: normalized.decisionMaker || normalized.decision_maker || '',
    decisionMakerRole: normalized.decisionMakerRole || normalized.decision_maker_role || null,
    decisionStatus: normalized.decisionStatus || normalized.decision_status || '',
    decisionSummary: normalized.decisionSummary || normalized.decision_summary || null,
    context: normalized.context || {},
    rationale: Array.isArray(normalized.rationale) ? normalized.rationale : [],
    risksIdentified: Array.isArray(normalized.risksIdentified) 
      ? normalized.risksIdentified 
      : (Array.isArray(normalized.risks_identified) ? normalized.risks_identified : []),
    mitigationStrategies: Array.isArray(normalized.mitigationStrategies)
      ? normalized.mitigationStrategies
      : (Array.isArray(normalized.mitigation_strategies) ? normalized.mitigation_strategies : []),
    expectedOutcomes: normalized.expectedOutcomes || normalized.expected_outcomes || null,
    confidenceScore: typeof normalized.confidenceScore === 'number'
      ? normalized.confidenceScore
      : (typeof normalized.confidence_score === 'number' ? normalized.confidence_score : 0),
    extractedAt: normalized.extractedAt || normalized.extracted_at || new Date().toISOString(),
  };
}

/**
 * Normalize step 2 response to view model
 */
export function normalizeStep2Response(
  step2Response: {
    step: number;
    status: string;
    data: Record<string, any>;
    errors?: string[];
    warnings?: string[];
  }
): NormalizedDecisionView {
  if (!step2Response || !step2Response.data) {
    throw new Error('Invalid step 2 response: missing data');
  }
  
  return normalizeDecisionData(step2Response.data);
}

