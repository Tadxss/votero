import Link from "next/link";
import type { ReactNode } from "react";

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <main className="relative flex-1 px-4 py-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-3xl font-bold text-[var(--foreground)]">{title}</h1>
          <p className="text-sm text-[var(--foreground-muted)]">Last updated {updated}</p>
        </div>

        <div className="flex animate-pop-in flex-col gap-6 rounded-3xl border border-neutral-300 bg-[var(--surface)] p-6 shadow-sm dark:border-neutral-800 sm:p-8">
          {children}
        </div>

        <Link
          href="/"
          className="text-sm font-medium text-[var(--foreground-muted)] transition-colors hover:text-brand-600"
        >
          ← Back home
        </Link>
      </div>
    </main>
  );
}

export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="font-display text-lg font-bold text-[var(--foreground)]">{heading}</h2>
      <div className="flex flex-col gap-2.5 text-sm leading-relaxed text-[var(--foreground-muted)]">
        {children}
      </div>
    </section>
  );
}
