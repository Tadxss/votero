"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ListChecks, Type } from "lucide-react";
import { useCreateLobby, useEnsureSession, useAuthUser } from "@repo/shared";
import type { BallotMode, QuestionType, TallyVisibility } from "@repo/types";
import { Button } from "../_components/Button";
import { RadioCard } from "../_components/RadioCard";
import { inputClasses } from "../_components/styles";
import { useDocumentTitle } from "../_components/useDocumentTitle";
import { trackEvent } from "../_lib/analytics";

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
  return "Something went wrong. Please try again.";
}

interface QuestionDraft {
  title: string;
  type: QuestionType;
  options: string[];
}

function makeQuestionDraft(): QuestionDraft {
  return { title: "", type: "choice", options: ["", ""] };
}

export default function CreateLobbyPage() {
  useDocumentTitle("Create a lobby");
  const router = useRouter();
  const { ready } = useEnsureSession();
  const { isSignedIn } = useAuthUser();
  const createLobby = useCreateLobby();

  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<QuestionDraft[]>([makeQuestionDraft()]);
  const [voterCap, setVoterCap] = useState(10);
  const [ballotMode, setBallotMode] = useState<BallotMode>("anonymous");
  const [tallyVisibility, setTallyVisibility] = useState<TallyVisibility>("hidden");
  const [closesAt, setClosesAt] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const preparedQuestions = questions.map((q) => ({
    title: q.title.trim(),
    type: q.type,
    options: q.type === "choice" ? q.options.map((o) => o.trim()).filter(Boolean) : [],
  }));
  const canSubmit =
    ready &&
    title.trim().length > 0 &&
    preparedQuestions.length > 0 &&
    preparedQuestions.every((q) => q.title.length > 0 && (q.type === "text" || q.options.length >= 2)) &&
    voterCap > 0 &&
    voterCap <= 10000;

  function updateQuestionTitle(qIndex: number, value: string) {
    setQuestions((prev) => prev.map((q, i) => (i === qIndex ? { ...q, title: value } : q)));
  }

  function updateQuestionType(qIndex: number, type: QuestionType) {
    setQuestions((prev) => prev.map((q, i) => (i === qIndex ? { ...q, type } : q)));
  }

  function updateOption(qIndex: number, oIndex: number, value: string) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex ? { ...q, options: q.options.map((o, j) => (j === oIndex ? value : o)) } : q,
      ),
    );
  }

  function addOption(qIndex: number) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === qIndex ? { ...q, options: [...q.options, ""] } : q)),
    );
  }

  function removeOption(qIndex: number, oIndex: number) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex ? { ...q, options: q.options.filter((_, j) => j !== oIndex) } : q,
      ),
    );
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, makeQuestionDraft()]);
  }

  function removeQuestion(qIndex: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== qIndex));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (title.trim().length === 0) {
      setFormError("Give the lobby a title.");
      return;
    }
    if (preparedQuestions.length === 0) {
      setFormError("Add at least one question.");
      return;
    }
    for (const q of preparedQuestions) {
      if (q.title.length === 0) {
        setFormError("Every question needs a title.");
        return;
      }
      if (q.type === "choice" && q.options.length < 2) {
        setFormError("Every choice question needs at least 2 options.");
        return;
      }
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
    <main className="relative min-h-[calc(100vh-4rem)] px-4 py-10">
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

            <div className="flex flex-col gap-4">
              {questions.map((question, qIndex) => (
                <div
                  key={qIndex}
                  className="flex flex-col gap-3 rounded-2xl border border-neutral-300 p-4 dark:border-neutral-800"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
                      Q{qIndex + 1}
                    </span>
                    <input
                      type="text"
                      value={question.title}
                      onChange={(e) => updateQuestionTitle(qIndex, e.target.value)}
                      placeholder="Best pizza topping?"
                      maxLength={200}
                      className={`flex-1 ${inputClasses}`}
                    />
                    {questions.length > 1 && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => removeQuestion(qIndex)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>

                  <div className="flex gap-2 pl-9">
                    <button
                      type="button"
                      onClick={() => updateQuestionType(qIndex, "choice")}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                        question.type === "choice"
                          ? "bg-brand-500 text-white"
                          : "bg-neutral-100 text-[var(--foreground-muted)] dark:bg-neutral-800"
                      }`}
                    >
                      <ListChecks size={14} /> Choice
                    </button>
                    <button
                      type="button"
                      onClick={() => updateQuestionType(qIndex, "text")}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                        question.type === "text"
                          ? "bg-brand-500 text-white"
                          : "bg-neutral-100 text-[var(--foreground-muted)] dark:bg-neutral-800"
                      }`}
                    >
                      <Type size={14} /> Free text
                    </button>
                  </div>

                  {question.type === "choice" && (
                    <div className="flex flex-col gap-2 pl-9">
                      {question.options.map((option, oIndex) => (
                        <div key={oIndex} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                            placeholder={`Option ${oIndex + 1}`}
                            maxLength={200}
                            className={`flex-1 ${inputClasses} py-2 text-sm`}
                          />
                          {question.options.length > 2 && (
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => removeOption(qIndex, oIndex)}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="secondary"
                        className="self-start"
                        onClick={() => addOption(qIndex)}
                      >
                        + Add option
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              <Button type="button" variant="secondary" className="self-start" onClick={addQuestion}>
                + Add question
              </Button>
            </div>
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
              {createLobby.isPending ? "Creating…" : "Create lobby"}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
