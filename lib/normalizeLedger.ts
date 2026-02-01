/**
 * Normalize raw ledger-like input into a fully valid DecisionLedger.
 * Maps alternative keys, fills required fields with defaults, and computes traceScore when missing.
 */

import type {
  DecisionLedger,
  DecisionEntry,
  FlowStep,
  EvidenceEntry,
  RiskEntry,
  AssumptionEntry,
  AccountabilityEntry,
  Confidence,
  Weight,
  Actor,
} from "./decisionLedgerSchema";

const VALID_CONFIDENCE: Confidence[] = ["low", "medium", "high"];
const VALID_WEIGHT: Weight[] = ["low", "medium", "high"];
const VALID_ACTOR: Actor[] = ["AI", "Human", "System"];

function asString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  return String(v);
}

function asNumber(v: unknown, fallback: number): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  const n = Number(v);
  return Number.isNaN(n) ? fallback : n;
}

function asBoolean(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (v === "true" || v === 1) return true;
  if (v === "false" || v === 0) return false;
  return Boolean(v);
}

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => asString(x));
  if (v != null && typeof v === "object") return [];
  return [];
}

function pickOneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof v === "string" && (allowed as readonly string[]).includes(v)) return v as T;
  return fallback;
}

/**
 * Compute traceScore deterministically from evidence, risks, and assumptions.
 * Same inputs always yield the same score in 0–100.
 */
export function computeTraceScore(
  evidence: EvidenceEntry[],
  risks: RiskEntry[],
  assumptions: AssumptionEntry[]
): number {
  let score = 70;

  for (const e of evidence) {
    if (e.used) {
      if (e.weight === "high") score += 5;
      else if (e.weight === "medium") score += 3;
      else score += 1;
    } else {
      score -= 2;
    }
  }

  for (const r of risks) {
    if (r.accepted && !(r.mitigation ?? "").trim()) score -= 3;
    else if (r.identified) score -= 1;
  }

  for (const a of assumptions) {
    if (a.validated) score += 1;
    else score -= 2;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function normalizeDecision(
  raw: unknown,
  opts: { evidenceLedger: EvidenceEntry[]; riskLedger: RiskEntry[]; assumptionLedger: AssumptionEntry[] }
): DecisionEntry {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const outcome =
    asString(o.outcome).trim() ||
    asString(o.title).trim() ||
    asString(o.description).trim().slice(0, 500) ||
    "Decision outcome not specified";
  const confidence = pickOneOf(o.confidence, VALID_CONFIDENCE, "medium");
  const scoreRationale = Array.isArray(o.scoreRationale)
    ? (o.scoreRationale as unknown[]).map((x) => asString(x)).filter(Boolean)
    : [];
  const traceScore =
    typeof o.traceScore === "number" && !Number.isNaN(o.traceScore)
      ? Math.max(0, Math.min(100, Math.round(o.traceScore)))
      : computeTraceScore(opts.evidenceLedger, opts.riskLedger, opts.assumptionLedger);

  return {
    outcome,
    confidence,
    traceScore,
    scoreRationale,
  };
}

function normalizeEvidenceEntry(raw: unknown): EvidenceEntry {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const evidence =
    asString(o.evidence).trim() ||
    asString(o.claim).trim() ||
    asString(o.source).trim() ||
    "";
  const weight = pickOneOf(
    o.weight ?? o.strength,
    VALID_WEIGHT,
    "medium"
  );
  const used = o.used !== undefined ? asBoolean(o.used) : true;
  const confidenceImpact = asNumber(o.confidenceImpact, 0);
  const reason = asString(o.reason).trim() || (used ? "Used in decision" : "Not used");

  return { evidence, used, weight, confidenceImpact, reason };
}

function normalizeEvidenceLedger(raw: unknown): EvidenceEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => normalizeEvidenceEntry(item));
}

