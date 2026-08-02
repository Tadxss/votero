"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useAuthUser, useProfile, useSignOut } from "@repo/shared";
import { Avatar } from "./Avatar";
import { Logo } from "./Logo";
import { ProfileModal } from "./ProfileModal";
import { ThemeToggle } from "./ThemeToggle";

const navLinkClasses =
  "rounded-full border border-neutral-300 px-3 py-1 font-medium text-[var(--foreground-muted)] transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-neutral-700";

export function Header() {
  const pathname = usePathname();
  const { user, isSignedIn, loading } = useAuthUser();
  const { data: profile } = useProfile(isSignedIn ? user?.id : undefined);
  const signOut = useSignOut();
  const [isProfileModalOpen, setProfileModalOpen] = useState(false);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Present Mode is meant to be projected on a screen at an event — the site nav would just be
  // distracting clutter there, so it renders with none at all.
  if (pathname?.endsWith("/present")) return null;

  const identityLabel = profile?.username ? `@${profile.username}` : user?.email || "";

  return (
    <header className="relative z-10 flex h-16 shrink-0 items-center justify-between px-4 sm:px-6">
      <Link
        href="/"
        className="flex items-center gap-2 font-display text-lg font-bold text-[var(--foreground)]"
      >
        <Logo className="h-7 w-7" />
        Votero
      </Link>
      <nav className="flex items-center gap-3 text-sm">
        {loading ? null : isSignedIn ? (
          <>
            {/* Full nav on sm and up — on mobile this many items wrapped onto multiple cramped
                lines, so it collapses into a single dropdown trigger below instead. */}
            <div className="hidden items-center gap-3 sm:flex">
              <Link
                href="/dashboard"
                className="font-medium text-[var(--foreground-muted)] transition-colors hover:text-brand-600"
              >
                Dashboard
              </Link>
              <Link
                href="/lobbies"
                className="font-medium text-[var(--foreground-muted)] transition-colors hover:text-brand-600"
              >
                My Lobbies
              </Link>
              <span className="flex items-center gap-1.5">
                <Avatar url={profile?.avatarUrl} label={profile?.username || user?.email || "?"} size="sm" />
                <span className="max-w-[160px] truncate text-[var(--foreground-muted)] md:max-w-[240px] lg:max-w-[360px]">
                  {identityLabel}
                </span>
              </span>
              <button
                onClick={() => setProfileModalOpen(true)}
                className="font-medium text-[var(--foreground-muted)] transition-colors hover:text-brand-600"
              >
                Edit profile
              </button>
              <button onClick={() => signOut.mutate()} className={navLinkClasses}>
                Sign out
              </button>
            </div>

            <div className="relative sm:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen((v) => !v)}
                aria-label="Open menu"
                aria-expanded={isMobileMenuOpen}
                className="flex items-center gap-1.5 rounded-full border border-neutral-300 p-1.5 text-[var(--foreground-muted)] dark:border-neutral-700"
              >
                <Avatar url={profile?.avatarUrl} label={profile?.username || user?.email || "?"} size="sm" />
                <Menu size={16} />
              </button>

              {isMobileMenuOpen && (
                <>
                  {/* Click-outside-to-dismiss backdrop for the mobile menu — the menu button's
                      own aria-expanded plus the visible menu items are how keyboard users close
                      it (click it again, or the toggle re-renders it away); this backdrop is a
                      convenience target, not a distinct interactive control. */}
                  {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setMobileMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full z-50 mt-2 flex w-56 animate-pop-in flex-col gap-1 rounded-2xl border border-neutral-300 bg-[var(--surface)] p-2 shadow-lg dark:border-neutral-800">
                    <span className="truncate px-3 py-2 text-xs font-medium text-[var(--foreground-muted)]">
                      {identityLabel}
                    </span>
                    <Link
                      href="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="rounded-xl px-3 py-2 text-left font-medium text-[var(--foreground)] transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/lobbies"
                      onClick={() => setMobileMenuOpen(false)}
                      className="rounded-xl px-3 py-2 text-left font-medium text-[var(--foreground)] transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      My Lobbies
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileModalOpen(true);
                        setMobileMenuOpen(false);
                      }}
                      className="rounded-xl px-3 py-2 text-left font-medium text-[var(--foreground)] transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      Edit profile
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        signOut.mutate();
                        setMobileMenuOpen(false);
                      }}
                      className="rounded-xl px-3 py-2 text-left font-medium text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <Link href="/login" className={navLinkClasses}>
            Sign in
          </Link>
        )}
        <ThemeToggle />
      </nav>
      <ProfileModal open={isProfileModalOpen} onClose={() => setProfileModalOpen(false)} />
    </header>
  );
}
