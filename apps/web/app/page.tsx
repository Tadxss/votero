"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "./_components/Button";
import { inputClasses } from "./_components/styles";

export default function Home() {
  const router = useRouter();
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  function handleJoinSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = joinCode.trim();
    if (!code) return;
    router.push(`/vote/${code}`);
  }

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

      <Link
        href="/create"
        className="group flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition-all hover:bg-brand-600 hover:shadow-lg hover:shadow-brand-500/30 active:scale-95"
      >
        Create a lobby
        <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
          →
        </span>
      </Link>

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

      <div className="mt-1 flex flex-col items-center gap-3">
        {!showJoin ? (
          <button
            type="button"
            onClick={() => setShowJoin(true)}
            className="text-sm font-semibold text-brand-600 hover:underline"
          >
            Have a code? Join a lobby
          </button>
        ) : (
          <form
            onSubmit={handleJoinSubmit}
            className="flex animate-pop-in items-center gap-2"
          >
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 8))}
              placeholder="8-CHAR CODE"
              autoFocus
              className={`${inputClasses} w-40 text-center font-mono text-sm tracking-widest`}
            />
            <Button type="submit" disabled={joinCode.trim().length === 0}>
              Join →
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