function normalizeFlowStep(raw: unknown, index: number): FlowStep {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const step = asNumber(o.step, index + 1);
  const label = asString(o.label).trim() || `Step ${step}`;
  const actor = pickOneOf(o.actor, VALID_ACTOR, "Human");
  const aiInfluence = asBoolean(o.aiInfluence);
  const overrideApplied = asBoolean(o.overrideApplied);
  const rulesApplied = Array.isArray(o.rulesApplied)
    ? (o.rulesApplied as unknown[]).map((x) => asString(x)).filter(Boolean)
    : [];
  const confidenceDelta = typeof o.confidenceDelta === "number" && !Number.isNaN(o.confidenceDelta)
    ? o.confidenceDelta
    : 0;

  return { step, label, actor, aiInfluence, overrideApplied, rulesApplied, confidenceDelta };
}

function normalizeFlow(raw: unknown): FlowStep[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, i) => normalizeFlowStep(item, i));
}

function normalizeRiskEntry(raw: unknown): RiskEntry {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    risk: asString(o.risk).trim() || "Unspecified risk",
    identified: o.identified !== undefined ? asBoolean(o.identified) : true,
    accepted: asBoolean(o.accepted),
    severity: asString(o.severity).trim() || "medium",
    acceptedBy: asString(o.acceptedBy).trim(),
    mitigation: asString(o.mitigation).trim(),
  };
}

function normalizeRiskLedger(raw: unknown): RiskEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => normalizeRiskEntry(item));
}

function normalizeAssumptionEntry(raw: unknown): AssumptionEntry {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    assumption: asString(o.assumption).trim() || "Unspecified assumption",
    explicit: asBoolean(o.explicit),
    validated: asBoolean(o.validated),
    owner: asString(o.owner).trim(),
    invalidationImpact: asString(o.invalidationImpact).trim(),
  };
}

function normalizeAssumptionLedger(raw: unknown): AssumptionEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => normalizeAssumptionEntry(item));
}

function normalizeAccountability(raw: unknown): AccountabilityEntry {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  let responsible = asString(o.responsible).trim();
  let accountable = asString(o.accountable).trim();
  let consulted = asStringArray(o.consulted);
  let informed = asStringArray(o.informed);

  const owner = asString(o.owner).trim();
  const stakeholders = asStringArray(o.stakeholders);

  if (!responsible && owner) responsible = owner;
  if (!accountable && owner) accountable = owner;
  if (consulted.length === 0 && stakeholders.length > 0) consulted = [...stakeholders];
  if (informed.length === 0 && stakeholders.length > 0 && consulted.length === 0) informed = [...stakeholders];

  return {
    responsible: responsible || "",
    accountable: accountable || "",
    consulted,
    informed,
  };
}

/**
 * Normalize raw input into a fully valid DecisionLedger.
 * - Maps decision.title/description -> decision.outcome; evidenceLedger claim/source/strength -> evidence/weight/used/reason; accountability owner/stakeholders -> responsible/accountable/consulted/informed.
 * - Ensures scoreRationale is string[], rulesApplied and confidenceDelta per step (default [] and 0).
 * - If decision.traceScore is missing, computes it deterministically from evidence/risks/assumptions.
 * @throws Error if raw is not a ledger-like object (e.g. null or missing required top-level keys).
 */
export function normalizeLedger(raw: unknown): DecisionLedger {
  if (raw == null || typeof raw !== "object") {
    throw new Error("normalizeLedger: input must be an object.");
  }

  const o = raw as Record<string, unknown>;

  const decisionRaw = o.decision;
  const evidenceLedger = normalizeEvidenceLedger(o.evidenceLedger);
  const riskLedger = normalizeRiskLedger(o.riskLedger);
  const assumptionLedger = normalizeAssumptionLedger(o.assumptionLedger);

  const decision = normalizeDecision(decisionRaw, {
    evidenceLedger,
    riskLedger,
    assumptionLedger,
  });

  const flow = normalizeFlow(o.flow);
  const accountability = normalizeAccountability(o.accountability);

  return {
    decision,
    flow,
    evidenceLedger,
    riskLedger,
    assumptionLedger,
    accountability,
  };
}
