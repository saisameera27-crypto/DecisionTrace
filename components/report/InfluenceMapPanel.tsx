"use client";

import type { DecisionLedger } from "@/lib/decisionLedgerSchema";

type FactorNode = {
  id: string;
  label: string;
  type: "evidence" | "risk" | "assumption";
  tag: "High Impact" | "High Risk" | "Low/Med Risk";
  isPlaceholder?: boolean;
};

const WEIGHT_ORDER = { high: 0, medium: 1, low: 2 } as const;

function deriveEvidenceNodes(ledger: DecisionLedger): FactorNode[] {
  const evidence = ledger.evidenceLedger ?? [];
  if (evidence.length === 0) {
    return [{ id: "ev-placeholder", label: "No evidence recorded", type: "evidence", tag: "High Impact", isPlaceholder: true }];
  }
  const sorted = [...evidence].sort((a, b) => {
    const wa = WEIGHT_ORDER[a.weight as keyof typeof WEIGHT_ORDER] ?? 2;
    const wb = WEIGHT_ORDER[b.weight as keyof typeof WEIGHT_ORDER] ?? 2;
    return wa - wb;
  });
  return sorted.slice(0, 2).map((e, i) => ({
    id: `ev-${i}`,
    label: (e.evidence ?? "—").slice(0, 40) + ((e.evidence?.length ?? 0) > 40 ? "…" : ""),
    type: "evidence" as const,
    tag: "High Impact" as const,
  }));
}

function severityRank(s: string): number {
  const t = s?.toLowerCase() ?? "";
  if (/high|critical|severe/.test(t)) return 0;
  if (/medium|med/.test(t)) return 1;
  return 2;
}

function deriveRiskNodes(ledger: DecisionLedger): FactorNode[] {
  const risks = ledger.riskLedger ?? [];
  if (risks.length === 0) {
    return [{ id: "risk-placeholder", label: "No risks recorded", type: "risk", tag: "High Risk", isPlaceholder: true }];
  }
  const sorted = [...risks].sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
  return sorted.slice(0, 2).map((r, i) => ({
    id: `risk-${i}`,
    label: (r.risk ?? "—").slice(0, 40) + ((r.risk?.length ?? 0) > 40 ? "…" : ""),
    type: "risk" as const,
    tag: "High Risk" as const,
  }));
}

function deriveAssumptionNodes(ledger: DecisionLedger): FactorNode[] {
  const assumptions = ledger.assumptionLedger ?? [];
  const unvalidated = assumptions.filter((a) => !a.validated);
  const source = unvalidated.length > 0 ? unvalidated : assumptions;
  if (source.length === 0) {
    return [{ id: "assump-placeholder", label: "No assumptions recorded", type: "assumption", tag: "Low/Med Risk", isPlaceholder: true }];
  }
  const a = source[0];
  return [
    {
      id: "assump-0",
      label: (a.assumption ?? "—").slice(0, 40) + ((a.assumption?.length ?? 0) > 40 ? "…" : ""),
      type: "assumption" as const,
      tag: "Low/Med Risk" as const,
    },
  ];
}

function getNodeStyles(node: FactorNode): string {
  if (node.isPlaceholder) {
    return "border-slate-200 bg-slate-50 text-slate-500";
  }
  switch (node.type) {
    case "evidence":
      return "border-emerald-300 bg-emerald-50/80 text-emerald-900";
    case "risk":
      return "border-amber-300 bg-amber-50/80 text-amber-900";
    case "assumption":
      return "border-violet-300 bg-violet-50/80 text-violet-900";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

export type InfluenceMapPanelProps = {
  ledger: DecisionLedger;
  coreLabel?: string;
};

export default function InfluenceMapPanel({ ledger, coreLabel = "Core Decision" }: InfluenceMapPanelProps) {
  const evidenceNodes = deriveEvidenceNodes(ledger);
  const riskNodes = deriveRiskNodes(ledger);
  const assumptionNodes = deriveAssumptionNodes(ledger);
  const factorNodes: FactorNode[] = [...evidenceNodes, ...riskNodes, ...assumptionNodes].slice(0, 5);

  return (
    <div
      data-testid="report-ai-override-banner"
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="mb-4">
        <h2 className="m-0 text-lg font-semibold text-slate-900">AI Influence Map</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Visual representation of decision factors and their relationships
        </p>
      </div>

      <div className="relative flex min-h-[120px] items-stretch gap-0">
        {/* Core Decision node (left/center) */}
        <div className="flex shrink-0 items-center pr-4">
          <div className="rounded-full bg-gradient-to-r from-indigo-500 to-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm">
            {coreLabel}
          </div>
        </div>

        {/* Connector lines + factor nodes */}
        <div className="flex flex-1 flex-col justify-center gap-2">
          {factorNodes.map((node, idx) => (
            <div key={node.id} className="flex items-center gap-2">
              {/* Thin line from core to node (CSS-only) */}
              <div
                className="h-px flex-1 min-w-[12px] bg-slate-300"
                style={{ maxWidth: 80 }}
                aria-hidden
              />
              <div
                className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-xs ${getNodeStyles(node)}`}
                style={{ maxWidth: 220 }}
              >
                <span className="font-medium text-slate-600">{node.tag}</span>
                <p className="m-0 mt-0.5 leading-snug break-words">{node.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
