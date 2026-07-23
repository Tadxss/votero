import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Profile, UpdateProfileInput } from "@repo/types";
import { useSupabaseClient } from "../supabase/context";

// SECURITY DEFINER RPC, not a raw client .update() — checking "is this username taken by someone
// else" needs to read across other users' profile rows, which profiles_select_self RLS
// deliberately blocks for plain clients (docs/ARCHITECTURE.md "User profiles").
export function useUpdateProfile(userId: string | undefined) {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation<Profile, Error, UpdateProfileInput>({
    mutationFn: async (input) => {
      const { data, error } = await supabase.rpc("rpc_update_profile", {
        p_username: input.username ?? "",
        p_first_name: input.firstName ?? "",
        p_last_name: input.lastName ?? "",
        p_avatar_url: input.avatarUrl ?? "",
      });
      if (error) throw error;
      // rpc_update_profile returns `jsonb` (typed as the generic `Json` union) — the RPC's own
      // profile_to_json (supabase/migrations) guarantees this shape at runtime.
      return data as unknown as Profile;
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(["profile", userId], profile);
    },
  });
}
