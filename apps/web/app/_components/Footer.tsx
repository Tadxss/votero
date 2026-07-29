"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { LegalModal, type LegalModalType } from "./LegalModal";

export function Footer() {
  const pathname = usePathname();
  const [openLegal, setOpenLegal] = useState<LegalModalType>(null);

  // Present Mode is projected at a live event — footer chrome would just be distracting clutter
  // there, same reasoning Header already applies to itself on this route.
  if (pathname?.endsWith("/present")) return null;

  return (
    <>
      <footer className="relative z-10 flex items-center justify-center gap-4 px-4 py-6 text-xs text-[var(--foreground-muted)]">
        <span>© {new Date().getFullYear()} Votero</span>
        <button
          type="button"
          onClick={() => setOpenLegal("terms")}
          className="transition-colors hover:text-brand-600"
        >
          Terms
        </button>
        <button
          type="button"
          onClick={() => setOpenLegal("privacy")}
          className="transition-colors hover:text-brand-600"
        >
          Privacy
        </button>
      </footer>
      <LegalModal type={openLegal} onClose={() => setOpenLegal(null)} />
    </>
  );
}
