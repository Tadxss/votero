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
  BarChart3,
  Palette,
  QrCode,
  ListChecks,
} from "lucide-react";
import {
  useLobby,
  useLobbyResults,
  useLobbyRealtime,
  useSetLobbyStatus,
  useEnsureSession,
  useAuthUser,
  useDeleteLobby,
  useUploadLobbyLogo,
  useUpdateLobbyBranding,
} from "@repo/shared";
import type { BallotDetailEntry, LobbyStatus } from "@repo/types";
import { Button } from "../../../_components/Button";
import { TallyBars } from "../../../_components/TallyBars";
import { RankedResults } from "../../../_components/RankedResults";
import { TextResponseCloud } from "../../../_components/TextResponseCloud";
import { StatusPill } from "../../../_components/StatusPill";
import { LiveDot } from "../../../_components/LiveDot";
import { Spinner } from "../../../_components/Spinner";
import { useConfetti } from "../../../_components/useConfetti";
import { ConfirmDialog } from "../../../_components/ConfirmDialog";
import { Avatar } from "../../../_components/Avatar";
import {
  downloadResultsCsv,
  downloadResultsImage,
  downloadBrandedReportPdf,
} from "../../../_components/downloadResults";
import { useDocumentTitle } from "../../../_components/useDocumentTitle";
import { trackEvent } from "../../../_lib/analytics";

