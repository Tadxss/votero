export function LiveDot() {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-600 dark:text-accent-400">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-pulse-dot rounded-full bg-accent-500" />
      </span>
      Live
    </span>
  );
}
