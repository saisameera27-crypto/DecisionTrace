/**
 * Generate a Decision Ledger from input text using Google Gemini.
 * Uses structured JSON output and a system instruction for audit-trail language.
 * Does not persist anything; returns the ledger only.
 */

import { GoogleGenAI, type Schema } from "@google/genai";
import {
  type DecisionLedger,
  DECISION_LEDGER_SCHEMA,
} from "./decisionLedgerSchema";

const responseSchema = DECISION_LEDGER_SCHEMA as unknown as Schema;

const MODEL_PRIMARY = "gemini-3-pro-preview";
const MODEL_FALLBACK = "gemini-3-flash-preview";

const SYSTEM_INSTRUCTION = `You produce a decision ledger (audit trail). Output ONLY valid JSON that conforms exactly to the provided response schema. No markdown, no preamble.

Ledger semantics (mandatory):
- For each flow step: set aiInfluence (true/false) and overrideApplied (true/false). In description, state explicitly e.g. "AI influenced this step only" or "Human override applied; AI did not influence this step."
- evidenceLedger: assign strength (low/medium/high) to every claim; cite short snippets only, never paste long paragraphs from the document.
- riskLedger: record risk acceptance and owner; likelihood and impact required.
- decision.description: cite evidenceLedger by short snippet or reference (e.g. "Per evidence item 1: …"). Do not dump raw document text.

Strict rules:
- traceScore: integer 0–100. scoreRationale: array of short strings (reasons for the score).
- Do not copy long paragraphs from the source. Use brief quotes or references.
- Decisions and flow steps must reference evidenceLedger entries (short snippets), not raw doc content.
- Be concise. Enforce full JSON schema compliance: all required fields, correct types and enums.`;

/**
 * Calls Gemini with the given model and returns the raw text from the first candidate.
 */
async function generateWithModel(
  ai: GoogleGenAI,
  model: string,
  text: string,
  signal?: AbortSignal
): Promise<string> {
  const config: import("@google/genai").GenerateContentConfig = {
    responseMimeType: "application/json",
    responseSchema,
    systemInstruction: SYSTEM_INSTRUCTION,
  };
  if (signal) (config as { abortSignal?: AbortSignal }).abortSignal = signal;

  const response = await ai.models.generateContent({
    model,
    contents: text,
    config,
  });

  const raw = response.text;
  if (raw == null || raw === "") {
    throw new Error(
      `Gemini returned no text. Model: ${model}. Response: ${JSON.stringify(response)}`
    );
  }
  return raw;
}

/**
 * Parses a string as JSON. On failure, throws an Error that includes the raw output.
 */
function parseJsonSafe<T = unknown>(raw: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const error = new Error(
      `Decision ledger JSON parse failed: ${message}. Raw model output: ${raw}`
    );
    (error as Error & { raw?: string }).raw = raw;
    throw error;
  }
}

export type GenerateLedgerOptions = {
  /** Optional AbortSignal for request timeout/cancel (e.g. AbortSignal.timeout(ms)). */
  signal?: AbortSignal;
};

/**
 * Generates a Decision Ledger from the given text using Gemini.
 * Uses gemini-3-pro-preview, falling back to gemini-3-flash-preview on error.
 * Returns the ledger only; does not store anything.
 */
export async function generateDecisionLedgerWithGemini(
  text: string,
  options?: GenerateLedgerOptions
): Promise<DecisionLedger> {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY or GOOGLE_API_KEY is required for generateDecisionLedgerWithGemini"
    );
  }

  const signal = options?.signal;
  const ai = new GoogleGenAI({ apiKey });

  let raw: string;
  try {
    raw = await generateWithModel(ai, MODEL_PRIMARY, text, signal);
  } catch (primaryError) {
    try {
      raw = await generateWithModel(ai, MODEL_FALLBACK, text, signal);
    } catch (fallbackError) {
      const msg =
        primaryError instanceof Error ? primaryError.message : String(primaryError);
      const fallbackMsg =
        fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
      throw new Error(
        `Gemini failed with primary model (${MODEL_PRIMARY}) and fallback (${MODEL_FALLBACK}). Primary: ${msg}. Fallback: ${fallbackMsg}`
      );
    }
  }

  const parsed = parseJsonSafe<DecisionLedger>(raw);

  // Basic shape check so we return a ledger-like object
  const required = [
    "decision",
    "flow",
    "evidenceLedger",
    "riskLedger",
    "assumptionLedger",
    "accountability",
    "traceScore",
    "scoreRationale",
  ] as const;
  for (const key of required) {
    if (!(key in parsed) || (parsed as Record<string, unknown>)[key] === undefined) {
      throw new Error(
        `Decision ledger missing required key "${key}". Raw model output: ${raw}`
      );
    }
  }

  return parsed;
}
