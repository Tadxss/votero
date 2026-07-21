import { useQuery } from "@tanstack/react-query";
import type { Lobby } from "@repo/types";
import { useSupabaseClient } from "../supabase/context";
import { mapLobbyRow } from "../supabase/mappers";

// Direct RLS-gated read, same pattern as useLobby — `lobbies_select_creator` already permits a
// creator to see their own rows regardless of status. The explicit `.eq("creator_id", userId)`
// filter is still required: `lobbies_select_public` is a *separate* permissive policy that would
// otherwise also surface everyone else's public/closed lobbies in an unfiltered `select *`.
export function useMyLobbies(userId: string | undefined) {
  const supabase = useSupabaseClient();

  return useQuery<Lobby[]>({
    queryKey: ["my-lobbies", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lobbies")
        .select("*")
        .eq("creator_id", userId as string)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapLobbyRow);
    },
  });
}
