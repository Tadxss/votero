"use client";

import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger";

const variantClasses: Record<Variant, string> = {
  // disabled states set their own text color explicitly (not just a muted bg) — the base `text-*`
  // color (white / red-600) left on top of a disabled bg gave near-invisible contrast in light mode.
  primary:
    "bg-brand-500 text-white shadow-md shadow-brand-500/25 hover:bg-brand-600 hover:shadow-lg hover:shadow-brand-500/30 disabled:bg-neutral-200 disabled:text-neutral-400 disabled:shadow-none dark:disabled:bg-neutral-700 dark:disabled:text-neutral-500",
  secondary:
    "bg-[var(--surface)] text-[var(--foreground)] border-2 border-neutral-300 hover:border-brand-300 hover:text-brand-600 disabled:text-neutral-400 dark:border-neutral-700",
  danger:
    "bg-white text-red-600 border-2 border-red-200 hover:bg-red-50 disabled:border-neutral-200 disabled:text-neutral-300 dark:bg-transparent dark:border-red-900 dark:hover:bg-red-950 dark:disabled:border-neutral-800 dark:disabled:text-neutral-600",
};

export function Button({
  variant = "primary",
  className = "",
  disabled,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={`rounded-full px-4 py-2.5 text-sm font-semibold transition-all active:scale-95 disabled:cursor-not-allowed disabled:active:scale-100 ${variantClasses[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
