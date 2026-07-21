import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SetLobbyStatusInput } from "@repo/types";
import { useSupabaseClient } from "../supabase/context";
import { extractFunctionErrorCode } from "../supabase/functionErrors";

// Edge Function rather than a raw client UPDATE — centralizes the auto-close-vs-manual-close
// interaction and keeps status transitions auditable (docs/ARCHITECTURE.md "set-lobby-status").
export function useSetLobbyStatus() {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation<void, Error, SetLobbyStatusInput>({
    mutationFn: async (input) => {
      const { error } = await supabase.functions.invoke("set-lobby-status", {
        body: input,
      });
      if (error) throw new Error(await extractFunctionErrorCode(error));
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ["lobby-results", input.lobbyId] });
    },
  });
}
