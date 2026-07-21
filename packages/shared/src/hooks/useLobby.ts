import { useQuery } from "@tanstack/react-query";
import type { Lobby, LobbyOption } from "@repo/types";
import { useSupabaseClient } from "../supabase/context";
import { mapLobbyRow, mapOptionRow } from "../supabase/mappers";

export interface LobbyWithOptions {
  lobby: Lobby;
  options: LobbyOption[];
}

// Direct RLS-gated read (not an Edge Function) — the `lobbies`/`options` SELECT policies in
// docs/ARCHITECTURE.md already permit this for a public, non-draft lobby or its creator.
export function useLobby(code: string | undefined) {
  const supabase = useSupabaseClient();

  return useQuery<LobbyWithOptions>({
    queryKey: ["lobby", code],
    enabled: Boolean(code),
    queryFn: async () => {
      // `as any`: the placeholder Database type (packages/types/src/database.ts) resolves every
      // table's Row type to `any`-typed fields — remove once `supabase gen types` replaces it.
      const { data: lobby, error: lobbyError } = await supabase
        .from("lobbies")
        .select("*")
        .eq("code", code as string)
        .single();
      if (lobbyError) throw lobbyError;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see comment above
      const mappedLobby = mapLobbyRow(lobby as any);

      const { data: options, error: optionsError } = await supabase
        .from("options")
        .select("*")
        .eq("lobby_id", mappedLobby.id)
        .order("position", { ascending: true });
      if (optionsError) throw optionsError;

      return {
        lobby: mappedLobby,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see comment above
        options: ((options ?? []) as any[]).map(mapOptionRow),
      };
    },
  });
}
