import { useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createSupabaseClient,
  SupabaseProvider,
  type SupabaseStorageAdapter,
} from "@repo/shared";

// Supabase's official guidance for React Native/Expo is AsyncStorage, not SecureStore — an
// auth session (JWT) can exceed SecureStore's ~2KB per-item limit.
const mobileStorageAdapter: SupabaseStorageAdapter = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  // Supabase isn't initialized yet (docs/ARCHITECTURE.md build order step 2) — stay null (and skip
  // the provider below) until EXPO_PUBLIC_SUPABASE_URL/ANON_KEY are set, rather than crashing the app.
  const [supabase] = useState(() =>
    supabaseUrl && supabaseAnonKey
      ? createSupabaseClient({ url: supabaseUrl, anonKey: supabaseAnonKey, storage: mobileStorageAdapter })
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
