"use client";

import Link from "next/link";
import { useAuthUser, useSignOut } from "@repo/shared";

const navLinkClasses =
  "rounded-full border border-neutral-200 px-3 py-1 font-medium text-[var(--foreground-muted)] transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-neutral-700";

export function Header() {
  const { user, isSignedIn, loading } = useAuthUser();
  const signOut = useSignOut();

  return (
    <header className="relative z-10 flex items-center justify-between px-4 py-3 sm:px-6">
      <Link href="/" className="font-display text-lg font-bold text-[var(--foreground)]">
        Votero
      </Link>
      <nav className="flex items-center gap-3 text-sm">
        {loading ? null : isSignedIn ? (
          <>
            <Link
              href="/lobbies"
              className="font-medium text-[var(--foreground-muted)] transition-colors hover:text-brand-600"
            >
              My Lobbies
            </Link>
            <span className="hidden max-w-[140px] truncate text-[var(--foreground-muted)] sm:inline">
              {user?.email}
            </span>
            <button onClick={() => signOut.mutate()} className={navLinkClasses}>
              Sign out
            </button>
          </>
        ) : (
          <Link href="/login" className={navLinkClasses}>
            Sign in
          </Link>
        )}
      </nav>
    </header>
  );
}
