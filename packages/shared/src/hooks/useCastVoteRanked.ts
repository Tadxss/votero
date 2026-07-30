import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CastVoteRankedInput } from "@repo/types";
import { useSupabaseClient } from "../supabase/context";
import { extractFunctionErrorCode } from "../supabase/functionErrors";

// Mirrors useCastVoteMulti.ts, but for a "ranked" question: the same "cast-vote" Edge Function
// branches on payload shape (rankedOptionIds present → rpc_cast_vote_ranked) and replaces the
// participant's full ordered ranking for that question in one call.
export function useCastVoteRanked() {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation<void, Error, CastVoteRankedInput>({
    mutationFn: async (input) => {
      const { error } = await supabase.functions.invoke("cast-vote", {
        body: input,
      });
      if (error) throw new Error(await extractFunctionErrorCode(error));
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ["lobby-results", input.lobbyId] });
    },
  });
}
