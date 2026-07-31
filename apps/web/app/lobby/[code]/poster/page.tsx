"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import { Lock, SearchX } from "lucide-react";
import { useLobby, useEnsureSession, useAuthUser } from "@repo/shared";
import { Button } from "../../../_components/Button";
import { Spinner } from "../../../_components/Spinner";
import { useDocumentTitle } from "../../../_components/useDocumentTitle";
import {
  downloadPosterPng,
  downloadPosterPdf,
  type PosterPreset,
} from "../../../_components/downloadPoster";
import { trackEvent } from "../../../_lib/analytics";

const PRESET_LABELS: Record<PosterPreset, string> = {
  a4: "A4 Flyer",
  tableTent: "Table Tent",
  slide: "Slide",
};

export default function PosterPage() {
  const { code } = useParams<{ code: string }>();
  const { ready } = useEnsureSession();
  const { user, loading: authLoading } = useAuthUser();
  const { data, isLoading, error } = useLobby(code, { enabled: ready });
  const lobby = data?.lobby;
  useDocumentTitle(lobby ? `${lobby.title} · QR Poster` : "QR poster");

  const [preset, setPreset] = useState<PosterPreset>("a4");
  const [voteUrl, setVoteUrl] = useState("");
  const [downloading, setDownloading] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setVoteUrl(`${window.location.origin}/vote/${code}`);
  }, [code]);

  if (!ready || isLoading) return <Spinner />;
  if (error || !lobby) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <SearchX size={40} strokeWidth={1.5} className="text-[var(--foreground-muted)]" />
        <p className="text-sm text-[var(--foreground-muted)]">Lobby not found.</p>
      </main>
    );
  }

  const isCreator = !authLoading && user?.id === lobby.creatorId;
  if (!isCreator) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <Lock size={40} strokeWidth={1.5} className="text-[var(--foreground-muted)]" />
        <p className="max-w-xs text-sm text-[var(--foreground-muted)]">
          Only this lobby&apos;s creator can generate a poster for it.
        </p>
      </main>
    );
  }

  async function handleDownload(format: "png" | "pdf") {
    const qrCanvas = qrCanvasRef.current;
    if (!qrCanvas || !lobby || !voteUrl) return;
    setDownloading(true);
    try {
      const qrDataUrl = qrCanvas.toDataURL("image/png");
      if (format === "png") {
        await downloadPosterPng(lobby, qrDataUrl, preset);
      } else if (preset !== "slide") {
        await downloadPosterPdf(lobby, qrDataUrl, preset);
      }
      trackEvent("qr_poster_opened", { preset, format });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <main className="relative flex-1 px-4 py-10">
      <div className="relative mx-auto flex max-w-2xl flex-col gap-6">
        <Link
          href={`/lobby/${code}/manage`}
          className="inline-flex w-fit items-center gap-1 text-sm font-medium text-[var(--foreground-muted)] transition-colors hover:text-brand-600"
        >
          ← Back to manage
        </Link>

        <h1 className="font-display text-3xl font-bold text-[var(--foreground)]">QR poster</h1>
        <p className="text-sm text-[var(--foreground-muted)]">
          A print-ready flyer, table tent, or slide for &quot;{lobby.title}&quot;.
        </p>

        <div className="flex flex-wrap gap-2">
          {(Object.keys(PRESET_LABELS) as PosterPreset[]).map((p) => (
            <Button
              key={p}
              type="button"
              variant={preset === p ? "primary" : "secondary"}
              onClick={() => setPreset(p)}
            >
              {PRESET_LABELS[p]}
            </Button>
          ))}
        </div>

        <div className="flex flex-col items-center gap-3 rounded-3xl border border-neutral-300 bg-[var(--surface)] p-8 dark:border-neutral-800">
          {voteUrl && (
            <div className="rounded-2xl bg-white p-4">
              <QRCodeSVG value={voteUrl} size={200} title={`QR code to vote in ${lobby.title}`} />
            </div>
          )}
          <p className="rounded-full bg-brand-50 px-4 py-1 text-lg font-mono font-bold tracking-widest text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
            {lobby.code}
          </p>
        </div>

        {/* Rendered off-screen at a high fixed resolution purely to produce a crisp PNG data URL
            for the poster canvas — canvas bitmap size is independent of CSS display, so this
            still rasterizes correctly while visually hidden. */}
        {voteUrl && (
          <div className="hidden">
            <QRCodeCanvas ref={qrCanvasRef} value={voteUrl} size={1200} />
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => handleDownload("png")} disabled={downloading}>
            {downloading ? "Generating…" : "Download PNG"}
          </Button>
          {preset !== "slide" && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleDownload("pdf")}
              disabled={downloading}
            >
              {downloading ? "Generating…" : "Download PDF"}
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}
