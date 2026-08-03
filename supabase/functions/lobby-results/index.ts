import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

// Composes progress/tally/ballotDetail per the visibility rules in docs/ARCHITECTURE.md
// "lobby-results". Two different privilege levels are used deliberately:
// - `ctx.supabase` (caller-scoped, RLS applies) reads the lobby row and calls
//   rpc_get_ballot_detail, which self-checks `ballot_mode='open' AND creator_id=auth.uid()`.
// - `ctx.supabaseAdmin` (service role) is the ONLY way to call rpc_get_tally, which has no
//   internal auth check of its own — this function decides whether the caller is allowed to see
//   the tally (live / closed / is-creator, unless the caller passes isPublicView — see below)
//   *before* reaching for the admin client, not after.
// Since multi-question surveys: both RPCs return an array grouped per question
// (`[{ questionId, questionTitle, tally|entries: [...] }, ...]`) instead of one flat array — this
// function just forwards whatever shape the RPC returns, so no change needed here beyond this note.
export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    const { lobbyId, isPublicView } = await req.json();
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

    // Count of participants who've finished the WHOLE survey, not lobby.votes_count — that's a
    // raw vote-row total (one per question per participant), which overcounts as soon as a survey
    // has more than one question (see LobbyProgress.completedCount's comment in packages/types).
    // Goes through a SECURITY DEFINER RPC rather than a direct admin-client table read, since
    // `participants` deliberately has no service_role grant (see grants.sql) — same reasoning as
    // rpc_get_tally below.
    const { data: completedCount, error: completedError } = await ctx.supabaseAdmin.rpc(
      "rpc_count_completed_participants",
      { p_lobby_id: lobbyId },
    );

    if (completedError) {
      return Response.json({ error: completedError.message }, { status: 400 });
    }

    const progress = {
      joined: lobby.joined_count,
      cap: lobby.voter_cap,
      completedCount: completedCount ?? 0,
    };

    // The creator-preview bypass only applies to a private dashboard (manage/stats) — a caller
    // viewing a shared/projected or voter-facing page (present/vote) passes isPublicView so a
    // signed-in creator on their OWN present/vote page doesn't get a sneak peek at a tally the
    // rest of the room is deliberately being denied by "hidden until closed."
    const creatorBypass = isCreator && !isPublicView;
    let tally = null;
    if (lobby.tally_visibility === "live" || lobby.status === "closed" || creatorBypass) {
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
