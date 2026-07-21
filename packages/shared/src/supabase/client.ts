import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@repo/types";
import type { SupabaseStorageAdapter } from "./storage";

export interface CreateSupabaseClientOptions {
  url: string;
  anonKey: string;
  storage: SupabaseStorageAdapter;
}

// Each app calls this once with its own env vars (EXPO_PUBLIC_* on mobile, NEXT_PUBLIC_* on web)
// and its own storage adapter, so both apps end up with identical session-handling behavior
// (docs/ARCHITECTURE.md: "Auth ... should live in the shared package").
export function createSupabaseClient({
  url,
  anonKey,
  storage,
}: CreateSupabaseClientOptions): SupabaseClient<Database> {
  return createClient<Database>(url, anonKey, {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}
