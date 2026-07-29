"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { TermsContent, PrivacyContent, TERMS_UPDATED, PRIVACY_UPDATED } from "./legalContent";

export type LegalModalType = "terms" | "privacy" | null;

export function LegalModal({ type, onClose }: { type: LegalModalType; onClose: () => void }) {
  useEffect(() => {
    if (!type) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [type, onClose]);

  if (!type) return null;

  const title = type === "terms" ? "Terms of Service" : "Privacy Policy";
  const updated = type === "terms" ? TERMS_UPDATED : PRIVACY_UPDATED;
  const fullPageHref = type === "terms" ? "/terms" : "/privacy";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-2xl animate-pop-in flex-col rounded-3xl border border-neutral-300 bg-[var(--surface)] shadow-xl dark:border-neutral-800"
      >
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 p-6 dark:border-neutral-800">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-xl font-bold text-[var(--foreground)]">{title}</h2>
            <p className="text-xs text-[var(--foreground-muted)]">Last updated {updated}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full p-1.5 text-[var(--foreground-muted)] transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-6 overflow-y-auto p-6 text-sm leading-relaxed text-[var(--foreground-muted)]">
          {type === "terms" ? <TermsContent /> : <PrivacyContent />}
        </div>

        <div className="border-t border-neutral-200 p-3 text-center dark:border-neutral-800">
          <a
            href={fullPageHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-[var(--foreground-muted)] transition-colors hover:text-brand-600 hover:underline"
          >
            Open full page ↗
          </a>
        </div>
      </div>
    </div>
  );
}
