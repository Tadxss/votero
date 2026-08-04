"use client";

import { useState } from "react";
import { Button } from "./Button";

// Same navigator.clipboard.writeText + "Copied!" pattern as ApiKeysModal.tsx's key-reveal
// panel — one copy mechanism in the app, not two.
export function ApiDocsCodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative rounded-2xl border border-neutral-300 bg-[var(--input-bg)] dark:border-neutral-800">
      {/* tabIndex so keyboard users can actually scroll this horizontally when it overflows —
          axe's scrollable-region-focusable rule (a scrollable element with no focusable way to
          scroll it isn't reachable without a mouse/trackpad). jsx-a11y flags tabIndex on a <pre>
          as "non-interactive," but that's exactly the point here — it's the standard fix. */}
      <pre
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        className="overflow-x-auto p-4 pr-20 text-xs leading-relaxed text-[var(--foreground)]"
      >
        <code>{code}</code>
      </pre>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={handleCopy}
        className="absolute right-2 top-2"
      >
        {copied ? "Copied!" : "Copy"}
      </Button>
    </div>
  );
}
