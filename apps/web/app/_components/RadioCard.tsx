"use client";

import { Check } from "lucide-react";

export function RadioCard<T extends string>({
  name,
  value,
  selected,
  label,
  description,
  size = "md",
  type = "radio",
  disabled = false,
  onSelect,
}: {
  name: string;
  value: T;
  selected: boolean;
  label: string;
  description?: string;
  size?: "md" | "lg";
  type?: "radio" | "checkbox"; // checkbox: multi-select questions (maxSelections > 1)
  disabled?: boolean; // e.g. a checkbox once maxSelections is reached
  onSelect: (value: T) => void;
}) {
  return (
    <label
      className={`flex items-center gap-3 rounded-2xl border-2 transition-all ${
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      } ${size === "lg" ? "p-4 text-base" : "p-4 text-sm"} ${
        selected
          ? "border-[var(--lobby-accent,theme(colors.brand.500))] bg-brand-50 dark:bg-brand-900/20"
          : "border-neutral-300 hover:border-brand-200 dark:border-neutral-700"
      }`}
    >
      <input
        type={type}
        name={name}
        value={value}
        checked={selected}
        disabled={disabled}
        onChange={() => onSelect(value)}
        className="sr-only"
      />
      <span
        className={`flex shrink-0 items-center justify-center border-2 font-bold text-white transition-colors ${
          type === "checkbox" ? "rounded-md" : "rounded-full"
        } ${size === "lg" ? "h-6 w-6 text-xs" : "h-5 w-5 text-[10px]"} ${
          selected
            ? "border-[var(--lobby-accent,theme(colors.brand.500))] bg-[var(--lobby-accent,theme(colors.brand.500))]"
            : "border-neutral-300 dark:border-neutral-600"
        }`}
      >
        {selected && <Check size={size === "lg" ? 14 : 12} strokeWidth={3} />}
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="font-semibold text-[var(--foreground)]">{label}</span>
        {description && <span className="text-[var(--foreground-muted)]">{description}</span>}
      </span>
    </label>
  );
}
