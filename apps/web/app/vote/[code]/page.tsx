"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { SearchX, Hourglass, Lock, Clock, Ban, type LucideIcon } from "lucide-react";
import {
  useLobby,
  useLobbyResults,
  useLobbyRealtime,
  useJoinLobby,
  useCastVote,
  useCastVoteMulti,
  useCastVoteRanked,
  useSubmitTextResponse,
  useEnsureSession,
  useAuthUser,
  containsProfanity,
} from "@repo/shared";
import { Button } from "../../_components/Button";
import { lobbyBrandingStyle } from "../../_components/lobbyBranding";
import { TallyBars } from "../../_components/TallyBars";
import { RankedResults } from "../../_components/RankedResults";
import { TextResponseCloud } from "../../_components/TextResponseCloud";
import { RadioCard } from "../../_components/RadioCard";
import { LiveDot } from "../../_components/LiveDot";
import { Spinner } from "../../_components/Spinner";
import { useConfetti } from "../../_components/useConfetti";
import { useDocumentTitle } from "../../_components/useDocumentTitle";
import { trackEvent } from "../../_lib/analytics";

function friendlyVoteError(message: string): string {
  if (message === "LOBBY_NOT_OPEN") return "Voting has closed for this lobby.";
  if (message === "LOBBY_NOT_FOUND") return "This lobby no longer exists.";
  if (message === "RESPONSE_TEXT_REQUIRED") return "Type an answer before submitting.";
  if (message === "RESPONSE_TEXT_TOO_LONG") return "Your answer is too long (300 characters max).";
  if (message === "INAPPROPRIATE_CONTENT") {
    return "Please remove inappropriate language from your answer.";
  }
  if (message === "RATE_LIMITED") return "You're going too fast — wait a moment and try again.";
  return "Something went wrong. Please try again.";
}

function EmptyState({ icon: Icon, message }: { icon: LucideIcon; message: string }) {
  return (
    <main className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-3 px-4 text-center">
      <Icon size={40} strokeWidth={1.5} className="text-[var(--foreground-muted)]" />
      <p className="text-sm text-[var(--foreground-muted)]">{message}</p>
    </main>
  );
}

