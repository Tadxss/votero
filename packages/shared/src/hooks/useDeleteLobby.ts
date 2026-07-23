import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabaseClient } from "../supabase/context";

// Plain RLS-gated delete, not an RPC — lobbies_delete_own (auth.uid() = creator_id) already
// expresses the only rule that matters here, same reasoning as the direct-read hooks.
export function useDeleteLobby(userId: string | undefined) {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (lobbyId: string) => {
      const { error } = await supabase.from("lobbies").delete().eq("id", lobbyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-lobbies", userId] });
    },
  });
}
