"use client";

import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ListChecks, Type, ArrowDownUp, GripVertical } from "lucide-react";
import { containsProfanity } from "@repo/shared";
import type { CreateLobbyQuestionInput, QuestionType } from "@repo/types";
import { Button } from "./Button";
import { inputClasses } from "./styles";

export interface EditableOption {
  id: string; // client-only, stable dnd-kit/React key — never sent to the server
  label: string;
}

export interface EditableQuestion {
  id: string; // client-only, same rules as EditableOption.id
  title: string;
  type: QuestionType;
  options: EditableOption[];
  maxSelections: number;
}

export function makeOption(): EditableOption {
  return { id: crypto.randomUUID(), label: "" };
}

export function makeQuestion(): EditableQuestion {
  return {
    id: crypto.randomUUID(),
    title: "",
    type: "choice",
    options: [makeOption(), makeOption()],
    maxSelections: 1,
  };
}

// Wire shape both rpc_create_lobby and rpc_update_lobby_questions accept — no id/position field,
// array order is the order (see supabase/migrations/20260802090000_editable_draft_questions.sql).
export function toCreateLobbyQuestionInputs(
  questions: EditableQuestion[],
): CreateLobbyQuestionInput[] {
  return questions.map((q) => ({
    title: q.title.trim(),
    type: q.type,
    options: q.type !== "text" ? q.options.map((o) => o.label.trim()).filter(Boolean) : [],
    maxSelections: q.type === "choice" ? q.maxSelections : undefined,
  }));
}

// Client-side pre-check mirroring the server's validate_lobby_questions exactly, so both the
// create and edit forms give the same instant feedback instead of round-tripping to find out.
export function validateQuestions(questions: EditableQuestion[]): string | null {
  const prepared = toCreateLobbyQuestionInputs(questions);
  if (prepared.length === 0) return "Add at least one question.";
  for (const q of prepared) {
    const options = q.options ?? [];
    if (q.title.length === 0) return "Every question needs a title.";
    if (q.type !== "text" && options.length < 2) {
      return q.type === "ranked"
        ? "Every ranked question needs at least 2 options."
        : "Every choice question needs at least 2 options.";
    }
    if (
      q.type === "choice" &&
      ((q.maxSelections ?? 1) < 1 || (q.maxSelections ?? 1) > options.length)
    ) {
      return "Max selections must be between 1 and the number of options.";
    }
    if (
      containsProfanity(q.title) ||
      (q.type !== "text" && options.some((opt) => containsProfanity(opt)))
    ) {
      return "Please remove inappropriate language from the questions or options.";
    }
  }
  return null;
}

export interface QuestionsEditorProps {
  questions: EditableQuestion[];
  onChange: (questions: EditableQuestion[]) => void;
  disabled?: boolean;
}

const dragHandleClasses =
  "cursor-grab touch-none rounded p-1 text-[var(--foreground-muted)] hover:bg-neutral-100 active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-neutral-800";

