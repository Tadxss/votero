"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { SearchX, Lock, Hourglass } from "lucide-react";
import { useLobby, useUpdateLobbyQuestions, useEnsureSession, useAuthUser } from "@repo/shared";
import type { SurveyQuestion } from "@repo/types";
import { Button } from "../../../_components/Button";
import { Spinner } from "../../../_components/Spinner";
import { useDocumentTitle } from "../../../_components/useDocumentTitle";
import QuestionsEditor, {
  type EditableQuestion,
  toCreateLobbyQuestionInputs,
  validateQuestions,
} from "../../../_components/QuestionsEditor";

function toEditableQuestions(questions: SurveyQuestion[]): EditableQuestion[] {
  return questions.map((q) => ({
    id: crypto.randomUUID(),
    title: q.title,
    type: q.type,
    maxSelections: q.maxSelections,
    options: q.options.map((o) => ({ id: crypto.randomUUID(), label: o.label })),
  }));
}

function friendlyEditError(message: string): string {
  if (message === "FORBIDDEN") return "Only this lobby's creator can do that.";
  if (message === "LOBBY_NOT_FOUND") return "This lobby no longer exists.";
  if (message === "LOBBY_NOT_DRAFT") return "Questions can only be edited before voting opens.";
  if (message === "AT_LEAST_ONE_QUESTION_REQUIRED") return "Add at least one question.";
  if (message === "AT_LEAST_TWO_OPTIONS_REQUIRED") return "Every question needs at least 2 options.";
  if (message === "INVALID_MAX_SELECTIONS") {
    return "Max selections must be between 1 and the number of options.";
  }
  if (message === "INAPPROPRIATE_CONTENT") {
    return "Please remove inappropriate language from the questions or options.";
  }
  if (message === "RATE_LIMITED") return "You're saving too quickly — wait a moment and try again.";
  return "Something went wrong. Please try again.";
}

export default function EditLobbyQuestionsPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const { ready } = useEnsureSession();
  const { user, loading: authLoading } = useAuthUser();
  const { data, isLoading, error } = useLobby(code, { enabled: ready });
  const lobby = data?.lobby;
  useDocumentTitle(lobby ? `${lobby.title} · Edit questions` : "Edit questions");

  const updateQuestions = useUpdateLobbyQuestions(code);
  const [questions, setQuestions] = useState<EditableQuestion[] | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (data && questions === null) setQuestions(toEditableQuestions(data.questions));
  }, [data, questions]);

  if (!ready || isLoading || authLoading) return <Spinner />;
  if (error || !lobby) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <SearchX size={40} strokeWidth={1.5} className="text-[var(--foreground-muted)]" />
        <p className="text-[var(--foreground-muted)]">Lobby not found.</p>
      </main>
    );
  }

  const isCreator = user?.id === lobby.creatorId;
  if (!isCreator) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <Lock size={40} strokeWidth={1.5} className="text-[var(--foreground-muted)]" />
        <p className="max-w-xs text-sm text-[var(--foreground-muted)]">
          Only this lobby&apos;s creator can edit its questions.
        </p>
        <Link href={`/lobby/${code}/manage`} className="font-semibold text-brand-700 hover:underline dark:text-brand-300">
          Back to manage
        </Link>
      </main>
    );
  }
  if (lobby.status !== "draft") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <Hourglass size={40} strokeWidth={1.5} className="text-[var(--foreground-muted)]" />
        <p className="max-w-xs text-sm text-[var(--foreground-muted)]">
          Questions can only be edited before voting opens.
        </p>
        <Link href={`/lobby/${code}/manage`} className="font-semibold text-brand-700 hover:underline dark:text-brand-300">
          Back to manage
        </Link>
      </main>
    );
  }
  if (!questions) return <Spinner />;

  function handleSave() {
    if (!questions || !lobby) return;
    setFormError(null);
    const err = validateQuestions(questions);
    if (err) {
      setFormError(err);
      return;
    }
    updateQuestions.mutate(
      { lobbyId: lobby.id, questions: toCreateLobbyQuestionInputs(questions) },
      { onSuccess: () => router.push(`/lobby/${code}/manage`) },
    );
  }

  return (
    <main className="relative flex-1 px-4 py-10">
      <div className="relative mx-auto flex max-w-3xl flex-col gap-6 px-4 sm:px-8">
        <Link
          href={`/lobby/${code}/manage`}
          className="inline-flex w-fit items-center gap-1 text-sm font-medium text-[var(--foreground-muted)] transition-colors hover:text-brand-600 dark:hover:text-brand-300"
        >
          ← Manage lobby
        </Link>

        <h1 className="font-display text-3xl font-bold text-[var(--foreground)]">
          Edit questions
        </h1>

        <QuestionsEditor
          questions={questions}
          onChange={setQuestions}
          disabled={updateQuestions.isPending}
        />

        {formError && (
          <p role="alert" className="text-sm font-medium text-red-600">
            {formError}
          </p>
        )}
        {updateQuestions.isError && (
          <p role="alert" className="text-sm font-medium text-red-600">
            {friendlyEditError(updateQuestions.error.message)}
          </p>
        )}

        <Button
          type="button"
          onClick={handleSave}
          disabled={updateQuestions.isPending}
          className="w-full sm:w-auto sm:self-start"
        >
          {updateQuestions.isPending ? "Saving…" : "Save questions"}
        </Button>
      </div>
    </main>
  );
}
