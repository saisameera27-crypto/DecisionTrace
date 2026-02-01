"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { theme } from "@/styles/theme";

type ReportSummary = { title?: string; filename?: string };
type ReportTabs = {
  overview?: { bullets?: string[] };
  decisionFlow?: { steps?: { step: number; label: string; description: string }[] };
  stakeholders?: { role: string; description: string }[];
  evidence?: unknown[];
  risks?: unknown[];
  assumptions?: unknown[];
};

type TabId = "overview" | "decisionFlow" | "stakeholders" | "evidence" | "risks" | "assumptions";

const TAB_CONFIG: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "decisionFlow", label: "Decision Flow" },
  { id: "stakeholders", label: "Stakeholders" },
  { id: "evidence", label: "Evidence & Sources" },
  { id: "risks", label: "Risks & Controls" },
  { id: "assumptions", label: "Assumptions & Gaps" },
];

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) ?? "";
  const [report, setReport] = useState<{ summary?: ReportSummary; tabs?: ReportTabs } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("overview");

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
      <div data-testid="report-error" style={{ padding: theme.spacing.xl, color: theme.colors.error }}>
        Error: {err}
      </div>
    );
  }

  if (loading || !report) {
    return <ReportLoadingSkeleton />;
  }

  const tabs = report.tabs ?? {};

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const baseStyles = {
    padding: theme.spacing.xl,
    maxWidth: 900,
    margin: "0 auto",
    fontFamily: theme.typography.fontFamily,
  };

  const headerRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottom: `1px solid ${theme.colors.border}`,
  };

  const tabListStyle: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
    borderBottom: `1px solid ${theme.colors.border}`,
  };

  const tabButtonStyle = (isActive: boolean): React.CSSProperties => ({
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: isActive ? theme.colors.primary : theme.colors.textSecondary,
    background: "none",
    border: "none",
    borderBottom: isActive ? `2px solid ${theme.colors.primary}` : "2px solid transparent",
    marginBottom: -1,
    cursor: "pointer",
    borderRadius: theme.borderRadius.sm,
  });

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    marginBottom: theme.spacing.sm,
  };

  const linkStyle: React.CSSProperties = {
    color: theme.colors.primary,
    textDecoration: "none",
    fontSize: theme.typography.fontSize.sm,
  };

  const buttonStyle: React.CSSProperties = {
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.background,
    backgroundColor: theme.colors.primary,
    border: "none",
    borderRadius: theme.borderRadius.md,
    cursor: "pointer",
  };

  return (
    <div data-testid="report-content" style={baseStyles}>
      <div style={headerRowStyle}>
        <div>
          <h1 style={{ fontSize: theme.typography.fontSize["2xl"], fontWeight: theme.typography.fontWeight.bold, marginBottom: theme.spacing.xs }}>
            {report.summary?.title ?? "Decision Trace Report"}
          </h1>
          {report.summary?.filename && (
            <p style={{ color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.sm }}>
              File: {report.summary.filename}
            </p>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: theme.spacing.md }}>
          <Link href="/" style={linkStyle} data-testid="report-back-to-upload">
            Back to Upload
          </Link>
          <button type="button" onClick={handleDownloadJson} style={buttonStyle} data-testid="report-download-json">
            Download JSON
          </button>
        </div>
      </div>

      <nav role="tablist" aria-label="Report sections" style={tabListStyle}>
        {TAB_CONFIG.map(({ id: tabId, label }) => (
          <button
            key={tabId}
            role="tab"
            aria-selected={activeTab === tabId}
            aria-controls={`tabpanel-${tabId}`}
            id={`tab-${tabId}`}
            style={tabButtonStyle(activeTab === tabId)}
            onClick={() => setActiveTab(tabId)}
            data-testid={`report-tab-${tabId}`}
          >
            {label}
          </button>
        ))}
      </nav>

      <div role="tabpanel" id="tabpanel-overview" aria-labelledby="tab-overview" hidden={activeTab !== "overview"}>
        {activeTab === "overview" && (
          <section>
            <h2 style={sectionTitleStyle}>Overview</h2>
            {tabs.overview?.bullets?.length ? (
              <ul style={{ paddingLeft: theme.spacing.lg }}>
                {tabs.overview.bullets.map((b, i) => (
                  <li key={i} style={{ marginBottom: theme.spacing.xs }}>{b}</li>
                ))}
              </ul>
            ) : (
              <p style={{ color: theme.colors.textSecondary }}>No overview content.</p>
            )}
          </section>
        )}
      </div>

      <div role="tabpanel" id="tabpanel-decisionFlow" aria-labelledby="tab-decisionFlow" hidden={activeTab !== "decisionFlow"}>
        {activeTab === "decisionFlow" && (
          <section>
            <h2 style={sectionTitleStyle}>Decision Flow</h2>
            {tabs.decisionFlow?.steps?.length ? (
              <ol style={{ paddingLeft: theme.spacing.lg }}>
                {tabs.decisionFlow.steps.map((s, i) => (
                  <li key={i} style={{ marginBottom: theme.spacing.sm }}>
                    <strong>{s.step}. {s.label}</strong> — {s.description}
                  </li>
                ))}
              </ol>
            ) : (
              <p style={{ color: theme.colors.textSecondary }}>No decision flow content.</p>
            )}
          </section>
        )}
      </div>

      <div role="tabpanel" id="tabpanel-stakeholders" aria-labelledby="tab-stakeholders" hidden={activeTab !== "stakeholders"}>
        {activeTab === "stakeholders" && (
          <section>
            <h2 style={sectionTitleStyle}>Stakeholders</h2>
            {Array.isArray(tabs.stakeholders) && tabs.stakeholders.length > 0 ? (
              <ul style={{ paddingLeft: theme.spacing.lg }}>
                {tabs.stakeholders.map((item, i) => (
                  <li key={i} style={{ marginBottom: theme.spacing.sm }}>
                    <strong>{item.role}:</strong> {item.description}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: theme.colors.textSecondary }}>No stakeholders content.</p>
            )}
          </section>
        )}
      </div>

      <div role="tabpanel" id="tabpanel-evidence" aria-labelledby="tab-evidence" hidden={activeTab !== "evidence"}>
        {activeTab === "evidence" && (
          <section>
            <h2 style={sectionTitleStyle}>Evidence & Sources</h2>
            {Array.isArray(tabs.evidence) && tabs.evidence.length > 0 ? (
              <ul style={{ paddingLeft: theme.spacing.lg }}>
                {tabs.evidence.map((item, i) => (
                  <li key={i} style={{ marginBottom: theme.spacing.sm }}>
                    {typeof item === "string" ? item : JSON.stringify(item)}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: theme.colors.textSecondary }}>No evidence or sources.</p>
            )}
          </section>
        )}
      </div>

      <div role="tabpanel" id="tabpanel-risks" aria-labelledby="tab-risks" hidden={activeTab !== "risks"}>
        {activeTab === "risks" && (
          <section>
            <h2 style={sectionTitleStyle}>Risks & Controls</h2>
            {Array.isArray(tabs.risks) && tabs.risks.length > 0 ? (
              <ul style={{ paddingLeft: theme.spacing.lg }}>
                {tabs.risks.map((item, i) => (
                  <li key={i} style={{ marginBottom: theme.spacing.sm }}>
                    {typeof item === "string" ? item : JSON.stringify(item)}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: theme.colors.textSecondary }}>No risks or controls.</p>
            )}
          </section>
        )}
      </div>

      <div role="tabpanel" id="tabpanel-assumptions" aria-labelledby="tab-assumptions" hidden={activeTab !== "assumptions"}>
        {activeTab === "assumptions" && (
          <section>
            <h2 style={sectionTitleStyle}>Assumptions & Gaps</h2>
            {Array.isArray(tabs.assumptions) && tabs.assumptions.length > 0 ? (
              <ul style={{ paddingLeft: theme.spacing.lg }}>
                {tabs.assumptions.map((item, i) => (
                  <li key={i} style={{ marginBottom: theme.spacing.sm }}>
                    {typeof item === "string" ? item : JSON.stringify(item)}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: theme.colors.textSecondary }}>No assumptions or gaps.</p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function ReportLoadingSkeleton() {
  return (
    <div data-testid="report-loading" style={{ padding: theme.spacing.xl, maxWidth: 900, margin: "0 auto" }}>
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
