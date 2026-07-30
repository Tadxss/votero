"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Users, Vote as VoteIcon, Download, Lock } from "lucide-react";
import {
  useLobby,
  useLobbyResults,
  useLobbyRealtime,
  useEnsureSession,
  useAuthUser,
} from "@repo/shared";
import { Button } from "../../../_components/Button";
import { StatCard } from "../../../_components/StatCard";
import { StatusPill } from "../../../_components/StatusPill";
import { Spinner } from "../../../_components/Spinner";
import { TallyChart } from "../../../_components/TallyChart";
import { ChartViewToggle, type ChartView } from "../../../_components/ChartViewToggle";
import { downloadResultsCsv, downloadResultsImage } from "../../../_components/downloadResults";
import { useDocumentTitle } from "../../../_components/useDocumentTitle";
import { trackEvent } from "../../../_lib/analytics";

const CHART_VIEW_STORAGE_KEY = "votero:chart-view";

export default function LobbyStatsPage() {
  const { code } = useParams<{ code: string }>();
  const { ready } = useEnsureSession();
  const { user, isSignedIn, loading: authLoading } = useAuthUser();
  const { data, isLoading, error } = useLobby(code, { enabled: ready });
  const lobby = data?.lobby;
  const questions = data?.questions ?? [];
  useDocumentTitle(lobby ? `${lobby.title} · Stats` : "Stats");
  const results = useLobbyResults(lobby?.id);

  useLobbyRealtime({ lobbyId: lobby?.id, code, tallyVisibility: lobby?.tallyVisibility });

  const [chartView, setChartView] = useState<ChartView>("bar");
  useEffect(() => {
    const stored = window.localStorage.getItem(CHART_VIEW_STORAGE_KEY);
    if (stored === "bar" || stored === "donut") setChartView(stored);
  }, []);
  function selectChartView(next: ChartView) {
    setChartView(next);
    window.localStorage.setItem(CHART_VIEW_STORAGE_KEY, next);
  }

  if (!ready || isLoading || authLoading) return <Spinner />;
  if (error || !lobby) {
    return <main className="p-10 text-sm text-red-600">Lobby not found.</main>;
  }

  // Deliberately stricter than the manage page: detailed stats are only for a real signed-in
  // account (matches this feature's own scope — see docs/ARCHITECTURE.md Build Order), not just
  // whichever browser session happens to match creator_id (which includes anonymous creators).
  const isCreator = isSignedIn && user?.id === lobby.creatorId;

  return (
    <main className="relative flex-1 px-4 py-10">
      <div className="relative mx-auto flex max-w-5xl flex-col gap-6 px-4 sm:px-8">
        <Link
          href={`/lobby/${code}/manage`}
          className="inline-flex w-fit items-center gap-1 text-sm font-medium text-[var(--foreground-muted)] transition-colors hover:text-brand-600"
        >
          ← Manage lobby
        </Link>

        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display text-3xl font-bold text-[var(--foreground)]">
            {lobby.title}
          </h1>
          <StatusPill status={lobby.status} />
        </div>

        {!isSignedIn ? (
          <div className="flex animate-pop-in flex-col items-start gap-3 rounded-3xl border border-neutral-300 bg-[var(--surface)] p-6 shadow-sm dark:border-neutral-800">
            <p className="text-sm text-[var(--foreground-muted)]">
              Sign in to see detailed stats for this lobby.
            </p>
            <Link href={`/login?redirect=${encodeURIComponent(`/lobby/${code}/stats`)}`}>
              <Button>Sign in</Button>
            </Link>
          </div>
        ) : !isCreator ? (
          <div className="flex items-start gap-2 rounded-2xl border border-neutral-300 bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground-muted)] dark:border-neutral-800">
            <Lock size={16} className="mt-0.5 shrink-0" aria-hidden />
            Only this lobby&apos;s creator can view detailed stats.
          </div>
        ) : (
          <div className="flex animate-pop-in flex-col gap-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <StatCard icon={Users} label="Voters joined" value={lobby.joinedCount} />
              <StatCard icon={VoteIcon} label="Votes cast" value={lobby.votesCount} />
            </div>

            {results.data?.tally ? (
              <div className="flex flex-col gap-6 rounded-3xl border border-neutral-300 bg-[var(--surface)] p-5 dark:border-neutral-800">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-[var(--foreground)]">Results</h2>
                  <div className="flex flex-wrap items-center gap-2">
                    {results.data.tally.some((q) => q.type === "choice") && (
                      <ChartViewToggle value={chartView} onChange={selectChartView} />
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
                  </div>
                </div>

                {results.data.tally.map((q) => {
                  const question = questions.find((qq) => qq.id === q.questionId);
                  return (
                    <div
                      key={q.questionId}
                      className="flex flex-col gap-4 border-b border-neutral-100 pb-6 last:border-b-0 last:pb-0 dark:border-neutral-800"
                    >
                      {questions.length > 1 && (
                        <h3 className="text-sm font-semibold text-[var(--foreground)]">
                          {q.questionTitle}
                        </h3>
                      )}
                      <TallyChart
                        question={question}
                        q={q}
                        view={chartView}
                        closed={lobby.status === "closed"}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              results.data && (
                <div
                  className="rounded-3xl border border-neutral-300 bg-[var(--surface)] p-6 text-sm text-[var(--foreground-muted)] dark:border-neutral-800"
                  aria-live="polite"
                >
                  {results.data.progress.completedCount} of {results.data.progress.joined} have
                  voted.
                </div>
              )
            )}
          </div>
        )}
      </div>
    </main>
  );
}
