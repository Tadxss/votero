import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { statusForRpcError } from "../_shared/errors.ts";

// Atomic cap enforcement (docs/ARCHITECTURE.md "join-lobby") lives in rpc_join_lobby, called with
// `auth: 'user'` so it runs as the caller — the anonymous-session voter or the creator testing
// their own lobby — and rpc_join_lobby's own `select ... for update` serializes concurrent joins.
export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    const { code, displayName } = await req.json();
    if (!code) {
      return Response.json({ error: "MISSING_CODE" }, { status: 400 });
    }

    const { data, error } = await ctx.supabase.rpc("rpc_join_lobby", {
      p_code: code,
      p_display_name: displayName ?? null,
    });

    if (error) {
      return Response.json({ error: error.message }, { status: statusForRpcError(error.message) });
    }

    return Response.json(data);
  }),
};
