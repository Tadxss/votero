"use client";

import { useEffect } from "react";

// Every page previously left the root layout's static "Votero" title in place, so a creator
// juggling several lobbies (manage in one tab, present in another, vote in a third) had no way
// to tell tabs apart at a glance. Pass the page-specific label; omit/empty falls back to plain
// "Votero" (used while a lobby's title is still loading).
export function useDocumentTitle(label: string | undefined) {
  useEffect(() => {
    const desired = label ? `${label} — Votero` : "Votero";
    document.title = desired;
    // Next's own App Router title reconciliation resets this back to the root layout's static
    // title on some pages (observed on ones with more than one sequential async loading phase,
    // e.g. auth state then a data fetch) — at a time we don't control and can't simply out-race
    // with effect ordering. A MutationObserver re-asserts our value immediately whenever anything
    // else changes it while this page stays mounted, instead.
    const titleEl = document.querySelector("title");
    if (!titleEl) return;
    const observer = new MutationObserver(() => {
      if (document.title !== desired) document.title = desired;
    });
    observer.observe(titleEl, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, [label]);
}
