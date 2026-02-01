"use client";

export type MetricItem = { label: string; value: number | string };

export default function MetricPills({ items }: { items: MetricItem[] }) {
  return (
    <div className="report-stats-strip">
      {items.map(({ label, value }) => (
        <div key={label} className="report-stat-card">
          <span className="report-stat-value">{value}</span>
          <span className="report-stat-label">{label}</span>
        </div>
      ))}
    </div>
  );
}
