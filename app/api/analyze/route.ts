import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

// simple in-memory store (works per serverless instance; good enough for demo)
declare global {
  // eslint-disable-next-line no-var
  var __DT_REPORTS__: Map<string, any> | undefined;
}
globalThis.__DT_REPORTS__ ??= new Map();

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
    }

    const analysisId = randomUUID();

    // TODO: replace with real Gemini output
    const report = {
      summary: { title: "Decision Trace Report", filename: file.name },
      tabs: {
        overview: { bullets: ["Stub report generated"] },
        evidence: [],
        risks: [],
        trace: [],
      },
    };

    globalThis.__DT_REPORTS__!.set(analysisId, report);

    return NextResponse.json({ ok: true, analysisId, report });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Analyze failed" }, { status: 500 });
  }
}
