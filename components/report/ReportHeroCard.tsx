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
      className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col gap-5 shadow-sm"
    >
      <div>
        <h1 className="text-xl font-bold text-slate-900 leading-tight m-0 line-clamp-3">
          {displayTitle}
        </h1>
        <p className="text-sm text-slate-500 mt-2">{subtitle}</p>
      </div>

      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-4xl font-bold text-slate-900 leading-none">{displayScore}</span>
        <span className="text-lg text-slate-500">/100</span>
      </div>
      <div className="h-2 rounded-full bg-slate-200 overflow-hidden max-w-[200px]">
        <div
          className="h-full rounded-full bg-indigo-500 transition-[width]"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="pt-1 border-t border-slate-100">
        <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Supported by</p>
        {rationale.length > 0 ? (
          <ul className="m-0 pl-5 text-sm text-slate-700 leading-relaxed list-disc space-y-1">
            {rationale.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No rationale provided.</p>
        )}
      </div>

      <MetricPills items={metrics} />

      <details className="text-xs text-slate-500 pt-1" data-testid="report-details-disclosure">
        <summary className="cursor-pointer list-none select-none underline hover:text-slate-700">
          Details
        </summary>
        <div className="mt-2 pl-0 font-mono text-slate-600 space-y-1">
          <div data-testid="report-analysis-id-debug">Analysis ID: {details.id}</div>
          <div>File type: {details.mimeType || "—"}</div>
          <div>File size: {details.size != null ? `${details.size} B` : "—"}</div>
        </div>
      </details>

      <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
        <button
          type="button"
          onClick={onDownload}
          data-testid="report-download-json"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
        >
          Download Audit JSON
        </button>
        <Link
          href="/"
          data-testid="report-back-to-upload"
          className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 no-underline hover:bg-slate-50 hover:border-slate-300 transition-colors"
        >
          Back
        </Link>
      </div>
    </div>
  );
}
