import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { SignJWT } from "npm:jose@5";

// Bearer-key auth for the public api-v1-* functions — no prior art in this codebase (every other
// Edge Function uses withSupabase({auth: "user"}), which expects Supabase's gateway to have
// already verified a real Supabase-issued session JWT). These functions instead receive
// `Authorization: Bearer vk_live_...` and must resolve it themselves, so `verify_jwt = false` is
// set for all three in supabase/config.toml.
//
// The resolved user is impersonated via a short-lived, self-minted JWT rather than querying with
// the service-role client directly, so every downstream RPC call (rpc_create_lobby,
// rpc_check_rate_limit, rpc_get_ballot_detail, ...) sees the real caller through `auth.uid()` via
// PostgREST, exactly as if it were a normal signed-in session — no need to duplicate any of those
// RPCs' own auth.uid()-based ownership checks here.
export interface ResolvedApiKey {
  userId: string;
  asUser: SupabaseClient;
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function resolveApiKey(req: Request): Promise<ResolvedApiKey | Response> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return Response.json({ error: "INVALID_API_KEY" }, { status: 401 });
  }
  const rawKey = match[1];

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  // Locally, the CLI auto-injects the project's JWT secret as SUPABASE_INTERNAL_JWT_SECRET —
  // there's no way to set plain `JWT_SECRET` for local dev. On the hosted project, only
  // `JWT_SECRET` can be set (via `supabase secrets set`), since Supabase reserves the
  // `SUPABASE_` prefix for its own auto-injected vars there.
  const jwtSecret = Deno.env.get("JWT_SECRET") ?? Deno.env.get("SUPABASE_INTERNAL_JWT_SECRET")!;

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const keyHash = await sha256Hex(rawKey);

  const { data: apiKey, error } = await admin
    .from("api_keys")
    .select("id, user_id, revoked_at")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (error || !apiKey || apiKey.revoked_at) {
    return Response.json({ error: "INVALID_API_KEY" }, { status: 401 });
  }

  // Fire-and-forget — a failed last_used_at touch shouldn't fail the actual request.
  admin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", apiKey.id)
    .then(() => {});

  const jwt = await new SignJWT({ role: "authenticated" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(apiKey.user_id)
    .setAudience("authenticated")
    .setIssuedAt()
    .setExpirationTime("60s")
    .sign(new TextEncoder().encode(jwtSecret));

  const asUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });

  return { userId: apiKey.user_id, asUser };
}
