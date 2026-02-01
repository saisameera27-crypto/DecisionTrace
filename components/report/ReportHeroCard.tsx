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
      className="dt-card flex flex-col gap-5 p-5"
    >
      <div>
        <h1 className="dt-heading-1 line-clamp-3">
          {displayTitle}
        </h1>
        <p className="dt-muted mt-2">{subtitle}</p>
      </div>

      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-3xl font-bold text-[var(--dt-text-heading)] leading-none">{displayScore}</span>
        <span className="dt-muted text-base">/100</span>
      </div>
      <div className="h-2 rounded-full bg-[var(--color-background-tertiary)] overflow-hidden max-w-[200px]">
        <div
          className="h-full rounded-full bg-indigo-500 transition-[width]"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="pt-1 border-t border-[var(--color-border-light)]">
        <p className="dt-label mb-2">Supported by</p>
        {rationale.length > 0 ? (
          <ul className="m-0 pl-5 text-[var(--dt-font-body)] text-[var(--dt-text-body)] leading-relaxed list-disc space-y-1">
            {rationale.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        ) : (
          <p className="dt-muted">No rationale provided.</p>
        )}
      </div>

      <MetricPills items={metrics} />

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
