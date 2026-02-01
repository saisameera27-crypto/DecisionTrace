import { NextResponse } from "next/server";
import { getSupabaseServer, type DecisionTraceRow } from "@/lib/supabase-server";
import type { DecisionLedger } from "@/lib/decisionLedgerSchema";

export const runtime = "nodejs";

const TABLE_DECISION_TRACES = "decision_traces";

export type ReportMeta = {
  filename: string;
  mimeType: string;
  size: number;
};

export type ReportPayload = {
  id: string;
  createdAt: string;
  meta: ReportMeta;
  ledger: DecisionLedger;
  title: string;
};

function deriveTitle(ledger: DecisionLedger, meta: ReportMeta): string {
  const outcome = ledger?.decision?.outcome?.trim();
  const doc = meta?.filename?.trim();
  if (outcome && doc) return `${outcome} – ${doc}`;
  if (outcome) return outcome;
  if (doc) return doc;
  return "Decision trace report";
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  // Temporary debug log
  console.log("fetch report", id);

  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from(TABLE_DECISION_TRACES)
      .select("id, created_at, filename, mime_type, size, report_json")
      .eq("id", id)
      .single();

    if (error || !data) {
      console.log("fetch report", id, "not found");
      return NextResponse.json({ ok: false, error: "Report not found" }, { status: 404 });
    }
    console.log("fetch report", id, "found");

    const row = data as DecisionTraceRow;
    const ledger = row.report_json as DecisionLedger;
    const meta: ReportMeta = {
      filename: row.filename ?? "",
      mimeType: row.mime_type ?? "",
      size: row.size ?? 0,
    };
    const report: ReportPayload = {
      id: row.id,
      createdAt: row.created_at,
      meta,
      ledger,
      title: deriveTitle(ledger, meta),
    };
    return NextResponse.json({ ok: true, report });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes("SUPABASE")) {
      return NextResponse.json(
        { ok: false, error: "Configuration error", detail: message },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: false, error: "Report not found" }, { status: 404 });
  }
}
