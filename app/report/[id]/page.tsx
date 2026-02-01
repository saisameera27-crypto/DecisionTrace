"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { theme } from "@/styles/theme";
import type { DecisionLedger, FlowStep } from "@/lib/decisionLedgerSchema";
import type { ExtractTextMeta } from "@/lib/extractText";

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

  const { ledger, meta, createdAt } = report;
  const displayTitle = (ledger?.decision?.outcome?.trim()) || "Decision Trace Report";
  const createdAtFormatted = createdAt ? new Date(createdAt).toLocaleString() : "—";
  const extReport = report as ReportPayload & { openQuestions?: string[]; nextActions?: string[] };
  const { aiLine, overrideLine } = flowBannerLines(ledger.flow);

  return (
    <div data-testid="report-content" style={{ maxWidth: 1024, margin: "0 auto", padding: theme.spacing.lg, display: "flex", flexDirection: "column", gap: theme.spacing.md }}>
      {/* Header */}
      <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.sm }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: theme.spacing.md }}>
          <div>
            <h1 style={{ fontSize: theme.typography.fontSize["2xl"], fontWeight: theme.typography.fontWeight.bold, margin: 0 }}>
              {displayTitle}
            </h1>
            {meta.filename?.trim() ? (
              <div style={{ marginTop: theme.spacing.xs, fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
                {meta.filename}
              </div>
            ) : null}
            <div style={{ marginTop: theme.spacing.xs, display: "flex", flexWrap: "wrap", alignItems: "center", gap: theme.spacing.sm, fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
              <span data-testid="report-analysis-id-debug" style={{ fontFamily: "monospace", fontSize: theme.typography.fontSize.xs, color: theme.colors.textTertiary }}>
                Analysis ID: {id}
              </span>
              <Pill>ID: {id}</Pill>
              <Pill>Created: {createdAtFormatted}</Pill>
              <Pill>File: {meta.filename ?? "—"}</Pill>
              <Pill>Type: {meta.mimeType ?? "—"}</Pill>
              {meta.size != null ? <Pill>Size: {meta.size} B</Pill> : null}
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
              onClick={() => {
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
              }}
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

      {/* 1) Decision Trace Score card */}
      <div data-testid="report-score-card">
        <Card title="Decision Trace Score">
          <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.sm }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: theme.spacing.sm }}>
              <div style={{ fontSize: theme.typography.fontSize["4xl"], fontWeight: theme.typography.fontWeight.bold }}>{ledger.decision?.traceScore ?? "—"}</div>
              <div style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>/ 100</div>
            </div>
            <div style={{ marginTop: theme.spacing.sm }}>
              <div style={{ fontSize: theme.typography.fontSize.xs, fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.textSecondary }}>Supported by</div>
              {Array.isArray(ledger.decision?.scoreRationale) && ledger.decision.scoreRationale.length > 0 ? (
                <ul style={{ marginTop: theme.spacing.xs, paddingLeft: theme.spacing.lg, margin: 0, fontSize: theme.typography.fontSize.sm }}>
                  {ledger.decision.scoreRationale.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              ) : (
                <ul style={{ marginTop: theme.spacing.xs, paddingLeft: theme.spacing.lg, margin: 0, fontSize: theme.typography.fontSize.sm }}>
                  <li>No rationale provided.</li>
                </ul>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* 2) AI influenced steps banner */}
      <div
        data-testid="report-ai-override-banner"
        style={{
          borderRadius: theme.borderRadius.xl,
          border: `2px solid ${theme.colors.primary}`,
          backgroundColor: theme.colors.backgroundSecondary,
          padding: theme.spacing.md,
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.xs,
        }}
      >
        <div style={{ fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.textPrimary }}>
          {aiLine}
        </div>
        {overrideLine ? (
          <div style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
            {overrideLine}
          </div>
        ) : null}
        <div style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textTertiary }}>
          This highlights which steps were influenced by AI vs human-controlled for auditability.
        </div>
      </div>

      {/* 3) Tabs */}
      <TabsBar tab={tab} setTab={setTab} />

      {/* 1) Overview */}
      {tab === "Overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.sm }}>
          <Card title="Decision outcome">
            <div style={{ fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.semibold }}>{ledger.decision?.outcome ?? "—"}</div>
            <div style={{ marginTop: theme.spacing.sm }}>
              <Pill>Confidence: {ledger.decision?.confidence ?? "—"}</Pill>
            </div>
          </Card>
        </div>
      )}

      {/* 2) Decision Flow */}
      {tab === "Decision Flow" && (
        <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.sm }}>
          {(ledger.flow ?? []).map((s, idx) => (
            <Card key={s.step ?? idx} title={`Step ${s.step ?? "—"} — ${s.label ?? "—"}`}>
              <div style={{ marginTop: theme.spacing.sm, display: "flex", flexWrap: "wrap", gap: theme.spacing.sm }}>
                <Pill>Actor: {s.actor ?? "—"}</Pill>
                <Pill>AI influenced: {s.aiInfluence ? "Yes" : "No"}</Pill>
                <Pill>Override applied: {s.overrideApplied ? "Yes" : "No"}</Pill>
                <Pill>Confidence delta: {s.confidenceDelta ?? "—"}</Pill>
              </div>
              {Array.isArray(s.rulesApplied) && s.rulesApplied.length > 0 ? (
                <div style={{ marginTop: theme.spacing.sm, fontSize: theme.typography.fontSize.sm }}>
                  <div style={{ fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.textSecondary }}>Rules applied</div>
                  <ul style={{ marginTop: theme.spacing.xs, paddingLeft: theme.spacing.lg, margin: 0 }}>
                    {s.rulesApplied.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </Card>
          ))}
          {(!ledger.flow || ledger.flow.length === 0) ? <Card>No decision flow steps.</Card> : null}
        </div>
      )}

      {/* 3) Stakeholders */}
      {tab === "Stakeholders" && (
        <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.sm }}>
          <Card title="Responsible">
            <div style={{ fontSize: theme.typography.fontSize.sm }}>{ledger.accountability?.responsible ?? "—"}</div>
          </Card>
          <Card title="Accountable">
            <div style={{ fontSize: theme.typography.fontSize.sm }}>{ledger.accountability?.accountable ?? "—"}</div>
          </Card>
          <Card title="Consulted">
            <ul style={{ listStyle: "disc", paddingLeft: theme.spacing.lg, margin: 0, fontSize: theme.typography.fontSize.sm }}>
              {(ledger.accountability?.consulted ?? []).map((x, i) => (
                <li key={i}>{x}</li>
              ))}
              {(!ledger.accountability?.consulted || ledger.accountability.consulted.length === 0) ? <li>—</li> : null}
            </ul>
          </Card>
          <Card title="Informed">
            <ul style={{ listStyle: "disc", paddingLeft: theme.spacing.lg, margin: 0, fontSize: theme.typography.fontSize.sm }}>
              {(ledger.accountability?.informed ?? []).map((x, i) => (
                <li key={i}>{x}</li>
              ))}
              {(!ledger.accountability?.informed || ledger.accountability.informed.length === 0) ? <li>—</li> : null}
            </ul>
          </Card>
        </div>
      )}

      {/* 4) Evidence */}
      {tab === "Evidence" && (
        <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.sm }}>
          <Card title="Evidence ledger">
            <Table
              headers={["Evidence", "Used", "Weight", "Confidence impact", "Reason"]}
              rows={(ledger.evidenceLedger ?? []).map((e, i) => [
                e.evidence ?? "—",
                e.used ? "Yes" : "No",
                <Pill key={i}>{e.weight ?? "—"}</Pill>,
                String(e.confidenceImpact ?? "—"),
                e.reason ?? "—",
              ])}
            />
            {(!ledger.evidenceLedger || ledger.evidenceLedger.length === 0) ? <div style={{ fontSize: theme.typography.fontSize.sm }}>No evidence items.</div> : null}
          </Card>
        </div>
      )}

      {/* 5) Risks */}
      {tab === "Risks" && (
        <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.sm }}>
          <Card title="Risk ledger">
            <Table
              headers={["Risk", "Identified", "Accepted", "Severity", "Accepted by", "Mitigation"]}
              rows={(ledger.riskLedger ?? []).map((r, i) => [
                r.risk ?? "—",
                r.identified ? "Yes" : "No",
                r.accepted ? "Yes" : "No",
                r.severity ?? "—",
                r.acceptedBy ?? "—",
                r.mitigation ?? "—",
              ])}
            />
            {(!ledger.riskLedger || ledger.riskLedger.length === 0) ? <div style={{ fontSize: theme.typography.fontSize.sm }}>—</div> : null}
          </Card>
        </div>
      )}

      {/* 6) Assumptions */}
      {tab === "Assumptions" && (
        <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.sm }}>
          <Card title="Assumption ledger">
            <Table
              headers={["Assumption", "Explicit", "Validated", "Owner", "Invalidation impact"]}
              rows={(ledger.assumptionLedger ?? []).map((a, i) => [
                a.assumption ?? "—",
                a.explicit ? "Yes" : "No",
                <Pill key={i}>{a.validated ? "Yes" : "No"}</Pill>,
                a.owner ?? "—",
                a.invalidationImpact ?? "—",
              ])}
            />
            {(!ledger.assumptionLedger || ledger.assumptionLedger.length === 0) ? <div style={{ fontSize: theme.typography.fontSize.sm }}>—</div> : null}
          </Card>
          {(extReport.openQuestions?.length ?? 0) > 0 || (extReport.nextActions?.length ?? 0) > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.sm }}>
              {extReport.openQuestions && extReport.openQuestions.length > 0 ? (
                <Card title="Open questions">
                  <ul style={{ listStyle: "disc", paddingLeft: theme.spacing.lg, margin: 0, fontSize: theme.typography.fontSize.sm }}>
                    {extReport.openQuestions.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </Card>
              ) : null}
              {extReport.nextActions && extReport.nextActions.length > 0 ? (
                <Card title="Next actions">
                  <ul style={{ listStyle: "disc", paddingLeft: theme.spacing.lg, margin: 0, fontSize: theme.typography.fontSize.sm }}>
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
  );
}
