import { NextResponse } from "next/server";

export const runtime = "nodejs";

type DecisionTraceReport = any;

declare global {
  // eslint-disable-next-line no-var
  var __DT_REPORTS__: Map<string, DecisionTraceReport> | undefined;
}

globalThis.__DT_REPORTS__ ??= new Map<string, DecisionTraceReport>();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  const report = globalThis.__DT_REPORTS__!.get(id);
  if (!report) return NextResponse.json({ ok: false, error: "Report not found" }, { status: 404 });

  return NextResponse.json({ ok: true, report });
}
