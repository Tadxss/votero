import { useMutation } from "@tanstack/react-query";
import { useSupabaseClient } from "../supabase/context";

// After sign-out there's no session at all — useEnsureSession already creates a fresh anonymous
// one the next time any page needs it, so nothing else has to react to this.
export function useSignOut() {
  const supabase = useSupabaseClient();

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
  });
}
