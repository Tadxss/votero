"use client";

import type { LobbyOption, TallyEntry } from "@repo/types";

// Same fixed hue order/values as TallyBars/TextResponseCloud (each component keeps its own copy
// of this small block rather than sharing an import — established pattern in this codebase).
const SERIES_VARS = [
  "--series-1",
  "--series-2",
  "--series-3",
  "--series-4",
  "--series-5",
  "--series-6",
  "--series-7",
  "--series-8",
] as const;

export function DonutChart({
  options,
  tally,
  closed = false,
  size = "md",
}: {
  options: LobbyOption[];
  tally: TallyEntry[];
  closed?: boolean;
  size?: "md" | "lg";
}) {
  const large = size === "lg";
  const countByOption = new Map(tally.map((t) => [t.optionId, t.count]));
  const total = tally.reduce((sum, t) => sum + t.count, 0);
  const maxCount = Math.max(1, ...tally.map((t) => t.count));
  const winners = tally.filter((t) => t.count > 0 && t.count === maxCount);
  // Same convention as TallyBars: only crown a winner once closed, and only when it's not a tie.
  const winnerOption =
    closed && winners.length === 1
      ? (options.find((o) => o.id === winners[0]?.optionId) ?? null)
      : null;

  const diameter = large ? 220 : 168;
  const strokeWidth = large ? 30 : 22;
  const radius = (diameter - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulative = 0;
  const segments = options.map((option, index) => {
    const count = countByOption.get(option.id) ?? 0;
    const pct = total > 0 ? count / total : 0;
    const length = pct * circumference;
    const segment = {
      option,
      count,
      pct,
      length,
      offset: cumulative,
      colorVar: SERIES_VARS[index % SERIES_VARS.length],
    };
    cumulative += length;
    return segment;
  });

  return (
    <div className="viz-root flex flex-wrap items-center justify-center gap-6">
      <style>{`
        .viz-root {
          --series-1: #2a78d6; --series-2: #eb6834; --series-3: #1baf7a; --series-4: #eda100;
          --series-5: #e87ba4; --series-6: #008300; --series-7: #4a3aa7; --series-8: #e34948;
        }
        @media (prefers-color-scheme: dark) {
          :root:where(:not([data-theme="light"])) .viz-root {
            --series-1: #3987e5; --series-2: #d95926; --series-3: #199e70; --series-4: #c98500;
            --series-5: #d55181; --series-6: #008300; --series-7: #9085e9; --series-8: #e66767;
          }
        }
        :root[data-theme="dark"] .viz-root {
          --series-1: #3987e5; --series-2: #d95926; --series-3: #199e70; --series-4: #c98500;
          --series-5: #d55181; --series-6: #008300; --series-7: #9085e9; --series-8: #e66767;
        }
      `}</style>

      <div className="relative shrink-0" style={{ width: diameter, height: diameter }}>
        <svg width={diameter} height={diameter} className="-rotate-90">
          {total === 0 ? (
            <circle
              cx={diameter / 2}
              cy={diameter / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-neutral-100 dark:text-neutral-800"
            />
          ) : (
            segments.map(
              (seg) =>
                seg.length > 0 && (
                  <circle
                    key={seg.option.id}
                    cx={diameter / 2}
                    cy={diameter / 2}
                    r={radius}
                    fill="none"
                    stroke={`var(${seg.colorVar})`}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${seg.length} ${circumference - seg.length}`}
                    strokeDashoffset={-seg.offset}
                  />
                ),
            )
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center">
          {total === 0 ? (
            <span className="text-sm text-[var(--foreground-muted)]">No votes yet</span>
          ) : winnerOption ? (
            <>
              <span
                className={`w-full truncate font-bold text-[var(--foreground)] ${large ? "text-lg" : "text-sm"}`}
              >
                {winnerOption.label}
              </span>
              <span className="text-xs text-[var(--foreground-muted)]">
                {Math.round(((countByOption.get(winnerOption.id) ?? 0) / total) * 100)}%
              </span>
            </>
          ) : (
            <>
              <span
                className={`font-bold tabular-nums text-[var(--foreground)] ${large ? "text-2xl" : "text-lg"}`}
              >
                {total}
              </span>
              <span className="text-xs text-[var(--foreground-muted)]">votes</span>
            </>
          )}
        </div>
      </div>

      <div className={`flex flex-col gap-2 ${large ? "text-base" : "text-sm"}`}>
        {segments.map((seg) => (
          <div key={seg.option.id} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: `var(${seg.colorVar})` }}
              aria-hidden
            />
            <span className="min-w-0 max-w-[12rem] flex-1 truncate text-[var(--foreground)]">
              {seg.option.label}
            </span>
            <span className="shrink-0 tabular-nums text-[var(--foreground-muted)]">
              {seg.count} · {total > 0 ? Math.round(seg.pct * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
