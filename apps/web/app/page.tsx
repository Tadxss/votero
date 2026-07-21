import Link from "next/link";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-6 overflow-hidden px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-brand-300/40 blur-3xl dark:bg-brand-700/30"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-accent-400/40 blur-3xl dark:bg-accent-600/20"
      />

      <span className="text-5xl">🗳️</span>
      <h1 className="font-display text-5xl font-extrabold tracking-tight text-[var(--foreground)]">
        Votero
      </h1>
      <p className="max-w-xs text-center text-[var(--foreground-muted)]">
        Create a lobby, share a QR code, watch the votes roll in live.
      </p>
      <Link
        href="/create"
        className="rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition-all hover:bg-brand-600 hover:shadow-lg hover:shadow-brand-500/30 active:scale-95"
      >
        Create a lobby
      </Link>
    </main>
  );
}
