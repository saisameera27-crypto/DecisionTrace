/**
 * Decision Ledger: TypeScript types and JSON Schema for structured decision trace data.
 * Used for validation and type-safe report generation.
 */

// --- Enums (strongly typed) ---

export type Confidence = "low" | "medium" | "high";

export type Weight = "low" | "medium" | "high";

export type Actor = "AI" | "Human" | "System";

// --- Decision (outcome, confidence, traceScore, scoreRationale) ---

export type DecisionEntry = {
  outcome: string;
  confidence: Confidence;
  traceScore: number;
  scoreRationale: string[];
};

// --- Flow (decision flow steps) ---

export type FlowStep = {
  step: number;
  label: string;
  actor: Actor;
  aiInfluence: boolean;
  overrideApplied: boolean;
  rulesApplied: string[];
  confidenceDelta: number;
};

// --- Evidence ledger ---

export type EvidenceEntry = {
  evidence: string;
  used: boolean;
  weight: Weight;
  confidenceImpact: number;
  reason: string;
};

// --- Risk ledger ---

export type RiskEntry = {
  risk: string;
  identified: boolean;
  accepted: boolean;
  severity: string;
  acceptedBy: string;
  mitigation: string;
};

// --- Assumption ledger ---

export type AssumptionEntry = {
  assumption: string;
  explicit: boolean;
  validated: boolean;
  owner: string;
  invalidationImpact: string;
};

// --- Accountability ---

export type AccountabilityEntry = {
  responsible: string;
  accountable: string;
  consulted: string[];
  informed: string[];
};

// --- Top-level Decision Ledger ---

export type DecisionLedger = {
  decision: DecisionEntry;
  flow: FlowStep[];
  evidenceLedger: EvidenceEntry[];
  riskLedger: RiskEntry[];
  assumptionLedger: AssumptionEntry[];
  accountability: AccountabilityEntry;
};

// --- JSON Schema (mirrors types, required fields, enums) ---

const confidenceEnum = ["low", "medium", "high"] as const;
const weightEnum = ["low", "medium", "high"] as const;
const actorEnum = ["AI", "Human", "System"] as const;

export const DECISION_LEDGER_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "DecisionLedger",
  type: "object",
  required: ["decision", "flow", "evidenceLedger", "riskLedger", "assumptionLedger", "accountability"],
  properties: {
    decision: {
      type: "object",
      required: ["outcome", "confidence"],
      properties: {
        outcome: { type: "string" },
        confidence: { type: "string", enum: [...confidenceEnum] },
        traceScore: { type: "number" },
        scoreRationale: { type: "array", items: { type: "string" } },
      },
    },
    flow: {
      type: "array",
      items: {
        type: "object",
        required: ["step", "label", "actor", "aiInfluence", "overrideApplied", "rulesApplied", "confidenceDelta"],
        properties: {
          step: { type: "number" },
          label: { type: "string" },
          actor: { type: "string", enum: [...actorEnum] },
          aiInfluence: { type: "boolean" },
          overrideApplied: { type: "boolean" },
          rulesApplied: { type: "array", items: { type: "string" } },
          confidenceDelta: { type: "number" },
        },
      },
    },
    evidenceLedger: {
      type: "array",
      items: {
        type: "object",
        required: ["evidence", "used", "weight", "confidenceImpact", "reason"],
        properties: {
          evidence: { type: "string" },
          used: { type: "boolean" },
          weight: { type: "string", enum: [...weightEnum] },
          confidenceImpact: { type: "number" },
          reason: { type: "string" },
        },
      },
    },
    riskLedger: {
      type: "array",
      items: {
        type: "object",
        required: ["risk", "identified", "accepted", "severity", "acceptedBy", "mitigation"],
        properties: {
          risk: { type: "string" },
          identified: { type: "boolean" },
          accepted: { type: "boolean" },
          severity: { type: "string" },
          acceptedBy: { type: "string" },
          mitigation: { type: "string" },
        },
      },
    },
    assumptionLedger: {
      type: "array",
      items: {
        type: "object",
        required: ["assumption", "explicit", "validated", "owner", "invalidationImpact"],
        properties: {
          assumption: { type: "string" },
          explicit: { type: "boolean" },
          validated: { type: "boolean" },
          owner: { type: "string" },
          invalidationImpact: { type: "string" },
        },
      },
    },
    accountability: {
      type: "object",
      required: ["responsible", "accountable", "consulted", "informed"],
      properties: {
        responsible: { type: "string" },
        accountable: { type: "string" },
        consulted: { type: "array", items: { type: "string" } },
        informed: { type: "array", items: { type: "string" } },
      },
    },
  },
} as const;
