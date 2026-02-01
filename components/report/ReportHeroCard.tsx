"use client";

import type { MetricItem } from "./MetricPills";
import MetricPills from "./MetricPills";
import Link from "next/link";

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
  const displayScore = typeof score === "number" ? score : "—";
  const progressPct = typeof score === "number" ? Math.min(100, Math.max(0, Number(score))) : 0;

  return (
    <div
      data-testid="report-score-card"
      className="report-hero-summary dt-card flex flex-col gap-4 p-5"
    >
      <h1 className="report-hero-title dt-heading-1 line-clamp-3 m-0">
        {displayTitle}
      </h1>
      <p className="report-hero-meta dt-muted mt-0 text-[var(--dt-font-muted)]">
        {subtitle}
      </p>

      <div className="report-score-pill" aria-label="Trace score">
        <span className="report-score-value">{displayScore}</span>
        <span className="report-score-suffix">/100</span>
      </div>
      <div className="report-score-bar h-2 rounded-full bg-[var(--color-background-tertiary)] overflow-hidden max-w-[200px]" aria-hidden>
        <div
          className="h-full rounded-full bg-indigo-500 transition-[width]"
          style={{ width: `${progressPct}%` }}
        />
      </div>

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

      <div className="report-hero-actions flex flex-wrap gap-2 pt-1 border-t border-[var(--color-border-light)]">
        <button
          type="button"
          onClick={onDownload}
          data-testid="report-download-json"
          className="dt-btn"
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
  );
}
