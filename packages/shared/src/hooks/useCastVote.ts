import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CastVoteInput } from "@repo/types";
import { useSupabaseClient } from "../supabase/context";
import { useBallotStore } from "../store/ballotStore";

// Edge Function, not a direct table insert — one vote atomically touches four things (vote row,
// participants.has_voted, lobbies.votes_count, possible auto-close) which must happen inside a
// single transaction (docs/ARCHITECTURE.md "cast-vote").
export function useCastVote() {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();
  const resetBallot = useBallotStore((state) => state.reset);

  return useMutation<void, Error, CastVoteInput>({
    mutationFn: async (input) => {
      const { error } = await supabase.functions.invoke("cast-vote", {
        body: input,
      });
      if (error) throw error;
    },
    onSuccess: (_data, input) => {
      resetBallot();
      queryClient.invalidateQueries({ queryKey: ["lobby-results", input.lobbyId] });
    },
  });
}
