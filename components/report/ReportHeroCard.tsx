"use client";

import type { MetricItem } from "./MetricPills";
import MetricPills from "./MetricPills";

export type ReportHeroCardProps = {
  displayTitle: string;
  subtitle: string;
  score: number;
  rationale: string[];
  confidenceLabel?: string;
  metrics: MetricItem[];
  details: { id: string; mimeType: string; size: number | null };
  onDownload: () => void;
};

export default function ReportHeroCard({
  displayTitle,
  subtitle,
  score,
  rationale,
  metrics,
  details,
  onDownload,
}: ReportHeroCardProps) {
  return (
    <div
      data-testid="report-score-card"
      className="report-hero-summary dt-card flex flex-col gap-4 p-5"
    >
      <section className="report-supported-by" aria-labelledby="supported-by-heading">
        <h2 id="supported-by-heading" className="report-supported-by-heading dt-label mb-2 m-0">
          Supported by
        </h2>
        <MetricPills items={metrics} />
      </section>

      <details className="dt-muted pt-1" data-testid="report-details-disclosure">
        <summary className="cursor-pointer list-none select-none underline hover:text-[var(--dt-text-body)]">
          Details
        </summary>
        <div className="mt-2 pl-0 font-mono space-y-1">
          <div data-testid="report-analysis-id-debug">Analysis ID: {details.id}</div>
          <div>File type: {details.mimeType || "—"}</div>
          <div>File size: {details.size != null ? `${details.size} B` : "—"}</div>
        </div>
      </details>
    </div>
  );
}
