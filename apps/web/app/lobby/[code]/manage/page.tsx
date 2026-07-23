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
import type { BallotDetailEntry, LobbyStatus } from "@repo/types";
import { Button } from "../../../_components/Button";
import { TallyBars } from "../../../_components/TallyBars";
import { StatusPill } from "../../../_components/StatusPill";
import { LiveDot } from "../../../_components/LiveDot";
import { Spinner } from "../../../_components/Spinner";
import { useConfetti } from "../../../_components/useConfetti";
import { ConfirmDialog } from "../../../_components/ConfirmDialog";
import { TrashIcon } from "../../../_components/icons";
import { Avatar } from "../../../_components/Avatar";

function resolveVoterLabel(entry: BallotDetailEntry): { primary: string; secondary: string | null } {
  const fullName = [entry.firstName, entry.lastName].filter(Boolean).join(" ").trim();
  if (fullName) {
    return { primary: fullName, secondary: entry.username ? `@${entry.username}` : null };
  }
  if (entry.username) {
    return { primary: `@${entry.username}`, secondary: null };
  }
  return { primary: entry.email ?? "Voter", secondary: null };
}

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
  const [copied, setCopied] = useState<"link" | "code" | null>(null);
  const { burst } = useConfetti();

  async function copyToClipboard(text: string, what: "link" | "code") {
    await navigator.clipboard.writeText(text);
    setCopied(what);
    setTimeout(() => setCopied(null), 2000);
  }

  async function shareLobby(title: string, url: string) {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: `Vote in "${title}" on Votero`, url });
      } catch {
        // user dismissed the share sheet — nothing to do
      }
    } else {
      copyToClipboard(url, "link");
    }
  }

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
  const deleteByLabel = new Date(
    new Date(lobby.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

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

        {!isSignedIn && (
          <div className="flex items-start gap-2 rounded-2xl border border-neutral-200 bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground-muted)] dark:border-neutral-800">
            <span aria-hidden>⏳</span>
            <p>
              This lobby isn&apos;t tied to an account, so it&apos;ll be automatically deleted on{" "}
              <strong className="text-[var(--foreground)]">{deleteByLabel}</strong>{" "}
              (7 days after creation, regardless of whether voting is open or closed) — signing in
              now won&apos;t save this one, since it can&apos;t be transferred to an account after
              the fact.{" "}
              <Link href="/login" className="font-semibold text-brand-600 hover:underline">
                Sign in
              </Link>{" "}
              before creating your next lobby to keep that one permanently.
            </p>
          </div>
        )}

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

                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="text-xs"
                    onClick={() => copyToClipboard(voteUrl, "link")}
                  >
                    {copied === "link" ? "Copied! ✓" : "Copy link"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="text-xs"
                    onClick={() => copyToClipboard(lobby.code, "code")}
                  >
                    {copied === "code" ? "Copied! ✓" : "Copy code"}
                  </Button>
                  <Button
                    type="button"
                    className="text-xs"
                    onClick={() => shareLobby(lobby.title, voteUrl)}
                  >
                    Share
                  </Button>
                </div>
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

            <div className="mt-2 flex flex-col items-start gap-2 border-t border-neutral-100 pt-4 dark:border-neutral-800">
              <Button
                type="button"
                variant="danger"
                className="inline-flex items-center gap-1.5"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <TrashIcon />
                Delete lobby
              </Button>
              {deleteLobby.isError && (
                <p className="text-sm font-medium text-red-600">{deleteLobby.error.message}</p>
              )}
            </div>
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
                    {results.data.ballotDetail.map((entry) => {
                      const { primary, secondary } = resolveVoterLabel(entry);
                      return (
                        <li
                          key={entry.participantId}
                          className="flex items-center gap-2.5 text-sm"
                        >
                          <Avatar url={entry.avatarUrl} label={primary} size="sm" />
                          <div className="flex flex-col leading-tight">
                            <span className="font-medium text-[var(--foreground)]">{primary}</span>
                            {secondary && (
                              <span className="text-xs text-[var(--foreground-muted)]">
                                {secondary}
                              </span>
                            )}
                          </div>
                          <span className="ml-auto font-semibold text-[var(--foreground)]">
                            {options.find((o) => o.id === entry.optionId)?.label}
                          </span>
                        </li>
                      );
                    })}
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
