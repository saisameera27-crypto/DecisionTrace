/**
 * Lightweight validator for Decision Ledger–shaped objects.
 * No dependencies; deterministic checks only.
 */

const REQUIRED_TOP_LEVEL_KEYS = [
  "decision",
  "flow",
  "evidenceLedger",
  "riskLedger",
  "assumptionLedger",
  "accountability",
] as const;

const REQUIRED_FLOW_STEP_KEYS = ["step", "label", "actor", "aiInfluence", "overrideApplied", "rulesApplied", "confidenceDelta"] as const;

function hasAllKeys(obj: unknown, keys: readonly string[]): boolean {
  if (typeof obj !== "object" || obj === null) return false;
  const o = obj as Record<string, unknown>;
  for (const key of keys) {
    if (!(key in o)) return false;
  }
  return true;
}

export type ValidateLedgerResult =
  | { ok: true }
  | { ok: false; error: string; missingFields?: string[] };

/**
 * Validates a decision ledger–shaped object.
 * - Ensures required top-level keys exist.
 * - Ensures each flow step has step, label, actor, aiInfluence, overrideApplied, rulesApplied, confidenceDelta.
 * Returns { ok: true } or { ok: false, error, missingFields? }.
 */
export function validateDecisionLedger(obj: unknown): ValidateLedgerResult {
  if (typeof obj !== "object" || obj === null) {
    return { ok: false, error: "Ledger must be an object.", missingFields: ["(root: must be an object)"] };
  }

  const ledger = obj as Record<string, unknown>;
  const missingFields: string[] = [];

  for (const key of REQUIRED_TOP_LEVEL_KEYS) {
    if (!(key in ledger)) {
      missingFields.push(key);
    }
  }
  if (missingFields.length > 0) {
    return {
      ok: false,
      error: `Missing required key(s): ${missingFields.map((k) => `"${k}"`).join(", ")}.`,
      missingFields,
    };
  }

  const decision = ledger.decision as Record<string, unknown> | undefined;
  const decisionRequired = ["outcome", "confidence", "traceScore", "scoreRationale"] as const;
  if (!decision || typeof decision !== "object") {
    return {
      ok: false,
      error: "decision must be an object.",
      missingFields: ["decision (object)"],
    };
  }
  for (const key of decisionRequired) {
    if (!(key in decision) || decision[key] === undefined) {
      missingFields.push(`decision.${key}`);
    }
  }
  if (missingFields.length > 0) {
    return {
      ok: false,
      error: `decision missing required key(s): ${missingFields.map((k) => k.replace("decision.", "")).join(", ")}.`,
      missingFields,
    };
  }

  const flow = ledger.flow;
  if (!Array.isArray(flow)) {
    return { ok: false, error: '"flow" must be an array.', missingFields: ["flow (array)"] };
  }

  for (let i = 0; i < flow.length; i++) {
    const step = flow[i];
    if (typeof step !== "object" || step === null) {
      return {
        ok: false,
        error: `Flow step ${i + 1} must be an object.`,
        missingFields: [`flow[${i}] (object)`],
      };
    }
    const stepMissing = REQUIRED_FLOW_STEP_KEYS.filter((k) => !(k in (step as Record<string, unknown>)));
    if (stepMissing.length > 0) {
      const fields = stepMissing.map((k) => `flow[${i}].${k}`);
      return {
        ok: false,
        error: `Flow step ${i + 1} is missing: ${stepMissing.join(", ")}. Required: step, label, actor, aiInfluence, overrideApplied, rulesApplied, confidenceDelta.`,
        missingFields: fields,
      };
    }
  }

  return { ok: true };
}
