import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { statusForRpcError } from "../_shared/errors.ts";

// Creator-only open/close, routed through rpc_set_lobby_status rather than a raw client UPDATE
// (docs/ARCHITECTURE.md "rpc_set_lobby_status") so the denormalized counters and valid status
// transitions stay centralized in one place.
export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    const { lobbyId, action } = await req.json();
    if (!lobbyId || (action !== "open" && action !== "close")) {
      return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
    }

    const { data, error } = await ctx.supabase.rpc("rpc_set_lobby_status", {
      p_lobby_id: lobbyId,
      p_action: action,
    });

    if (error) {
      return Response.json({ error: error.message }, { status: statusForRpcError(error.message) });
    }

    return Response.json(data);
  }),
};
