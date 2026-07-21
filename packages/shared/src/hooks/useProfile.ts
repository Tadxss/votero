import { useQuery } from "@tanstack/react-query";
import type { Profile } from "@repo/types";
import { useSupabaseClient } from "../supabase/context";
import { mapProfileRow } from "../supabase/mappers";

// Direct RLS-gated read — profiles_select_self already restricts this to the caller's own row.
export function useProfile(userId: string | undefined) {
  const supabase = useSupabaseClient();

  return useQuery<Profile>({
    queryKey: ["profile", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId as string)
        .single();
      if (error) throw error;
      return mapProfileRow(data);
    },
  });
}
