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
  useEnsureSession,
  useAuthUser,
  useBallotStore,
} from "@repo/shared";
import { Button } from "../../_components/Button";
import { TallyBars } from "../../_components/TallyBars";
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
  const options = data?.options ?? [];

  const joinLobby = useJoinLobby();
  const castVote = useCastVote();
  const results = useLobbyResults(lobby?.id);
  const selectedOptionId = useBallotStore((s) => s.selectedOptionId);
  const selectOption = useBallotStore((s) => s.select);
  const { burst } = useConfetti();

  useLobbyRealtime({ lobbyId: lobby?.id, code, tallyVisibility: lobby?.tallyVisibility });

  const [participantId, setParticipantId] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
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
              <TallyBars
                options={options}
                tally={results.data.tally}
                closed={lobby.status === "closed"}
              />
            ) : (
              results.data && (
                <p className="text-sm text-[var(--foreground-muted)]">
                  {results.data.progress.votesCast} of {results.data.progress.joined} have voted.
                </p>
              )
            )}
          </div>
        ) : participantId ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!selectedOptionId) return;
              castVote.mutate(
                { lobbyId: lobby.id, optionId: selectedOptionId },
                {
                  onSuccess: () => {
                    setHasVoted(true);
                    burst();
                  },
                },
              );
            }}
            className="flex animate-pop-in flex-col gap-3"
          >
            {options.map((option) => (
              <RadioCard
                key={option.id}
                name="option"
                value={option.id}
                selected={selectedOptionId === option.id}
                label={option.label}
                size="lg"
                onSelect={selectOption}
              />
            ))}
            {castVote.isError && (
              <p className="text-sm font-medium text-red-600">{castVote.error.message}</p>
            )}
            <Button type="submit" disabled={!selectedOptionId || castVote.isPending} className="w-full">
              {castVote.isPending ? "Voting…" : "Vote ✋"}
            </Button>
          </form>
        ) : (
          <Spinner label="Joining…" />
        )}
      </div>
    </main>
  );
}
