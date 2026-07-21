export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-sm text-[var(--foreground-muted)]">
      <div className="flex gap-1.5">
        <span className="h-2.5 w-2.5 animate-pulse-dot rounded-full bg-brand-500 [animation-delay:0ms]" />
        <span className="h-2.5 w-2.5 animate-pulse-dot rounded-full bg-brand-500 [animation-delay:150ms]" />
        <span className="h-2.5 w-2.5 animate-pulse-dot rounded-full bg-brand-500 [animation-delay:300ms]" />
      </div>
      {label}
    </div>
  );
}
