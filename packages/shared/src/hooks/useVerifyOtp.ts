import { useMutation } from "@tanstack/react-query";
import { useSupabaseClient } from "../supabase/context";

// Step 2 of creator sign-in: submit the code the user typed in. On success this replaces any
// existing (e.g. anonymous) session with the real signed-in one.
export function useVerifyOtp() {
  const supabase = useSupabaseClient();

  return useMutation<void, Error, { email: string; token: string }>({
    mutationFn: async ({ email, token }) => {
      const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
      if (error) throw error;
    },
  });
}
