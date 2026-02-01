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
      className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 flex flex-col gap-4 shadow-sm"
    >
      <div>
        <h1 className="text-xl font-bold text-slate-900 leading-tight m-0 line-clamp-2">
          {displayTitle}
        </h1>
        <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
      </div>

      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-4xl font-bold text-slate-900 leading-none">{displayScore}</span>
        <span className="text-lg text-slate-500">/100</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden max-w-[160px]">
        <div
          className="h-full rounded-full bg-indigo-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-600 mb-1">Supported by</p>
        {rationale.length > 0 ? (
          <ul className="m-0 pl-5 text-sm text-slate-800 leading-relaxed list-disc">
            {rationale.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No rationale provided.</p>
        )}
      </div>

      <MetricPills items={metrics} />

      <details className="text-xs text-slate-500" data-testid="report-details-disclosure">
        <summary className="cursor-pointer list-none select-none underline">Details</summary>
        <div className="mt-1 pl-0">
          <div
            className="font-mono tracking-wide"
            data-testid="report-analysis-id-debug"
          >
            Analysis ID: {details.id}
          </div>
          <div className="mt-1">File type: {details.mimeType || "—"}</div>
          <div className="mt-1">File size: {details.size != null ? `${details.size} B` : "—"}</div>
        </div>
      </details>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onDownload}
          data-testid="report-download-json"
          className="rounded-full border border-slate-200 px-3 py-1.5 text-xs bg-white hover:bg-slate-50 transition-colors text-slate-700"
        >
          Download Audit JSON
        </button>
        <Link
          href="/"
          data-testid="report-back-to-upload"
          className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-900 no-underline hover:bg-slate-50 transition-colors"
        >
          Back
        </Link>
      </div>
    </div>
  );
}
