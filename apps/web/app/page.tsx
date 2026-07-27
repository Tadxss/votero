"use client";

import { useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { Vote, Lock, Zap, QrCode } from "lucide-react";
import { Button } from "./_components/Button";
import { JoinLobbyModal } from "./_components/JoinLobbyModal";
import { TallyBars } from "./_components/TallyBars";

// A believable glimpse of the real manage-page tally, not stock/decorative art — see the design
// audit (home hero was the last "everything perfectly centered" AI-slop tell in the app).
const DEMO_OPTIONS = [
  { id: "a", lobbyId: "demo", questionId: "q1", label: "Pepperoni", position: 0 },
  { id: "b", lobbyId: "demo", questionId: "q1", label: "Veggie", position: 1 },
];
const DEMO_TALLY = [
  { optionId: "a", count: 8 },
  { optionId: "b", count: 3 },
];

export default function Home() {
  const [joinModalOpen, setJoinModalOpen] = useState(false);

  return (
    <main className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col items-center gap-14 px-4 py-10 lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-10 lg:py-16">
      <div className="flex max-w-md animate-pop-in flex-col items-center gap-5 lg:items-start">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-600">
          <Vote size={14} /> QR-code group voting
        </span>

        <h1 className="text-center font-display text-5xl font-extrabold tracking-tight text-[var(--foreground)] lg:text-left">
          Votero
        </h1>

        <p className="text-center text-[var(--foreground-muted)] lg:text-left">
          Create a lobby, share a QR code, watch the votes roll in live.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/create"
            className="group flex items-center justify-center gap-2 rounded-full bg-brand-500 px-8 py-4 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition-all hover:bg-brand-600 hover:shadow-lg hover:shadow-brand-500/30 active:scale-95"
          >
            Create a lobby
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </Link>

          <Button variant="secondary" className="px-8 py-4" onClick={() => setJoinModalOpen(true)}>
            Join a lobby
          </Button>
        </div>

        <p className="text-xs text-[var(--foreground-muted)]">Free · No sign-up required</p>

        <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs text-[var(--foreground-muted)] lg:justify-start">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1 dark:border-neutral-700">
            <Lock size={14} /> Anonymous option
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1 dark:border-neutral-700">
            <Zap size={14} /> Live results
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1 dark:border-neutral-700">
            <QrCode size={14} /> Scan & vote
          </span>
        </div>
      </div>

      {/* Desktop-only glimpse of a real lobby card, tilted so the two columns don't mirror each
          other — the text block stays left-aligned, this stays put as its visual counterweight. */}
      <div className="hidden lg:flex lg:justify-center">
        <div className="w-72 -rotate-2 rounded-3xl border border-neutral-300 bg-[var(--surface)] p-5 shadow-xl transition-transform hover:rotate-0 dark:border-neutral-800">
          <p className="mb-3 text-sm font-semibold text-[var(--foreground)]">Team pizza night?</p>
          <div className="mb-4 flex justify-center rounded-2xl bg-white p-3">
            <QRCodeSVG value="https://votero.app/vote/DEMOABCD" size={104} />
          </div>
          <TallyBars options={DEMO_OPTIONS} tally={DEMO_TALLY} />
          <p className="mt-4 text-xs text-[var(--foreground-muted)]">42 joined · live</p>
        </div>
      </div>

      <JoinLobbyModal open={joinModalOpen} onClose={() => setJoinModalOpen(false)} />
    </main>
  );
}
