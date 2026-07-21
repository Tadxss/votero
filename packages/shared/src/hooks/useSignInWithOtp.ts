import { useMutation } from "@tanstack/react-query";
import { useSupabaseClient } from "../supabase/context";

// Step 1 of creator sign-in: request a 6-digit code, emailed via the custom magic_link template
// (supabase/templates/magic_link.html) which uses {{ .Token }} instead of a clickable link.
export function useSignInWithOtp() {
  const supabase = useSupabaseClient();

  return useMutation<void, Error, { email: string }>({
    mutationFn: async ({ email }) => {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
    },
  });
}
