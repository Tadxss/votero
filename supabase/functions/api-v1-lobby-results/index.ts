import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import { resolveApiKey } from "../_shared/apiAuth.ts";
import { statusForRpcError } from "../_shared/errors.ts";

// API-callable equivalent of supabase/functions/lobby-results/index.ts, adapted for a caller who
// only has the human-readable `code` (not the internal lobby UUID) and is never the "creator
// previewing their own present/vote page" case lobby-results' isPublicView branch exists for — an
// API caller only ever gets the public tally view. Ownership mismatches return 404, not 403, so a
// wrong/foreign code doesn't even confirm a lobby exists.
Deno.serve(async (req) => {
  const resolved = await resolveApiKey(req);
  if (resolved instanceof Response) return resolved;
  const { userId, asUser } = resolved;

  const { error: rateLimitError } = await asUser.rpc("rpc_check_rate_limit", {
    p_action: "api_get_results",
    p_max_count: 60,
    p_window: "1 hour",
  });
  if (rateLimitError) {
    return Response.json(
      { error: rateLimitError.message },
      { status: statusForRpcError(rateLimitError.message) },
    );
  }

  const code = new URL(req.url).searchParams.get("code");
  if (!code) {
    return Response.json({ error: "MISSING_CODE" }, { status: 400 });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: lobby, error: lobbyError } = await admin
    .from("lobbies")
    .select("id, creator_id, tally_visibility, ballot_mode, status, joined_count, voter_cap")
    .eq("code", code)
    .maybeSingle();

  if (lobbyError || !lobby || lobby.creator_id !== userId) {
    return Response.json({ error: "LOBBY_NOT_FOUND" }, { status: 404 });
  }

  const { data: completedCount, error: completedError } = await admin.rpc(
    "rpc_count_completed_participants",
    { p_lobby_id: lobby.id },
  );
  if (completedError) {
    return Response.json({ error: completedError.message }, { status: 400 });
  }

  const progress = {
    joined: lobby.joined_count,
    cap: lobby.voter_cap,
    completedCount: completedCount ?? 0,
  };

  let tally = null;
  if (lobby.tally_visibility === "live" || lobby.status === "closed") {
    const { data, error } = await admin.rpc("rpc_get_tally", { p_lobby_id: lobby.id });
    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    tally = data;
  }

  let ballotDetail = null;
  if (lobby.ballot_mode === "open") {
    const { data, error } = await asUser.rpc("rpc_get_ballot_detail", { p_lobby_id: lobby.id });
    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    ballotDetail = data;
  }

  return Response.json({ progress, tally, ballotDetail });
});
