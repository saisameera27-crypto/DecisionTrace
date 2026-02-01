"use client";

export default function InfluenceMapPanel({ aiLine }: { aiLine: string }) {
  return (
    <div
      data-testid="report-ai-override-banner"
      className="report-map-panel dt-card flex-1 min-h-0 flex flex-col gap-3 border-indigo-100 bg-indigo-50/80"
    >
      <div className="flex items-center gap-2">
        <span className="text-xl text-indigo-600" aria-hidden>
          ✨
        </span>
        <h2 className="dt-heading-2">AI Influence Map</h2>
      </div>
      <p className="text-[var(--dt-font-body)] text-[var(--dt-text-body)] leading-relaxed m-0">{aiLine}</p>
      <p className="dt-muted m-0">
        Highlights AI-influenced vs human-controlled steps for auditability.
      </p>
    </div>
  );
}
