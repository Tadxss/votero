"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import {
  useLobby,
  useLobbyResults,
  useLobbyRealtime,
  useSetLobbyStatus,
  useEnsureSession,
  useAuthUser,
  useDeleteLobby,
} from "@repo/shared";
import type { LobbyStatus } from "@repo/types";
import { Button } from "../../../_components/Button";
import { TallyBars } from "../../../_components/TallyBars";
import { StatusPill } from "../../../_components/StatusPill";
import { LiveDot } from "../../../_components/LiveDot";
import { Spinner } from "../../../_components/Spinner";
import { useConfetti } from "../../../_components/useConfetti";
import { ConfirmDialog } from "../../../_components/ConfirmDialog";

export default function ManageLobbyPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const { ready } = useEnsureSession();
  const { user, isSignedIn } = useAuthUser();
  const { data, isLoading, error } = useLobby(code, { enabled: ready });
  const lobby = data?.lobby;
  const options = data?.options ?? [];

  const results = useLobbyResults(lobby?.id);
  const setStatus = useSetLobbyStatus();
  const deleteLobby = useDeleteLobby(user?.id);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { burst } = useConfetti();

  useLobbyRealtime({
    lobbyId: lobby?.id,
    code,
    tallyVisibility: lobby?.tallyVisibility,
  });

  const [voteUrl, setVoteUrl] = useState("");
  useEffect(() => {
    setVoteUrl(`${window.location.origin}/vote/${code}`);
  }, [code]);

  const prevStatus = useRef<LobbyStatus | undefined>(undefined);
  useEffect(() => {
    if (prevStatus.current === "open" && lobby?.status === "closed") {
      burst();
    }
    prevStatus.current = lobby?.status;
  }, [lobby?.status, burst]);

  if (!ready || isLoading) return <Spinner />;
  if (error || !lobby) {
    return <main className="p-10 text-sm text-red-600">Lobby not found.</main>;
  }

  const joinedPct = Math.min(100, (lobby.joinedCount / lobby.voterCap) * 100);

  return (
    <main className="relative min-h-[calc(100vh-4rem)] overflow-hidden px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-24 h-72 w-72 rounded-full bg-brand-300/30 blur-3xl dark:bg-brand-700/20"
      />

      <div className="relative mx-auto flex max-w-5xl flex-col gap-6 px-4 sm:px-8">
        <Link
          href={isSignedIn ? "/lobbies" : "/"}
          className="inline-flex w-fit items-center gap-1 text-sm font-medium text-[var(--foreground-muted)] transition-colors hover:text-brand-600"
        >
          ← {isSignedIn ? "My Lobbies" : "Home"}
        </Link>

        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-bold text-[var(--foreground)]">
            {lobby.title}
          </h1>
          <StatusPill status={lobby.status} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start lg:gap-8">
          <div className="flex flex-col gap-6">
            {lobby.status !== "closed" && voteUrl && (
              <div className="flex animate-pop-in flex-col items-center gap-3 rounded-3xl border-4 border-brand-500 bg-[var(--surface)] p-6 shadow-md">
                <div className="rounded-2xl bg-white p-3">
                  <QRCodeSVG value={voteUrl} size={180} />
                </div>
                <p className="break-all text-center text-sm text-[var(--foreground-muted)]">
                  {voteUrl}
                </p>
                <p className="rounded-full bg-brand-50 px-4 py-1 text-lg font-mono font-bold tracking-widest text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                  {lobby.code}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-sm font-medium text-[var(--foreground-muted)]">
                <span>
                  {lobby.joinedCount} / {lobby.voterCap} joined
                </span>
                {lobby.tallyVisibility === "live" && <LiveDot />}
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                <div
                  className="h-full rounded-full bg-accent-500 transition-all duration-500"
                  style={{ width: `${joinedPct}%` }}
                />
              </div>
            </div>

            {lobby.status === "draft" && (
              <Button
                onClick={() => setStatus.mutate({ lobbyId: lobby.id, action: "open" })}
                disabled={setStatus.isPending}
              >
                Open voting 🚀
              </Button>
            )}

            {lobby.status === "open" && (
              <Button
                variant="danger"
                onClick={() => setStatus.mutate({ lobbyId: lobby.id, action: "close" })}
                disabled={setStatus.isPending}
              >
                Close voting
              </Button>
            )}

            {setStatus.isError && (
              <p className="text-sm font-medium text-red-600">{setStatus.error.message}</p>
            )}

            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="self-start text-sm font-medium text-red-600 hover:underline"
            >
              Delete lobby
            </button>
            {deleteLobby.isError && (
              <p className="text-sm font-medium text-red-600">{deleteLobby.error.message}</p>
            )}
          </div>

          {results.data && (
            <div className="flex flex-col gap-4 rounded-3xl border border-neutral-200 bg-[var(--surface)] p-5 dark:border-neutral-800">
              {results.data.tally ? (
                <TallyBars
                  options={options}
                  tally={results.data.tally}
                  closed={lobby.status === "closed"}
                />
              ) : (
                <p className="text-sm text-[var(--foreground-muted)]">
                  {results.data.progress.votesCast} of {results.data.progress.joined} have voted —
                  tally hidden until the lobby closes.
                </p>
              )}

              {results.data.ballotDetail && results.data.ballotDetail.length > 0 && (
                <div className="flex flex-col gap-2 border-t border-neutral-100 pt-4 dark:border-neutral-800">
                  <h2 className="text-sm font-semibold text-[var(--foreground)]">
                    Who voted for what
                  </h2>
                  <ul className="flex flex-col gap-2">
                    {results.data.ballotDetail.map((entry) => (
                      <li key={entry.participantId} className="flex items-center gap-2.5 text-sm">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
                          {(entry.displayName ?? "V")[0]?.toUpperCase()}
                        </span>
                        <span className="text-[var(--foreground-muted)]">
                          {entry.displayName ?? "Voter"}
                        </span>
                        <span className="ml-auto font-semibold text-[var(--foreground)]">
                          {options.find((o) => o.id === entry.optionId)?.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        title={`Delete "${lobby.title}"?`}
        message="This can't be undone — all votes and data for this lobby will be permanently deleted."
        isPending={deleteLobby.isPending}
        onConfirm={() =>
          deleteLobby.mutate(lobby.id, { onSuccess: () => router.push("/lobbies") })
        }
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </main>
  );
}
