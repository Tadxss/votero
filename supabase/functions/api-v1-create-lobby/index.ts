import "@supabase/functions-js/edge-runtime.d.ts";
import { resolveApiKey } from "../_shared/apiAuth.ts";
import { statusForRpcError } from "../_shared/errors.ts";

// Same param mapping as packages/shared/src/hooks/useCreateLobby.ts's rpc_create_lobby call —
// this is the API-callable equivalent of that hook, not a wrapper around an existing Edge
// Function (lobby creation never had one). Its own 'api_create_lobby' rate-limit bucket is an
// API-specific abuse signal on top of rpc_create_lobby's own internal 'create_lobby' bucket.
Deno.serve(async (req) => {
  const resolved = await resolveApiKey(req);
  if (resolved instanceof Response) return resolved;

  const asUser = await resolved.getAsUser();
  if (asUser instanceof Response) return asUser;

  const { error: rateLimitError } = await asUser.rpc("rpc_check_rate_limit", {
    p_action: "api_create_lobby",
    p_max_count: 20,
    p_window: "1 hour",
  });
  if (rateLimitError) {
    return Response.json(
      { error: rateLimitError.message },
      { status: statusForRpcError(rateLimitError.message) },
    );
  }

  const body = await req.json();
  const { data, error } = await asUser.rpc("rpc_create_lobby", {
    p_title: body.title,
    p_questions: body.questions,
    p_voter_cap: body.voterCap,
    p_ballot_mode: body.ballotMode,
    p_tally_visibility: body.tallyVisibility,
    ...(body.closesAt ? { p_closes_at: body.closesAt } : {}),
  });

  if (error) {
    return Response.json({ error: error.message }, { status: statusForRpcError(error.message) });
  }

  return Response.json(data);
});
