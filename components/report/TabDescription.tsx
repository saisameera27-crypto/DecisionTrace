"use client";

export default function TabDescription({ description }: { description: string }) {
  return (
    <p className="dt-muted mt-2 leading-snug" data-testid="report-tab-description">
      {description}
    </p>
  );
}
