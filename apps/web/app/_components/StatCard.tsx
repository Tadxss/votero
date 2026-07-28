import type { LucideIcon } from "lucide-react";

export function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-4 rounded-3xl border border-neutral-300 bg-[var(--surface)] p-5 dark:border-neutral-800">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-900/30">
        <Icon size={20} strokeWidth={1.75} />
      </span>
      <div className="flex flex-col">
        <span className="text-2xl font-bold tabular-nums text-[var(--foreground)]">{value}</span>
        <span className="text-sm text-[var(--foreground-muted)]">{label}</span>
      </div>
    </div>
  );
}
