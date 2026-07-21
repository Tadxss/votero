import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useSupabaseClient } from "../supabase/context";

export interface AuthUserState {
  user: User | null;
  isSignedIn: boolean; // real (non-anonymous) account
  loading: boolean;
}

// The one primitive the header, /lobbies, and the /create sign-in nudge all read from — whether
// the current session is a real signed-in account vs. anonymous (or not yet resolved).
export function useAuthUser(): AuthUserState {
  const supabase = useSupabaseClient();
  const [state, setState] = useState<AuthUserState>({
    user: null,
    isSignedIn: false,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const user = data.session?.user ?? null;
      setState({ user, isSignedIn: user != null && !user.is_anonymous, loading: false });
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      setState({ user, isSignedIn: user != null && !user.is_anonymous, loading: false });
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, [supabase]);

  return state;
}
