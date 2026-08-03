"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Table2, LayoutGrid, Trash2, BarChart3 } from "lucide-react";
import { useAuthUser, useMyLobbies, useDeleteLobby } from "@repo/shared";
import type { Lobby } from "@repo/types";
import { StatusPill } from "../_components/StatusPill";
import { Spinner } from "../_components/Spinner";
import { Button } from "../_components/Button";
import { ConfirmDialog } from "../_components/ConfirmDialog";
import { useDocumentTitle } from "../_components/useDocumentTitle";
import { trackEvent } from "../_lib/analytics";

const LOBBY_CAP = 10;
const VIEW_STORAGE_KEY = "votero:lobbies-view";
type View = "table" | "grid";

function friendlyDeleteError(message: string): string {
  if (message === "FORBIDDEN") return "Only this lobby's creator can delete it.";
  return "Something went wrong deleting this lobby. Please try again.";
}

function LobbyCard({ lobby, onDelete }: { lobby: Lobby; onDelete: (lobby: Lobby) => void }) {
  return (
    <li className="rounded-2xl border border-neutral-300 bg-[var(--surface)] p-4 transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800">
      <div className="flex items-center justify-between gap-3">
        <Link href={`/lobby/${lobby.code}/manage`} className="flex flex-1 flex-col gap-0.5">
          <span className="font-semibold text-[var(--foreground)]">{lobby.title}</span>
          <span className="text-xs text-[var(--foreground-muted)]">
            {new Date(lobby.createdAt).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <StatusPill status={lobby.status} />
          <Link
            href={`/lobby/${lobby.code}/stats`}
            aria-label={`View stats for ${lobby.title}`}
            className="rounded-full p-1.5 text-[var(--foreground-muted)] transition-colors hover:bg-neutral-100 hover:text-brand-600 dark:hover:bg-neutral-800 dark:hover:text-brand-300"
          >
            <BarChart3 size={16} />
          </Link>
          <button
            type="button"
            onClick={() => onDelete(lobby)}
            aria-label={`Delete ${lobby.title}`}
            className="rounded-full p-1.5 text-[var(--foreground-muted)] transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </li>
  );
}

export default function MyLobbiesPage() {
  useDocumentTitle("My Lobbies");
  const { user, isSignedIn, loading: authLoading } = useAuthUser();
  const { data: lobbies, isLoading } = useMyLobbies(isSignedIn ? user?.id : undefined);
  const deleteLobby = useDeleteLobby(user?.id);
  const lobbyCount = lobbies?.length ?? 0;
  const atCap = isSignedIn && lobbyCount >= LOBBY_CAP;

  const [view, setView] = useState<View>("table");
  const [pendingDelete, setPendingDelete] = useState<Lobby | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (stored === "table" || stored === "grid") setView(stored);
  }, []);

  function selectView(next: View) {
    setView(next);
    window.localStorage.setItem(VIEW_STORAGE_KEY, next);
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    deleteLobby.mutate(pendingDelete.id, {
      onSuccess: () => {
        trackEvent("lobby_deleted");
        setPendingDelete(null);
      },
    });
  }

  return (
    <main className="relative flex-1 px-4 py-10">
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
          <div className="flex items-center gap-3">
            {isSignedIn && lobbies && lobbies.length > 0 && (
              <div className="hidden items-center gap-1 rounded-full border border-neutral-300 p-1 lg:flex dark:border-neutral-700">
                <button
                  type="button"
                  onClick={() => selectView("table")}
                  aria-label="Table view"
                  aria-pressed={view === "table"}
                  className={`rounded-full p-1.5 transition-colors ${
                    view === "table"
                      ? "bg-brand-700 text-white"
                      : "text-[var(--foreground-muted)] hover:text-brand-600 dark:hover:text-brand-300"
                  }`}
                >
                  <Table2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => selectView("grid")}
                  aria-label="Grid view"
                  aria-pressed={view === "grid"}
                  className={`rounded-full p-1.5 transition-colors ${
                    view === "grid"
                      ? "bg-brand-700 text-white"
                      : "text-[var(--foreground-muted)] hover:text-brand-600 dark:hover:text-brand-300"
                  }`}
                >
                  <LayoutGrid size={16} />
                </button>
              </div>
            )}
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
                  <span className="text-xs text-red-600">
                    Limit reached — delete one to add another
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {authLoading ? (
          <Spinner />
        ) : !isSignedIn ? (
          <div className="flex animate-pop-in flex-col items-start gap-3 rounded-3xl border border-neutral-300 bg-[var(--surface)] p-6 shadow-sm dark:border-neutral-800">
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
            {view === "table" && (
              // Deliberately squared off (rounded-lg, not the rounded-2xl/3xl/full used
              // everywhere else) — a data table reads as more considered next to something
              // crisp, and gives the app's otherwise uniform softness one point of contrast.
              <div className="hidden animate-pop-in overflow-hidden rounded-lg border border-neutral-300 bg-[var(--surface)] lg:block dark:border-neutral-800">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-neutral-50 dark:bg-neutral-900/40">
                    <tr>
                      <th className="px-4 py-4 font-semibold text-[var(--foreground-muted)]">
                        Title
                      </th>
                      <th className="px-4 py-4 font-semibold text-[var(--foreground-muted)]">
                        Status
                      </th>
                      <th className="px-4 py-4 font-semibold text-[var(--foreground-muted)]">
                        Created
                      </th>
                      <th className="px-4 py-4" />
                      <th className="px-4 py-4" />
                    </tr>
                  </thead>
                  <tbody>
                    {lobbies.map((lobby) => (
                      <tr
                        key={lobby.id}
                        className="border-t border-neutral-100 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900/40"
                      >
                        <td className="px-4 py-4 font-semibold text-[var(--foreground)]">
                          {lobby.title}
                        </td>
                        <td className="px-4 py-4">
                          <StatusPill status={lobby.status} />
                        </td>
                        <td className="px-4 py-4 text-[var(--foreground-muted)]">
                          {new Date(lobby.createdAt).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/lobby/${lobby.code}/stats`}
                              className="rounded-full border-2 border-neutral-300 px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] transition-colors hover:border-brand-300 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                            >
                              Stats
                            </Link>
                            <Link
                              href={`/lobby/${lobby.code}/manage`}
                              className="rounded-full bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-900"
                            >
                              Manage →
                            </Link>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => setPendingDelete(lobby)}
                            aria-label={`Delete ${lobby.title}`}
                            className="rounded-full p-1.5 text-[var(--foreground-muted)] transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {view === "grid" && (
              <ul className="hidden animate-pop-in grid-cols-2 gap-4 lg:grid xl:grid-cols-3">
                {lobbies.map((lobby) => (
                  <LobbyCard key={lobby.id} lobby={lobby} onDelete={setPendingDelete} />
                ))}
              </ul>
            )}

            <ul className="flex animate-pop-in flex-col gap-3 lg:hidden">
              {lobbies.map((lobby) => (
                <LobbyCard key={lobby.id} lobby={lobby} onDelete={setPendingDelete} />
              ))}
            </ul>
          </>
        ) : (
          <div className="flex animate-pop-in flex-col items-start gap-3 rounded-3xl border border-neutral-300 bg-[var(--surface)] p-6 shadow-sm dark:border-neutral-800">
            <p className="text-sm text-[var(--foreground-muted)]">
              No lobbies yet — anything you create while signed in will show up here.
            </p>
            <Link href="/create">
              <Button>Create a lobby</Button>
            </Link>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={`Delete "${pendingDelete?.title ?? ""}"?`}
        message="This can't be undone — all votes and data for this lobby will be permanently deleted."
        isPending={deleteLobby.isPending}
        error={deleteLobby.isError ? friendlyDeleteError(deleteLobby.error.message) : null}
        onConfirm={confirmDelete}
        onCancel={() => {
          setPendingDelete(null);
          deleteLobby.reset();
        }}
      />
    </main>
  );
}
