"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { SearchX } from "lucide-react";
import { useLobby, useLobbyResults, useLobbyRealtime, useEnsureSession } from "@repo/shared";
import { TallyBars } from "../../../_components/TallyBars";
import { TextResponseCloud } from "../../../_components/TextResponseCloud";
import { StatusPill } from "../../../_components/StatusPill";
import { LiveDot } from "../../../_components/LiveDot";
import { Spinner } from "../../../_components/Spinner";

export default function PresentLobbyPage() {
  const { code } = useParams<{ code: string }>();
  const { ready } = useEnsureSession();
  const { data, isLoading, error } = useLobby(code, { enabled: ready });
  const lobby = data?.lobby;
  const questions = data?.questions ?? [];
  const results = useLobbyResults(lobby?.id);

  useLobbyRealtime({ lobbyId: lobby?.id, code, tallyVisibility: lobby?.tallyVisibility });

  const [voteUrl, setVoteUrl] = useState("");
  useEffect(() => {
    setVoteUrl(`${window.location.origin}/vote/${code}`);
  }, [code]);

  if (!ready || isLoading) return <Spinner />;
  if (error || !lobby) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <SearchX size={40} strokeWidth={1.5} className="text-[var(--foreground-muted)]" />
        <p className="text-[var(--foreground-muted)]">Lobby not found.</p>
      </main>
    );
  }

  const joinedPct = Math.min(100, (lobby.joinedCount / lobby.voterCap) * 100);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-8 px-6 py-10">
      <div className="flex animate-pop-in items-center gap-3">
        <h1 className="font-display text-4xl font-bold text-[var(--foreground)] sm:text-5xl">
          {lobby.title}
        </h1>
        <StatusPill status={lobby.status} />
      </div>

      <div className="grid w-full max-w-6xl grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-full max-w-[280px] rounded-3xl bg-white p-6 shadow-2xl [&>svg]:h-auto [&>svg]:w-full">
            <QRCodeSVG value={voteUrl} size={280} />
          </div>
          <p className="rounded-full bg-brand-50 px-5 py-1.5 font-mono text-2xl font-bold tracking-widest text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
            {lobby.code}
          </p>
          <p className="flex items-center gap-2 text-lg text-[var(--foreground-muted)]">
            {lobby.joinedCount} / {lobby.voterCap} joined
            {lobby.tallyVisibility === "live" && <LiveDot />}
          </p>
          <div className="h-3 w-full max-w-xs overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div
              className="h-full rounded-full bg-accent-500 transition-all duration-500"
              style={{ width: `${joinedPct}%` }}
            />
          </div>
        </div>

        <div className="flex w-full min-w-0 flex-col items-center gap-6">
          {lobby.status === "draft" ? (
            <p className="text-center text-2xl text-[var(--foreground-muted)]">
              Scan to get ready — voting opens soon
            </p>
          ) : results.data?.tally ? (
            <div className="flex w-full min-w-0 flex-col gap-6">
              {results.data.tally.map((q) => {
                const question = questions.find((qq) => qq.id === q.questionId);
                return (
                  <div
                    key={q.questionId}
                    className="flex flex-col gap-3 border-b border-neutral-200/60 pb-6 last:border-b-0 last:pb-0 dark:border-neutral-800"
                  >
                    {questions.length > 1 && (
                      <h2 className="truncate text-lg font-semibold text-[var(--foreground-muted)]">
                        {q.questionTitle}
                      </h2>
                    )}
                    {q.type === "choice" ? (
                      <TallyBars
                        options={question?.options ?? []}
                        tally={q.tally}
                        closed={lobby.status === "closed"}
                        size="lg"
                      />
                    ) : (
                      <TextResponseCloud responses={q.responses} size="lg" />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            results.data && (
              <p className="text-center text-2xl text-[var(--foreground-muted)]">
                {results.data.progress.completedCount} of {results.data.progress.joined} have voted
              </p>
            )
          )}
        </div>
      </div>
    </main>
  );
}
