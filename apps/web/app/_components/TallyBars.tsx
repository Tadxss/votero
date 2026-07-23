"use client";

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
}: {
  options: LobbyOption[];
  tally: TallyEntry[];
  closed?: boolean;
}) {
  const countByOption = new Map(tally.map((t) => [t.optionId, t.count]));
  const maxCount = Math.max(1, ...tally.map((t) => t.count));
  const winners = tally.filter((t) => t.count > 0 && t.count === maxCount);
  // Only crown a winner once voting has actually closed, and only when it's not a tie.
  const winnerOptionId = closed && winners.length === 1 ? winners[0]?.optionId : null;

  return (
    <div className="viz-root flex flex-col gap-3">
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
          <div key={option.id} className="flex items-center gap-3 text-sm">
            <span
              className="flex w-32 shrink-0 items-center gap-1 text-[var(--foreground)]"
              title={option.label}
            >
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              {option.id === winnerOptionId && <span aria-label="Winner">🏆</span>}
            </span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: `var(${SERIES_VARS[index % SERIES_VARS.length]})`,
                }}
              />
            </div>
            <span className="w-6 shrink-0 text-right tabular-nums text-[var(--foreground-muted)]">
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}
