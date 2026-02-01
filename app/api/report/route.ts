import { NextResponse } from "next/server";
import type { StoredAnalysis } from "@/app/api/analyze/route";

export const runtime = "nodejs";

type DecisionTraceReport = any;

export type ReportPayload = {
  ledger: StoredAnalysis["ledger"];
  meta: StoredAnalysis["meta"];
  createdAt: string;
  title: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __DT_REPORTS__: Map<string, DecisionTraceReport> | undefined;
  // eslint-disable-next-line no-var
  var __DT_ANALYSES__: Map<string, StoredAnalysis> | undefined;
}

globalThis.__DT_REPORTS__ ??= new Map<string, DecisionTraceReport>();
globalThis.__DT_ANALYSES__ ??= new Map<string, StoredAnalysis>();

function deriveTitle(analysis: StoredAnalysis): string {
  const { ledger, meta } = analysis;
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

  const analysis = globalThis.__DT_ANALYSES__?.get(id);
  if (analysis) {
    const report: ReportPayload = {
      ledger: analysis.ledger,
      meta: analysis.meta,
      createdAt: analysis.createdAt,
      title: deriveTitle(analysis),
    };
    return NextResponse.json({ ok: true, report });
  }

  const report = globalThis.__DT_REPORTS__!.get(id);
  if (!report) return NextResponse.json({ ok: false, error: "Report not found" }, { status: 404 });

  return NextResponse.json({ ok: true, report });
}
