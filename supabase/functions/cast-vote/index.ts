import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { statusForRpcError } from "../_shared/errors.ts";

// One vote atomically touches four things and can trigger auto-close (docs/ARCHITECTURE.md
// "cast-vote") — all handled inside rpc_cast_vote's own transaction, run as the caller.
//
// Branches on payload shape rather than a separate Edge Function: {lobbyId, optionId} (original,
// single-select) calls rpc_cast_vote; {lobbyId, questionId, optionIds} (multi-select, max_selections
// > 1 questions only) calls rpc_cast_vote_multi. Both share the same live-tally broadcast below.
export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    const body = await req.json();
    const { lobbyId } = body;
    if (!lobbyId) {
      return Response.json({ error: "MISSING_LOBBY_ID_OR_OPTION_ID" }, { status: 400 });
    }

    const isMulti = Array.isArray(body.optionIds);
    if (!isMulti && !body.optionId) {
      return Response.json({ error: "MISSING_LOBBY_ID_OR_OPTION_ID" }, { status: 400 });
    }

    const { data: lobby, error } = isMulti
      ? await ctx.supabase.rpc("rpc_cast_vote_multi", {
          p_lobby_id: lobbyId,
          p_question_id: body.questionId,
          p_option_ids: body.optionIds,
        })
      : await ctx.supabase.rpc("rpc_cast_vote", {
          p_lobby_id: lobbyId,
          p_option_id: body.optionId,
        });

    if (error) {
      return Response.json({ error: error.message }, { status: statusForRpcError(error.message) });
    }

    // Broadcast the live tally (docs/ARCHITECTURE.md "Realtime design") — counts only, computed
    // with the service-role client since rpc_get_tally is service_role-only (see functions
    // migration). Only ever done when tally_visibility='live'; never for hidden lobbies.
    // NOTE: sending a broadcast without first subscribing follows Supabase's documented
    // server-side broadcast pattern, but could not be exercised locally without Docker — smoke
    // test against a real/local instance before relying on it.
    if (lobby.tally_visibility === "live") {
      const { data: tally } = await ctx.supabaseAdmin.rpc("rpc_get_tally", { p_lobby_id: lobbyId });
      await ctx.supabaseAdmin.channel(`lobby:${lobbyId}:tally`).send({
        type: "broadcast",
        event: "tally",
        payload: { counts: tally },
      });
    }

    return Response.json({ ok: true });
  }),
};
