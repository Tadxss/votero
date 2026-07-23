"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "./_components/Button";
import { JoinLobbyModal } from "./_components/JoinLobbyModal";

export default function Home() {
  const [joinModalOpen, setJoinModalOpen] = useState(false);

  return (
    <main className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-5 overflow-hidden px-4 py-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-brand-300/40 blur-3xl dark:bg-brand-700/30"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-accent-400/40 blur-3xl dark:bg-accent-600/20"
      />

      <span className="flex h-20 w-20 animate-float items-center justify-center rounded-3xl bg-white text-5xl shadow-lg shadow-brand-500/10 ring-1 ring-black/5 dark:bg-white/10 dark:ring-white/10">
        🗳️
      </span>

      <div className="flex flex-col items-center gap-3 animate-pop-in">
        <h1 className="font-display text-5xl font-extrabold tracking-tight text-[var(--foreground)]">
          Votero
        </h1>
        <p className="max-w-xs text-center text-[var(--foreground-muted)]">
          Create a lobby, share a QR code, watch the votes roll in live.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/create"
          className="group flex items-center justify-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition-all hover:bg-brand-600 hover:shadow-lg hover:shadow-brand-500/30 active:scale-95"
        >
          Create a lobby
          <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </Link>

        <Button variant="secondary" className="px-6 py-3" onClick={() => setJoinModalOpen(true)}>
          Join a lobby
        </Button>
      </div>

      <p className="text-xs text-[var(--foreground-muted)]">
        Free · No sign-up required
      </p>

      <div className="hidden items-center gap-2 pt-2 text-xs text-[var(--foreground-muted)] sm:flex">
        <span className="rounded-full border border-neutral-200 px-3 py-1 dark:border-neutral-700">
          🔒 Anonymous option
        </span>
        <span className="rounded-full border border-neutral-200 px-3 py-1 dark:border-neutral-700">
          ⚡ Live results
        </span>
        <span className="rounded-full border border-neutral-200 px-3 py-1 dark:border-neutral-700">
          📱 Scan & vote
        </span>
      </div>

      <JoinLobbyModal open={joinModalOpen} onClose={() => setJoinModalOpen(false)} />
    </main>
  );
}
