import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CastTextResponseInput } from "@repo/types";
import { useSupabaseClient } from "../supabase/context";
import { extractFunctionErrorCode } from "../supabase/functionErrors";

// Mirrors useCastVote.ts — an Edge Function, not a direct table insert, since one response
// atomically touches the same four things (vote row, participants.answered_count/has_voted,
// lobbies.votes_count, possible auto-close). Also doubles as an edit, same as useCastVote: the
// text input is local per-question component state on /vote/[code], so revisiting an
// already-answered question and resubmitting just updates it in place server-side.
export function useSubmitTextResponse() {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation<void, Error, CastTextResponseInput>({
    mutationFn: async (input) => {
      const { error } = await supabase.functions.invoke("submit-text-response", {
        body: input,
      });
      if (error) throw new Error(await extractFunctionErrorCode(error));
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ["lobby-results", input.lobbyId] });
    },
  });
}
