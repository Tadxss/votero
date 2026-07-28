"use client";

import Link from "next/link";
import { Layers, Users, Vote as VoteIcon } from "lucide-react";
import { useAuthUser, useMyLobbies } from "@repo/shared";
import type { Lobby, LobbyStatus } from "@repo/types";
import { Spinner } from "../_components/Spinner";
import { Button } from "../_components/Button";
import { StatusPill } from "../_components/StatusPill";
import { StatCard } from "../_components/StatCard";

const STATUSES: LobbyStatus[] = ["draft", "open", "closed"];
const TOP_LOBBIES_SHOWN = 5;

// Ranked horizontal bar chart of top lobbies by voter count: one metric compared across named
// items, not a set of recurring category series, so a single brand hue is correct here (no
// legend needed) rather than the fixed multi-hue categorical palette TallyBars/TextResponseCloud
// use for within-question option/response comparisons.
function TopLobbiesChart({ lobbies }: { lobbies: Lobby[] }) {
  const top = [...lobbies].sort((a, b) => b.joinedCount - a.joinedCount).slice(0, TOP_LOBBIES_SHOWN);
  const maxJoined = Math.max(1, ...top.map((l) => l.joinedCount));

  return (
    <div className="flex flex-col gap-3">
      {top.map((lobby) => (
        <Link
          key={lobby.id}
          href={`/lobby/${lobby.code}/stats`}
          className="group flex items-center gap-3 text-sm"
        >
          <span className="w-32 shrink-0 truncate font-medium text-[var(--foreground)] group-hover:text-brand-600 sm:w-48">
            {lobby.title}
          </span>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div
              className="h-full rounded-full bg-brand-500 transition-all"
              style={{ width: `${(lobby.joinedCount / maxJoined) * 100}%` }}
            />
          </div>
          <span className="w-6 shrink-0 text-right tabular-nums text-[var(--foreground-muted)]">
            {lobby.joinedCount}
          </span>
        </Link>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { user, isSignedIn, loading: authLoading } = useAuthUser();
  const { data: lobbies, isLoading } = useMyLobbies(isSignedIn ? user?.id : undefined);

  const totalLobbies = lobbies?.length ?? 0;
  const totalVoters = lobbies?.reduce((sum, l) => sum + l.joinedCount, 0) ?? 0;
  const totalVotes = lobbies?.reduce((sum, l) => sum + l.votesCount, 0) ?? 0;
  const countByStatus: Record<LobbyStatus, number> = { draft: 0, open: 0, closed: 0 };
  for (const lobby of lobbies ?? []) countByStatus[lobby.status]++;
  const hasVoters = (lobbies ?? []).some((l) => l.joinedCount > 0);

  return (
    <main className="relative min-h-[calc(100vh-4rem)] px-4 py-10">
      <div className="relative mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:px-8">
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-display text-3xl font-bold text-[var(--foreground)]">Dashboard</h1>
          <Link href="/create">
            <Button className="whitespace-nowrap">+ New lobby</Button>
          </Link>
        </div>

        {authLoading ? (
          <Spinner />
        ) : !isSignedIn ? (
          <div className="flex animate-pop-in flex-col items-start gap-3 rounded-3xl border border-neutral-300 bg-[var(--surface)] p-6 shadow-sm dark:border-neutral-800">
            <p className="text-sm text-[var(--foreground-muted)]">
              Sign in to see stats about the lobbies you&apos;ve created.
            </p>
            <Link href="/login">
              <Button>Sign in</Button>
            </Link>
          </div>
        ) : isLoading ? (
          <Spinner />
        ) : totalLobbies === 0 ? (
          <div className="flex animate-pop-in flex-col items-start gap-3 rounded-3xl border border-neutral-300 bg-[var(--surface)] p-6 shadow-sm dark:border-neutral-800">
            <p className="text-sm text-[var(--foreground-muted)]">
              No lobbies yet — create one to start seeing stats here.
            </p>
            <Link href="/create">
              <Button>Create a lobby</Button>
            </Link>
          </div>
        ) : (
          <div className="flex animate-pop-in flex-col gap-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard icon={Layers} label="Lobbies created" value={totalLobbies} />
              <StatCard icon={Users} label="Voters joined" value={totalVoters} />
              <StatCard icon={VoteIcon} label="Votes cast" value={totalVotes} />
            </div>

            <div className="rounded-3xl border border-neutral-300 bg-[var(--surface)] p-5 dark:border-neutral-800">
              <h2 className="mb-4 text-sm font-semibold text-[var(--foreground)]">
                Lobbies by status
              </h2>
              <div className="flex flex-wrap items-center gap-3">
                {STATUSES.map((status) => (
                  <div key={status} className="flex items-center gap-2">
                    <StatusPill status={status} />
                    <span className="text-sm tabular-nums text-[var(--foreground-muted)]">
                      {countByStatus[status]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-neutral-300 bg-[var(--surface)] p-5 dark:border-neutral-800">
              <h2 className="mb-4 text-sm font-semibold text-[var(--foreground)]">
                Voters by lobby
              </h2>
              {hasVoters ? (
                <TopLobbiesChart lobbies={lobbies ?? []} />
              ) : (
                <p className="text-sm text-[var(--foreground-muted)]">
                  No one has joined a lobby yet.
                </p>
              )}
            </div>

            <Link
              href="/lobbies"
              className="self-start text-sm font-semibold text-brand-600 hover:underline"
            >
              View all lobbies →
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
