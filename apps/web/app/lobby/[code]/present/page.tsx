"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { qrImageSettings } from "../../../_components/qrLogo";
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
import { Button } from "../../../_components/Button";
import { StatusPill } from "../../../_components/StatusPill";
import { LiveDot } from "../../../_components/LiveDot";
import { Spinner } from "../../../_components/Spinner";
import { useDocumentTitle } from "../../../_components/useDocumentTitle";
import { lobbyBrandingStyle } from "../../../_components/lobbyBranding";

const CHART_VIEW_STORAGE_KEY = "votero:chart-view";

export default function PresentLobbyPage() {
  const { code } = useParams<{ code: string }>();
  const { ready } = useEnsureSession();
  const { user, isSignedIn } = useAuthUser();
  const { data, isLoading, error } = useLobby(code, { enabled: ready });
  const lobby = data?.lobby;
  const questions = data?.questions ?? [];
  useDocumentTitle(lobby ? `${lobby.title} · Present` : "Present");
  // Present Mode is a shared/projected display, not a private organizer dashboard — a signed-in
  // creator viewing their own Present Mode shouldn't get a "hidden until closed" tally sneak peek
  // the rest of the room is deliberately being denied (see lobby-results/index.ts).
  const results = useLobbyResults(lobby?.id, { isPublicView: true });

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

  const tally = results.data?.tally;
  const [questionIndex, setQuestionIndex] = useState(0);
  const hasMultipleQuestions = (tally?.length ?? 0) > 1;

  // A presenter clicking through slides while talking is a natural fit for arrow-key navigation —
  // cheap to add on the same code path as the Next/Previous buttons below.
  useEffect(() => {
    if (!hasMultipleQuestions || !tally) return;
    const lastIndex = tally.length - 1;
    function handleKeydown(e: KeyboardEvent) {
      if (e.key === "ArrowRight") setQuestionIndex((i) => Math.min(i + 1, lastIndex));
      if (e.key === "ArrowLeft") setQuestionIndex((i) => Math.max(i - 1, 0));
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [hasMultipleQuestions, tally]);

  if (!ready || isLoading) return <Spinner />;
  if (error || !lobby) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <SearchX size={40} strokeWidth={1.5} className="text-[var(--foreground-muted)]" />
        <p className="text-[var(--foreground-muted)]">Lobby not found.</p>
      </main>
    );
  }

  const currentTally = tally?.[questionIndex];
  const joinedPct = Math.min(100, (lobby.joinedCount / lobby.voterCap) * 100);
  // Only shown to the operator (a real signed-in creator) — Present Mode is otherwise a public,
  // unauthenticated display (see the RLS fix noted above), and the destination page enforces the
  // same signed-in-creator check anyway, so a stranger would just hit a sign-in wall.
  const isCreator = isSignedIn && user?.id === lobby.creatorId;
  // Draft lobbies and hidden-until-closed tallies (still open) have no chart to show — the
  // two-column grid below reserves a whole column for one either way, which reads as a lopsided
  // empty half on a projector. Falls back to a single centered column when there's nothing to plot.
  const hasChartContent = lobby.status !== "draft" && Boolean(currentTally);

  const qrBlock = (
    <div className="flex flex-col items-center gap-4">
      <div className="w-full max-w-[280px] rounded-3xl bg-white p-6 shadow-2xl [&>svg]:h-auto [&>svg]:w-full">
        <QRCodeSVG
          value={voteUrl}
          size={280}
          level="H"
          imageSettings={qrImageSettings(lobby.brandLogoUrl, 280)}
          title={`QR code to vote in ${lobby.title}`}
        />
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
          style={{
            width: `${joinedPct}%`,
            ...(lobby.brandColor ? { backgroundColor: lobby.brandColor } : {}),
          }}
        />
      </div>
    </div>
  );

  const statusMessage =
    lobby.status === "draft" ? (
      <p className="text-center text-2xl text-[var(--foreground-muted)]">
        Scan to get ready — voting opens soon
      </p>
    ) : (
      results.data && (
        <p className="text-center text-2xl text-[var(--foreground-muted)]" aria-live="polite">
          {results.data.progress.completedCount} of {results.data.progress.joined} have voted
        </p>
      )
    );

  return (
    <main
      className="relative flex min-h-screen flex-col items-center justify-center gap-8 px-6 py-10"
      style={lobbyBrandingStyle(lobby.brandColor)}
    >
      <div className="flex flex-wrap animate-pop-in items-center justify-center gap-3">
        {lobby.brandLogoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary uploaded logo, not a static asset Next can optimize
          <img
            src={lobby.brandLogoUrl}
            alt=""
            className="h-10 w-10 shrink-0 rounded-lg object-contain sm:h-14 sm:w-14"
          />
        )}
        <h1 className="font-display text-2xl font-bold text-[var(--foreground)] sm:text-4xl lg:text-5xl">
          {lobby.title}
        </h1>
        <StatusPill status={lobby.status} />
        {isCreator && (
          <Link
            href={`/lobby/${code}/stats`}
            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1 text-sm font-medium text-[var(--foreground-muted)] transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-neutral-700 dark:hover:text-brand-300"
          >
            <BarChart3 size={14} /> Detailed stats
          </Link>
        )}
      </div>

      {hasChartContent && currentTally ? (
        <div className="grid w-full max-w-6xl grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          {qrBlock}

          <div className="flex w-full min-w-0 flex-col items-center gap-6">
            {/* One question at a time (Next/Previous below) — no scrolling needed, since a single
                question's natural height never grows tall enough to threaten pushing the QR/header
                off-screen the way a stacked multi-question list once did. */}
            {currentTally.type === "choice" && (
              <div className="flex justify-center">
                <ChartViewToggle value={chartView} onChange={selectChartView} />
              </div>
            )}
            <div className="flex w-full flex-col gap-3">
              {questions.length > 1 && (
                <h2 className="truncate text-center text-lg font-semibold text-[var(--foreground-muted)]">
                  {currentTally.questionTitle}
                </h2>
              )}
              <TallyChart
                question={questions.find((qq) => qq.id === currentTally.questionId)}
                q={currentTally}
                view={chartView}
                closed={lobby.status === "closed"}
                size="lg"
              />
            </div>
            {hasMultipleQuestions && tally && (
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  className="shrink-0"
                  disabled={questionIndex === 0}
                  onClick={() => setQuestionIndex((i) => i - 1)}
                >
                  ← Previous
                </Button>
                <p className="whitespace-nowrap text-sm font-medium text-[var(--foreground-muted)]">
                  Question {questionIndex + 1} of {tally.length}
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  className="shrink-0"
                  disabled={questionIndex === tally.length - 1}
                  onClick={() => setQuestionIndex((i) => i + 1)}
                >
                  Next →
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex w-full max-w-sm flex-col items-center gap-8">
          {qrBlock}
          {statusMessage}
        </div>
      )}
    </main>
  );
}