function friendlyManageError(message: string): string {
  if (message === "FORBIDDEN") return "Only this lobby's creator can do that.";
  if (message === "LOBBY_NOT_FOUND") return "This lobby no longer exists.";
  if (message === "LOBBY_NOT_DRAFT") return "This lobby has already been opened.";
  if (message === "LOBBY_NOT_OPEN") return "This lobby isn't open, so it can't be closed.";
  if (message === "INVALID_BRAND_COLOR") return "That doesn't look like a valid color.";
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
  useDocumentTitle(lobby ? `${lobby.title} · Manage` : "Manage lobby");

  const results = useLobbyResults(lobby?.id);
  const setStatus = useSetLobbyStatus();
  const deleteLobby = useDeleteLobby(user?.id);
  const uploadLogo = useUploadLobbyLogo(user?.id, lobby?.id);
  const updateBranding = useUpdateLobbyBranding(code);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [copied, setCopied] = useState<"link" | "code" | null>(null);
  const { burst } = useConfetti();

  const [brandColorInput, setBrandColorInput] = useState(lobby?.brandColor ?? "#2a78d6");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(lobby?.brandLogoUrl ?? null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (lobby) setBrandColorInput(lobby.brandColor ?? "#2a78d6");
  }, [lobby]);

  useEffect(() => {
    if (!logoFile) {
      setLogoPreviewUrl(lobby?.brandLogoUrl ?? null);
      return;
    }
    const url = URL.createObjectURL(logoFile);
    setLogoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile, lobby?.brandLogoUrl]);

  async function saveBranding() {
    if (!lobby) return;
    let brandLogoUrl = lobby.brandLogoUrl ?? undefined;
    if (logoFile) {
      brandLogoUrl = await uploadLogo.mutateAsync(logoFile);
    }
    updateBranding.mutate({ lobbyId: lobby.id, brandLogoUrl, brandColor: brandColorInput });
    setLogoFile(null);
  }

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

  const tally = results.data?.tally;
  const [questionIndex, setQuestionIndex] = useState(0);
  const currentTally = tally?.[questionIndex];
  const hasMultipleQuestions = (tally?.length ?? 0) > 1;

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
    <main className="relative flex-1 px-4 py-10">
      <div className="relative mx-auto flex max-w-5xl flex-col gap-6 px-4 sm:px-8">
        <Link
          href={isSignedIn ? "/lobbies" : "/"}
          className="inline-flex w-fit items-center gap-1 text-sm font-medium text-[var(--foreground-muted)] transition-colors hover:text-brand-600"
        >
          ← {isSignedIn ? "My Lobbies" : "Home"}
        </Link>

        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display text-3xl font-bold text-[var(--foreground)]">
            {lobby.title}
          </h1>
          <StatusPill status={lobby.status} />
        </div>

        {isCreator && !isSignedIn && (
          <div className="flex items-start gap-2 rounded-2xl border border-neutral-300 bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground-muted)] dark:border-neutral-800">
            <Hourglass size={16} className="mt-0.5 shrink-0" aria-hidden />
            <p>
              This lobby isn&apos;t tied to an account, so it&apos;ll be automatically deleted on{" "}
              <strong className="text-[var(--foreground)]">{deleteByLabel}</strong>{" "}
              (7 days after creation, regardless of whether voting is open or closed) — signing in
              now won&apos;t save this one, since it can&apos;t be transferred to an account after
              the fact.{" "}
              <Link href="/login" className="font-semibold text-brand-700 hover:underline">
                Sign in
              </Link>{" "}
              before creating your next lobby to keep that one permanently.
            </p>
          </div>
        )}

        {!authLoading && !isCreator && (
          <div className="flex items-start gap-2 rounded-2xl border border-neutral-300 bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground-muted)] dark:border-neutral-800">
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
                  <QRCodeSVG value={voteUrl} size={180} title={`QR code to vote in ${lobby.title}`} />
                </div>
                <p
                  className="w-full max-w-full truncate text-center text-sm text-[var(--foreground-muted)]"
                  title={voteUrl}
                >
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

            {lobby.status === "closed" && (
              <div className="flex animate-pop-in flex-col items-center gap-2 rounded-3xl border-4 border-neutral-300 bg-[var(--surface)] p-6 text-center shadow-md dark:border-neutral-700">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-[var(--foreground-muted)] dark:bg-neutral-800">
                  <Lock size={12} aria-hidden /> Voting closed
                </span>
                <p className="text-sm text-[var(--foreground-muted)]">
                  {lobby.closedAt
                    ? `Voting ended ${new Date(lobby.closedAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}.`
                    : "Voting has ended for this lobby."}{" "}
                  See the results panel for the full breakdown.
                </p>
              </div>
            )}

            {isCreator && (
              <div className="flex flex-col gap-3 rounded-3xl border border-neutral-300 bg-[var(--surface)] p-5 dark:border-neutral-800">
                <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--foreground)]">
                  <Palette size={16} /> Branding
                </h2>
                <p className="text-xs text-[var(--foreground-muted)]">
                  Add your own logo and accent color to this lobby&apos;s vote page and Present
                  Mode.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 text-xs text-[var(--foreground-muted)] dark:border-neutral-700 dark:bg-neutral-900"
                  >
                    {logoPreviewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- arbitrary uploaded logo, not a static asset Next can optimize
                      <img
                        src={logoPreviewUrl}
                        alt="Lobby logo preview"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      "Logo"
                    )}
                  </button>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setLogoFile(file);
                    }}
                  />
                  <label className="flex flex-col gap-1 text-xs text-[var(--foreground-muted)]">
                    Accent color
                    <input
                      type="color"
                      value={brandColorInput}
                      onChange={(e) => setBrandColorInput(e.target.value)}
                      className="h-9 w-16 cursor-pointer rounded-lg border border-neutral-300 dark:border-neutral-700"
                    />
                  </label>
                  <Button
                    type="button"
                    variant="secondary"
                    className="text-xs"
                    onClick={saveBranding}
                    disabled={uploadLogo.isPending || updateBranding.isPending}
                  >
                    {uploadLogo.isPending || updateBranding.isPending
                      ? "Saving…"
                      : "Save branding"}
                  </Button>
                </div>
                {(uploadLogo.isError || updateBranding.isError) && (
                  <p className="text-sm font-medium text-red-600">
                    {friendlyManageError(
                      (uploadLogo.error ?? updateBranding.error)?.message ?? "",
                    )}
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {isCreator && lobby.status === "draft" && (
                <Link href={`/lobby/${code}/edit`} className="self-start">
                  <Button
                    type="button"
                    variant="secondary"
                    className="inline-flex items-center gap-1.5"
                  >
                    <ListChecks size={14} /> Edit questions
                  </Button>
                </Link>
              )}
              <Link
                href={`/lobby/${code}/present`}
                target="_blank"
                rel="noopener noreferrer"
                className="self-start"
              >
                <Button
                  type="button"
                  variant="secondary"
                  className="inline-flex items-center gap-1.5"
                >
                  <Monitor size={14} /> Present Mode
                </Button>
              </Link>
              <Link href={`/lobby/${code}/poster`} className="self-start">
                <Button
                  type="button"
                  variant="secondary"
                  className="inline-flex items-center gap-1.5"
                  onClick={() => trackEvent("qr_poster_opened")}
                >
                  <QrCode size={14} /> QR poster
                </Button>
              </Link>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-sm font-medium text-[var(--foreground-muted)]">
                <span aria-live="polite">
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
                onClick={() =>
                  setStatus.mutate(
                    { lobbyId: lobby.id, action: "open" },
                    { onSuccess: () => trackEvent("voting_opened") },
                  )
                }
                disabled={setStatus.isPending}
              >
                Open voting
              </Button>
            )}

            {isCreator && lobby.status === "open" && (
              <Button
                variant="danger"
                onClick={() => setShowCloseConfirm(true)}
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
            <div className="flex flex-col gap-6 rounded-3xl border border-neutral-300 bg-[var(--surface)] p-5 dark:border-neutral-800">
              {results.data.tally && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-[var(--foreground)]">Results</h2>
                  <div className="flex flex-wrap gap-2">
                    {isSignedIn && isCreator && (
                      <Link href={`/lobby/${code}/stats`}>
                        <Button
                          type="button"
                          variant="secondary"
                          className="inline-flex items-center gap-1.5 text-xs"
                        >
                          <BarChart3 size={14} /> Detailed stats
                        </Button>
                      </Link>
                    )}
                    <Button
                      type="button"
                      variant="secondary"
                      className="inline-flex items-center gap-1.5 text-xs"
                      onClick={() => {
                        if (!results.data?.tally) return;
                        downloadResultsCsv(lobby, questions, results.data.tally);
                        trackEvent("results_exported", { format: "csv" });
                      }}
                    >
                      <Download size={14} /> CSV
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="inline-flex items-center gap-1.5 text-xs"
                      onClick={() => {
                        if (!results.data?.tally) return;
                        downloadResultsImage(lobby, questions, results.data.tally);
                        trackEvent("results_exported", { format: "image" });
                      }}
                    >
                      <Download size={14} /> Image
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="inline-flex items-center gap-1.5 text-xs"
                      onClick={() => {
                        if (!results.data?.tally) return;
                        downloadBrandedReportPdf(lobby, questions, results.data.tally);
                        trackEvent("results_exported", { format: "pdf" });
                      }}
                    >
                      <Download size={14} /> PDF report
                    </Button>
                  </div>
                </div>
              )}
              {currentTally ? (
                (() => {
                  const q = currentTally;
                  const question = questions.find((qq) => qq.id === q.questionId);
                  const ballotDetail = results.data?.ballotDetail?.find(
                    (b) => b.questionId === q.questionId,
                  );
                  return (
                    <div className="flex flex-col gap-4">
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
                      ) : q.type === "ranked" ? (
                        <RankedResults
                          options={question?.options ?? []}
                          rounds={q.rounds}
                          winner={q.winner}
                          closed={lobby.status === "closed"}
                        />
                      ) : (
                        <TextResponseCloud responses={q.responses} />
                      )}

                      {ballotDetail && ballotDetail.entries.length > 0 && (
                        <div className="flex flex-col gap-2 border-t border-neutral-100 pt-4 dark:border-neutral-800">
                          <h3 className="text-sm font-semibold text-[var(--foreground)]">
                            {q.type === "text" ? "Who said what" : "Who voted for what"}
                          </h3>
                          <ul className="flex flex-col gap-2">
                            {(() => {
                              // A multi-select or ranked question produces one vote row (one
                              // entry) per selected/ranked option — group by participant so a
                              // person's multiple picks show as one row, not duplicates. Ranked
                              // entries carry a `rank`, sorted and numbered; multi-select entries
                              // have rank: null and just join in whatever order they arrived.
                              const grouped = new Map<
                                string,
                                { entry: BallotDetailEntry; picks: { label: string; rank: number | null }[] }
                              >();
                              for (const entry of ballotDetail.entries) {
                                const label =
                                  "optionId" in entry
                                    ? (question?.options.find((o) => o.id === entry.optionId)?.label ??
                                      "Unknown option")
                                    : undefined;
                                const rank = "rank" in entry ? entry.rank : null;
                                const existing = grouped.get(entry.participantId);
                                if (existing) {
                                  if (label) existing.picks.push({ label, rank });
                                } else {
                                  grouped.set(entry.participantId, {
                                    entry,
                                    picks: label ? [{ label, rank }] : [],
                                  });
                                }
                              }
                              return Array.from(grouped.values()).map(({ entry, picks }) => {
                                const { primary, secondary } = resolveVoterLabel(entry);
                                const isRanked = picks.some((p) => p.rank !== null);
                                const displayText = isRanked
                                  ? picks
                                      .slice()
                                      .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
                                      .map((p, i) => `${i + 1}. ${p.label}`)
                                      .join(", ")
                                  : picks.map((p) => p.label).join(", ");
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
                                      {"optionId" in entry ? displayText : entry.responseText}
                                    </span>
                                  </li>
                                );
                              });
                            })()}
                          </ul>
                        </div>
                      )}

                      {hasMultipleQuestions && tally && (
                        <div className="flex items-center justify-center gap-4 border-t border-neutral-100 pt-4 dark:border-neutral-800">
                          <Button
                            type="button"
                            variant="secondary"
                            className="text-xs"
                            disabled={questionIndex === 0}
                            onClick={() => setQuestionIndex((i) => i - 1)}
                          >
                            ← Previous
                          </Button>
                          <p className="text-sm font-medium text-[var(--foreground-muted)]">
                            Question {questionIndex + 1} of {tally.length}
                          </p>
                          <Button
                            type="button"
                            variant="secondary"
                            className="text-xs"
                            disabled={questionIndex === tally.length - 1}
                            onClick={() => setQuestionIndex((i) => i + 1)}
                          >
                            Next →
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <p className="text-sm text-[var(--foreground-muted)]" aria-live="polite">
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
          deleteLobby.mutate(lobby.id, {
            onSuccess: () => {
              trackEvent("lobby_deleted");
              router.push("/lobbies");
            },
          })
        }
        onCancel={() => {
          setShowDeleteConfirm(false);
          deleteLobby.reset();
        }}
      />

      <ConfirmDialog
        open={showCloseConfirm}
        title="Close voting?"
        message="Voters won't be able to submit or change any responses after this — there's no way to reopen it."
        confirmLabel="Close voting"
        pendingLabel="Closing…"
        isPending={setStatus.isPending}
        onConfirm={() =>
          setStatus.mutate(
            { lobbyId: lobby.id, action: "close" },
            { onSuccess: () => setShowCloseConfirm(false) },
          )
        }
        onCancel={() => {
          setShowCloseConfirm(false);
          setStatus.reset();
        }}
      />
    </main>
  );
}
