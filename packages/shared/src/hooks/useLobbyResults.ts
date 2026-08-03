import { useQuery } from "@tanstack/react-query";
import type { LobbyResults } from "@repo/types";
import { useSupabaseClient } from "../supabase/context";

// Edge Function, not a direct table read — `votes` has zero client SELECT policies by design;
// this composes progress/tally/ballotDetail with the visibility rules from
// docs/ARCHITECTURE.md "lobby-results" (rpc_get_tally / rpc_get_ballot_detail).
//
// `isPublicView` distinguishes a private organizer dashboard (manage/stats — the creator is
// expected to be able to peek at a "hidden until closed" tally themselves) from a shared/projected
// or voter-facing page (present/vote) where a signed-in creator viewing their own page shouldn't
// get a sneak peek the whole room is deliberately being denied — see lobby-results/index.ts.
export function useLobbyResults(lobbyId: string | undefined, options?: { isPublicView?: boolean }) {
  const supabase = useSupabaseClient();
  const isPublicView = options?.isPublicView ?? false;

  return useQuery<LobbyResults>({
    queryKey: ["lobby-results", lobbyId, isPublicView],
    enabled: Boolean(lobbyId),
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("lobby-results", {
        body: { lobbyId, isPublicView },
      });
      if (error) throw error;
      return data as LobbyResults;
    },
  });
}
