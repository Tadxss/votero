"use client";

import Link from "next/link";
import { useAuthUser, useMyLobbies } from "@repo/shared";
import { StatusPill } from "../_components/StatusPill";
import { Spinner } from "../_components/Spinner";
import { Button } from "../_components/Button";

const LOBBY_CAP = 10;

export default function MyLobbiesPage() {
  const { user, isSignedIn, loading: authLoading } = useAuthUser();
  const { data: lobbies, isLoading } = useMyLobbies(isSignedIn ? user?.id : undefined);
  const lobbyCount = lobbies?.length ?? 0;
  const atCap = isSignedIn && lobbyCount >= LOBBY_CAP;

  return (
    <main className="relative min-h-[calc(100vh-4rem)] overflow-hidden px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-24 h-72 w-72 rounded-full bg-accent-400/30 blur-3xl dark:bg-accent-600/15"
      />

      <div className="relative mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:px-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold text-[var(--foreground)]">
              My Lobbies
            </h1>
            {isSignedIn && lobbies && lobbies.length > 0 && (
              <p className="mt-1 text-sm text-[var(--foreground-muted)]">
                {lobbyCount}/{LOBBY_CAP} lobbies
              </p>
            )}
          </div>
          {isSignedIn && lobbies && lobbies.length > 0 && (
            <div className="flex flex-col items-end gap-1">
              {atCap ? (
                <Button className="whitespace-nowrap" disabled>
                  + New lobby
                </Button>
              ) : (
                <Link href="/create">
                  <Button className="whitespace-nowrap">+ New lobby</Button>
                </Link>
              )}
              {atCap && (
                <span className="text-xs text-red-600">Limit reached — delete one to add another</span>
              )}
            </div>
          )}
        </div>

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
          <>
            <div className="hidden animate-pop-in overflow-hidden rounded-3xl border border-neutral-200 bg-[var(--surface)] lg:block dark:border-neutral-800">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-neutral-50 dark:bg-neutral-900/40">
                  <tr>
                    <th className="px-5 py-3 font-semibold text-[var(--foreground-muted)]">
                      Title
                    </th>
                    <th className="px-5 py-3 font-semibold text-[var(--foreground-muted)]">
                      Status
                    </th>
                    <th className="px-5 py-3 font-semibold text-[var(--foreground-muted)]">
                      Created
                    </th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {lobbies.map((lobby) => (
                    <tr
                      key={lobby.id}
                      className="border-t border-neutral-100 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900/40"
                    >
                      <td className="px-5 py-3.5 font-semibold text-[var(--foreground)]">
                        {lobby.title}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusPill status={lobby.status} />
                      </td>
                      <td className="px-5 py-3.5 text-[var(--foreground-muted)]">
                        {new Date(lobby.createdAt).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          href={`/lobby/${lobby.code}/manage`}
                          className="font-semibold text-brand-600 hover:underline"
                        >
                          Manage →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="flex animate-pop-in flex-col gap-3 lg:hidden">
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
          </>
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
