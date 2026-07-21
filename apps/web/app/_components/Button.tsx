"use client";

import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger";

const variantClasses: Record<Variant, string> = {
  primary: "bg-neutral-900 text-white hover:bg-neutral-700 disabled:bg-neutral-300",
  secondary:
    "bg-white text-neutral-900 border border-neutral-300 hover:bg-neutral-50 disabled:text-neutral-400",
  danger: "bg-red-600 text-white hover:bg-red-500 disabled:bg-red-200",
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
      className={`rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
