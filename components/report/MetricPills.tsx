"use client";

export type MetricItem = { label: string; value: number | string };

export default function MetricPills({ items }: { items: MetricItem[] }) {
  return (
    <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-200">
      {items.map(({ label, value }) => (
        <span
          key={label}
          className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
        >
          <span className="font-medium text-slate-900">{value}</span>
          <span className="ml-1">{label}</span>
        </span>
      ))}
    </div>
  );
}