export default function VotePage() {
  const { code } = useParams<{ code: string }>();
  const { ready } = useEnsureSession();
  const { isSignedIn } = useAuthUser();
  const { data, isLoading, error } = useLobby(code, { enabled: ready });
  const lobby = data?.lobby;
  const questions = data?.questions ?? [];
  useDocumentTitle(lobby ? lobby.title : "Vote");

  const joinLobby = useJoinLobby();
  const castVote = useCastVote();
  const castVoteMulti = useCastVoteMulti();
  const castVoteRanked = useCastVoteRanked();
  const submitTextResponse = useSubmitTextResponse();
  // Voter-facing page — a signed-in creator voting in their own lobby shouldn't get a "hidden
  // until closed" tally sneak peek other voters are deliberately being denied (see
  // lobby-results/index.ts).
  const results = useLobbyResults(lobby?.id, { isPublicView: true });
  const { burst } = useConfetti();

  useLobbyRealtime({ lobbyId: lobby?.id, code, tallyVisibility: lobby?.tallyVisibility });

  const [participantId, setParticipantId] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  // Keyed by question ID (not a single "current selection") so going back to an earlier question
  // shows what was previously picked/typed there, rather than a blank slate.
  const [choiceAnswers, setChoiceAnswers] = useState<Record<string, string>>({});
  // Separate state for multi-select (maxSelections > 1) questions — single-select's state/logic
  // above is untouched, this is an additive path.
  const [multiChoiceAnswers, setMultiChoiceAnswers] = useState<Record<string, string[]>>({});
  // Ranked questions: array order IS the ranking (index 0 = most preferred) — built up by tapping
  // options in preference order; tapping an already-ranked option removes it.
  const [rankedAnswers, setRankedAnswers] = useState<Record<string, string[]>>({});
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});
  const [textError, setTextError] = useState<string | null>(null);
  const joinAttempted = useRef(false);

  useEffect(() => {
    if (!ready || lobby?.status !== "open" || joinAttempted.current) return;
    if (lobby.ballotMode === "open" && !isSignedIn) return; // gated below until they sign in
    joinAttempted.current = true;
    joinLobby.mutate(
      { code },
      {
        onSuccess: (result) => {
          trackEvent("lobby_joined");
          setParticipantId(result.participantId);
          setHasVoted(result.hasVoted);
        },
      },
    );
  }, [ready, lobby?.status, lobby?.ballotMode, isSignedIn, code, joinLobby]);

  if (!ready || isLoading) return <Spinner />;
  if (error || !lobby) {
    return <EmptyState icon={SearchX} message="Lobby not found." />;
  }

  if (lobby.status === "draft") {
    return <EmptyState icon={Hourglass} message="This lobby hasn't opened yet — check back soon." />;
  }

  if (lobby.status === "open" && lobby.ballotMode === "open" && !isSignedIn) {
    return (
      <main className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 px-4 text-center">
        <Lock size={40} strokeWidth={1.5} className="text-[var(--foreground-muted)]" />
        <p className="max-w-xs text-sm text-[var(--foreground-muted)]">
          This lobby shows who voted for what — sign in to vote.
        </p>
        <Link href={`/login?redirect=/vote/${code}`}>
          <Button>Sign in to vote</Button>
        </Link>
      </main>
    );
  }

  if (joinLobby.error?.message === "LOBBY_FULL") {
    return <EmptyState icon={Ban} message="This lobby is full." />;
  }

  const showResults = lobby.status === "closed" || hasVoted;
  const currentQuestion = questions[questionIndex];
  const isLastQuestion = questionIndex === questions.length - 1;
  const selectedOptionId = currentQuestion ? (choiceAnswers[currentQuestion.id] ?? null) : null;
  const isMultiSelect = Boolean(currentQuestion && currentQuestion.maxSelections > 1);
  const selectedOptionIds = currentQuestion ? (multiChoiceAnswers[currentQuestion.id] ?? []) : [];
  const rankedOptionIds = currentQuestion ? (rankedAnswers[currentQuestion.id] ?? []) : [];
  const textResponse = currentQuestion ? (textAnswers[currentQuestion.id] ?? "") : "";

  return (
    <main
      className="relative flex-1 px-4 py-10"
      style={lobbyBrandingStyle(lobby.brandColor)}
    >
      <div className="relative mx-auto flex max-w-md flex-col gap-6">
        <div className="flex items-center gap-3">
          {lobby.brandLogoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- arbitrary uploaded logo, not a static asset Next can optimize
            <img
              src={lobby.brandLogoUrl}
              alt=""
              className="h-10 w-10 shrink-0 rounded-lg object-contain"
            />
          )}
          <h1 className="font-display text-3xl font-bold text-[var(--foreground)]">
            {lobby.title}
          </h1>
        </div>

        {lobby.closesAt && lobby.status === "open" && (
          <p className="-mt-4 inline-flex items-center gap-1.5 text-xs text-[var(--foreground-muted)]">
            <Clock size={14} /> Voting closes{" "}
            {new Date(lobby.closesAt).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        )}

        {showResults ? (
          <div className="flex animate-pop-in flex-col gap-4 rounded-3xl border border-neutral-300 bg-[var(--surface)] p-5 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-[var(--foreground-muted)]">
                {lobby.status === "closed"
                  ? "Voting is closed."
                  : "You're in — thanks for voting!"}
              </p>
              {lobby.tallyVisibility === "live" && <LiveDot />}
            </div>
            {results.data?.tally ? (
              <div className="flex flex-col gap-5">
                {results.data.tally.map((q) => {
                  const question = questions.find((qq) => qq.id === q.questionId);
                  return (
                    <div key={q.questionId} className="flex flex-col gap-2">
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
                    </div>
                  );
                })}
              </div>
            ) : (
              results.data && (
                <p className="text-sm text-[var(--foreground-muted)]">
                  {results.data.progress.completedCount} of {results.data.progress.joined} have voted.
                </p>
              )
            )}
          </div>
        ) : participantId && currentQuestion ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();

              function advance() {
                if (isLastQuestion) {
                  setHasVoted(true);
                  burst();
                } else {
                  setQuestionIndex((i) => i + 1);
                }
              }

              if (currentQuestion.type === "choice" && isMultiSelect) {
                if (selectedOptionIds.length === 0) return;
                castVoteMulti.mutate(
                  { lobbyId: lobby.id, questionId: currentQuestion.id, optionIds: selectedOptionIds },
                  {
                    onSuccess: () => {
                      trackEvent("vote_cast", { questionType: "choice" });
                      advance();
                    },
                  },
                );
              } else if (currentQuestion.type === "choice") {
                if (!selectedOptionId) return;
                castVote.mutate(
                  { lobbyId: lobby.id, optionId: selectedOptionId },
                  {
                    onSuccess: () => {
                      trackEvent("vote_cast", { questionType: "choice" });
                      advance();
                    },
                  },
                );
              } else if (currentQuestion.type === "ranked") {
                if (rankedOptionIds.length < 2) return;
                castVoteRanked.mutate(
                  { lobbyId: lobby.id, questionId: currentQuestion.id, rankedOptionIds },
                  {
                    onSuccess: () => {
                      trackEvent("vote_cast", { questionType: "ranked" });
                      advance();
                    },
                  },
                );
              } else {
                const trimmed = textResponse.trim();
                if (!trimmed) return;
                if (containsProfanity(trimmed)) {
                  setTextError("Please remove inappropriate language from your answer.");
                  return;
                }
                setTextError(null);
                submitTextResponse.mutate(
                  { lobbyId: lobby.id, questionId: currentQuestion.id, responseText: trimmed },
                  {
                    onSuccess: () => {
                      trackEvent("vote_cast", { questionType: "text" });
                      advance();
                    },
                  },
                );
              }
            }}
            className="flex animate-pop-in flex-col gap-3"
          >
            {questions.length > 1 && (
              <p
                className="text-xs font-semibold tracking-wide text-[var(--foreground-muted)] uppercase"
                aria-live="polite"
              >
                Question {questionIndex + 1} of {questions.length}
              </p>
            )}
            {questions.length > 1 && (
              <h2 className="-mt-2 text-lg font-semibold text-[var(--foreground)]">
                {currentQuestion.title}
              </h2>
            )}
            {currentQuestion.type === "choice" && isMultiSelect ? (
              <>
                <p className="-mt-1 text-xs text-[var(--foreground-muted)]">
                  Choose up to {currentQuestion.maxSelections}
                </p>
                {currentQuestion.options.map((option) => {
                  const checked = selectedOptionIds.includes(option.id);
                  const atCap = selectedOptionIds.length >= currentQuestion.maxSelections;
                  return (
                    <RadioCard
                      key={option.id}
                      type="checkbox"
                      name="option"
                      value={option.id}
                      selected={checked}
                      label={option.label}
                      size="lg"
                      disabled={!checked && atCap}
                      onSelect={(optionId) =>
                        setMultiChoiceAnswers((prev) => {
                          const current = prev[currentQuestion.id] ?? [];
                          const next = current.includes(optionId)
                            ? current.filter((id) => id !== optionId)
                            : current.length < currentQuestion.maxSelections
                              ? [...current, optionId]
                              : current;
                          return { ...prev, [currentQuestion.id]: next };
                        })
                      }
                    />
                  );
                })}
              </>
            ) : currentQuestion.type === "choice" ? (
              currentQuestion.options.map((option) => (
                <RadioCard
                  key={option.id}
                  name="option"
                  value={option.id}
                  selected={selectedOptionId === option.id}
                  label={option.label}
                  size="lg"
                  onSelect={(optionId) =>
                    setChoiceAnswers((prev) => ({ ...prev, [currentQuestion.id]: optionId }))
                  }
                />
              ))
            ) : currentQuestion.type === "ranked" ? (
              <>
                <p className="-mt-1 text-xs text-[var(--foreground-muted)]">
                  Tap options in order of preference — tap again to remove.
                </p>
                {currentQuestion.options.map((option) => {
                  const rankIndex = rankedOptionIds.indexOf(option.id);
                  const ranked = rankIndex !== -1;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() =>
                        setRankedAnswers((prev) => {
                          const current = prev[currentQuestion.id] ?? [];
                          const next = current.includes(option.id)
                            ? current.filter((id) => id !== option.id)
                            : [...current, option.id];
                          return { ...prev, [currentQuestion.id]: next };
                        })
                      }
                      className={`flex items-center gap-3 rounded-2xl border-2 p-4 text-left text-base transition-all ${
                        ranked
                          ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
                          : "border-neutral-300 hover:border-brand-200 dark:border-neutral-700"
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${
                          ranked
                            ? "border-brand-500 bg-brand-500 text-white"
                            : "border-neutral-300 text-transparent dark:border-neutral-600"
                        }`}
                      >
                        {ranked ? rankIndex + 1 : ""}
                      </span>
                      <span className="font-semibold text-[var(--foreground)]">{option.label}</span>
                    </button>
                  );
                })}
              </>
            ) : (
              <div className="flex flex-col gap-1">
                <label htmlFor="vote-text-answer" className="sr-only">
                  Your answer
                </label>
                <textarea
                  id="vote-text-answer"
                  value={textResponse}
                  onChange={(e) => {
                    setTextAnswers((prev) => ({ ...prev, [currentQuestion.id]: e.target.value }));
                    setTextError(null);
                  }}
                  maxLength={300}
                  rows={3}
                  placeholder="Type your answer…"
                  aria-invalid={textError !== null || submitTextResponse.isError}
                  aria-describedby={
                    textError || submitTextResponse.isError ? "vote-text-answer-error" : undefined
                  }
                  className="rounded-2xl border-2 border-neutral-300 bg-[var(--input-bg)] p-4 text-base text-[var(--foreground)] outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus:border-brand-400 dark:border-neutral-700"
                />
                <span className="self-end text-xs text-[var(--foreground-muted)]">
                  {textResponse.length}/300
                </span>
              </div>
            )}
            {currentQuestion.type === "choice"
              ? (isMultiSelect ? castVoteMulti.isError : castVote.isError) && (
                  <p role="alert" className="text-sm font-medium text-red-600">
                    {friendlyVoteError(
                      (isMultiSelect ? castVoteMulti.error : castVote.error)!.message,
                    )}
                  </p>
                )
              : currentQuestion.type === "ranked"
                ? castVoteRanked.isError && (
                    <p role="alert" className="text-sm font-medium text-red-600">
                      {friendlyVoteError(castVoteRanked.error.message)}
                    </p>
                  )
                : textError
                  ? (
                      <p id="vote-text-answer-error" role="alert" className="text-sm font-medium text-red-600">
                        {textError}
                      </p>
                    )
                  : submitTextResponse.isError && (
                      <p id="vote-text-answer-error" role="alert" className="text-sm font-medium text-red-600">
                        {friendlyVoteError(submitTextResponse.error.message)}
                      </p>
                    )}
            <div className="flex gap-2">
              {questionIndex > 0 && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={
                    castVote.isPending ||
                    castVoteMulti.isPending ||
                    castVoteRanked.isPending ||
                    submitTextResponse.isPending
                  }
                  onClick={() => setQuestionIndex((i) => i - 1)}
                >
                  ← Back
                </Button>
              )}
              <Button
                type="submit"
                disabled={
                  currentQuestion.type === "choice"
                    ? isMultiSelect
                      ? selectedOptionIds.length === 0 || castVoteMulti.isPending
                      : !selectedOptionId || castVote.isPending
                    : currentQuestion.type === "ranked"
                      ? rankedOptionIds.length < 2 || castVoteRanked.isPending
                      : textResponse.trim().length === 0 || submitTextResponse.isPending
                }
                className="flex-1"
              >
                {castVote.isPending ||
                castVoteMulti.isPending ||
                castVoteRanked.isPending ||
                submitTextResponse.isPending
                  ? currentQuestion.type === "text"
                    ? "Submitting…"
                    : "Voting…"
                  : !isLastQuestion
                    ? "Next →"
                    : questions.length > 1
                      ? "Submit"
                      : "Vote"}
              </Button>
            </div>
          </form>
        ) : (
          <Spinner label="Joining…" />
        )}
      </div>
    </main>
  );
}
