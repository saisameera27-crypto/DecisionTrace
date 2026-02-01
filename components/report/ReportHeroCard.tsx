"use client";

import type { MetricItem } from "./MetricPills";
import MetricPills from "./MetricPills";
import Link from "next/link";

/** Presentation-only: treat rationale text as warning (amber) if it suggests gaps/missing validation */
function isWarningRationale(text: string): boolean {
  const t = text.toLowerCase();
  return (
    /missing|gap|lack|unvalidated|not validated|no evidence|no rationale|incomplete|pending/.test(
      t
    ) || /^no\s|—/.test(t.trim())
  );
}

const CheckIcon = () => (
  <svg className="h-4 w-4 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const WarningIcon = () => (
  <svg className="h-4 w-4 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

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
  confidenceLabel,
  metrics,
  details,
  onDownload,
}: ReportHeroCardProps) {
  const displayScore = typeof score === "number" ? score : "—";
  const progressPct = typeof score === "number" ? Math.min(100, Math.max(0, Number(score))) : 0;
  const supportingItems = rationale.slice(0, 3).map((text) => ({
    text,
    isWarning: isWarningRationale(text),
  }));

  return (
    <div
      data-testid="report-score-card"
      className="rounded-xl border border-slate-200 bg-white shadow-md overflow-hidden flex flex-col"
    >
      {/* Gradient header */}
      <div className="bg-gradient-to-br from-indigo-600 to-blue-700 px-4 py-4 text-white">
        <h1 className="text-lg font-semibold leading-tight m-0 line-clamp-2 tracking-tight">
          {displayTitle}
        </h1>
        <p className="text-xs text-indigo-100 mt-1.5 font-medium">{subtitle}</p>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Score + confidence pill */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-slate-900 leading-none">
              {displayScore}
            </span>
            <span className="text-base text-slate-500">/100</span>
          </div>
          {confidenceLabel ? (
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
              {confidenceLabel}
            </span>
          ) : null}
        </div>

        {/* Progress bar */}
        <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-600 transition-[width]"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Supporting information: 2–3 status cards from rationale */}
        {supportingItems.length > 0 ? (
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-2">Supporting information</p>
            <ul className="space-y-2 m-0 p-0 list-none">
              {supportingItems.map((item, i) => (
                <li
                  key={i}
                  className={`flex gap-2 items-start rounded-lg border px-2.5 py-2 text-sm ${
                    item.isWarning
                      ? "border-amber-200 bg-amber-50/80 text-amber-900"
                      : "border-emerald-200 bg-emerald-50/50 text-slate-800"
                  }`}
                >
                  {item.isWarning ? <WarningIcon /> : <CheckIcon />}
                  <span className="leading-snug break-words">{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-xs text-slate-500">No supporting rationale provided.</p>
        )}

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
    </div>
  );
}
