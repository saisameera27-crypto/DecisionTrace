/**
 * Decision Ledger: TypeScript types and JSON Schema for structured decision trace data.
 * Used for validation and type-safe report generation.
 */

// --- Enums (strongly typed) ---

export type Confidence = "low" | "medium" | "high";

export type Weight = "low" | "medium" | "high";

export type Severity = "low" | "medium" | "high";

// --- Decision ---

export type DecisionEntry = {
  title: string;
  description: string;
  confidence: Confidence;
};

// --- Flow (decision flow steps) ---

export type FlowStep = {
  step: number;
  label: string;
  description: string;
  actor: string;
  aiInfluence: boolean;
  overrideApplied: boolean;
};

// --- Evidence ledger ---

export type EvidenceEntry = {
  claim: string;
  source: string;
  strength: Weight;
};

// --- Risk ledger ---

export type RiskEntry = {
  risk: string;
  likelihood: Weight;
  impact: Severity;
  mitigation: string;
  owner: string;
};

// --- Assumption ledger ---

export type AssumptionEntry = {
  assumption: string;
  validated: boolean;
  howToValidate: string;
};

// --- Accountability ---

export type StakeholderEntry = {
  name: string;
  role: string;
  responsibility: "R" | "A" | "C" | "I";
  impact: string;
};

export type AccountabilityEntry = {
  owner: string;
  stakeholders: StakeholderEntry[];
  approvalsNeeded: string[];
};

// --- Top-level Decision Ledger ---

export type DecisionLedger = {
  decision: DecisionEntry;
  flow: FlowStep[];
  evidenceLedger: EvidenceEntry[];
  riskLedger: RiskEntry[];
  assumptionLedger: AssumptionEntry[];
  accountability: AccountabilityEntry;
  traceScore: number;
  scoreRationale: string[];
};

// --- JSON Schema (mirrors types, required fields, enums) ---

const confidenceEnum = ["low", "medium", "high"] as const;
const weightEnum = ["low", "medium", "high"] as const;
const severityEnum = ["low", "medium", "high"] as const;
const responsibilityEnum = ["R", "A", "C", "I"] as const;

export const DECISION_LEDGER_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "DecisionLedger",
  type: "object",
  required: ["decision", "flow", "evidenceLedger", "riskLedger", "assumptionLedger", "accountability"],
  properties: {
    decision: {
      type: "object",
      required: ["title", "description", "confidence"],
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        confidence: { type: "string", enum: [...confidenceEnum] },
      },
    },
    flow: {
      type: "array",
      items: {
        type: "object",
        required: ["step", "label", "description", "actor", "aiInfluence", "overrideApplied"],
        properties: {
          step: { type: "number" },
          label: { type: "string" },
          description: { type: "string" },
          actor: { type: "string" },
          aiInfluence: { type: "boolean" },
          overrideApplied: { type: "boolean" },
        },
      },
    },
    evidenceLedger: {
      type: "array",
      items: {
        type: "object",
        required: ["claim", "source", "strength"],
        properties: {
          claim: { type: "string" },
          source: { type: "string" },
          strength: { type: "string", enum: [...weightEnum] },
        },
      },
    },
    riskLedger: {
      type: "array",
      items: {
        type: "object",
        required: ["risk", "likelihood", "impact", "mitigation", "owner"],
        properties: {
          risk: { type: "string" },
          likelihood: { type: "string", enum: [...weightEnum] },
          impact: { type: "string", enum: [...severityEnum] },
          mitigation: { type: "string" },
          owner: { type: "string" },
        },
      },
    },
    assumptionLedger: {
      type: "array",
      items: {
        type: "object",
        required: ["assumption", "validated", "howToValidate"],
        properties: {
          assumption: { type: "string" },
          validated: { type: "boolean" },
          howToValidate: { type: "string" },
        },
      },
    },
    accountability: {
      type: "object",
      required: ["owner", "stakeholders", "approvalsNeeded"],
      properties: {
        owner: { type: "string" },
        stakeholders: {
          type: "array",
          items: {
            type: "object",
            required: ["name", "role", "responsibility", "impact"],
            properties: {
              name: { type: "string" },
              role: { type: "string" },
              responsibility: { type: "string", enum: [...responsibilityEnum] },
              impact: { type: "string" },
            },
          },
        },
        approvalsNeeded: {
          type: "array",
          items: { type: "string" },
        },
      },
    },
  },
} as const;
