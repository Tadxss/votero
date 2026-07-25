import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { statusForRpcError } from "../_shared/errors.ts";

// Mirrors cast-vote/index.ts exactly (docs/ARCHITECTURE.md "cast-vote") — a text response touches
// the same four things (vote row, participants.answered_count/has_voted, lobbies.votes_count,
// possible auto-close) inside rpc_submit_text_response's own transaction, run as the caller.
export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    const { lobbyId, questionId, responseText } = await req.json();
    if (!lobbyId || !questionId || !responseText) {
      return Response.json({ error: "MISSING_LOBBY_ID_OR_QUESTION_ID_OR_RESPONSE_TEXT" }, { status: 400 });
    }

    const { data: lobby, error } = await ctx.supabase.rpc("rpc_submit_text_response", {
      p_lobby_id: lobbyId,
      p_question_id: questionId,
      p_response_text: responseText,
    });

    if (error) {
      return Response.json({ error: error.message }, { status: statusForRpcError(error.message) });
    }

    // Broadcast the live tally, same convention cast-vote uses — only ever done when
    // tally_visibility='live'; never for hidden lobbies.
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
