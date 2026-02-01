/**
 * Deterministic score rationale derivation from ledger data.
 * Ensures traceScore is supported by concrete, explainable reasons from evidence, risks, and assumptions.
 */

import type { DecisionLedger } from "./decisionLedgerSchema";

const MIN_RATIONALE_ITEMS = 3;
const MAX_RATIONALE_ITEMS = 6;
const MIN_AVG_LENGTH = 25;

/**
 * Returns true if scoreRationale is missing or too generic to support the score.
 */
export function isScoreRationaleTooGeneric(rationale: string[] | undefined): boolean {
  if (!rationale || rationale.length === 0) return true;
  if (rationale.length < MIN_RATIONALE_ITEMS) return true;
  const totalLen = rationale.reduce((sum, s) => sum + (s?.trim?.()?.length ?? 0), 0);
  const avgLen = totalLen / rationale.length;
  return avgLen < MIN_AVG_LENGTH;
}

/**
 * Derives 3–6 concrete, explainable reasons from the ledger (evidence, risks, assumptions, flow, accountability).
 * Deterministic: same ledger → same output.
 */
export function deriveScoreRationale(ledger: DecisionLedger): string[] {
  const reasons: string[] = [];

  const evidence = ledger.evidenceLedger ?? [];
  if (evidence.length > 0) {
    const high = evidence.filter((e) => e.weight === "high").length;
    const medium = evidence.filter((e) => e.weight === "medium").length;
    const low = evidence.filter((e) => e.weight === "low").length;
    const used = evidence.filter((e) => e.used).length;
    const parts: string[] = [];
    if (high) parts.push(`${high} high`);
    if (medium) parts.push(`${medium} medium`);
    if (low) parts.push(`${low} low`);
    reasons.push(`Evidence: ${evidence.length} item(s), ${used} used (${parts.join(", ")} weight).`);
  } else {
    reasons.push("Evidence: no evidence items recorded.");
  }

  const risks = ledger.riskLedger ?? [];
  if (risks.length > 0) {
    const accepted = risks.filter((r) => r.accepted).length;
    const withMitigation = risks.filter((r) => (r.mitigation ?? "").trim().length > 0).length;
    reasons.push(`Risks: ${risks.length} identified; ${accepted} accepted; ${withMitigation} with mitigation.`);
  } else {
    reasons.push("Risks: none recorded.");
  }

  const assumptions = ledger.assumptionLedger ?? [];
  if (assumptions.length > 0) {
    const validated = assumptions.filter((a) => a.validated === true).length;
    reasons.push(`Assumptions: ${assumptions.length} total; ${validated} validated, ${assumptions.length - validated} unvalidated.`);
  } else {
    reasons.push("Assumptions: none recorded.");
  }

  const flow = ledger.flow ?? [];
  if (flow.length > 0) {
    const aiSteps = flow.filter((s) => s.aiInfluence === true).length;
    const overrideSteps = flow.filter((s) => s.overrideApplied === true).length;
    reasons.push(`Decision flow: ${flow.length} step(s); AI influenced ${aiSteps}; override applied in ${overrideSteps}.`);
  } else {
    reasons.push("Decision flow: no steps recorded.");
  }

  const acc = ledger.accountability;
  if (acc) {
    const hasResponsible = (acc.responsible ?? "").trim().length > 0;
    const hasAccountable = (acc.accountable ?? "").trim().length > 0;
    const consultedCount = acc.consulted?.length ?? 0;
    const informedCount = acc.informed?.length ?? 0;
    reasons.push(`Accountability: responsible ${hasResponsible ? "set" : "not set"}; accountable ${hasAccountable ? "set" : "not set"}; ${consultedCount} consulted; ${informedCount} informed.`);
  } else {
    reasons.push("Accountability: not recorded.");
  }

  return reasons.slice(0, MAX_RATIONALE_ITEMS);
}

/**
 * Ensures ledger.decision.scoreRationale supports the score: if missing or too generic,
 * sets or appends 3–6 concrete reasons derived from evidence, risks, and assumptions.
 * Mutates ledger in place. Deterministic and explainable.
 */
export function ensureScoreRationale(ledger: DecisionLedger): void {
  const decision = ledger.decision;
  if (!decision) return;
  const current = decision.scoreRationale ?? [];

  if (current.length === 0) {
    decision.scoreRationale = deriveScoreRationale(ledger);
    return;
  }

  if (isScoreRationaleTooGeneric(current)) {
    const derived = deriveScoreRationale(ledger);
    const combined = [...current, ...derived];
    decision.scoreRationale = combined.slice(0, MAX_RATIONALE_ITEMS);
  }
}
