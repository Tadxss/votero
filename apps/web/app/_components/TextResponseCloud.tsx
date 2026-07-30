"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";
import type { TextResponseGroup } from "@repo/types";
import { useModalA11y } from "./useModalA11y";

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
// across a room, so badges show a short preview and reveal the full text in a modal on click
// (a hover tooltip doesn't work on touch devices or for an audience watching a projected screen).
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
  // Fixed, compact badge size regardless of response frequency — these are meant to read as small
  // previews at a glance (even projected on Present Mode), not scale up into full sentences. The
  // "×N" count already communicates frequency, so font-size-by-frequency was redundant on top of it.
  const previewChars = large ? 20 : 16;
  const [expanded, setExpanded] = useState<TextResponseGroup | null>(null);
  const expandedRef = useRef<HTMLDivElement>(null);
  useModalA11y({
    open: expanded !== null,
    onClose: () => setExpanded(null),
    containerRef: expandedRef,
  });

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
        const colorVar = SERIES_VARS[index % SERIES_VARS.length];
        const bgVar = SERIES_BG_VARS[index % SERIES_BG_VARS.length];
        const isTruncated = r.text.length > previewChars;
        return (
          <button
            key={r.text}
            type="button"
            onClick={() => setExpanded(r)}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-semibold leading-none whitespace-nowrap transition-transform hover:scale-105 active:scale-95 ${large ? "text-sm" : "text-xs"}`}
            style={{ color: `var(${colorVar})`, backgroundColor: `var(${bgVar})` }}
            aria-label={
              isTruncated
                ? `Show full response: ${r.text}${r.count > 1 ? ` (${r.count} responses)` : ""}`
                : undefined
            }
          >
            {truncate(r.text, previewChars)}
            {r.count > 1 && (
              <span className="text-[0.85em] font-normal opacity-70">×{r.count}</span>
            )}
          </button>
        );
      })}

      {expanded && (
        // Click-outside-to-dismiss backdrop — Escape (handled by useModalA11y) is the keyboard
        // equivalent, so this div itself doesn't need its own key handler.
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setExpanded(null)}
        >
          {/* stopPropagation only guards against the backdrop's onClose above, not a real interaction */}
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events */}
          <div
            ref={expandedRef}
            role="dialog"
            aria-modal="true"
            aria-label="Response detail"
            tabIndex={-1}
            className="w-full max-w-sm animate-pop-in rounded-3xl border border-neutral-300 bg-[var(--surface)] p-6 shadow-xl dark:border-neutral-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-base text-[var(--foreground)]">{expanded.text}</p>
              <button
                type="button"
                onClick={() => setExpanded(null)}
                aria-label="Close"
                className="shrink-0 rounded-full p-1 text-[var(--foreground-muted)] transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X size={18} />
              </button>
            </div>
            {expanded.count > 1 && (
              <p className="mt-3 text-sm text-[var(--foreground-muted)]">
                {expanded.count} people gave this response
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
