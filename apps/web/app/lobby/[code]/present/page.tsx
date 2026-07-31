"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { SearchX, BarChart3 } from "lucide-react";
import {
  useLobby,
  useLobbyResults,
  useLobbyRealtime,
  useEnsureSession,
  useAuthUser,
} from "@repo/shared";
import { TallyChart } from "../../../_components/TallyChart";
import { ChartViewToggle, type ChartView } from "../../../_components/ChartViewToggle";
import { StatusPill } from "../../../_components/StatusPill";
import { LiveDot } from "../../../_components/LiveDot";
import { Spinner } from "../../../_components/Spinner";
import { useDocumentTitle } from "../../../_components/useDocumentTitle";

const CHART_VIEW_STORAGE_KEY = "votero:chart-view";

export default function PresentLobbyPage() {
  const { code } = useParams<{ code: string }>();
  const { ready } = useEnsureSession();
  const { user, isSignedIn } = useAuthUser();
  const { data, isLoading, error } = useLobby(code, { enabled: ready });
  const lobby = data?.lobby;
  const questions = data?.questions ?? [];
  useDocumentTitle(lobby ? `${lobby.title} · Present` : "Present");
  const results = useLobbyResults(lobby?.id);

  useLobbyRealtime({ lobbyId: lobby?.id, code, tallyVisibility: lobby?.tallyVisibility });

  const [voteUrl, setVoteUrl] = useState("");
  useEffect(() => {
    setVoteUrl(`${window.location.origin}/vote/${code}`);
  }, [code]);

  const [chartView, setChartView] = useState<ChartView>("bar");
  useEffect(() => {
    const stored = window.localStorage.getItem(CHART_VIEW_STORAGE_KEY);
    if (stored === "bar" || stored === "donut") setChartView(stored);
  }, []);
  function selectChartView(next: ChartView) {
    setChartView(next);
    window.localStorage.setItem(CHART_VIEW_STORAGE_KEY, next);
  }

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
  // Only shown to the operator (a real signed-in creator) — Present Mode is otherwise a public,
  // unauthenticated display (see the RLS fix noted above), and the destination page enforces the
  // same signed-in-creator check anyway, so a stranger would just hit a sign-in wall.
  const isCreator = isSignedIn && user?.id === lobby.creatorId;

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-8 px-6 py-10">
      <div className="flex flex-wrap animate-pop-in items-center justify-center gap-3">
        <h1 className="font-display text-2xl font-bold text-[var(--foreground)] sm:text-4xl lg:text-5xl">
          {lobby.title}
        </h1>
        <StatusPill status={lobby.status} />
        {isCreator && (
          <Link
            href={`/lobby/${code}/stats`}
            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1 text-sm font-medium text-[var(--foreground-muted)] transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-neutral-700"
          >
            <BarChart3 size={14} /> Detailed stats
          </Link>
        )}
      </div>

      <div className="grid w-full max-w-6xl grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-full max-w-[280px] rounded-3xl bg-white p-6 shadow-2xl [&>svg]:h-auto [&>svg]:w-full">
            <QRCodeSVG value={voteUrl} size={280} title={`QR code to vote in ${lobby.title}`} />
          </div>
          <p className="rounded-full bg-brand-50 px-6 py-2 font-mono text-2xl font-bold tracking-widest text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
            {lobby.code}
          </p>
          <p className="flex items-center gap-2 text-lg text-[var(--foreground-muted)]" aria-live="polite">
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
            // Capped + independently scrollable — a long survey used to grow this column tall
            // enough to push the QR/header off-screen (that column was vertically centered into
            // whatever height this one needed). Now the QR/header stay fixed and visible no
            // matter how many questions there are; only this panel scrolls.
            <div className="flex w-full min-w-0 max-h-[70vh] flex-col gap-6 overflow-y-auto pb-2 pr-1">
              {results.data.tally.some((q) => q.type === "choice") && (
                <div className="flex justify-center">
                  <ChartViewToggle value={chartView} onChange={selectChartView} />
                </div>
              )}
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
                    <TallyChart
                      question={question}
                      q={q}
                      view={chartView}
                      closed={lobby.status === "closed"}
                      size="lg"
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            results.data && (
              <p className="text-center text-2xl text-[var(--foreground-muted)]" aria-live="polite">
                {results.data.progress.completedCount} of {results.data.progress.joined} have voted
              </p>
            )
          )}
        </div>
      </div>
    </main>
  );
}
