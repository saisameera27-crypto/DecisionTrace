"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { theme } from "@/styles/theme";

type Report = any;

type ScoreBreakdown = {
  score: number;
  traceability: number;
  accountability: number;
  evidence: number;
  riskControls: number;
  notes: string[];
};

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function computeDecisionTraceScore(report: Report | null): ScoreBreakdown {
  if (!report) {
    return { score: 0, traceability: 0, accountability: 0, evidence: 0, riskControls: 0, notes: ["No report loaded."] };
  }

  const flowCount = Array.isArray(report.decisionFlow) ? report.decisionFlow.length : 0;
  const hasAIFlags = Array.isArray(report.decisionFlow) ? report.decisionFlow.some((s: any) => s?.aiInvolved) : false;

  const raciCount = report?.stakeholders?.raci?.length ?? 0;
  const approvalsCount = report?.stakeholders?.approvalsNeeded?.length ?? 0;

  const evidenceCount = Array.isArray(report.evidence) ? report.evidence.length : 0;
  const strongEvidenceCount = Array.isArray(report.evidence)
    ? report.evidence.filter((e: any) => e?.strength === "strong").length
    : 0;

  const risksCount = Array.isArray(report.risks) ? report.risks.length : 0;
  const mitigationsCount = Array.isArray(report.risks)
    ? report.risks.filter((r: any) => (r?.mitigation ?? "").trim().length > 0).length
    : 0;

  const assumptionsCount = Array.isArray(report.assumptions) ? report.assumptions.length : 0;
  const validatedAssumptions = Array.isArray(report.assumptions)
    ? report.assumptions.filter((a: any) => a?.validated).length
    : 0;

  const traceability = clamp(flowCount * 12 + (hasAIFlags ? 10 : 0));
  const accountability = clamp(raciCount * 12 + approvalsCount * 8);
  const evidence = clamp(evidenceCount * 10 + strongEvidenceCount * 8);
  const riskControls = clamp(risksCount * 12 + mitigationsCount * 8 + Math.min(assumptionsCount, 5) * 4 + validatedAssumptions * 3);

  const score = clamp(Math.round(traceability * 0.30 + accountability * 0.25 + evidence * 0.25 + riskControls * 0.20));

  const notes: string[] = [];
  if (flowCount < 4) notes.push("Decision Flow is short—add more steps for traceability.");
  if (raciCount < 3) notes.push("Stakeholder accountability is thin—add a stronger RACI.");
  if (evidenceCount < 3) notes.push("Evidence list is small—add more claim→snippet mappings.");
  if (risksCount < 2) notes.push("Risk coverage is minimal—add risk + mitigation owners.");

  return { score, traceability, accountability, evidence, riskControls, notes };
}

