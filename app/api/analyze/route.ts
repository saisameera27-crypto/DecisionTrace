import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { extractTextFromUpload } from "@/lib/extractText";
import { generateDecisionLedgerWithGemini } from "@/lib/geminiDecisionLedger";
import { validateDecisionLedger } from "@/lib/validateLedger";
import { MAX_FILE_BYTES, truncateTextForGemini } from "@/lib/analyzeLimits";
import { ensureScoreRationale } from "@/lib/scoreRationale";
import type { DecisionLedger } from "@/lib/decisionLedgerSchema";
import type { ExtractTextMeta } from "@/lib/extractText";

export const runtime = "nodejs";

export type StoredAnalysis = {
  ledger: DecisionLedger;
  meta: ExtractTextMeta;
  createdAt: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __DT_ANALYSES__: Map<string, StoredAnalysis> | undefined;
}

globalThis.__DT_ANALYSES__ ??= new Map<string, StoredAnalysis>();

function analyzeErrorResponse(e: unknown): {
  error: string;
  detail: string;
  status: number;
} {
  const message = e instanceof Error ? e.message : String(e);
  const detail = message;

  if (e instanceof Error && e.name === "AbortError") {
    return { error: "Request timed out", detail: "Analysis took too long. Try a shorter document.", status: 504 };
  }
  if (message.toLowerCase().includes("timeout") || message.toLowerCase().includes("aborted")) {
    return { error: "Request timed out", detail, status: 504 };
  }
  if (message.includes("Unsupported file type")) {
    return { error: "Unsupported file type", detail, status: 400 };
  }
  if (message.includes("File too large") || message.includes("maximum size")) {
    return { error: "File too large", detail, status: 413 };
  }
  if (message.startsWith("DOCX extraction failed:")) {
    return { error: "DOCX extraction failed", detail, status: 422 };
  }
  if (message.startsWith("PDF extraction failed:")) {
    return { error: "PDF extraction failed", detail, status: 422 };
  }
  if (
    message.includes("GEMINI_API_KEY") ||
    message.includes("GOOGLE_API_KEY") ||
    message.includes("quota") ||
    message.includes("API key") ||
    message.includes("429") ||
    message.includes("401") ||
    message.includes("403") ||
    message.includes("Unauthorized") ||
    message.includes("Forbidden") ||
    message.includes("Gemini failed")
  ) {
    return { error: "Gemini error (quota/auth)", detail, status: 502 };
  }
  if (
    message.includes("Decision ledger missing required key") ||
    message.includes("JSON parse failed") ||
    message.includes("Decision ledger JSON parse failed")
  ) {
    return { error: "Gemini returned invalid schema", detail, status: 502 };
  }

  return { error: "Analyze failed", detail, status: 500 };
}

export async function POST(req: Request) {
  try {
    // 0) Server-only: require GEMINI_API_KEY for analysis
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === "") {
      return NextResponse.json(
        { ok: false, error: "Missing GEMINI_API_KEY", detail: "Set GEMINI_API_KEY in environment variables to enable analysis." },
        { status: 500 }
      );
    }

    // 1) Read multipart/form-data, get file
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "Missing file", detail: "No file in request." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_BYTES) {
      const maxMb = (MAX_FILE_BYTES / (1024 * 1024)).toFixed(1);
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      return NextResponse.json(
        {
          ok: false,
          error: "File too large",
          detail: `Maximum file size is ${maxMb} MB. Your file is ${sizeMb} MB.`,
        },
        { status: 413 }
      );
    }

    // 2) extractTextFromUpload(file)
    let text: string;
    let meta: ExtractTextMeta;
    try {
      const result = await extractTextFromUpload(file);
      text = result.text;
      meta = result.meta;
    } catch (e: unknown) {
      const { error, detail, status } = analyzeErrorResponse(e);
      return NextResponse.json({ ok: false, error, detail }, { status });
    }

    text = truncateTextForGemini(text);

    // 3) generateDecisionLedgerWithGemini(text) with request timeout
    const ANALYZE_TIMEOUT_MS = 90_000;
    const timeoutSignal = AbortSignal.timeout(ANALYZE_TIMEOUT_MS);

    let ledger: DecisionLedger;
    try {
      ledger = await generateDecisionLedgerWithGemini(text, { signal: timeoutSignal });
    } catch (e: unknown) {
      const { error, detail, status } = analyzeErrorResponse(e);
      return NextResponse.json({ ok: false, error, detail }, { status });
    }

    // 4) validateDecisionLedger(ledger) and return 500 with explanation if invalid
    const validation = validateDecisionLedger(ledger);
    if (!validation.ok) {
      return NextResponse.json(
        { ok: false, error: "Gemini returned invalid schema", detail: validation.error },
        { status: 500 }
      );
    }

    // 4b) Ensure score rationale supports traceScore: fill or append concrete reasons from evidence/risks/assumptions
    ensureScoreRationale(ledger);

    // 5) create analysisId (uuid)
    const analysisId = randomUUID();

    // 6) store the ledger + meta in global Map keyed by analysisId
    const createdAt = new Date().toISOString();
    globalThis.__DT_ANALYSES__!.set(analysisId, { ledger, meta, createdAt });

    // 7) return { ok: true, analysisId }; do NOT return the whole ledger
    return NextResponse.json({
      ok: true,
      analysisId,
      mode: "gemini",
    });
  } catch (e: unknown) {
    const { error, detail, status } = analyzeErrorResponse(e);
    return NextResponse.json({ ok: false, error, detail }, { status });
  }
}
