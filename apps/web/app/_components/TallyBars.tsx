"use client";

import { Trophy } from "lucide-react";
import type { LobbyOption, TallyEntry } from "@repo/types";

// Categorical palette + mark spec from the dataviz skill (references/palette.md,
// references/marks-and-anatomy.md): fixed hue order (never cycled/repainted by rank), thin bars
// with rounded data-ends, direct count labels, identity carried by the adjacent text label (not
// color alone) so no legend box is needed. Caps at 8 slots — this app's polls are small.
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

export function TallyBars({
  options,
  tally,
  closed = false,
  size = "md",
  showPercentage = false,
}: {
  options: LobbyOption[];
  tally: TallyEntry[];
  closed?: boolean;
  size?: "md" | "lg";
  // Opt-in — the plain count-only label is unchanged everywhere this already renders (manage
  // page, vote page, Present Mode's non-chart-toggle fallback); only the detailed stats page and
  // Present Mode's chart-toggle view ask for percentages alongside the raw count.
  showPercentage?: boolean;
}) {
  const countByOption = new Map(tally.map((t) => [t.optionId, t.count]));
  const totalCount = tally.reduce((sum, t) => sum + t.count, 0);
  const maxCount = Math.max(1, ...tally.map((t) => t.count));
  const winners = tally.filter((t) => t.count > 0 && t.count === maxCount);
  // Only crown a winner once voting has actually closed, and only when it's not a tie.
  const winnerOptionId = closed && winners.length === 1 ? winners[0]?.optionId : null;
  const large = size === "lg";

  return (
    <div className={`viz-root flex flex-col ${large ? "gap-5" : "gap-3"}`}>
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
      {options.map((option, index) => {
        const count = countByOption.get(option.id) ?? 0;
        const widthPct = (count / maxCount) * 100;
        return (
          <div
            key={option.id}
            className={`flex items-center text-[var(--foreground)] ${large ? "gap-4 text-xl" : "gap-3 text-sm"}`}
          >
            <span
              className={`flex shrink-0 items-center gap-1.5 ${large ? "w-48" : "w-32"}`}
              title={option.label}
            >
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              {option.id === winnerOptionId && (
                <Trophy
                  size={large ? 18 : 14}
                  className="shrink-0 text-accent-500"
                  aria-label="Winner"
                />
              )}
            </span>
            <div
              className={`flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800 ${large ? "h-6" : "h-3"}`}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: `var(${SERIES_VARS[index % SERIES_VARS.length]})`,
                }}
              />
            </div>
            {showPercentage ? (
              <span
                className={`flex shrink-0 flex-col items-end leading-tight ${large ? "w-16" : "w-12"}`}
              >
                <span className="tabular-nums text-[var(--foreground)]">{count}</span>
                <span className="text-xs tabular-nums text-[var(--foreground-muted)]">
                  {totalCount > 0 ? Math.round((count / totalCount) * 100) : 0}%
                </span>
              </span>
            ) : (
              <span
                className={`shrink-0 text-right tabular-nums text-[var(--foreground-muted)] ${large ? "w-12" : "w-6"}`}
              >
                {count}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
