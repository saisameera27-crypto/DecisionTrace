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

const REQUIRED_FLOW_STEP_KEYS = ["step", "label", "actor", "aiInfluence", "overrideApplied"] as const;

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
  | { ok: false; error: string };

/**
 * Validates a decision ledger–shaped object.
 * - Ensures required top-level keys exist.
 * - Ensures each flow step has step, label, actor, aiInfluence, overrideApplied.
 * Returns { ok: true } or { ok: false, error: "human-readable message" }.
 */
export function validateDecisionLedger(obj: unknown): ValidateLedgerResult {
  if (typeof obj !== "object" || obj === null) {
    return { ok: false, error: "Ledger must be an object." };
  }

  const ledger = obj as Record<string, unknown>;

  for (const key of REQUIRED_TOP_LEVEL_KEYS) {
    if (!(key in ledger)) {
      return { ok: false, error: `Missing required key: "${key}".` };
    }
  }

  const flow = ledger.flow;
  if (!Array.isArray(flow)) {
    return { ok: false, error: '"flow" must be an array.' };
  }

  for (let i = 0; i < flow.length; i++) {
    const step = flow[i];
    if (typeof step !== "object" || step === null) {
      return { ok: false, error: `Flow step ${i + 1} must be an object.` };
    }
    if (!hasAllKeys(step, [...REQUIRED_FLOW_STEP_KEYS])) {
      const missing = REQUIRED_FLOW_STEP_KEYS.filter((k) => !(k in (step as Record<string, unknown>)));
      return {
        ok: false,
        error: `Flow step ${i + 1} is missing: ${missing.join(", ")}. Required: step, label, actor, aiInfluence, overrideApplied.`,
      };
    }
  }

  return { ok: true };
}
