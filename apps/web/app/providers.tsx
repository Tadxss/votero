"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createSupabaseClient,
  SupabaseProvider,
  type SupabaseStorageAdapter,
} from "@repo/shared";

const webStorageAdapter: SupabaseStorageAdapter = {
  getItem: (key) => (typeof window === "undefined" ? null : window.localStorage.getItem(key)),
  setItem: (key, value) => {
    if (typeof window !== "undefined") window.localStorage.setItem(key, value);
  },
  removeItem: (key) => {
    if (typeof window !== "undefined") window.localStorage.removeItem(key);
  },
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  // Supabase isn't initialized yet (docs/ARCHITECTURE.md build order step 2) — stay null (and skip
  // the provider below) until NEXT_PUBLIC_SUPABASE_URL/ANON_KEY are set, rather than crashing `pnpm dev`.
  const [supabase] = useState(() =>
    supabaseUrl && supabaseAnonKey
      ? createSupabaseClient({ url: supabaseUrl, anonKey: supabaseAnonKey, storage: webStorageAdapter })
      : null,
  );

  if (!supabase) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SupabaseProvider client={supabase}>{children}</SupabaseProvider>
    </QueryClientProvider>
  );
}
