import type { LobbyStatus } from "@repo/types";

const STYLES: Record<LobbyStatus, string> = {
  draft:
    "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
  open: "bg-accent-400/20 text-accent-600 dark:text-accent-400",
  closed: "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300",
};

const LABELS: Record<LobbyStatus, string> = {
  draft: "Draft",
  open: "Open",
  closed: "Closed",
};

export function StatusPill({ status }: { status: LobbyStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${STYLES[status]}`}
    >
      {status === "open" && (
        <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-accent-500" />
      )}
      {LABELS[status]}
    </span>
  );
}
