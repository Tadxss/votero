import "@supabase/functions-js/edge-runtime.d.ts";
import { resolveApiKey } from "../_shared/apiAuth.ts";

// Pure auth-test endpoint — no RPC, no business logic. Lets a future integration's "connect your
// account" flow (or a curl one-liner) confirm a key is valid before doing anything else.
Deno.serve(async (req) => {
  const resolved = await resolveApiKey(req);
  if (resolved instanceof Response) return resolved;

  return Response.json({ ok: true, userId: resolved.userId });
});
