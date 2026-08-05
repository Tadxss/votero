import { useMutation } from "@tanstack/react-query";
import { useSupabaseClient } from "../supabase/context";

// After sign-out there's no session at all — useEnsureSession already creates a fresh anonymous
// one the next time any page needs it. Callers may still want to redirect (e.g. web's Header
// sends the user home on success) since staying on a creator-only page with no session is a dead end.
export function useSignOut() {
  const supabase = useSupabaseClient();

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
  });
}
