"use client";

import type { TextResponseGroup } from "@repo/types";

// Reuses TallyBars' fixed series-color order (same --series-* vars/light-dark values) for visual
// consistency between choice-question bars and text-question chips in the same survey.
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

export function TextResponseCloud({
  responses,
  size = "md",
}: {
  responses: TextResponseGroup[];
  size?: "md" | "lg";
}) {
  const large = size === "lg";
  const maxCount = Math.max(1, ...responses.map((r) => r.count));
  const minRem = large ? 1.1 : 0.875;
  const maxRem = large ? 2.75 : 1.75;

  if (responses.length === 0) {
    return (
      <p className="text-sm text-[var(--foreground-muted)]">No responses yet.</p>
    );
  }

  return (
    <div className={`viz-root flex flex-wrap items-baseline ${large ? "gap-x-6 gap-y-3" : "gap-x-4 gap-y-2"}`}>
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
      {responses.map((r, index) => {
        const scale = r.count / maxCount;
        const fontSize = `${minRem + scale * (maxRem - minRem)}rem`;
        return (
          <span
            key={r.text}
            className="font-semibold leading-none"
            style={{ fontSize, color: `var(${SERIES_VARS[index % SERIES_VARS.length]})` }}
            title={`${r.text} · ${r.count}`}
          >
            {r.text}
            {r.count > 1 && (
              <span className="ml-1 align-super text-xs font-normal text-[var(--foreground-muted)]">
                ×{r.count}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
