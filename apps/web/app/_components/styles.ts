// A slightly recessed fill (`--input-bg`, distinct from the card `--surface` it sits inside) plus
// a darker resting border than a plain card gets — a white-on-white field with only a faint
// neutral-200 line around it was hard to see in light mode; both cues together fix that without
// needing a heavy border.
export const inputClasses =
  "rounded-2xl border-2 border-neutral-300 bg-[var(--input-bg)] px-4 py-2.5 text-base font-normal text-[var(--foreground)] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-400 focus:border-brand-500 dark:border-neutral-700";
