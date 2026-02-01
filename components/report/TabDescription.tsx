"use client";

export default function TabDescription({ description }: { description: string }) {
  return (
    <p className="mt-2 text-sm text-slate-500 leading-snug" data-testid="report-tab-description">
      {description}
    </p>
  );
}