function SortableOptionRow({
  option,
  qIndex,
  oIndex,
  canRemove,
  disabled,
  onChange,
  onRemove,
}: {
  option: EditableOption;
  qIndex: number;
  oIndex: number;
  canRemove: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition } =
    useSortable({ id: option.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex items-center gap-2"
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        disabled={disabled}
        aria-label={`Reorder option ${oIndex + 1} of question ${qIndex + 1}`}
        className={dragHandleClasses}
      >
        <GripVertical size={14} aria-hidden />
      </button>
      <input
        type="text"
        value={option.label}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Option ${oIndex + 1}`}
        maxLength={200}
        disabled={disabled}
        className={`flex-1 ${inputClasses} py-2 text-sm`}
      />
      {canRemove && (
        <Button type="button" variant="secondary" disabled={disabled} onClick={onRemove}>
          Remove
        </Button>
      )}
    </div>
  );
}

function SortableQuestionCard({
  question,
  qIndex,
  canRemove,
  disabled,
  onTitleChange,
  onTypeChange,
  onRemove,
  onOptionChange,
  onAddOption,
  onRemoveOption,
  onMaxSelectionsChange,
  onReorderOptions,
}: {
  question: EditableQuestion;
  qIndex: number;
  canRemove: boolean;
  disabled?: boolean;
  onTitleChange: (value: string) => void;
  onTypeChange: (type: QuestionType) => void;
  onRemove: () => void;
  onOptionChange: (oIndex: number, value: string) => void;
  onAddOption: () => void;
  onRemoveOption: (oIndex: number) => void;
  onMaxSelectionsChange: (value: number) => void;
  onReorderOptions: (event: DragEndEvent) => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition } =
    useSortable({ id: question.id });
  const optionSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex flex-col gap-3 rounded-2xl border border-neutral-300 p-4 dark:border-neutral-800"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          disabled={disabled}
          aria-label={`Reorder question ${qIndex + 1}`}
          className={dragHandleClasses}
        >
          <GripVertical size={16} aria-hidden />
        </button>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-900 dark:bg-brand-900/40 dark:text-brand-300">
          Q{qIndex + 1}
        </span>
        <input
          type="text"
          value={question.title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Best pizza topping?"
          maxLength={200}
          disabled={disabled}
          className={`flex-1 ${inputClasses}`}
        />
        {canRemove && (
          <Button type="button" variant="secondary" disabled={disabled} onClick={onRemove}>
            Remove
          </Button>
        )}
      </div>

      <div className="flex gap-2 pl-9">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onTypeChange("choice")}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
            question.type === "choice"
              ? "bg-brand-700 text-white"
              : "bg-neutral-100 text-[var(--foreground-muted)] dark:bg-neutral-800"
          }`}
        >
          <ListChecks size={14} /> Choice
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onTypeChange("ranked")}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
            question.type === "ranked"
              ? "bg-brand-700 text-white"
              : "bg-neutral-100 text-[var(--foreground-muted)] dark:bg-neutral-800"
          }`}
        >
          <ArrowDownUp size={14} /> Ranked
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onTypeChange("text")}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
            question.type === "text"
              ? "bg-brand-700 text-white"
              : "bg-neutral-100 text-[var(--foreground-muted)] dark:bg-neutral-800"
          }`}
        >
          <Type size={14} /> Free text
        </button>
      </div>

      {(question.type === "choice" || question.type === "ranked") && (
        <div className="flex flex-col gap-2 pl-9">
          <DndContext
            sensors={optionSensors}
            collisionDetection={closestCenter}
            onDragEnd={onReorderOptions}
          >
            <SortableContext
              items={question.options.map((o) => o.id)}
              strategy={verticalListSortingStrategy}
            >
              {question.options.map((option, oIndex) => (
                <SortableOptionRow
                  key={option.id}
                  option={option}
                  qIndex={qIndex}
                  oIndex={oIndex}
                  canRemove={question.options.length > 2}
                  disabled={disabled}
                  onChange={(value) => onOptionChange(oIndex, value)}
                  onRemove={() => onRemoveOption(oIndex)}
                />
              ))}
            </SortableContext>
          </DndContext>
          <Button
            type="button"
            variant="secondary"
            className="self-start"
            disabled={disabled}
            onClick={onAddOption}
          >
            + Add option
          </Button>
          {question.type === "choice" && question.options.length > 2 && (
            <label className="flex items-center gap-2 text-xs font-semibold text-[var(--foreground-muted)]">
              Max selections
              <input
                type="number"
                min={1}
                max={question.options.length}
                value={question.maxSelections}
                disabled={disabled}
                onChange={(e) => onMaxSelectionsChange(Number(e.target.value))}
                className={`${inputClasses} w-16 py-1 text-center text-sm`}
              />
              <span className="font-normal">
                of {question.options.length} — 1 for a classic single-choice question
              </span>
            </label>
          )}
          {question.type === "ranked" && (
            <p className="text-xs text-[var(--foreground-muted)]">
              Voters will rank these options in order of preference.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function QuestionsEditor({ questions, onChange, disabled }: QuestionsEditorProps) {
  const questionSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function updateQuestionTitle(qIndex: number, value: string) {
    onChange(questions.map((q, i) => (i === qIndex ? { ...q, title: value } : q)));
  }

  function updateQuestionType(qIndex: number, type: QuestionType) {
    onChange(questions.map((q, i) => (i === qIndex ? { ...q, type } : q)));
  }

  function updateOption(qIndex: number, oIndex: number, value: string) {
    onChange(
      questions.map((q, i) =>
        i === qIndex
          ? { ...q, options: q.options.map((o, j) => (j === oIndex ? { ...o, label: value } : o)) }
          : q,
      ),
    );
  }

  function addOption(qIndex: number) {
    onChange(
      questions.map((q, i) => (i === qIndex ? { ...q, options: [...q.options, makeOption()] } : q)),
    );
  }

  function removeOption(qIndex: number, oIndex: number) {
    onChange(
      questions.map((q, i) => {
        if (i !== qIndex) return q;
        const options = q.options.filter((_, j) => j !== oIndex);
        return { ...q, options, maxSelections: Math.min(q.maxSelections, options.length) };
      }),
    );
  }

  function updateMaxSelections(qIndex: number, value: number) {
    onChange(
      questions.map((q, i) =>
        i === qIndex
          ? { ...q, maxSelections: Math.max(1, Math.min(value, q.options.length)) }
          : q,
      ),
    );
  }

  function addQuestion() {
    onChange([...questions, makeQuestion()]);
  }

  function removeQuestion(qIndex: number) {
    onChange(questions.filter((_, i) => i !== qIndex));
  }

  function handleQuestionDragEnd(event: DragEndEvent) {
    if (disabled) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = questions.findIndex((q) => q.id === active.id);
    const newIndex = questions.findIndex((q) => q.id === over.id);
    onChange(arrayMove(questions, oldIndex, newIndex));
  }

  function reorderOptions(qIndex: number, event: DragEndEvent) {
    if (disabled) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onChange(
      questions.map((q, i) => {
        if (i !== qIndex) return q;
        const oldIndex = q.options.findIndex((o) => o.id === active.id);
        const newIndex = q.options.findIndex((o) => o.id === over.id);
        return { ...q, options: arrayMove(q.options, oldIndex, newIndex) };
      }),
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <DndContext
        sensors={questionSensors}
        collisionDetection={closestCenter}
        onDragEnd={handleQuestionDragEnd}
      >
        <SortableContext
          items={questions.map((q) => q.id)}
          strategy={verticalListSortingStrategy}
        >
          {questions.map((question, qIndex) => (
            <SortableQuestionCard
              key={question.id}
              question={question}
              qIndex={qIndex}
              canRemove={questions.length > 1}
              disabled={disabled}
              onTitleChange={(value) => updateQuestionTitle(qIndex, value)}
              onTypeChange={(type) => updateQuestionType(qIndex, type)}
              onRemove={() => removeQuestion(qIndex)}
              onOptionChange={(oIndex, value) => updateOption(qIndex, oIndex, value)}
              onAddOption={() => addOption(qIndex)}
              onRemoveOption={(oIndex) => removeOption(qIndex, oIndex)}
              onMaxSelectionsChange={(value) => updateMaxSelections(qIndex, value)}
              onReorderOptions={(event) => reorderOptions(qIndex, event)}
            />
          ))}
        </SortableContext>
      </DndContext>
      <Button type="button" variant="secondary" className="self-start" disabled={disabled} onClick={addQuestion}>
        + Add question
      </Button>
    </div>
  );
}
