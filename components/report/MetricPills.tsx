"use client";

export type MetricItem = { label: string; value: number | string };

export default function MetricPills({ items }: { items: MetricItem[] }) {
  return (
    <div className="report-summary-block">
      {items.map(({ label, value }) => (
        <div key={label} className="report-summary-line">
          <span className="report-summary-label">{label}</span>
          <span className="report-summary-value">{value}</span>
        </div>
      ))}
    </div>
  );
}
