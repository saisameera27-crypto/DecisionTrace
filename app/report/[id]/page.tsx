"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { theme } from "@/styles/theme";

type ReportSummary = { title?: string; filename?: string };
type ReportTabs = {
  overview?: { bullets?: string[] };
  evidence?: unknown[];
  risks?: unknown[];
  trace?: unknown[];
};

export default function ReportPage() {
  const params = useParams();
  const id = (params?.id as string) ?? "";
  const [report, setReport] = useState<{ summary?: ReportSummary; tabs?: ReportTabs } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setErr("Missing report id");
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/report?id=${encodeURIComponent(id)}`);
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setErr(data.error ?? "Failed to load report");
          return;
        }
        setReport(data.report ?? null);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load report");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (err) {
    return (
      <div style={{ padding: theme.spacing.xl, color: theme.colors.error }}>
        Error: {err}
      </div>
    );
  }

  if (loading || !report) {
    return <ReportLoadingSkeleton />;
  }

  const summary = report.summary;
  const tabs = report.tabs ?? {};

  return (
    <div style={{ padding: theme.spacing.xl, maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ fontSize: theme.typography.fontSize["2xl"], fontWeight: theme.typography.fontWeight.bold, marginBottom: theme.spacing.sm }}>
        {summary?.title ?? "Decision Trace Report"}
      </h1>
      {summary?.filename && (
        <p style={{ color: theme.colors.textSecondary, marginBottom: theme.spacing.lg, fontSize: theme.typography.fontSize.sm }}>
          File: {summary.filename}
        </p>
      )}

      {/* Overview */}
      {tabs.overview?.bullets?.length ? (
        <section style={{ marginBottom: theme.spacing.xl }}>
          <h2 style={{ fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.semibold, marginBottom: theme.spacing.sm }}>Overview</h2>
          <ul style={{ paddingLeft: theme.spacing.lg }}>
            {tabs.overview.bullets.map((b, i) => (
              <li key={i} style={{ marginBottom: theme.spacing.xs }}>{b}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Evidence */}
      {Array.isArray(tabs.evidence) && tabs.evidence.length > 0 && (
        <section style={{ marginBottom: theme.spacing.xl }}>
          <h2 style={{ fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.semibold, marginBottom: theme.spacing.sm }}>Evidence</h2>
          <ul style={{ paddingLeft: theme.spacing.lg }}>
            {tabs.evidence.map((item, i) => (
              <li key={i} style={{ marginBottom: theme.spacing.sm }}>
                {typeof item === "string" ? item : JSON.stringify(item)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Risks */}
      {Array.isArray(tabs.risks) && tabs.risks.length > 0 && (
        <section style={{ marginBottom: theme.spacing.xl }}>
          <h2 style={{ fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.semibold, marginBottom: theme.spacing.sm }}>Risks</h2>
          <ul style={{ paddingLeft: theme.spacing.lg }}>
            {tabs.risks.map((item, i) => (
              <li key={i} style={{ marginBottom: theme.spacing.sm }}>
                {typeof item === "string" ? item : JSON.stringify(item)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Trace */}
      {Array.isArray(tabs.trace) && tabs.trace.length > 0 && (
        <section style={{ marginBottom: theme.spacing.xl }}>
          <h2 style={{ fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.semibold, marginBottom: theme.spacing.sm }}>Trace</h2>
          <ul style={{ paddingLeft: theme.spacing.lg }}>
            {tabs.trace.map((item, i) => (
              <li key={i} style={{ marginBottom: theme.spacing.sm }}>
                {typeof item === "string" ? item : JSON.stringify(item)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {!tabs.overview?.bullets?.length && !(Array.isArray(tabs.evidence) && tabs.evidence.length > 0) &&
       !(Array.isArray(tabs.risks) && tabs.risks.length > 0) && !(Array.isArray(tabs.trace) && tabs.trace.length > 0) && (
        <p style={{ color: theme.colors.textSecondary }}>No tab content.</p>
      )}
    </div>
  );
}

function ReportLoadingSkeleton() {
  return (
    <div style={{ padding: theme.spacing.xl, maxWidth: 800, margin: "0 auto" }}>
      <div
        style={{
          height: 28,
          width: "70%",
          maxWidth: 400,
          backgroundColor: theme.colors.backgroundTertiary,
          borderRadius: 4,
          marginBottom: theme.spacing.md,
        }}
      />
      <div
        style={{
          height: 16,
          width: "40%",
          backgroundColor: theme.colors.backgroundTertiary,
          borderRadius: 4,
          marginBottom: theme.spacing.xl,
        }}
      />
      <div
        style={{
          height: 20,
          width: "30%",
          backgroundColor: theme.colors.backgroundTertiary,
          borderRadius: 4,
          marginBottom: theme.spacing.sm,
        }}
      />
      <div style={{ paddingLeft: theme.spacing.lg }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              height: 16,
              width: i === 2 ? "90%" : "100%",
              backgroundColor: theme.colors.backgroundTertiary,
              borderRadius: 4,
              marginBottom: theme.spacing.sm,
            }}
          />
        ))}
      </div>
    </div>
  );
}
