"use client";

import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger";
type Size = "sm" | "md";

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm",
};

const variantClasses: Record<Variant, string> = {
  // disabled states set their own text color explicitly (not just a muted bg) — the base `text-*`
  // color (white / red-600) left on top of a disabled bg gave near-invisible contrast in light mode.
  // brand-700 (not the brighter brand-500) is the only shade in the palette that hits WCAG AA
  // 4.5:1 for white text (12.80:1, confirmed by an axe scan) — brand-500 doesn't clear it reliably.
  // bg/hover read a --lobby-accent(-hover) CSS variable with the exact previous color as its
  // fallback — unset everywhere except a branded lobby's vote/present pages (see
  // docs's Branding-per-lobby plan), so every other call site is provably unaffected. Dark mode
  // gets its own, lighter fallback (brand-500/600 instead of 700/900) — navy is dark enough that
  // the 700/900 stops nearly disappear against a dark page background, even though white text on
  // them still passes contrast; a lobby's own custom --lobby-accent still wins in both themes.
  primary:
    "bg-[var(--lobby-accent,theme(colors.brand.700))] text-white shadow-md shadow-brand-700/25 hover:bg-[var(--lobby-accent-hover,theme(colors.brand.900))] hover:shadow-lg hover:shadow-brand-700/30 disabled:bg-neutral-200 disabled:text-neutral-400 disabled:shadow-none dark:bg-[var(--lobby-accent,theme(colors.brand.500))] dark:hover:bg-[var(--lobby-accent-hover,theme(colors.brand.600))] dark:disabled:bg-neutral-700 dark:disabled:text-neutral-500",
  secondary:
    "bg-[var(--surface)] text-[var(--foreground)] border-2 border-neutral-300 hover:border-brand-300 hover:text-brand-600 disabled:text-neutral-400 dark:border-neutral-700 dark:hover:text-brand-300",
  danger:
    "bg-white text-red-600 border-2 border-red-200 hover:bg-red-50 disabled:border-neutral-200 disabled:text-neutral-300 dark:bg-transparent dark:border-red-900 dark:hover:bg-red-950 dark:disabled:border-neutral-800 dark:disabled:text-neutral-600",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  disabled,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={`rounded-full font-semibold transition-all active:scale-95 disabled:cursor-not-allowed disabled:active:scale-100 ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
