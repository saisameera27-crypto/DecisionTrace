"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { DecisionLedger, FlowStep } from "@/lib/decisionLedgerSchema";
import type { ExtractTextMeta } from "@/lib/extractText";
import ReportHeroCard from "@/components/report/ReportHeroCard";
import InfluenceMapPanel from "@/components/report/InfluenceMapPanel";
import TabDescription from "@/components/report/TabDescription";

/** Format step numbers for display: "Step 3" or "Steps 3, 4, 5" */
function formatStepList(steps: number[]): string {
  if (steps.length === 0) return "";
  if (steps.length === 1) return `Step ${steps[0]}`;
  return `Steps ${steps.join(", ")}`;
}

function flowBannerLines(flow: FlowStep[] | undefined): { aiLine: string; overrideLine: string | null } {
  if (!flow?.length) {
    return { aiLine: "No decision flow steps.", overrideLine: null };
  }
  const aiSteps = flow.filter((s) => s.aiInfluence === true).map((s) => s.step);
  const anyOverride = flow.some((s) => s.overrideApplied === true);
  const aiLine =
    aiSteps.length === 0
      ? "AI did not influence any step."
      : `AI influenced steps in Decision Flow: ${formatStepList(aiSteps)}`;
  const overrideLine = anyOverride ? "Override applied in one or more steps." : null;
  return { aiLine, overrideLine };
}

