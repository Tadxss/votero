import { useMutation } from "@tanstack/react-query";
import type { CreateLobbyInput, CreateLobbyResult } from "@repo/types";
import { useSupabaseClient } from "../supabase/context";

// Plain RPC, not an Edge Function — single-statement insert of lobby+options, no race to guard
// and nothing sensitive to hide (docs/ARCHITECTURE.md "rpc_create_lobby").
export function useCreateLobby() {
  const supabase = useSupabaseClient();

  return useMutation<CreateLobbyResult, Error, CreateLobbyInput>({
    mutationFn: async (input) => {
      const { data, error } = await supabase.rpc("rpc_create_lobby", {
        p_title: input.title,
        p_options: input.options,
        p_voter_cap: input.voterCap,
        p_ballot_mode: input.ballotMode,
        p_tally_visibility: input.tallyVisibility,
        ...(input.closesAt ? { p_closes_at: input.closesAt } : {}),
      });
      if (error) throw error;
      // rpc_create_lobby returns `jsonb` (typed as the generic `Json` union) — the RPC's own
      // lobby_to_json/option_to_json (supabase/migrations) guarantee this shape at runtime.
      return data as unknown as CreateLobbyResult;
    },
  });
}
