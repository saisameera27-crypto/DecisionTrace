"use client";

export default function InfluenceMapPanel({ aiLine }: { aiLine: string }) {
  return (
    <div
      data-testid="report-ai-override-banner"
      className="rounded-xl border border-indigo-200 bg-indigo-50/80 p-4 flex flex-col gap-2 shadow-sm"
    >
      <div className="flex items-center gap-2">
        <span className="text-xl text-indigo-600" aria-hidden>
          ✨
        </span>
        <h2 className="m-0 text-lg font-semibold text-slate-900">AI Influence Map</h2>
      </div>
      <p className="text-sm text-slate-600 leading-snug">{aiLine}</p>
      <p className="text-xs text-slate-500">
        Highlights AI-influenced vs human-controlled steps for auditability.
      </p>
    </div>
  );
}
