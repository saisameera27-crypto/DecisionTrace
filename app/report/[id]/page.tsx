"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { theme } from "@/styles/theme";

export default function ReportPage() {
  const params = useParams();
  const id = params.id as string;
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setError("Missing report id");
      setLoading(false);
      return;
    }
    fetch(`/api/report?id=${encodeURIComponent(id)}`)
      .then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(new Error(d.error ?? res.statusText)));
        return res.json();
      })
      .then((data) => {
        if (data.ok && data.report) setReport(data.report);
        else setError("Invalid response");
      })
      .catch((e) => setError(e?.message ?? "Failed to load report"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: theme.spacing.xl, textAlign: "center" }}>
        Loading report...
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ padding: theme.spacing.xl, color: theme.colors.error }}>
        {error}
      </div>
    );
  }
  if (!report) return null;

  const summary = report.summary as { title?: string; filename?: string } | undefined;
  const tabs = report.tabs as {
    overview?: { bullets?: string[] };
    evidence?: unknown[];
    risks?: unknown[];
    trace?: unknown[];
  } | undefined;

  return (
    <div style={{ padding: theme.spacing.xl, maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ fontSize: theme.typography.fontSize["2xl"], marginBottom: theme.spacing.lg }}>
        {summary?.title ?? "Decision Trace Report"}
      </h1>
      {summary?.filename && (
        <p style={{ color: theme.colors.textSecondary, marginBottom: theme.spacing.lg }}>
          File: {summary.filename}
        </p>
      )}
      {tabs?.overview?.bullets?.length ? (
        <section style={{ marginBottom: theme.spacing.xl }}>
          <h2 style={{ fontSize: theme.typography.fontSize.lg, marginBottom: theme.spacing.sm }}>Overview</h2>
          <ul>
            {tabs.overview.bullets.map((b, i) => (
              <li key={i} style={{ marginBottom: theme.spacing.xs }}>{b}</li>
            ))}
          </ul>
        </section>
      ) : (
        <p>No overview content.</p>
      )}
    </div>
  );
}
