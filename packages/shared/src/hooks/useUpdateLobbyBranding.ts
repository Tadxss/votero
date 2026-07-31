import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Lobby, UpdateLobbyBrandingInput } from "@repo/types";
import { useSupabaseClient } from "../supabase/context";
import type { LobbyWithQuestions } from "./useLobby";

// SECURITY DEFINER RPC (rpc_update_lobby_branding), not a raw client .update() — mirrors
// useUpdateProfile.ts. Creator-only check + hex validation + the WCAG-contrast auto-darkening
// safeguard all live server-side (supabase/migrations/20260801090600_lobby_branding.sql), so this
// hook is a thin wrapper, same as its profile counterpart.
export function useUpdateLobbyBranding(code: string | undefined) {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation<Lobby, Error, UpdateLobbyBrandingInput>({
    mutationFn: async (input) => {
      const { data, error } = await supabase.rpc("rpc_update_lobby_branding", {
        p_lobby_id: input.lobbyId,
        p_brand_logo_url: input.brandLogoUrl ?? "",
        p_brand_color: input.brandColor ?? "",
      });
      if (error) throw error;
      // rpc_update_lobby_branding returns jsonb built by lobby_to_json — same shape guarantee as
      // useUpdateProfile relies on for profile_to_json.
      return data as unknown as Lobby;
    },
    onSuccess: (lobby) => {
      queryClient.setQueryData<LobbyWithQuestions>(["lobby", code], (old) =>
        old ? { ...old, lobby } : old,
      );
    },
  });
}
