"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuthUser, useProfile, useSignOut } from "@repo/shared";
import { Avatar } from "./Avatar";
import { ProfileModal } from "./ProfileModal";

const navLinkClasses =
  "rounded-full border border-neutral-200 px-3 py-1 font-medium text-[var(--foreground-muted)] transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-neutral-700";

export function Header() {
  const { user, isSignedIn, loading } = useAuthUser();
  const { data: profile } = useProfile(isSignedIn ? user?.id : undefined);
  const signOut = useSignOut();
  const [isProfileModalOpen, setProfileModalOpen] = useState(false);

  return (
    <header className="relative z-10 flex h-16 shrink-0 items-center justify-between px-4 sm:px-6">
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
            <span className="hidden items-center gap-1.5 sm:flex">
              <Avatar url={profile?.avatarUrl} label={profile?.username || user?.email || "?"} size="sm" />
              <span className="max-w-[160px] truncate text-[var(--foreground-muted)] md:max-w-[240px] lg:max-w-[360px]">
                {profile?.username ? `@${profile.username}` : user?.email}
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
          </>
        ) : (
          <Link href="/login" className={navLinkClasses}>
            Sign in
          </Link>
        )}
      </nav>
      <ProfileModal open={isProfileModalOpen} onClose={() => setProfileModalOpen(false)} />
    </header>
  );
}
