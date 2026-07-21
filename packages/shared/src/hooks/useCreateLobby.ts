import { useMutation } from "@tanstack/react-query";
import type { CreateLobbyInput, CreateLobbyResult } from "@repo/types";
import { useSupabaseClient } from "../supabase/context";

// Plain RPC, not an Edge Function — single-statement insert of lobby+options, no race to guard
// and nothing sensitive to hide (docs/ARCHITECTURE.md "rpc_create_lobby").
export function useCreateLobby() {
  const supabase = useSupabaseClient();

  return useMutation<CreateLobbyResult, Error, CreateLobbyInput>({
    mutationFn: async (input) => {
      // `as any` args: the placeholder Database type (packages/types/src/database.ts) can't express
      // per-function argument shapes yet — remove once `supabase gen types` replaces it.
      const { data, error } = await supabase.rpc("rpc_create_lobby", {
        p_title: input.title,
        p_options: input.options,
        p_voter_cap: input.voterCap,
        p_ballot_mode: input.ballotMode,
        p_tally_visibility: input.tallyVisibility,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see comment above
      } as any);
      if (error) throw error;
      return data as CreateLobbyResult;
    },
  });
}
