"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import {
  Hourglass,
  Lock,
  Link as LinkIcon,
  Copy,
  Share2,
  Check,
  Monitor,
  Clock,
  Download,
  Trash2,
} from "lucide-react";
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
import { TextResponseCloud } from "../../../_components/TextResponseCloud";
import { StatusPill } from "../../../_components/StatusPill";
import { LiveDot } from "../../../_components/LiveDot";
import { Spinner } from "../../../_components/Spinner";
import { useConfetti } from "../../../_components/useConfetti";
import { ConfirmDialog } from "../../../_components/ConfirmDialog";
import { Avatar } from "../../../_components/Avatar";
import { downloadResultsCsv, downloadResultsImage } from "../../../_components/downloadResults";

function friendlyManageError(message: string): string {
  if (message === "FORBIDDEN") return "Only this lobby's creator can do that.";
  if (message === "LOBBY_NOT_FOUND") return "This lobby no longer exists.";
  if (message === "LOBBY_NOT_DRAFT") return "This lobby has already been opened.";
  if (message === "LOBBY_NOT_OPEN") return "This lobby isn't open, so it can't be closed.";
  return "Something went wrong. Please try again.";
}

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
  const { user, isSignedIn, loading: authLoading } = useAuthUser();
  const { data, isLoading, error } = useLobby(code, { enabled: ready });
  const lobby = data?.lobby;
  const questions = data?.questions ?? [];

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

  // Anyone with the link can view this dashboard (QR/share/tally are already read-only and safe
  // to share with co-organizers), but only the actual creator can mutate the lobby — rpc_set_
  // lobby_status/rpc_delete_lobby already enforce this server-side (auth.uid() === creator_id),
  // this just keeps the client UI honest about it instead of showing buttons that always 403.
  const isCreator = !authLoading && user?.id === lobby.creatorId;
  const joinedPct = Math.min(100, (lobby.joinedCount / lobby.voterCap) * 100);
  const deleteByLabel = new Date(
    new Date(lobby.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  return (
    <main className="relative min-h-[calc(100vh-4rem)] px-4 py-10">
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

        {isCreator && !isSignedIn && (
          <div className="flex items-start gap-2 rounded-2xl border border-neutral-200 bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground-muted)] dark:border-neutral-800">
            <Hourglass size={16} className="mt-0.5 shrink-0" aria-hidden />
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

        {!authLoading && !isCreator && (
          <div className="flex items-start gap-2 rounded-2xl border border-neutral-200 bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground-muted)] dark:border-neutral-800">
            <Lock size={16} className="mt-0.5 shrink-0" aria-hidden />
            <p>
              You&apos;re viewing this lobby&apos;s dashboard, but only its creator can open/close
              voting or delete it — the account or browser session that created it doesn&apos;t
              match this one.
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
                    className="inline-flex items-center gap-1.5 text-xs"
                    onClick={() => copyToClipboard(voteUrl, "link")}
                  >
                    {copied === "link" ? (
                      <>
                        <Check size={14} /> Copied!
                      </>
                    ) : (
                      <>
                        <LinkIcon size={14} /> Copy link
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="inline-flex items-center gap-1.5 text-xs"
                    onClick={() => copyToClipboard(lobby.code, "code")}
                  >
                    {copied === "code" ? (
                      <>
                        <Check size={14} /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={14} /> Copy code
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    className="inline-flex items-center gap-1.5 text-xs"
                    onClick={() => shareLobby(lobby.title, voteUrl)}
                  >
                    <Share2 size={14} /> Share
                  </Button>
                </div>
              </div>
            )}

            <Link
              href={`/lobby/${code}/present`}
              target="_blank"
              rel="noopener noreferrer"
              className="self-start"
            >
              <Button type="button" variant="secondary" className="inline-flex items-center gap-1.5">
                <Monitor size={14} /> Present Mode
              </Button>
            </Link>

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

            {lobby.closesAt && lobby.status !== "closed" && (
              <p className="inline-flex items-center gap-1.5 text-xs text-[var(--foreground-muted)]">
                <Clock size={14} /> Auto-closes{" "}
                {new Date(lobby.closesAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            )}

            {isCreator && lobby.status === "draft" && (
              <Button
                onClick={() => setStatus.mutate({ lobbyId: lobby.id, action: "open" })}
                disabled={setStatus.isPending}
              >
                Open voting
              </Button>
            )}

            {isCreator && lobby.status === "open" && (
              <Button
                variant="danger"
                onClick={() => setStatus.mutate({ lobbyId: lobby.id, action: "close" })}
                disabled={setStatus.isPending}
              >
                Close voting
              </Button>
            )}

            {setStatus.isError && (
              <p className="text-sm font-medium text-red-600">
                {friendlyManageError(setStatus.error.message)}
              </p>
            )}

            {isCreator && (
              <div className="mt-2 flex flex-col items-start gap-2 border-t border-neutral-100 pt-4 dark:border-neutral-800">
                <Button
                  type="button"
                  variant="danger"
                  className="inline-flex items-center gap-1.5"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 size={16} />
                  Delete lobby
                </Button>
                {deleteLobby.isError && (
                  <p className="text-sm font-medium text-red-600">
                    {friendlyManageError(deleteLobby.error.message)}
                  </p>
                )}
              </div>
            )}
          </div>

          {results.data && (
            <div className="flex flex-col gap-6 rounded-3xl border border-neutral-200 bg-[var(--surface)] p-5 dark:border-neutral-800">
              {results.data.tally && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-[var(--foreground)]">Results</h2>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="inline-flex items-center gap-1.5 text-xs"
                      onClick={() =>
                        results.data?.tally &&
                        downloadResultsCsv(lobby, questions, results.data.tally)
                      }
                    >
                      <Download size={14} /> CSV
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="inline-flex items-center gap-1.5 text-xs"
                      onClick={() =>
                        results.data?.tally &&
                        downloadResultsImage(lobby, questions, results.data.tally)
                      }
                    >
                      <Download size={14} /> Image
                    </Button>
                  </div>
                </div>
              )}
              {results.data.tally ? (
                results.data.tally.map((q) => {
                  const question = questions.find((qq) => qq.id === q.questionId);
                  const ballotDetail = results.data?.ballotDetail?.find(
                    (b) => b.questionId === q.questionId,
                  );
                  return (
                    <div
                      key={q.questionId}
                      className="flex flex-col gap-4 border-b border-neutral-100 pb-6 last:border-b-0 last:pb-0 dark:border-neutral-800"
                    >
                      {questions.length > 1 && (
                        <h2 className="text-sm font-semibold text-[var(--foreground)]">
                          {q.questionTitle}
                        </h2>
                      )}
                      {q.type === "choice" ? (
                        <TallyBars
                          options={question?.options ?? []}
                          tally={q.tally}
                          closed={lobby.status === "closed"}
                        />
                      ) : (
                        <TextResponseCloud responses={q.responses} />
                      )}

                      {ballotDetail && ballotDetail.entries.length > 0 && (
                        <div className="flex flex-col gap-2 border-t border-neutral-100 pt-4 dark:border-neutral-800">
                          <h3 className="text-sm font-semibold text-[var(--foreground)]">
                            {q.type === "choice" ? "Who voted for what" : "Who said what"}
                          </h3>
                          <ul className="flex flex-col gap-2">
                            {ballotDetail.entries.map((entry) => {
                              const { primary, secondary } = resolveVoterLabel(entry);
                              return (
                                <li
                                  key={entry.participantId}
                                  className="flex items-center gap-2.5 text-sm"
                                >
                                  <Avatar url={entry.avatarUrl} label={primary} size="sm" />
                                  <div className="flex flex-col leading-tight">
                                    <span className="font-medium text-[var(--foreground)]">
                                      {primary}
                                    </span>
                                    {secondary && (
                                      <span className="text-xs text-[var(--foreground-muted)]">
                                        {secondary}
                                      </span>
                                    )}
                                  </div>
                                  <span className="ml-auto font-semibold text-[var(--foreground)]">
                                    {"optionId" in entry
                                      ? question?.options.find((o) => o.id === entry.optionId)?.label
                                      : entry.responseText}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-[var(--foreground-muted)]">
                  {results.data.progress.completedCount} of {results.data.progress.joined} have voted —
                  tally hidden until the lobby closes.
                </p>
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
        onCancel={() => {
          setShowDeleteConfirm(false);
          deleteLobby.reset();
        }}
      />
    </main>
  );
}
