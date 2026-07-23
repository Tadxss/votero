"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCreateLobby, useEnsureSession, useAuthUser } from "@repo/shared";
import type { BallotMode, TallyVisibility } from "@repo/types";
import { Button } from "../_components/Button";
import { RadioCard } from "../_components/RadioCard";
import { inputClasses } from "../_components/styles";

function friendlyCreateError(message: string): string {
  if (message.includes("LOBBY_LIMIT_REACHED")) {
    return "You've reached the 10-lobby limit for your account — delete an old one to create a new one.";
  }
  return message;
}

export default function CreateLobbyPage() {
  const router = useRouter();
  const { ready } = useEnsureSession();
  const { isSignedIn } = useAuthUser();
  const createLobby = useCreateLobby();

  const [title, setTitle] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [voterCap, setVoterCap] = useState(10);
  const [ballotMode, setBallotMode] = useState<BallotMode>("anonymous");
  const [tallyVisibility, setTallyVisibility] = useState<TallyVisibility>("hidden");
  const [formError, setFormError] = useState<string | null>(null);

  const nonEmptyOptions = options.map((o) => o.trim()).filter(Boolean);
  const canSubmit = ready && title.trim().length > 0 && nonEmptyOptions.length >= 2 && voterCap > 0;

  function updateOption(index: number, value: string) {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  }

  function removeOption(index: number) {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (title.trim().length === 0) {
      setFormError("Give the lobby a title.");
      return;
    }
    if (nonEmptyOptions.length < 2) {
      setFormError("Add at least 2 options.");
      return;
    }
    if (voterCap <= 0) {
      setFormError("Voter cap must be at least 1.");
      return;
    }

    createLobby.mutate(
      {
        title: title.trim(),
        options: nonEmptyOptions,
        voterCap,
        ballotMode,
        tallyVisibility,
      },
      {
        onSuccess: (result) => {
          router.push(`/lobby/${result.lobby.code}/manage`);
        },
      },
    );
  }

  return (
    <main className="relative min-h-[calc(100vh-4rem)] overflow-hidden px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-24 h-72 w-72 rounded-full bg-accent-400/30 blur-3xl dark:bg-accent-600/15"
      />

      <div className="relative mx-auto flex max-w-5xl flex-col gap-6 px-4 sm:px-8">
        <h1 className="font-display text-3xl font-bold text-[var(--foreground)]">
          Create a lobby
        </h1>

        <form
          onSubmit={handleSubmit}
          className="grid animate-pop-in grid-cols-1 gap-6 rounded-3xl border border-neutral-200 bg-[var(--surface)] p-6 shadow-sm dark:border-neutral-800 lg:grid-cols-2 lg:gap-x-10 lg:p-8"
        >
          <div className="flex flex-col gap-6">
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-[var(--foreground)]">
              Title
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Best pizza topping?"
                className={inputClasses}
              />
            </label>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-[var(--foreground)]">Options</span>
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
                    {index + 1}
                  </span>
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className={`flex-1 ${inputClasses} py-2 text-sm`}
                  />
                  {options.length > 2 && (
                    <Button type="button" variant="secondary" onClick={() => removeOption(index)}>
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                className="self-start"
                onClick={() => setOptions((prev) => [...prev, ""])}
              >
                + Add option
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-[var(--foreground)]">
              Voter cap
              <input
                type="number"
                min={1}
                value={voterCap}
                onChange={(e) => setVoterCap(Number(e.target.value))}
                className={inputClasses}
              />
            </label>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-[var(--foreground)]">Ballot mode</span>
              <RadioCard
                name="ballotMode"
                value="anonymous"
                selected={ballotMode === "anonymous"}
                label="Anonymous"
                description="You'll only see aggregate results — not who voted for what."
                onSelect={setBallotMode}
              />
              <RadioCard
                name="ballotMode"
                value="open"
                selected={ballotMode === "open"}
                label="Open"
                description="You'll see each voter's choice."
                onSelect={setBallotMode}
              />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-[var(--foreground)]">
                Tally visibility
              </span>
              <RadioCard
                name="tallyVisibility"
                value="hidden"
                selected={tallyVisibility === "hidden"}
                label="Hidden until closed"
                description="Voters only see progress (X of Y voted) until you close the lobby."
                onSelect={setTallyVisibility}
              />
              <RadioCard
                name="tallyVisibility"
                value="live"
                selected={tallyVisibility === "live"}
                label="Live"
                description="Everyone sees vote counts update in real time."
                onSelect={setTallyVisibility}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:col-span-2">
            {formError && <p className="text-sm font-medium text-red-600">{formError}</p>}
            {createLobby.isError && (
              <p className="text-sm font-medium text-red-600">
                {friendlyCreateError(createLobby.error.message)}
              </p>
            )}

            {!isSignedIn && (
              <p className="text-sm text-[var(--foreground-muted)]">
                <Link href="/login" className="font-semibold text-brand-600 hover:underline">
                  Sign in
                </Link>{" "}
                to save this to your history — or just create it, no account needed.
              </p>
            )}

            <Button
              type="submit"
              disabled={!canSubmit || createLobby.isPending}
              className="w-full lg:w-auto lg:self-start"
            >
              {createLobby.isPending ? "Creating…" : "Create lobby 🎉"}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
