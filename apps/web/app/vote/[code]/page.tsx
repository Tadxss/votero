"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  useLobby,
  useLobbyResults,
  useLobbyRealtime,
  useJoinLobby,
  useCastVote,
  useEnsureSession,
  useBallotStore,
} from "@repo/shared";
import { Button } from "../../_components/Button";
import { TallyBars } from "../../_components/TallyBars";

export default function VotePage() {
  const { code } = useParams<{ code: string }>();
  const { ready } = useEnsureSession();
  const { data, isLoading, error } = useLobby(code, { enabled: ready });
  const lobby = data?.lobby;
  const options = data?.options ?? [];

  const joinLobby = useJoinLobby();
  const castVote = useCastVote();
  const results = useLobbyResults(lobby?.id);
  const selectedOptionId = useBallotStore((s) => s.selectedOptionId);
  const selectOption = useBallotStore((s) => s.select);

  useLobbyRealtime({ lobbyId: lobby?.id, code, tallyVisibility: lobby?.tallyVisibility });

  const [participantId, setParticipantId] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const joinAttempted = useRef(false);

  useEffect(() => {
    if (!ready || lobby?.status !== "open" || joinAttempted.current) return;
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
  }, [ready, lobby?.status, code, joinLobby]);

  if (!ready || isLoading) {
    return <main className="p-10 text-sm text-neutral-500">Loading…</main>;
  }
  if (error || !lobby) {
    return <main className="p-10 text-sm text-red-600">Lobby not found.</main>;
  }

  if (lobby.status === "draft") {
    return (
      <main className="p-10 text-sm text-neutral-500">
        This lobby hasn&apos;t opened yet — check back soon.
      </main>
    );
  }

  if (joinLobby.error?.message === "LOBBY_FULL") {
    return <main className="p-10 text-sm text-neutral-500">This lobby is full.</main>;
  }

  const showResults = lobby.status === "closed" || hasVoted;

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-bold">{lobby.title}</h1>

      {showResults ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-neutral-500">
            {lobby.status === "closed" ? "Voting is closed." : "You're in — thanks for voting!"}
          </p>
          {results.data?.tally ? (
            <TallyBars options={options} tally={results.data.tally} />
          ) : (
            results.data && (
              <p className="text-sm text-neutral-500">
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
              { onSuccess: () => setHasVoted(true) },
            );
          }}
          className="flex flex-col gap-3"
        >
          {options.map((option) => (
            <label
              key={option.id}
              className={`flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm ${
                selectedOptionId === option.id
                  ? "border-neutral-900 bg-neutral-50"
                  : "border-neutral-200"
              }`}
            >
              <input
                type="radio"
                name="option"
                checked={selectedOptionId === option.id}
                onChange={() => selectOption(option.id)}
              />
              {option.label}
            </label>
          ))}
          {castVote.isError && <p className="text-sm text-red-600">{castVote.error.message}</p>}
          <Button type="submit" disabled={!selectedOptionId || castVote.isPending}>
            {castVote.isPending ? "Voting…" : "Vote"}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-neutral-500">Joining…</p>
      )}
    </main>
  );
}
