"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Footer() {
  const pathname = usePathname();

  // Present Mode is projected at a live event — footer chrome would just be distracting clutter
  // there, same reasoning Header already applies to itself on this route.
  if (pathname?.endsWith("/present")) return null;

  return (
    <footer className="relative z-10 flex items-center justify-center gap-4 px-4 py-6 text-xs text-[var(--foreground-muted)]">
      <span>© {new Date().getFullYear()} Votero</span>
      <Link href="/terms" className="transition-colors hover:text-brand-600">
        Terms
      </Link>
      <Link href="/privacy" className="transition-colors hover:text-brand-600">
        Privacy
      </Link>
    </footer>
  );
}
