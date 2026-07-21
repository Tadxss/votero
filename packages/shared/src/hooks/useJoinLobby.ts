import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { JoinLobbyInput, JoinLobbyResult } from "@repo/types";
import { useSupabaseClient } from "../supabase/context";
import { extractFunctionErrorCode } from "../supabase/functionErrors";

// Edge Function, not a direct table insert — atomic cap enforcement requires a `select ... for
// update` transaction (docs/ARCHITECTURE.md "join-lobby"), which isn't expressible as an RLS-gated
// client-side insert.
export function useJoinLobby() {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation<JoinLobbyResult, Error, JoinLobbyInput>({
    mutationFn: async (input) => {
      const { data, error } = await supabase.functions.invoke("join-lobby", {
        body: input,
      });
      if (error) throw new Error(await extractFunctionErrorCode(error));
      return data as JoinLobbyResult;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["lobby", result.lobby.code] });
    },
  });
}
