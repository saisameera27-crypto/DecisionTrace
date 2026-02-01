import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

type DecisionTraceReport = any;

declare global {
  // eslint-disable-next-line no-var
  var __DT_REPORTS__: Map<string, DecisionTraceReport> | undefined;
}

globalThis.__DT_REPORTS__ ??= new Map<string, DecisionTraceReport>();

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
    }

    const analysisId = randomUUID();
    const createdAt = new Date().toISOString();

    const report: DecisionTraceReport = {
      id: analysisId,
      title: "Decision Trace Report",
      createdAt,
      source: {
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
      },
      overview: {
        decision: "Proceed with analysis of uploaded document.",
        recommendation: "Review the decision flow and evidence before finalizing.",
        confidence: "medium" as const,
        keyTakeaways: [
          "Mock report generated from uploaded file.",
          "Decision context and key takeaways will appear here after full analysis.",
        ],
        whatWouldChange: [
          "Additional stakeholder input could shift the recommendation.",
          "New evidence or risk findings would update the trace.",
        ],
      },
      decisionFlow: [
        {
          step: 1,
          label: "Input received",
          rationale: "File uploaded for analysis.",
          inputsUsed: [file.name],
          outputsProduced: [],
          aiInvolved: false,
        },
        {
          step: 2,
          label: "Analysis run",
          rationale: "Mock report generated with canonical shape.",
          inputsUsed: ["Uploaded file"],
          outputsProduced: ["Report JSON"],
          aiInvolved: true,
        },
        {
          step: 3,
          label: "Report ready",
          rationale: "Six-tab structure and score computed from contents.",
          inputsUsed: ["Report JSON"],
          outputsProduced: ["Decision Trace Score", "Tabs"],
          aiInvolved: false,
        },
      ],
      stakeholders: {
        raci: [
          { name: "—", role: "Decision owner", responsibility: "R" as const, impact: "To be identified from content" },
          { name: "—", role: "Influencers", responsibility: "I" as const, impact: "To be extracted from document" },
        ],
        approvalsNeeded: ["Stakeholder sign-off pending"],
      },
      evidence: [
        { claim: "Document upload provides primary input.", snippet: "Uploaded file used as source.", strength: "medium" as const },
        { claim: "Additional evidence to be extracted by analysis.", snippet: "—", strength: "weak" as const },
      ],
      risks: [
        { risk: "Mock data only; real analysis not yet run.", likelihood: "medium" as const, impact: "low" as const, severity: 3, mitigation: "Run full analysis.", owner: "—" },
        { risk: "Stakeholder and risk data placeholder.", likelihood: "low" as const, impact: "low" as const, severity: 2, mitigation: "Populate from analysis.", owner: "—" },
      ],
      assumptions: [
        { assumption: "Input document is relevant to the decision.", validated: false, howToValidate: "Cross-check with decision context." },
        { assumption: "Structured output will match this schema.", validated: true, howToValidate: "API returns canonical shape." },
      ],
      openQuestions: ["Who is the decision owner?", "What is the approval threshold?"],
      nextActions: ["Run full Gemini analysis.", "Link real stakeholders and evidence."],
    };

    globalThis.__DT_REPORTS__!.set(analysisId, reportPayload);

    return NextResponse.json({ ok: true, analysisId });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Analyze failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
