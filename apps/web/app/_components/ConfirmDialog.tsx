"use client";

import { useRef } from "react";
import { Button } from "./Button";
import { useModalA11y } from "./useModalA11y";

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  pendingLabel = "Deleting…",
  isPending,
  error,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  pendingLabel?: string;
  isPending?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  useModalA11y({ open, onClose: onCancel, containerRef });

  if (!open) return null;

  return (
    // Click-outside-to-dismiss backdrop — Escape (handled by useModalA11y) is the keyboard
    // equivalent, so this div itself doesn't need its own key handler.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      {/* stopPropagation only guards against the backdrop's onClose above, not a real interaction */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events */}
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        tabIndex={-1}
        className="w-full max-w-sm animate-pop-in rounded-3xl border border-neutral-300 bg-[var(--surface)] p-6 shadow-xl dark:border-neutral-800"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="font-display text-xl font-bold text-[var(--foreground)]">{title}</h2>
        <p className="mt-2 text-sm text-[var(--foreground-muted)]">{message}</p>
        {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm} disabled={isPending}>
            {isPending ? pendingLabel : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
