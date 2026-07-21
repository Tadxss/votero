import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { TallyEntry, TallyVisibility } from "@repo/types";
import { useSupabaseClient } from "../supabase/context";

export interface UseLobbyRealtimeOptions {
  lobbyId: string | undefined;
  code: string | undefined;
  tallyVisibility: TallyVisibility | undefined;
  onTally?: (counts: TallyEntry[]) => void;
}

// Two Realtime primitives, per docs/ARCHITECTURE.md "Realtime design":
// - Postgres Changes on the `lobbies` row only — drives status/joined_count/votes_count. Safe
//   for any subscriber the existing SELECT policies already allow; `participants`/`votes` are
//   never replicated (that would leak voter->option linkage regardless of RLS).
// - Broadcast on `lobby:{id}:tally`, function-published, counts-only payload — only subscribed
//   when tally_visibility === 'live'.
export function useLobbyRealtime({
  lobbyId,
  code,
  tallyVisibility,
  onTally,
}: UseLobbyRealtimeOptions) {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!lobbyId) return;

    const statusChannel = supabase
      .channel(`lobby:${lobbyId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "lobbies",
          filter: `id=eq.${lobbyId}`,
        },
        () => {
          if (code) queryClient.invalidateQueries({ queryKey: ["lobby", code] });
          queryClient.invalidateQueries({ queryKey: ["lobby-results", lobbyId] });
        },
      )
      .subscribe();

    let tallyChannel: ReturnType<typeof supabase.channel> | undefined;
    if (tallyVisibility === "live") {
      tallyChannel = supabase
        .channel(`lobby:${lobbyId}:tally`)
        .on("broadcast", { event: "tally" }, ({ payload }) => {
          onTally?.(payload.counts as TallyEntry[]);
          queryClient.invalidateQueries({ queryKey: ["lobby-results", lobbyId] });
        })
        .subscribe();
    }

    return () => {
      supabase.removeChannel(statusChannel);
      if (tallyChannel) supabase.removeChannel(tallyChannel);
    };
  }, [supabase, queryClient, lobbyId, code, tallyVisibility, onTally]);
}
