"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useApiKeys, useCreateApiKey, useRevokeApiKey } from "@repo/shared";
import { Button } from "./Button";
import { inputClasses } from "./styles";
import { useModalA11y } from "./useModalA11y";

function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function ApiKeysModal({
  open,
  onClose,
  userId,
}: {
  open: boolean;
  onClose: () => void;
  userId: string | undefined;
}) {
  const { data: keys } = useApiKeys(open ? userId : undefined);
  const createApiKey = useCreateApiKey(userId);
  const revokeApiKey = useRevokeApiKey(userId);

  const [newKeyName, setNewKeyName] = useState("");
  // Holds the one-time full key right after creation — cleared on close/new-generate so it can
  // never be shown again, matching the Stripe/GitHub "shown once" convention.
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  useModalA11y({ open, onClose, containerRef });

  if (!open) return null;

  function handleClose() {
    setNewKeyName("");
    setRevealedKey(null);
    setCopied(false);
    createApiKey.reset();
    onClose();
  }

  function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    const name = newKeyName.trim();
    if (!name) return;
    createApiKey.mutate(name, {
      onSuccess: (result) => {
        setRevealedKey(result.key);
        setNewKeyName("");
        setCopied(false);
      },
    });
  }

  async function handleCopy() {
    if (!revealedKey) return;
    await navigator.clipboard.writeText(revealedKey);
    setCopied(true);
  }

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={handleClose}
    >
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events */}
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="api-keys-modal-title"
        tabIndex={-1}
        className="w-full max-w-md animate-pop-in rounded-3xl border border-neutral-300 bg-[var(--surface)] p-6 shadow-xl dark:border-neutral-800"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="api-keys-modal-title" className="font-display text-xl font-bold text-[var(--foreground)]">
          API keys
        </h2>
        <p className="mt-1 text-sm text-[var(--foreground-muted)]">
          Create and manage keys for the Votero public API.{" "}
          <Link href="/developers" className="font-medium text-brand-600 hover:underline dark:text-brand-300">
            View API documentation
          </Link>{" "}
          for endpoints and sample requests.
        </p>

        {revealedKey ? (
          <div className="mt-4 rounded-2xl border-2 border-brand-300 bg-brand-50 p-4 dark:border-brand-700 dark:bg-brand-950">
            <p className="text-sm font-semibold text-[var(--foreground)]">
              Copy this key now and store it somewhere safe.
            </p>
            <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">
              You won&apos;t be able to view it again — closing this dialog or navigating away
              loses it for good.
            </p>
            <code className="mt-2 block break-all rounded-xl bg-[var(--surface)] px-3 py-2 text-xs">
              {revealedKey}
            </code>
            <div className="mt-3 flex justify-end gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={handleCopy}>
                {copied ? "Copied!" : "Copy"}
              </Button>
              <Button type="button" size="sm" onClick={() => setRevealedKey(null)}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleGenerate} className="mt-4 flex gap-2">
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g. My integration"
              maxLength={100}
              className={`${inputClasses} flex-1 py-2 text-sm`}
            />
            <Button type="submit" size="sm" disabled={createApiKey.isPending || !newKeyName.trim()}>
              {createApiKey.isPending ? "Generating…" : "Generate key"}
            </Button>
          </form>
        )}

        {createApiKey.isError && (
          <p role="alert" className="mt-2 text-sm font-medium text-red-600">
            Something went wrong generating that key. Please try again.
          </p>
        )}

        <ul className="mt-5 flex max-h-64 flex-col gap-2 overflow-y-auto">
          {keys?.length === 0 && (
            <li className="text-sm text-[var(--foreground-muted)]">No API keys yet.</li>
          )}
          {keys?.map((key) => (
            <li
              key={key.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-300 px-4 py-2.5 dark:border-neutral-800"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--foreground)]">{key.name}</p>
                <p className="text-xs text-[var(--foreground-muted)]">
                  {key.keyPrefix}… · Last used: {formatDate(key.lastUsedAt)}
                </p>
              </div>
              {key.revokedAt ? (
                <span className="shrink-0 text-xs font-medium text-[var(--foreground-muted)]">Revoked</span>
              ) : (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  disabled={revokeApiKey.isPending}
                  onClick={() => revokeApiKey.mutate(key.id)}
                >
                  Revoke
                </Button>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-5 flex justify-end">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
