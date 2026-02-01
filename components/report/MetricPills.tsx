"use client";

export type MetricItem = { label: string; value: number | string };

export default function MetricPills({ items }: { items: MetricItem[] }) {
  return (
    <div className="flex flex-wrap gap-3 pt-2 border-t border-emerald-200 text-xs text-slate-600">
      {items.map(({ label, value }) => (
        <span key={label}>
          {label}: <strong className="text-slate-900">{value}</strong>
        </span>
      ))}
    </div>
  );
}
