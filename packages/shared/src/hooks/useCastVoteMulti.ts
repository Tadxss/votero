import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CastVoteMultiInput } from "@repo/types";
import { useSupabaseClient } from "../supabase/context";
import { extractFunctionErrorCode } from "../supabase/functionErrors";

// Mirrors useCastVote.ts, but for a question with maxSelections > 1: the same "cast-vote" Edge
// Function branches on payload shape (optionIds present → rpc_cast_vote_multi) and replaces the
// participant's full selection set for that question in one call, rather than one option at a
// time — matching the vote page's "accumulate locally, submit once" model.
export function useCastVoteMulti() {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation<void, Error, CastVoteMultiInput>({
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