type ReportPayload = {
  ledger: DecisionLedger;
  meta: ExtractTextMeta;
  createdAt: string;
  title: string;
};

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="dt-badge">
      {children}
    </span>
  );
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="report-card dt-card">
      {title ? (
        <div className="dt-heading-2 mb-3 border-b border-[var(--color-border-light)] pb-2">{title}</div>
      ) : null}
      {children}
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-[var(--dt-radius-card)] border-[var(--color-border-light)] border shadow-sm">
      <table className="w-full min-w-[400px] text-[var(--dt-font-body)] border-collapse">
        <thead className="bg-[var(--dt-bg-surface)]">
          <tr>
            {headers.map((h) => (
              <th key={h} className="p-3 text-left dt-label border-b border-[var(--color-border-light)] normal-case">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr
              key={idx}
              className={`border-b border-[var(--color-border-light)] last:border-b-0 ${idx % 2 === 1 ? "bg-[var(--dt-bg-surface)]" : "bg-[var(--dt-bg-card)]"}`}
            >
              {r.map((cell, j) => (
                <td key={j} className="p-3 align-top break-words text-[var(--dt-text-body)]">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyStateCard({ title, message }: { title: string; message: string }) {
  return (
    <Card title={title}>
      <p className="dt-muted text-[var(--dt-font-body)] leading-relaxed">{message}</p>
    </Card>
  );
}

const TABS = ["Overview", "Decision Flow", "Stakeholders", "Evidence", "Risks", "Assumptions"] as const;
type Tab = (typeof TABS)[number];

const TAB_DESCRIPTIONS: Record<Tab, string> = {
  Overview: "Decision summary, confidence, and what would change the outcome.",
  "Decision Flow": "Step-by-step audit trail of AI influence and applied controls.",
  Stakeholders: "RACI accountability: who owned, approved, and was consulted.",
  Evidence: "Evidence used vs missing, with strength and confidence impact.",
  Risks: "Risk register with severity, acceptance, and mitigations.",
  Assumptions: "Key assumptions and validation status that could invalidate the decision.",
};

function TabsBar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <div className="report-tabs">
      <div className="report-tabs-list" role="tablist">
        {TABS.map((t) => {
          const isActive = tab === t;
          return (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setTab(t)}
              data-testid={`report-tab-${t.toLowerCase().replace(" ", "")}`}
              className={`report-tab ${isActive ? "report-tab--active" : ""}`}
            >
              {t}
            </button>
          );
        })}
      </div>
      <TabDescription description={TAB_DESCRIPTIONS[tab]} />
    </div>
  );
}

export default function ReportPage() {
  const params = useParams();
  const id = (params?.id as string) ?? "";
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("Overview");

  useEffect(() => {
    if (!id) {
      setErr("Missing report id");
      return;
    }
    (async () => {
      try {
        setErr(null);
        setReport(null);
        const res = await fetch(`/api/report?id=${encodeURIComponent(id)}`, { cache: "no-store" });
        const data = await res.json().catch(async () => ({ raw: await res.text() }));

        if (!res.ok || !data?.ok) {
          throw new Error(data?.error ?? `Failed to load report (${res.status})`);
        }
        const payload = data.report;
        if (!payload?.ledger) {
          throw new Error("Report format not supported (missing ledger).");
        }
        setReport(payload);
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "Unexpected error");
      }
    })();
  }, [id]);

  if (err) {
    return (
      <div data-testid="report-error" className="max-w-3xl mx-auto my-8 px-6">
        <div className="rounded-xl border border-red-200 bg-red-50/80 p-4 text-red-800">
          <div className="font-semibold">Error</div>
          <div className="mt-1 text-sm">{err}</div>
          <div className="mt-4">
            <Link href="/" className="text-sm underline text-indigo-600 hover:text-indigo-700" data-testid="report-back-to-upload">
              Back to upload
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div data-testid="report-loading" className="max-w-3xl mx-auto my-8 px-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
          Loading report…
        </div>
      </div>
    );
  }

  const { ledger, meta, createdAt } = report;
  const displayTitle = (ledger?.decision?.outcome?.trim()) || "Decision Trace Report";
  const createdAtFormatted = createdAt ? new Date(createdAt).toLocaleString() : "—";
  const extReport = report as ReportPayload & { openQuestions?: string[]; nextActions?: string[] };
  const { aiLine } = flowBannerLines(ledger.flow);

  const score = ledger.decision?.traceScore ?? 0;
  const rationale = Array.isArray(ledger.decision?.scoreRationale) ? ledger.decision.scoreRationale.slice(0, 5) : [];
  const evidenceUsed = (ledger.evidenceLedger ?? []).filter((e) => e.used).length;
  const risksAccepted = (ledger.riskLedger ?? []).filter((r) => r.accepted).length;
  const assumptionsValidated = (ledger.assumptionLedger ?? []).filter((a) => a.validated).length;
  const overrides = (ledger.flow ?? []).filter((s) => s.overrideApplied).length;

  const handleDownload = () => {
    const payload = { reportId: id, createdAt, meta, ledger };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `decision-trace-${id}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div data-testid="report-content" className="report-page-wrap qs-container dt-page">
      <div className="qs-card">
        <div className="report-shell">
          <header className="report-card-header" role="banner">
            <h2 className="report-card-header-title">{displayTitle}</h2>
            <div className="report-card-header-meta">
              <span className="report-card-header-meta-left">
                {meta.filename?.trim() || "—"} · {createdAtFormatted}
              </span>
              <div className="report-card-header-actions">
                <button
                  type="button"
                  onClick={handleDownload}
                  data-testid="report-download-json"
                  className="dt-btn no-underline"
                >
                  Download Audit JSON
                </button>
                <Link
                  href="/"
                  data-testid="report-back-to-upload"
                  className="dt-btn inline-flex no-underline"
                >
                  Back
                </Link>
              </div>
            </div>
            <div className="report-card-header-score dt-pill" aria-label="Trace score">
              Score <span className="report-card-header-score-value">{typeof score === "number" ? score : "—"}</span>/100
            </div>
          </header>

          <main className="report-main flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        <aside className="report-map min-h-0 flex flex-col gap-4 p-4 overflow-y-auto border-b lg:border-b-0 lg:border-r border-[var(--color-border-light)] bg-[var(--dt-bg-surface)] lg:w-[360px] lg:shrink-0">
          <ReportHeroCard
            displayTitle={displayTitle}
            subtitle={`${meta.filename?.trim() || "—"} • ${createdAtFormatted}`}
            score={score}
            rationale={rationale}
            metrics={[
              { label: "Evidence used", value: evidenceUsed },
              { label: "Risks accepted", value: risksAccepted },
              { label: "Assumptions validated", value: assumptionsValidated },
              { label: "Overrides", value: overrides },
            ]}
            details={{ id, mimeType: meta.mimeType ?? "—", size: meta.size ?? null }}
            onDownload={handleDownload}
          />
          <InfluenceMapPanel aiLine={aiLine} />
        </aside>

        <section className="report-details flex-1 min-w-0 min-h-0 flex flex-col">
          <TabsBar tab={tab} setTab={setTab} />
          <div className="report-details-scroll report-tab-content">
            <div className="dt-container flex flex-col gap-4">
      {tab === "Overview" && (
        <div className="flex flex-col gap-2">
          <Card title="Decision outcome">
            <div className="dt-heading-2">{ledger.decision?.outcome ?? "—"}</div>
            <div className="mt-2">
              <Pill>Confidence: {ledger.decision?.confidence ?? "—"}</Pill>
            </div>
          </Card>
        </div>
      )}

      {tab === "Decision Flow" && (
        <div className="flex flex-col gap-2">
          {(ledger.flow ?? []).map((s, idx) => (
            <div
              key={s.step ?? idx}
              className="dt-card rounded-[var(--dt-radius-card)] p-3"
            >
              <div className="dt-heading-2 text-[var(--dt-font-body)] mb-1">
                Step {s.step ?? "—"} — {s.label ?? "—"}
              </div>
              <div className="flex flex-wrap gap-2 items-start">
                <div className="flex-1 min-w-[200px]">
                  {Array.isArray(s.rulesApplied) && s.rulesApplied.length > 0 ? (
                    <div className="text-sm text-slate-600">
                      <span className="font-semibold">Rules applied</span>
                      <ul className="mt-0.5 pl-4 m-0 leading-snug list-disc">
                        {s.rulesApplied.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <span className="text-sm text-slate-500">No rules listed</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 shrink-0 self-start">
                  <Pill>Actor: {s.actor ?? "—"}</Pill>
                  <Pill>AI influenced: {s.aiInfluence ? "Yes" : "No"}</Pill>
                  <Pill>Override applied: {s.overrideApplied ? "Yes" : "No"}</Pill>
                  <Pill>Confidence delta: {s.confidenceDelta ?? "—"}</Pill>
                </div>
              </div>
            </div>
          ))}
          {(!ledger.flow || ledger.flow.length === 0) ? <Card>No decision flow steps.</Card> : null}
        </div>
      )}

      {tab === "Stakeholders" && (
        <div className="flex flex-col gap-2">
          <Card title="Responsible">
            <div className="text-sm text-slate-800">{ledger.accountability?.responsible ?? "—"}</div>
          </Card>
          <Card title="Accountable">
            <div className="text-sm text-slate-800">{ledger.accountability?.accountable ?? "—"}</div>
          </Card>
          <Card title="Consulted">
            <ul className="list-disc pl-6 m-0 text-sm text-slate-800">
              {(ledger.accountability?.consulted ?? []).map((x, i) => (
                <li key={i}>{x}</li>
              ))}
              {(!ledger.accountability?.consulted || ledger.accountability.consulted.length === 0) ? <li>—</li> : null}
            </ul>
          </Card>
          <Card title="Informed">
            <ul className="list-disc pl-6 m-0 text-sm text-slate-800">
              {(ledger.accountability?.informed ?? []).map((x, i) => (
                <li key={i}>{x}</li>
              ))}
              {(!ledger.accountability?.informed || ledger.accountability.informed.length === 0) ? <li>—</li> : null}
            </ul>
          </Card>
        </div>
      )}

      {tab === "Evidence" && (
        <div className="flex flex-col gap-2">
          {(!ledger.evidenceLedger || ledger.evidenceLedger.length === 0) ? (
            <EmptyStateCard
              title="Evidence ledger"
              message="No evidence items were recorded for this decision. Evidence can be added to support the outcome and trace score."
            />
          ) : (
            <Card title="Evidence ledger">
              <Table
                headers={["Evidence", "Used", "Weight", "Confidence impact", "Reason"]}
                rows={(ledger.evidenceLedger ?? []).map((e, i) => [
                  e.evidence ?? "—",
                  <Pill key={`used-${i}`}>{e.used ? "Yes" : "No"}</Pill>,
                  <Pill key={`weight-${i}`}>{e.weight ?? "—"}</Pill>,
                  String(e.confidenceImpact ?? "—"),
                  e.reason ?? "—",
                ])}
              />
            </Card>
          )}
        </div>
      )}

      {tab === "Risks" && (
        <div className="flex flex-col gap-2">
          {(!ledger.riskLedger || ledger.riskLedger.length === 0) ? (
            <EmptyStateCard
              title="Risk ledger"
              message="No risks were recorded for this decision. Risks can be documented here with severity, acceptance, and mitigation."
            />
          ) : (
            <Card title="Risk ledger">
              <Table
                headers={["Risk", "Identified", "Accepted", "Severity", "Accepted by", "Mitigation"]}
                rows={(ledger.riskLedger ?? []).map((r, i) => [
                  r.risk ?? "—",
                  <Pill key={`id-${i}`}>{r.identified ? "Yes" : "No"}</Pill>,
                  <Pill key={`acc-${i}`}>{r.accepted ? "Yes" : "No"}</Pill>,
                  <Pill key={`sev-${i}`}>{r.severity ?? "—"}</Pill>,
                  r.acceptedBy ?? "—",
                  r.mitigation ?? "—",
                ])}
              />
            </Card>
          )}
        </div>
      )}

      {tab === "Assumptions" && (
        <div className="flex flex-col gap-2">
          {(!ledger.assumptionLedger || ledger.assumptionLedger.length === 0) ? (
            <EmptyStateCard
              title="Assumption ledger"
              message="No assumptions were recorded for this decision. Assumptions can be listed here with validation status and impact."
            />
          ) : (
            <Card title="Assumption ledger">
              <Table
                headers={["Assumption", "Explicit", "Validated", "Owner", "Invalidation impact"]}
                rows={(ledger.assumptionLedger ?? []).map((a, i) => [
                  a.assumption ?? "—",
                  <Pill key={`exp-${i}`}>{a.explicit ? "Yes" : "No"}</Pill>,
                  <Pill key={`val-${i}`}>{a.validated ? "Yes" : "No"}</Pill>,
                  a.owner ?? "—",
                  a.invalidationImpact ?? "—",
                ])}
              />
            </Card>
          )}
          {(extReport.openQuestions?.length ?? 0) > 0 || (extReport.nextActions?.length ?? 0) > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {extReport.openQuestions && extReport.openQuestions.length > 0 ? (
                <Card title="Open questions">
                  <ul className="list-disc pl-6 m-0 text-sm text-slate-800">
                    {extReport.openQuestions.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </Card>
              ) : null}
              {extReport.nextActions && extReport.nextActions.length > 0 ? (
                <Card title="Next actions">
                  <ul className="list-disc pl-6 m-0 text-sm text-slate-800">
                    {extReport.nextActions.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </Card>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
            </div>
          </div>
        </section>
          </main>
        </div>
      </div>
    </div>
  );
}
