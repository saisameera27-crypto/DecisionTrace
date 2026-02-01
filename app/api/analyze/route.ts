import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

// simple in-memory store (works per serverless instance; good enough for demo)
declare global {
  // eslint-disable-next-line no-var
  var __DT_REPORTS__: Map<string, unknown> | undefined;
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

    const report = {
      summary: { title: "Decision Trace Report", filename: file.name },
      tabs: {
        overview: {
          bullets: [
            "Mock report generated from uploaded file.",
            "Decision context and key takeaways will appear here.",
          ],
        },
        decisionFlow: {
          steps: [
            { step: 1, label: "Input received", description: "File uploaded for analysis" },
            { step: 2, label: "Analysis run", description: "Mock report generated" },
            { step: 3, label: "Report ready", description: "Six-tab structure created" },
          ],
        },
        stakeholders: [
          { role: "Decision owner", description: "To be identified from content" },
          { role: "Influencers", description: "To be extracted from document" },
        ],
        evidence: [
          "Document upload provides primary input.",
          "Additional evidence to be extracted by analysis.",
        ],
        risks: [
          "Mock data only; real analysis not yet run.",
          "Stakeholder and risk data placeholder.",
        ],
        assumptions: [
          "Input document is relevant to the decision.",
          "Structured output will match this schema.",
        ],
      },
    };

    globalThis.__DT_REPORTS__!.set(analysisId, report);

    return NextResponse.json({ ok: true, analysisId });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Analyze failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
