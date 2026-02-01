"use client";

export type MetricItem = { label: string; value: number | string };

export default function MetricPills({ items }: { items: MetricItem[] }) {
  return (
    <ul className="report-supported-list" aria-label="Support metrics">
      {items.map(({ label, value }) => (
        <li key={label} className="report-supported-list__row">
          <span className="report-supported-list__label">{label}</span>
          <span className="report-supported-list__value">{value}</span>
        </li>
      ))}
    </ul>
  );
}