function downloadJson(filename: string, data: any) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: theme.borderRadius.full,
        border: `1px solid ${theme.colors.border}`,
        padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
        fontSize: theme.typography.fontSize.xs,
      }}
    >
      {children}
    </span>
  );
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        borderRadius: theme.borderRadius.xl,
        border: `1px solid ${theme.colors.border}`,
        backgroundColor: theme.colors.background,
        padding: theme.spacing.md,
        boxShadow: theme.colors.shadowSm,
      }}
    >
      {title ? (
        <div style={{ marginBottom: theme.spacing.sm, fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.semibold }}>
          {title}
        </div>
      ) : null}
      {children}
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <div style={{ overflowX: "auto", borderRadius: theme.borderRadius.xl, border: `1px solid ${theme.colors.border}` }}>
      <table style={{ width: "100%", minWidth: 400, fontSize: theme.typography.fontSize.sm }}>
        <thead style={{ backgroundColor: theme.colors.backgroundSecondary }}>
          <tr>
            {headers.map((h) => (
              <th key={h} style={{ padding: theme.spacing.sm, textAlign: "left", fontWeight: theme.typography.fontWeight.semibold }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={idx} style={{ borderTop: `1px solid ${theme.colors.border}` }}>
              {r.map((cell, j) => (
                <td key={j} style={{ padding: theme.spacing.sm, verticalAlign: "top" }}>
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

const TABS = ["Overview", "Decision Flow", "Stakeholders", "Evidence", "Risks", "Assumptions"] as const;
type Tab = (typeof TABS)[number];

function TabsBar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: theme.spacing.sm }}>
      {TABS.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => setTab(t)}
          data-testid={`report-tab-${t.toLowerCase().replace(" ", "")}`}
          style={{
            borderRadius: theme.borderRadius.full,
            border: `1px solid ${theme.colors.border}`,
            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
            fontSize: theme.typography.fontSize.sm,
            backgroundColor: tab === t ? theme.colors.primary : theme.colors.background,
            color: tab === t ? theme.colors.background : theme.colors.textPrimary,
            cursor: "pointer",
          }}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

export default function ReportPage() {
  const params = useParams();
  const id = (params?.id as string) ?? "";
  const [report, setReport] = useState<Report | null>(null);
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
        setReport(data.report);
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "Unexpected error");
      }
    })();
  }, [id]);

  const score = useMemo(() => computeDecisionTraceScore(report), [report]);

  if (err) {
    return (
      <div data-testid="report-error" style={{ maxWidth: 1024, margin: theme.spacing.xl, marginLeft: "auto", marginRight: "auto", padding: theme.spacing.lg }}>
        <div
          style={{
            borderRadius: theme.borderRadius.xl,
            border: `1px solid ${theme.colors.error}`,
            padding: theme.spacing.md,
            color: theme.colors.error,
          }}
        >
          <div style={{ fontWeight: theme.typography.fontWeight.semibold }}>Error</div>
          <div style={{ marginTop: theme.spacing.xs, fontSize: theme.typography.fontSize.sm }}>{err}</div>
          <div style={{ marginTop: theme.spacing.md }}>
            <Link href="/" style={{ fontSize: theme.typography.fontSize.sm, textDecoration: "underline", color: theme.colors.primary }} data-testid="report-back-to-upload">
              Back to upload
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div data-testid="report-loading" style={{ maxWidth: 1024, margin: theme.spacing.xl, marginLeft: "auto", marginRight: "auto", padding: theme.spacing.lg }}>
        <div style={{ borderRadius: theme.borderRadius.xl, border: `1px solid ${theme.colors.border}`, padding: theme.spacing.lg }}>
          Loading report…
        </div>
      </div>
    );
  }

  const source = report.source ?? {};
  const createdAt = report.createdAt ? new Date(report.createdAt).toLocaleString() : "—";

  return (
    <div data-testid="report-content" style={{ maxWidth: 1024, margin: "0 auto", padding: theme.spacing.lg, display: "flex", flexDirection: "column", gap: theme.spacing.md }}>
      {/* Header */}
      <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.sm }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: theme.spacing.md }}>
          <div>
            <div style={{ fontSize: theme.typography.fontSize["2xl"], fontWeight: theme.typography.fontWeight.bold }}>
              {report.title ?? "Decision Trace Report"}
            </div>
            <div style={{ marginTop: theme.spacing.xs, display: "flex", flexWrap: "wrap", gap: theme.spacing.sm, fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
              <Pill>ID: {report.id ?? id}</Pill>
              <Pill>Created: {createdAt}</Pill>
              <Pill>File: {source.filename ?? "—"}</Pill>
              <Pill>Type: {source.mimeType ?? "—"}</Pill>
            </div>
          </div>

          <div style={{ display: "flex", gap: theme.spacing.sm }}>
            <button
              type="button"
              style={{
                borderRadius: theme.borderRadius.xl,
                border: `1px solid ${theme.colors.border}`,
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                fontSize: theme.typography.fontSize.sm,
                cursor: "pointer",
                backgroundColor: theme.colors.background,
              }}
              onClick={() => downloadJson(`decision-trace-${report.id ?? id}.json`, report)}
              data-testid="report-download-json"
            >
              Download Audit JSON
            </button>
            <Link
              href="/"
              style={{
                borderRadius: theme.borderRadius.xl,
                border: `1px solid ${theme.colors.border}`,
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textPrimary,
                textDecoration: "none",
              }}
              data-testid="report-back-to-upload"
            >
              Back
            </Link>
          </div>
        </div>
      </div>

      {/* Score */}
      <div data-testid="report-score-card">
      <Card title="Decision Trace Score">
        <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.sm }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.md }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: theme.spacing.sm }}>
              <div style={{ fontSize: theme.typography.fontSize["4xl"], fontWeight: theme.typography.fontWeight.bold }}>{score.score}</div>
              <div style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>/ 100</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: theme.spacing.sm }}>
              <div style={{ borderRadius: theme.borderRadius.xl, border: `1px solid ${theme.colors.border}`, padding: theme.spacing.sm }}>
                <div style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>Traceability</div>
                <div style={{ fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.semibold }}>{score.traceability}</div>
              </div>
              <div style={{ borderRadius: theme.borderRadius.xl, border: `1px solid ${theme.colors.border}`, padding: theme.spacing.sm }}>
                <div style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>Accountability</div>
                <div style={{ fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.semibold }}>{score.accountability}</div>
              </div>
              <div style={{ borderRadius: theme.borderRadius.xl, border: `1px solid ${theme.colors.border}`, padding: theme.spacing.sm }}>
                <div style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>Evidence</div>
                <div style={{ fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.semibold }}>{score.evidence}</div>
              </div>
              <div style={{ borderRadius: theme.borderRadius.xl, border: `1px solid ${theme.colors.border}`, padding: theme.spacing.sm }}>
                <div style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>Risk Controls</div>
                <div style={{ fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.semibold }}>{score.riskControls}</div>
              </div>
            </div>
          </div>

          {score.notes.length > 0 ? (
            <div style={{ marginTop: theme.spacing.sm, borderRadius: theme.borderRadius.xl, backgroundColor: theme.colors.backgroundSecondary, padding: theme.spacing.sm, fontSize: theme.typography.fontSize.sm }}>
              <div style={{ fontWeight: theme.typography.fontWeight.semibold }}>Quick improvements</div>
              <ul style={{ marginTop: theme.spacing.xs, paddingLeft: theme.spacing.lg, margin: 0 }}>
                {score.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </Card>
      </div>

      {/* Tabs */}
      <TabsBar tab={tab} setTab={setTab} />

      {/* Tab content */}
      {tab === "Overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: theme.spacing.sm }}>
          <Card title="Decision">
            <div style={{ fontSize: theme.typography.fontSize.sm }}>{report.overview?.decision ?? "—"}</div>
          </Card>
          <Card title="Recommendation">
            <div style={{ fontSize: theme.typography.fontSize.sm }}>{report.overview?.recommendation ?? "—"}</div>
            <div style={{ marginTop: theme.spacing.sm }}>
              <Pill>Confidence: {report.overview?.confidence ?? "—"}</Pill>
            </div>
          </Card>

          <Card title="Key takeaways">
            <ul style={{ listStyle: "disc", paddingLeft: theme.spacing.lg, margin: 0, fontSize: theme.typography.fontSize.sm }}>
              {(report.overview?.keyTakeaways ?? []).map((x: string, i: number) => (
                <li key={i}>{x}</li>
              ))}
              {(!report.overview?.keyTakeaways || report.overview.keyTakeaways.length === 0) ? <li>—</li> : null}
            </ul>
          </Card>

          <Card title="What would change the decision">
            <ul style={{ listStyle: "disc", paddingLeft: theme.spacing.lg, margin: 0, fontSize: theme.typography.fontSize.sm }}>
              {(report.overview?.whatWouldChange ?? []).map((x: string, i: number) => (
                <li key={i}>{x}</li>
              ))}
              {(!report.overview?.whatWouldChange || report.overview.whatWouldChange.length === 0) ? <li>—</li> : null}
            </ul>
          </Card>
        </div>
      )}

      {tab === "Decision Flow" && (
        <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.sm }}>
          {(report.decisionFlow ?? []).map((s: any, idx: number) => (
            <Card key={s.step ?? idx} title={`Step ${s.step ?? "—"} — ${s.label ?? "—"}`}>
              <div style={{ fontSize: theme.typography.fontSize.sm }}>{s.rationale ?? "—"}</div>
              <div style={{ marginTop: theme.spacing.sm, display: "flex", flexWrap: "wrap", gap: theme.spacing.sm }}>
                <Pill>AI involved: {s.aiInvolved ? "Yes" : "No"}</Pill>
                <Pill>Inputs: {(s.inputsUsed ?? []).length}</Pill>
                <Pill>Outputs: {(s.outputsProduced ?? []).length}</Pill>
              </div>
              <div style={{ marginTop: theme.spacing.sm, display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.sm }}>
                <div>
                  <div style={{ fontSize: theme.typography.fontSize.xs, fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.textSecondary }}>Inputs used</div>
                  <ul style={{ marginTop: theme.spacing.xs, listStyle: "disc", paddingLeft: theme.spacing.lg, margin: 0, fontSize: theme.typography.fontSize.sm }}>
                    {(s.inputsUsed ?? []).map((x: string, i: number) => <li key={i}>{x}</li>)}
                    {(!s.inputsUsed || s.inputsUsed.length === 0) ? <li>—</li> : null}
                  </ul>
                </div>
                <div>
                  <div style={{ fontSize: theme.typography.fontSize.xs, fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.textSecondary }}>Outputs produced</div>
                  <ul style={{ marginTop: theme.spacing.xs, listStyle: "disc", paddingLeft: theme.spacing.lg, margin: 0, fontSize: theme.typography.fontSize.sm }}>
                    {(s.outputsProduced ?? []).map((x: string, i: number) => <li key={i}>{x}</li>)}
                    {(!s.outputsProduced || s.outputsProduced.length === 0) ? <li>—</li> : null}
                  </ul>
                </div>
              </div>
            </Card>
          ))}
          {(!report.decisionFlow || report.decisionFlow.length === 0) ? <Card>No decision flow steps found.</Card> : null}
        </div>
      )}

      {tab === "Stakeholders" && (
        <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.sm }}>
          <Card title="RACI">
            <Table
              headers={["Name", "Role", "RACI", "Impact"]}
              rows={(report.stakeholders?.raci ?? []).map((r: any) => [
                r.name ?? "—",
                r.role ?? "—",
                <Pill key="raci">{r.responsibility ?? "—"}</Pill>,
                r.impact ?? "—",
              ])}
            />
            {(!report.stakeholders?.raci || report.stakeholders.raci.length === 0) ? <div style={{ fontSize: theme.typography.fontSize.sm }}>—</div> : null}
          </Card>

          <Card title="Approvals needed">
            <ul style={{ listStyle: "disc", paddingLeft: theme.spacing.lg, margin: 0, fontSize: theme.typography.fontSize.sm }}>
              {(report.stakeholders?.approvalsNeeded ?? []).map((x: string, i: number) => <li key={i}>{x}</li>)}
              {(!report.stakeholders?.approvalsNeeded || report.stakeholders.approvalsNeeded.length === 0) ? <li>—</li> : null}
            </ul>
          </Card>
        </div>
      )}

      {tab === "Evidence" && (
        <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.sm }}>
          {(report.evidence ?? []).map((e: any, i: number) => (
            <Card key={i} title={e.claim ?? "Claim"}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: theme.spacing.sm, marginBottom: theme.spacing.sm }}>
                <Pill>Strength: {e.strength ?? "—"}</Pill>
                {e.location ? <Pill>Location: {e.location}</Pill> : null}
              </div>
              <div style={{ fontSize: theme.typography.fontSize.sm, whiteSpace: "pre-wrap" }}>{e.snippet ?? "—"}</div>
            </Card>
          ))}
          {(!report.evidence || report.evidence.length === 0) ? <Card>No evidence items found.</Card> : null}
        </div>
      )}

      {tab === "Risks" && (
        <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.sm }}>
          <Card title="Risk register">
            <Table
              headers={["Risk", "Likelihood", "Impact", "Severity", "Owner", "Mitigation"]}
              rows={(report.risks ?? []).map((r: any, i: number) => [
                r.risk ?? "—",
                <Pill key={`l-${i}`}>{r.likelihood ?? "—"}</Pill>,
                <Pill key={`i-${i}`}>{r.impact ?? "—"}</Pill>,
                String(r.severity ?? "—"),
                r.owner ?? "—",
                r.mitigation ?? "—",
              ])}
            />
            {(!report.risks || report.risks.length === 0) ? <div style={{ fontSize: theme.typography.fontSize.sm }}>—</div> : null}
          </Card>
        </div>
      )}

      {tab === "Assumptions" && (
        <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.sm }}>
          <Card title="Assumptions">
            <Table
              headers={["Assumption", "Validated", "How to validate"]}
              rows={(report.assumptions ?? []).map((a: any, i: number) => [
                a.assumption ?? "—",
                <Pill key={`v-${i}`}>{a.validated ? "Yes" : "No"}</Pill>,
                a.howToValidate ?? "—",
              ])}
            />
            {(!report.assumptions || report.assumptions.length === 0) ? <div style={{ fontSize: theme.typography.fontSize.sm }}>—</div> : null}
          </Card>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.sm }}>
            <Card title="Open questions">
              <ul style={{ listStyle: "disc", paddingLeft: theme.spacing.lg, margin: 0, fontSize: theme.typography.fontSize.sm }}>
                {(report.openQuestions ?? []).map((x: string, i: number) => <li key={i}>{x}</li>)}
                {(!report.openQuestions || report.openQuestions.length === 0) ? <li>—</li> : null}
              </ul>
            </Card>
            <Card title="Next actions">
              <ul style={{ listStyle: "disc", paddingLeft: theme.spacing.lg, margin: 0, fontSize: theme.typography.fontSize.sm }}>
                {(report.nextActions ?? []).map((x: string, i: number) => <li key={i}>{x}</li>)}
                {(!report.nextActions || report.nextActions.length === 0) ? <li>—</li> : null}
              </ul>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
