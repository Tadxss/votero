"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCreateLobby, useEnsureSession, useAuthUser, containsProfanity } from "@repo/shared";
import type { BallotMode, TallyVisibility } from "@repo/types";
import { Button } from "../_components/Button";
import { RadioCard } from "../_components/RadioCard";
import { inputClasses } from "../_components/styles";
import { useDocumentTitle } from "../_components/useDocumentTitle";
import { trackEvent } from "../_lib/analytics";
import QuestionsEditor, {
  type EditableQuestion,
  makeQuestion,
  toCreateLobbyQuestionInputs,
  validateQuestions,
} from "../_components/QuestionsEditor";

function friendlyCreateError(message: string): string {
  if (message.includes("LOBBY_LIMIT_REACHED")) {
    return "You've reached the 10-lobby limit for your account — delete an old one to create a new one.";
  }
  if (message.includes("CLOSES_AT_MUST_BE_FUTURE")) {
    return "Auto-close time must be in the future.";
  }
  if (message.includes("AT_LEAST_ONE_QUESTION_REQUIRED")) {
    return "Add at least one question.";
  }
  if (message.includes("AT_LEAST_TWO_OPTIONS_REQUIRED")) {
    return "Every question needs at least 2 options.";
  }
  if (message.includes("INVALID_MAX_SELECTIONS")) {
    return "Max selections must be between 1 and the number of options.";
  }
  if (message.includes("INAPPROPRIATE_CONTENT")) {
    return "Please remove inappropriate language from the title, questions, or options.";
  }
  if (message.includes("RATE_LIMITED")) {
    return "You're creating lobbies too quickly — wait a few minutes and try again.";
  }
  return "Something went wrong. Please try again.";
}

export default function CreateLobbyPage() {
  useDocumentTitle("Create a lobby");
  const router = useRouter();
  const { ready } = useEnsureSession();
  const { isSignedIn } = useAuthUser();
  const createLobby = useCreateLobby();

  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<EditableQuestion[]>(() => [
    makeQuestion("initial-question"),
  ]);
  const [voterCap, setVoterCap] = useState(10);
  const [ballotMode, setBallotMode] = useState<BallotMode>("anonymous");
  const [tallyVisibility, setTallyVisibility] = useState<TallyVisibility>("hidden");
  const [closesAt, setClosesAt] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const preparedQuestions = toCreateLobbyQuestionInputs(questions);
  const canSubmit =
    ready &&
    title.trim().length > 0 &&
    validateQuestions(questions) === null &&
    voterCap > 0 &&
    voterCap <= 10000;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (title.trim().length === 0) {
      setFormError("Give the lobby a title.");
      return;
    }
    if (containsProfanity(title)) {
      setFormError("Please remove inappropriate language from the title.");
      return;
    }
    const questionsError = validateQuestions(questions);
    if (questionsError) {
      setFormError(questionsError);
      return;
    }
    if (voterCap <= 0) {
      setFormError("Voter cap must be at least 1.");
      return;
    }
    if (voterCap > 10000) {
      setFormError("Voter cap can't exceed 10,000.");
      return;
    }
    if (closesAt && new Date(closesAt) <= new Date()) {
      setFormError("Auto-close time must be in the future.");
      return;
    }

    createLobby.mutate(
      {
        title: title.trim(),
        questions: preparedQuestions,
        voterCap,
        ballotMode,
        tallyVisibility,
        closesAt: closesAt ? new Date(closesAt).toISOString() : undefined,
      },
      {
        onSuccess: (result) => {
          trackEvent("lobby_created", {
            mode: isSignedIn ? "signedIn" : "anonymous",
            questionCount: preparedQuestions.length,
            tallyVisibility,
          });
          router.push(`/lobby/${result.lobby.code}/manage`);
        },
      },
    );
  }

  return (
    <main className="relative flex-1 px-4 py-10">
      <div className="relative mx-auto flex max-w-5xl flex-col gap-6 px-4 sm:px-8">
        <h1 className="font-display text-3xl font-bold text-[var(--foreground)]">
          Create a lobby
        </h1>

        <form
          onSubmit={handleSubmit}
          className="grid animate-pop-in grid-cols-1 gap-6 rounded-3xl border border-neutral-300 bg-[var(--surface)] p-6 shadow-sm dark:border-neutral-800 lg:grid-cols-2 lg:gap-x-10 lg:p-8"
        >
          <div className="flex flex-col gap-6">
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-[var(--foreground)]">
              Title
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Team survey"
                maxLength={200}
                className={inputClasses}
              />
            </label>

            <QuestionsEditor
              questions={questions}
              onChange={setQuestions}
              disabled={createLobby.isPending}
            />
          </div>

          <div className="flex flex-col gap-6">
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-[var(--foreground)]">
              Voter cap
              <input
                type="number"
                min={1}
                max={10000}
                value={voterCap}
                onChange={(e) => setVoterCap(Number(e.target.value))}
                className={inputClasses}
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-semibold text-[var(--foreground)]">
              Auto-close at{" "}
              <span className="font-normal text-[var(--foreground-muted)]">(optional)</span>
              <input
                type="datetime-local"
                value={closesAt}
                onChange={(e) => setClosesAt(e.target.value)}
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
            {formError && (
              <p role="alert" className="text-sm font-medium text-red-600">
                {formError}
              </p>
            )}
            {createLobby.isError && (
              <p role="alert" className="text-sm font-medium text-red-600">
                {friendlyCreateError(createLobby.error.message)}
              </p>
            )}

            {!isSignedIn && (
              <p className="text-sm text-[var(--foreground-muted)]">
                <Link href="/login" className="font-semibold text-brand-700 hover:underline dark:text-brand-300">
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
              {createLobby.isPending ? "Creating…" : "Create lobby"}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
