"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  useLobby,
  useLobbyResults,
  useLobbyRealtime,
  useJoinLobby,
  useCastVote,
  useSubmitTextResponse,
  useEnsureSession,
  useAuthUser,
} from "@repo/shared";
import { Button } from "../../_components/Button";
import { TallyBars } from "../../_components/TallyBars";
import { TextResponseCloud } from "../../_components/TextResponseCloud";
import { RadioCard } from "../../_components/RadioCard";
import { LiveDot } from "../../_components/LiveDot";
import { Spinner } from "../../_components/Spinner";
import { useConfetti } from "../../_components/useConfetti";

function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <main className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-3 px-4 text-center">
      <span className="text-4xl">{icon}</span>
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

  const joinLobby = useJoinLobby();
  const castVote = useCastVote();
  const submitTextResponse = useSubmitTextResponse();
  const results = useLobbyResults(lobby?.id);
  const { burst } = useConfetti();

  useLobbyRealtime({ lobbyId: lobby?.id, code, tallyVisibility: lobby?.tallyVisibility });

  const [participantId, setParticipantId] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  // Keyed by question ID (not a single "current selection") so going back to an earlier question
  // shows what was previously picked/typed there, rather than a blank slate.
  const [choiceAnswers, setChoiceAnswers] = useState<Record<string, string>>({});
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});
  const joinAttempted = useRef(false);

  useEffect(() => {
    if (!ready || lobby?.status !== "open" || joinAttempted.current) return;
    if (lobby.ballotMode === "open" && !isSignedIn) return; // gated below until they sign in
    joinAttempted.current = true;
    joinLobby.mutate(
      { code },
      {
        onSuccess: (result) => {
          setParticipantId(result.participantId);
          setHasVoted(result.hasVoted);
        },
      },
    );
  }, [ready, lobby?.status, lobby?.ballotMode, isSignedIn, code, joinLobby]);

  if (!ready || isLoading) return <Spinner />;
  if (error || !lobby) {
    return <EmptyState icon="🔍" message="Lobby not found." />;
  }

  if (lobby.status === "draft") {
    return <EmptyState icon="⏳" message="This lobby hasn't opened yet — check back soon." />;
  }

  if (lobby.status === "open" && lobby.ballotMode === "open" && !isSignedIn) {
    return (
      <main className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 px-4 text-center">
        <span className="text-4xl">🔏</span>
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
    return <EmptyState icon="🙅" message="This lobby is full." />;
  }

  const showResults = lobby.status === "closed" || hasVoted;
  const currentQuestion = questions[questionIndex];
  const isLastQuestion = questionIndex === questions.length - 1;
  const selectedOptionId = currentQuestion ? (choiceAnswers[currentQuestion.id] ?? null) : null;
  const textResponse = currentQuestion ? (textAnswers[currentQuestion.id] ?? "") : "";

  return (
    <main className="relative min-h-[calc(100vh-4rem)] overflow-hidden px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-24 h-72 w-72 rounded-full bg-brand-300/30 blur-3xl dark:bg-brand-700/20"
      />

      <div className="relative mx-auto flex max-w-md flex-col gap-6">
        <h1 className="font-display text-2xl font-bold text-[var(--foreground)]">
          {lobby.title}
        </h1>

        {lobby.closesAt && lobby.status === "open" && (
          <p className="-mt-4 text-xs text-[var(--foreground-muted)]">
            ⏰ Voting closes{" "}
            {new Date(lobby.closesAt).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        )}

        {showResults ? (
          <div className="flex animate-pop-in flex-col gap-4 rounded-3xl border border-neutral-200 bg-[var(--surface)] p-5 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-[var(--foreground-muted)]">
                {lobby.status === "closed"
                  ? "Voting is closed."
                  : "You're in — thanks for voting! 🎉"}
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
                  {results.data.progress.votesCast} of {results.data.progress.joined} have voted.
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

              if (currentQuestion.type === "choice") {
                if (!selectedOptionId) return;
                castVote.mutate({ lobbyId: lobby.id, optionId: selectedOptionId }, { onSuccess: advance });
              } else {
                const trimmed = textResponse.trim();
                if (!trimmed) return;
                submitTextResponse.mutate(
                  { lobbyId: lobby.id, questionId: currentQuestion.id, responseText: trimmed },
                  { onSuccess: advance },
                );
              }
            }}
            className="flex animate-pop-in flex-col gap-3"
          >
            {questions.length > 1 && (
              <p className="text-xs font-semibold tracking-wide text-[var(--foreground-muted)] uppercase">
                Question {questionIndex + 1} of {questions.length}
              </p>
            )}
            {questions.length > 1 && (
              <h2 className="-mt-2 text-lg font-semibold text-[var(--foreground)]">
                {currentQuestion.title}
              </h2>
            )}
            {currentQuestion.type === "choice" ? (
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
            ) : (
              <div className="flex flex-col gap-1">
                <textarea
                  value={textResponse}
                  onChange={(e) =>
                    setTextAnswers((prev) => ({ ...prev, [currentQuestion.id]: e.target.value }))
                  }
                  maxLength={300}
                  rows={3}
                  placeholder="Type your answer…"
                  className="rounded-2xl border-2 border-neutral-200 bg-[var(--surface)] p-3.5 text-base text-[var(--foreground)] outline-none focus:border-brand-400 dark:border-neutral-700"
                />
                <span className="self-end text-xs text-[var(--foreground-muted)]">
                  {textResponse.length}/300
                </span>
              </div>
            )}
            {currentQuestion.type === "choice"
              ? castVote.isError && <p className="text-sm font-medium text-red-600">{castVote.error.message}</p>
              : submitTextResponse.isError && (
                  <p className="text-sm font-medium text-red-600">
                    {submitTextResponse.error.message}
                  </p>
                )}
            <div className="flex gap-2">
              {questionIndex > 0 && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={castVote.isPending || submitTextResponse.isPending}
                  onClick={() => setQuestionIndex((i) => i - 1)}
                >
                  ← Back
                </Button>
              )}
              <Button
                type="submit"
                disabled={
                  currentQuestion.type === "choice"
                    ? !selectedOptionId || castVote.isPending
                    : textResponse.trim().length === 0 || submitTextResponse.isPending
                }
                className="flex-1"
              >
                {castVote.isPending || submitTextResponse.isPending
                  ? currentQuestion.type === "choice"
                    ? "Voting…"
                    : "Submitting…"
                  : !isLastQuestion
                    ? "Next →"
                    : questions.length > 1
                      ? "Submit ✋"
                      : "Vote ✋"}
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
