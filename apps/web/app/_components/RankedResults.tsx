import { Trophy } from "lucide-react";
import type { LobbyOption, IrvRound } from "@repo/types";

// Same fixed series-color order as TallyBars, keyed by each option's position in the *original*
// options list (not its position within a given round) — so an option keeps the same color across
// rounds even as others get eliminated around it.
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

export function RankedResults({
  options,
  rounds,
  winner,
  closed = false,
  size = "md",
}: {
  options: LobbyOption[];
  rounds: IrvRound[];
  winner: string | null;
  closed?: boolean;
  size?: "md" | "lg";
}) {
  const large = size === "lg";
  const colorIndexByOption = new Map(options.map((o, i) => [o.id, i % SERIES_VARS.length]));
  const labelByOption = new Map(options.map((o) => [o.id, o.label]));

  if (rounds.length === 0) {
    return <p className="text-sm text-[var(--foreground-muted)]">No ranked votes yet.</p>;
  }

  return (
    <div className={`viz-root flex flex-col ${large ? "gap-6" : "gap-4"}`}>
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
      {rounds.map((round) => {
        const entries = Object.entries(round.counts);
        const total = entries.reduce((sum, [, count]) => sum + count, 0);
        const maxCount = Math.max(1, ...entries.map(([, count]) => count));
        const isFinalRound = round.round === rounds.length;
        return (
          <div key={round.round} className="flex flex-col gap-2">
            <p className="text-xs font-semibold tracking-wide text-[var(--foreground-muted)] uppercase">
              Round {round.round}
              {rounds.length > 1 && !isFinalRound && " — elimination"}
              {isFinalRound && rounds.length > 1 && " — result"}
            </p>
            <div className={`flex flex-col ${large ? "gap-3" : "gap-2"}`}>
              {entries
                .sort(([, a], [, b]) => b - a)
                .map(([optionId, count]) => {
                  const widthPct = (count / maxCount) * 100;
                  const colorIndex = colorIndexByOption.get(optionId) ?? 0;
                  const isWinner = closed && isFinalRound && optionId === winner;
                  return (
                    <div
                      key={optionId}
                      className={`flex items-center text-[var(--foreground)] ${large ? "gap-4 text-lg" : "gap-3 text-sm"}`}
                    >
                      <span
                        className={`flex shrink-0 items-center gap-1.5 ${large ? "w-48" : "w-32"}`}
                        title={labelByOption.get(optionId) ?? "Unknown option"}
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {labelByOption.get(optionId) ?? "Unknown option"}
                        </span>
                        {isWinner && (
                          <Trophy
                            size={large ? 18 : 14}
                            className="shrink-0 text-accent-500"
                            aria-label="Winner"
                          />
                        )}
                      </span>
                      <div
                        className={`flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800 ${large ? "h-5" : "h-2.5"}`}
                      >
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${widthPct}%`,
                            backgroundColor: `var(${SERIES_VARS[colorIndex]})`,
                          }}
                        />
                      </div>
                      <span
                        className={`shrink-0 text-right tabular-nums text-[var(--foreground-muted)] ${large ? "w-16" : "w-10"}`}
                      >
                        {count}
                        {total > 0 && (
                          <span className="ml-1 text-xs">
                            ({Math.round((count / total) * 100)}%)
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
