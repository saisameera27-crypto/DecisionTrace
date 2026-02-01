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

const MAX_WIDTH_6XL = "72rem"; // 1152px

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: theme.borderRadius.full,
        border: `1px solid ${theme.colors.border}`,
        padding: "2px 8px",
        fontSize: theme.typography.fontSize.xs,
        color: theme.colors.textSecondary,
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

const tableCellWrap: React.CSSProperties = {
  wordBreak: "break-word",
  overflowWrap: "break-word",
};

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
            <tr
              key={idx}
              style={{
                borderTop: `1px solid ${theme.colors.border}`,
                backgroundColor: idx % 2 === 1 ? theme.colors.backgroundSecondary : theme.colors.background,
                transition: "background-color 0.15s ease",
              }}
            >
              {r.map((cell, j) => (
                <td key={j} style={{ padding: theme.spacing.sm, verticalAlign: "top", ...tableCellWrap }}>
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
      <div style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary, lineHeight: 1.6 }}>
        {message}
      </div>
    </Card>
  );
}

const TABS = ["Overview", "Decision Flow", "Stakeholders", "Evidence", "Risks", "Assumptions"] as const;
type Tab = (typeof TABS)[number];

function TabsBar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        padding: `${theme.spacing.sm} 0`,
        marginLeft: -theme.spacing.xl,
        marginRight: -theme.spacing.xl,
        paddingLeft: theme.spacing.xl,
        paddingRight: theme.spacing.xl,
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        backgroundColor: "rgba(255, 255, 255, 0.85)",
        borderBottom: `1px solid ${theme.colors.border}`,
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: theme.spacing.xs }}>
        {TABS.map((t) => {
          const isActive = tab === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              data-testid={`report-tab-${t.toLowerCase().replace(" ", "")}`}
              style={{
                borderRadius: theme.borderRadius.full,
                border: `1px solid ${isActive ? theme.colors.primary : theme.colors.border}`,
                padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                fontSize: theme.typography.fontSize.sm,
                fontWeight: isActive ? theme.typography.fontWeight.semibold : theme.typography.fontWeight.normal,
                backgroundColor: isActive ? theme.colors.primary : "transparent",
                color: isActive ? theme.colors.background : theme.colors.textPrimary,
                cursor: "pointer",
                boxShadow: isActive ? theme.colors.shadowSm : "none",
              }}
            >
              {t}
            </button>
          );
        })}
      </div>
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
    <div data-testid="report-content" style={{ maxWidth: MAX_WIDTH_6XL, margin: "0 auto", padding: theme.spacing.xl, display: "flex", flexDirection: "column", gap: theme.spacing.md }}>
      {/* Header */}
      <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.sm }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: theme.spacing.md }}>
          <div style={{ flex: "1 1 0", minWidth: 0 }}>
            <h1
              style={{
                fontSize: theme.typography.fontSize["2xl"],
                fontWeight: theme.typography.fontWeight.bold,
                margin: 0,
                lineHeight: theme.typography.lineHeight.tight,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                textWrap: "balance",
              }}
            >
              {displayTitle}
            </h1>
            <div style={{ marginTop: theme.spacing.xs, fontSize: theme.typography.fontSize.xs, color: theme.colors.textTertiary }}>
              Decision Ledger • Gemini 3 • Audit-ready
            </div>
            <div
              style={{
                marginTop: theme.spacing.sm,
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textTertiary,
                fontFamily: "ui-monospace, monospace",
              }}
              data-testid="report-analysis-id-debug"
            >
              ID <span style={{ letterSpacing: "0.02em" }}>{id}</span>
              <span style={{ marginLeft: theme.spacing.sm, marginRight: theme.spacing.sm, color: theme.colors.border }}>·</span>
              Created {createdAtFormatted}
            </div>
            <div style={{ marginTop: theme.spacing.xs, display: "flex", flexWrap: "wrap", alignItems: "center", gap: theme.spacing.xs }}>
              <Pill>File: {meta.filename ?? "—"}</Pill>
              <Pill>Type: {meta.mimeType ?? "—"}</Pill>
              {meta.size != null ? <Pill>Size: {meta.size} B</Pill> : null}
            </div>
          </div>

          <div style={{ display: "flex", gap: theme.spacing.sm, flexShrink: 0 }}>
            <button
              type="button"
              style={{
                borderRadius: theme.borderRadius.full,
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
                borderRadius: theme.borderRadius.full,
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

      {/* 1) Decision Trace Score hero card */}
      {(() => {
        const score = ledger.decision?.traceScore ?? 0;
        const rationale = Array.isArray(ledger.decision?.scoreRationale) ? ledger.decision.scoreRationale.slice(0, 5) : [];
        const evidenceUsed = (ledger.evidenceLedger ?? []).filter((e) => e.used).length;
        const risksAccepted = (ledger.riskLedger ?? []).filter((r) => r.accepted).length;
        const assumptionsValidated = (ledger.assumptionLedger ?? []).filter((a) => a.validated).length;
        const overrides = (ledger.flow ?? []).filter((s) => s.overrideApplied).length;
        return (
          <div
            data-testid="report-score-card"
            style={{
              borderRadius: theme.borderRadius.xl,
              border: `1px solid ${theme.colors.border}`,
              background: `linear-gradient(145deg, ${theme.colors.background} 0%, ${theme.colors.backgroundSecondary} 100%)`,
              padding: theme.spacing.xl,
              display: "flex",
              flexDirection: "column",
              gap: theme.spacing.lg,
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "stretch", gap: theme.spacing.xl }}>
              <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.sm, minWidth: 120 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: theme.spacing.xs }}>
                  <span style={{ fontSize: "3.5rem", fontWeight: theme.typography.fontWeight.bold, lineHeight: 1 }}>{typeof score === "number" ? score : "—"}</span>
                  <span style={{ fontSize: theme.typography.fontSize.lg, color: theme.colors.textTertiary }}>/100</span>
                </div>
                <div
                  style={{
                    height: 6,
                    borderRadius: theme.borderRadius.full,
                    backgroundColor: theme.colors.borderLight,
                    overflow: "hidden",
                    width: "100%",
                    maxWidth: 160,
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(100, Math.max(0, Number(score)))}%`,
                      borderRadius: theme.borderRadius.full,
                      backgroundColor: theme.colors.primary,
                      opacity: 0.6,
                    }}
                  />
                </div>
              </div>
              <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                <div style={{ fontSize: theme.typography.fontSize.xs, fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.textSecondary, marginBottom: theme.spacing.xs }}>Supported by</div>
                {rationale.length > 0 ? (
                  <ul style={{ margin: 0, paddingLeft: theme.spacing.lg, fontSize: theme.typography.fontSize.sm, color: theme.colors.textPrimary, lineHeight: 1.6 }}>
                    {rationale.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                ) : (
                  <div style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textTertiary }}>No rationale provided.</div>
                )}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: theme.spacing.lg,
                paddingTop: theme.spacing.sm,
                borderTop: `1px solid ${theme.colors.border}`,
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textSecondary,
              }}
            >
              <span>Evidence used: <strong style={{ color: theme.colors.textPrimary }}>{evidenceUsed}</strong></span>
              <span>Risks accepted: <strong style={{ color: theme.colors.textPrimary }}>{risksAccepted}</strong></span>
              <span>Assumptions validated: <strong style={{ color: theme.colors.textPrimary }}>{assumptionsValidated}</strong></span>
              <span>Overrides: <strong style={{ color: theme.colors.textPrimary }}>{overrides}</strong></span>
            </div>
          </div>
        );
      })()}

      {/* 2) AI Influence Map banner */}
      <div
        data-testid="report-ai-override-banner"
        style={{
          borderRadius: theme.borderRadius.xl,
          border: `1px solid ${theme.colors.border}`,
          background: `linear-gradient(145deg, ${theme.colors.backgroundSecondary} 0%, ${theme.colors.background} 100%)`,
          padding: theme.spacing.md,
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.sm,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: theme.spacing.sm }}>
          <span style={{ fontSize: "1.25rem", lineHeight: 1 }} aria-hidden>✨</span>
          <h2 style={{ margin: 0, fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.textPrimary }}>
            AI Influence Map
          </h2>
        </div>
        <div style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary, lineHeight: 1.5 }}>
          {aiLine}
        </div>
        {overrideLine ? (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: theme.spacing.xs }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                borderRadius: theme.borderRadius.full,
                border: `1px solid ${theme.colors.border}`,
                padding: "2px 8px",
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textSecondary,
                backgroundColor: theme.colors.background,
              }}
            >
              Overrides: {formatStepList((ledger.flow ?? []).filter((s) => s.overrideApplied).map((s) => s.step))}
            </span>
          </div>
        ) : null}
      </div>

      {/* 3) Tabs */}
      <TabsBar tab={tab} setTab={setTab} />

      {/* Tab content area */}
      <div style={{ paddingTop: theme.spacing.md, display: "flex", flexDirection: "column", gap: theme.spacing.md }}>
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

      {/* 5) Risks */}
      {tab === "Risks" && (
        <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.sm }}>
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

      {/* 6) Assumptions */}
      {tab === "Assumptions" && (
        <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.sm }}>
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
    </div>
  );
}
