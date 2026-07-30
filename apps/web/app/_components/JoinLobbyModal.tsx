"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
import { QrCode, Keyboard } from "lucide-react";
import { Button } from "./Button";
import { inputClasses } from "./styles";
import { useModalA11y } from "./useModalA11y";

type Mode = "choice" | "scan" | "code";

// QR codes always encode a full https://.../vote/<CODE> URL (see the manage page's voteUrl) —
// works regardless of which environment (local/hosted) generated it, since we only look at the
// path, not the origin.
const VOTE_PATH_PATTERN = /^\/vote\/[A-Z0-9]+$/i;

export function JoinLobbyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("choice");
  const [code, setCode] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const cameraSupported =
    typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);

  useEffect(() => {
    if (!open) {
      setMode("choice");
      setCode("");
      setScanError(null);
    }
  }, [open]);

  const containerRef = useRef<HTMLDivElement>(null);
  useModalA11y({ open, onClose, containerRef });

  useEffect(() => {
    if (!open || mode !== "scan") return;
    let cancelled = false;

    function handleDecoded(data: string) {
      try {
        const url = new URL(data);
        if (VOTE_PATH_PATTERN.test(url.pathname)) {
          onClose();
          router.push(url.pathname);
          return;
        }
      } catch {
        // not a URL — fall through to the error below
      }
      setScanError("That doesn't look like a Votero QR code.");
    }

    function tick() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const result = jsQR(imageData.data, imageData.width, imageData.height);
          if (result) {
            handleDecoded(result.data);
            return;
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    async function startScanning() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        tick();
      } catch {
        if (!cancelled) {
          setScanError("Camera access was denied — try entering the code instead.");
        }
      }
    }

    startScanning();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open, mode, onClose, router]);

  function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    onClose();
    router.push(`/vote/${trimmed}`);
  }

  if (!open) return null;

  return (
    // Click-outside-to-dismiss backdrop — Escape (handled by useModalA11y) is the keyboard
    // equivalent, so this div itself doesn't need its own key handler.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      {/* stopPropagation only guards against the backdrop's onClose above, not a real interaction */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events */}
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="join-lobby-title"
        tabIndex={-1}
        className="w-full max-w-sm animate-pop-in rounded-3xl border border-neutral-300 bg-[var(--surface)] p-6 shadow-xl dark:border-neutral-800"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="join-lobby-title" className="font-display text-xl font-bold text-[var(--foreground)]">Join a lobby</h2>

        {mode === "choice" && (
          <div className="mt-4 flex flex-col gap-3">
            {cameraSupported && (
              <button
                type="button"
                onClick={() => setMode("scan")}
                className="rounded-2xl border-2 border-neutral-300 p-4 text-left transition-colors hover:border-brand-300 dark:border-neutral-700"
              >
                <span className="flex flex-col gap-0.5">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--foreground)]">
                    <QrCode size={16} /> Scan QR code
                  </span>
                  <span className="text-sm text-[var(--foreground-muted)]">
                    Use your camera to scan a lobby&apos;s QR code.
                  </span>
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setMode("code")}
              className="rounded-2xl border-2 border-neutral-300 p-4 text-left transition-colors hover:border-brand-300 dark:border-neutral-700"
            >
              <span className="flex flex-col gap-0.5">
                <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--foreground)]">
                  <Keyboard size={16} /> Enter code instead
                </span>
                <span className="text-sm text-[var(--foreground-muted)]">
                  Type the 8-character lobby code.
                </span>
              </span>
            </button>
            <Button type="button" variant="secondary" onClick={onClose} className="self-end">
              Cancel
            </Button>
          </div>
        )}

        {mode === "scan" && (
          <div className="mt-4 flex flex-col gap-3">
            <div className="overflow-hidden rounded-2xl bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="aspect-square w-full object-cover"
              />
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <p className="text-center text-sm text-[var(--foreground-muted)]">
              Point your camera at a lobby&apos;s QR code.
            </p>
            {scanError && <p className="text-sm font-medium text-red-600">{scanError}</p>}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setMode("code")}
                className="text-sm font-semibold text-brand-600 hover:underline"
              >
                Use code instead
              </button>
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {mode === "code" && (
          <form onSubmit={handleCodeSubmit} className="mt-4 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-[var(--foreground)]">
              Lobby code
              {/* Focus-safe here: this input only appears after switching modes inside an
                  already-open, already-focus-trapped modal (useModalA11y) — it never steals focus
                  on page load. */}
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 8))}
                placeholder="8-CHAR CODE"
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
                className={`${inputClasses} text-center font-mono tracking-widest`}
              />
            </label>
            <div className="flex items-center justify-between">
              {cameraSupported ? (
                <button
                  type="button"
                  onClick={() => setMode("scan")}
                  className="text-sm font-semibold text-brand-600 hover:underline"
                >
                  Scan QR instead
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={code.trim().length === 0}>
                  Join →
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
