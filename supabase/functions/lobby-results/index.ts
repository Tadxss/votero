import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

// Composes progress/tally/ballotDetail per the visibility rules in docs/ARCHITECTURE.md
// "lobby-results". Two different privilege levels are used deliberately:
// - `ctx.supabase` (caller-scoped, RLS applies) reads the lobby row and calls
//   rpc_get_ballot_detail, which self-checks `ballot_mode='open' AND creator_id=auth.uid()`.
// - `ctx.supabaseAdmin` (service role) is the ONLY way to call rpc_get_tally, which has no
//   internal auth check of its own — this function decides whether the caller is allowed to see
//   the tally (live / closed / is-creator) *before* reaching for the admin client, not after.
export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    const { lobbyId } = await req.json();
    if (!lobbyId) {
      return Response.json({ error: "MISSING_LOBBY_ID" }, { status: 400 });
    }

    const { data: lobby, error: lobbyError } = await ctx.supabase
      .from("lobbies")
      .select("*")
      .eq("id", lobbyId)
      .single();

    if (lobbyError || !lobby) {
      return Response.json({ error: "LOBBY_NOT_FOUND" }, { status: 404 });
    }

    const isCreator = lobby.creator_id === ctx.userClaims!.id;

    const progress = {
      joined: lobby.joined_count,
      cap: lobby.voter_cap,
      votesCast: lobby.votes_count,
    };

    let tally = null;
    if (lobby.tally_visibility === "live" || lobby.status === "closed" || isCreator) {
      const { data, error } = await ctx.supabaseAdmin.rpc("rpc_get_tally", { p_lobby_id: lobbyId });
      if (error) {
        return Response.json({ error: error.message }, { status: 400 });
      }
      tally = data;
    }

    let ballotDetail = null;
    if (lobby.ballot_mode === "open" && isCreator) {
      const { data, error } = await ctx.supabase.rpc("rpc_get_ballot_detail", {
        p_lobby_id: lobbyId,
      });
      if (error) {
        return Response.json({ error: error.message }, { status: 400 });
      }
      ballotDetail = data;
    }

    return Response.json({ progress, tally, ballotDetail });
  }),
};
