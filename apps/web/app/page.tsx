import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">Votero</h1>
      <p className="text-sm text-neutral-500">QR-code group voting.</p>
      <Link
        href="/create"
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
      >
        Create a lobby
      </Link>
    </main>
  );
}
