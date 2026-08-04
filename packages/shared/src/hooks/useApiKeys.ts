import { useQuery } from "@tanstack/react-query";
import type { ApiKey } from "@repo/types";
import { useSupabaseClient } from "../supabase/context";
import { mapApiKeyRow } from "../supabase/mappers";

// Direct RLS-gated read — api_keys_select_self already restricts this to the caller's own keys.
// Never selects key_hash: nothing here needs it, and there's no reason to pull it over the wire.
export function useApiKeys(userId: string | undefined) {
  const supabase = useSupabaseClient();

  return useQuery<ApiKey[]>({
    queryKey: ["api-keys", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_keys")
        .select("id, name, key_prefix, created_at, last_used_at, revoked_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapApiKeyRow);
    },
  });
}
