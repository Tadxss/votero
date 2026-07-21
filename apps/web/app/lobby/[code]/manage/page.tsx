"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import {
  useLobby,
  useLobbyResults,
  useLobbyRealtime,
  useSetLobbyStatus,
  useEnsureSession,
} from "@repo/shared";
import { Button } from "../../../_components/Button";
import { TallyBars } from "../../../_components/TallyBars";

export default function ManageLobbyPage() {
  const { code } = useParams<{ code: string }>();
  const { ready } = useEnsureSession();
  const { data, isLoading, error } = useLobby(code, { enabled: ready });
  const lobby = data?.lobby;
  const options = data?.options ?? [];

  const results = useLobbyResults(lobby?.id);
  const setStatus = useSetLobbyStatus();

  useLobbyRealtime({
    lobbyId: lobby?.id,
    code,
    tallyVisibility: lobby?.tallyVisibility,
  });

  const [voteUrl, setVoteUrl] = useState("");
  useEffect(() => {
    setVoteUrl(`${window.location.origin}/vote/${code}`);
  }, [code]);

  if (!ready || isLoading) {
    return <main className="p-10 text-sm text-neutral-500">Loading…</main>;
  }
  if (error || !lobby) {
    return <main className="p-10 text-sm text-red-600">Lobby not found.</main>;
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-bold">{lobby.title}</h1>

      {lobby.status !== "closed" && voteUrl && (
        <div className="flex flex-col items-center gap-3 rounded-md border border-neutral-200 p-4">
          <QRCodeSVG value={voteUrl} size={180} />
          <p className="break-all text-center text-sm text-neutral-500">{voteUrl}</p>
          <p className="text-lg font-mono font-bold tracking-widest">{lobby.code}</p>
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-neutral-500">
        <span>
          {lobby.joinedCount} / {lobby.voterCap} joined
        </span>
        <span className="capitalize">{lobby.status}</span>
      </div>

      {lobby.status === "draft" && (
        <Button
          onClick={() => setStatus.mutate({ lobbyId: lobby.id, action: "open" })}
          disabled={setStatus.isPending}
        >
          Open voting
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

      {results.data && (
        <div className="flex flex-col gap-4">
          {results.data.tally ? (
            <TallyBars options={options} tally={results.data.tally} />
          ) : (
            <p className="text-sm text-neutral-500">
              {results.data.progress.votesCast} of {results.data.progress.joined} have voted —
              tally hidden until the lobby closes.
            </p>
          )}

          {results.data.ballotDetail && (
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-medium">Who voted for what</h2>
              <table className="w-full text-left text-sm">
                <tbody>
                  {results.data.ballotDetail.map((entry) => (
                    <tr key={entry.participantId} className="border-t border-neutral-100">
                      <td className="py-1 text-neutral-500">{entry.displayName ?? "Voter"}</td>
                      <td className="py-1 font-medium">
                        {options.find((o) => o.id === entry.optionId)?.label}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {setStatus.isError && <p className="text-sm text-red-600">{setStatus.error.message}</p>}
    </main>
  );
}
