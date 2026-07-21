import { useQuery } from "@tanstack/react-query";
import type { LobbyResults } from "@repo/types";
import { useSupabaseClient } from "../supabase/context";

// Edge Function, not a direct table read — `votes` has zero client SELECT policies by design;
// this composes progress/tally/ballotDetail with the visibility rules from
// docs/ARCHITECTURE.md "lobby-results" (rpc_get_tally / rpc_get_ballot_detail).
export function useLobbyResults(lobbyId: string | undefined) {
  const supabase = useSupabaseClient();

  return useQuery<LobbyResults>({
    queryKey: ["lobby-results", lobbyId],
    enabled: Boolean(lobbyId),
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("lobby-results", {
        body: { lobbyId },
      });
      if (error) throw error;
      return data as LobbyResults;
    },
  });
}
