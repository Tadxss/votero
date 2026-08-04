import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateApiKeyResult } from "@repo/types";
import { useSupabaseClient } from "../supabase/context";

// Plain RPC, not an Edge Function — single-statement insert, nothing to orchestrate. The raw key
// in the response is only ever shown this once (docs/API.md); the caller owns showing/copying it.
export function useCreateApiKey(userId: string | undefined) {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation<CreateApiKeyResult, Error, string>({
    mutationFn: async (name) => {
      const { data, error } = await supabase.rpc("rpc_create_api_key", { p_name: name });
      if (error) throw error;
      return data as unknown as CreateApiKeyResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys", userId] });
    },
  });
}
