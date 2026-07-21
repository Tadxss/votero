"use client";

import Link from "next/link";
import { useAuthUser, useMyLobbies } from "@repo/shared";
import { StatusPill } from "../_components/StatusPill";
import { Spinner } from "../_components/Spinner";
import { Button } from "../_components/Button";

export default function MyLobbiesPage() {
  const { user, isSignedIn, loading: authLoading } = useAuthUser();
  const { data: lobbies, isLoading } = useMyLobbies(isSignedIn ? user?.id : undefined);

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-24 h-72 w-72 rounded-full bg-accent-400/30 blur-3xl dark:bg-accent-600/15"
      />

      <div className="relative mx-auto flex max-w-md flex-col gap-6">
        <h1 className="font-display text-3xl font-bold text-[var(--foreground)]">My Lobbies</h1>

        {authLoading ? (
          <Spinner />
        ) : !isSignedIn ? (
          <div className="flex animate-pop-in flex-col items-start gap-3 rounded-3xl border border-neutral-200 bg-[var(--surface)] p-6 shadow-sm dark:border-neutral-800">
            <p className="text-sm text-[var(--foreground-muted)]">
              Sign in to see the lobbies you&apos;ve created — from any device.
            </p>
            <Link href="/login">
              <Button>Sign in</Button>
            </Link>
          </div>
        ) : isLoading ? (
          <Spinner />
        ) : lobbies && lobbies.length > 0 ? (
          <ul className="flex animate-pop-in flex-col gap-3">
            {lobbies.map((lobby) => (
              <li key={lobby.id}>
                <Link
                  href={`/lobby/${lobby.code}/manage`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-[var(--surface)] p-4 transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-[var(--foreground)]">{lobby.title}</span>
                    <span className="text-xs text-[var(--foreground-muted)]">
                      {new Date(lobby.createdAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                  <StatusPill status={lobby.status} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex animate-pop-in flex-col items-start gap-3 rounded-3xl border border-neutral-200 bg-[var(--surface)] p-6 shadow-sm dark:border-neutral-800">
            <p className="text-sm text-[var(--foreground-muted)]">
              No lobbies yet — anything you create while signed in will show up here.
            </p>
            <Link href="/create">
              <Button>Create a lobby</Button>
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
