"use client";

import { BarChart3, PieChart } from "lucide-react";

export type ChartView = "bar" | "donut";

// Same segmented-control look as the table/grid toggle on /lobbies.
export function ChartViewToggle({
  value,
  onChange,
}: {
  value: ChartView;
  onChange: (view: ChartView) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-neutral-300 p-1 dark:border-neutral-700">
      <button
        type="button"
        onClick={() => onChange("bar")}
        aria-label="Bar chart"
        aria-pressed={value === "bar"}
        className={`rounded-full p-1.5 transition-colors ${
          value === "bar"
            ? "bg-brand-700 text-white"
            : "text-[var(--foreground-muted)] hover:text-brand-600 dark:hover:text-brand-300"
        }`}
      >
        <BarChart3 size={16} />
      </button>
      <button
        type="button"
        onClick={() => onChange("donut")}
        aria-label="Donut chart"
        aria-pressed={value === "donut"}
        className={`rounded-full p-1.5 transition-colors ${
          value === "donut"
            ? "bg-brand-700 text-white"
            : "text-[var(--foreground-muted)] hover:text-brand-600 dark:hover:text-brand-300"
        }`}
      >
        <PieChart size={16} />
      </button>
    </div>
  );
}
