import { useEffect, useState } from "react";
import { useSupabaseClient } from "../supabase/context";

// rpc_create_lobby/join-lobby both need auth.uid() to be non-null — bootstraps an anonymous
// session if the caller has none yet, so pages don't have to think about it themselves.
export function useEnsureSession(): { ready: boolean } {
  const supabase = useSupabaseClient();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function ensure() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        await supabase.auth.signInAnonymously();
      }
      if (!cancelled) setReady(true);
    }

    void ensure();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  return { ready };
}
