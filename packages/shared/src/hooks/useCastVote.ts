import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CastVoteInput } from "@repo/types";
import { useSupabaseClient } from "../supabase/context";
import { extractFunctionErrorCode } from "../supabase/functionErrors";

// Edge Function, not a direct table insert — one vote atomically touches four things (vote row,
// participants.has_voted, lobbies.votes_count, possible auto-close) which must happen inside a
// single transaction (docs/ARCHITECTURE.md "cast-vote"). Also doubles as an edit: rpc_cast_vote
// updates the caller's existing vote for that question in place if one already exists (the voter
// went back and changed their mind), rather than erroring.
export function useCastVote() {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation<void, Error, CastVoteInput>({
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
