"use client";

import type { TextResponseGroup } from "@repo/types";

// Reuses TallyBars' fixed series-color order (same --series-* vars/light-dark values) for visual
// consistency between choice-question bars and text-question chips in the same survey. The `-bg`
// variants are the same hues at low alpha, for the badge background — kept as separate hardcoded
// swatches (not computed via color-mix) to match this file's existing light/dark convention.
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

const SERIES_BG_VARS = SERIES_VARS.map((v) => `${v}-bg`) as readonly string[];

// A response can be up to 300 characters (see rpc_submit_text_response) — full sentences don't
// read as a "collective thoughts" cloud at a glance, especially projected on Present Mode from
// across a room, so badges show a short preview with the full text only on hover.
function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars - 1).trimEnd()}…`;
}

export function TextResponseCloud({
  responses,
  size = "md",
}: {
  responses: TextResponseGroup[];
  size?: "md" | "lg";
}) {
  const large = size === "lg";
  const maxCount = Math.max(1, ...responses.map((r) => r.count));
  const minRem = large ? 1 : 0.875;
  const maxRem = large ? 2.25 : 1.5;
  const previewChars = large ? 24 : 36;

  if (responses.length === 0) {
    return <p className="text-sm text-[var(--foreground-muted)]">No responses yet.</p>;
  }

  return (
    <div className={`viz-root flex flex-wrap items-center ${large ? "gap-3" : "gap-2"}`}>
      <style>{`
        .viz-root {
          --series-1: #2a78d6; --series-2: #eb6834; --series-3: #1baf7a; --series-4: #eda100;
          --series-5: #e87ba4; --series-6: #008300; --series-7: #4a3aa7; --series-8: #e34948;
          --series-1-bg: rgba(42, 120, 214, 0.14); --series-2-bg: rgba(235, 104, 52, 0.14);
          --series-3-bg: rgba(27, 175, 122, 0.14); --series-4-bg: rgba(237, 161, 0, 0.14);
          --series-5-bg: rgba(232, 123, 164, 0.14); --series-6-bg: rgba(0, 131, 0, 0.14);
          --series-7-bg: rgba(74, 58, 167, 0.14); --series-8-bg: rgba(227, 73, 72, 0.14);
        }
        @media (prefers-color-scheme: dark) {
          :root:where(:not([data-theme="light"])) .viz-root {
            --series-1: #3987e5; --series-2: #d95926; --series-3: #199e70; --series-4: #c98500;
            --series-5: #d55181; --series-6: #008300; --series-7: #9085e9; --series-8: #e66767;
            --series-1-bg: rgba(57, 135, 229, 0.2); --series-2-bg: rgba(217, 89, 38, 0.2);
            --series-3-bg: rgba(25, 158, 112, 0.2); --series-4-bg: rgba(201, 133, 0, 0.2);
            --series-5-bg: rgba(213, 81, 129, 0.2); --series-6-bg: rgba(0, 131, 0, 0.2);
            --series-7-bg: rgba(144, 133, 233, 0.2); --series-8-bg: rgba(230, 103, 103, 0.2);
          }
        }
        :root[data-theme="dark"] .viz-root {
          --series-1: #3987e5; --series-2: #d95926; --series-3: #199e70; --series-4: #c98500;
          --series-5: #d55181; --series-6: #008300; --series-7: #9085e9; --series-8: #e66767;
          --series-1-bg: rgba(57, 135, 229, 0.2); --series-2-bg: rgba(217, 89, 38, 0.2);
          --series-3-bg: rgba(25, 158, 112, 0.2); --series-4-bg: rgba(201, 133, 0, 0.2);
          --series-5-bg: rgba(213, 81, 129, 0.2); --series-6-bg: rgba(0, 131, 0, 0.2);
          --series-7-bg: rgba(144, 133, 233, 0.2); --series-8-bg: rgba(230, 103, 103, 0.2);
        }
      `}</style>
      {responses.map((r, index) => {
        const scale = r.count / maxCount;
        const fontSize = `${minRem + scale * (maxRem - minRem)}rem`;
        const colorVar = SERIES_VARS[index % SERIES_VARS.length];
        const bgVar = SERIES_BG_VARS[index % SERIES_BG_VARS.length];
        return (
          <span
            key={r.text}
            className="inline-flex items-center gap-1 rounded-full px-[0.7em] py-[0.35em] font-semibold leading-none whitespace-nowrap"
            style={{ fontSize, color: `var(${colorVar})`, backgroundColor: `var(${bgVar})` }}
            title={r.count > 1 ? `${r.text} · ${r.count} responses` : r.text}
          >
            {truncate(r.text, previewChars)}
            {r.count > 1 && (
              <span className="text-[0.7em] font-normal opacity-70">×{r.count}</span>
            )}
          </span>
        );
      })}
    </div>
  );
}
