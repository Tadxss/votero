import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

// Bearer-key auth for the public api-v1-* functions — no prior art in this codebase (every other
// Edge Function uses withSupabase({auth: "user"}), which expects Supabase's gateway to have
// already verified a real Supabase-issued session JWT). These functions instead receive
// `Authorization: Bearer vk_live_...` and must resolve it themselves, so `verify_jwt = false` is
// set for all three in supabase/config.toml.
//
// The resolved user is impersonated via a genuine session GoTrue itself mints (admin.generateLink
// + verifyOtp), not a JWT this code signs itself — a shared JWT secret only exists for projects on
// Supabase's legacy signing model, and the hosted project has since moved to asymmetric JWT
// Signing Keys, whose private key is never exposed. generateLink/verifyOtp sidesteps the whole
// question of which signing model is active: GoTrue always signs the resulting session correctly.
export interface ResolvedApiKey {
  userId: string;
  // Lazy: api-v1-me never calls this, so a bare "is my key valid" check never touches the
  // rate-limited verifyOtp path below. create-lobby/lobby-results call it once (they need it
  // unconditionally, since rpc_check_rate_limit itself depends on auth.uid()) and get the same
  // memoized client back if called again within the same request. Same value-or-Response
  // convention as resolveApiKey itself: `if (result instanceof Response) return result;`.
  getAsUser: () => Promise<SupabaseClient | Response>;
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface CachedSession {
  accessToken: string;
  expiresAtMs: number;
}

// Module-level — persists across requests within a warm Deno worker, not distributed/persistent
// across workers. GoTrue's own token-verification rate limit (config.toml [auth.rate_limit]
// token_verifications = 30 per 5 min per IP, aggregated across all Edge Function traffic since it
// all originates from Supabase's own infrastructure IPs) is the real reason this cache exists, not
// just a latency optimization — minting a fresh session on every request would burn that budget
// fast under real traffic. Best-effort is an acceptable tradeoff at current scale; revisit if the
// rate limit ever actually gets hit.
const sessionCache = new Map<string, CachedSession>();
const SESSION_REFRESH_MARGIN_MS = 5 * 60 * 1000;

async function mintImpersonatedSession(
  admin: SupabaseClient,
  supabaseUrl: string,
  anonKey: string,
  userId: string,
): Promise<SupabaseClient | null> {
  const cached = sessionCache.get(userId);
  if (cached && cached.expiresAtMs > Date.now() + SESSION_REFRESH_MARGIN_MS) {
    return createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${cached.accessToken}` } },
    });
  }

  const { data: userData, error: userError } = await admin.auth.admin.getUserById(userId);
  const email = userData?.user?.email;
  if (userError || !email) {
    console.error("mintImpersonatedSession: getUserById failed", userError, userData);
    return null;
  }

  // Never sends an email — just returns tokens GoTrue would otherwise put in one. Works
  // regardless of the target user's actual sign-in method (this app is OTP-only, but a magic-link
  // grant is just how the admin API generates any sign-in token for an existing user).
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkError || !linkData?.properties?.hashed_token) {
    console.error("mintImpersonatedSession: generateLink failed", linkError, linkData);
    return null;
  }

  const throwaway = createClient(supabaseUrl, anonKey);
  const { data: sessionData, error: verifyError } = await throwaway.auth.verifyOtp({
    type: "magiclink",
    token_hash: linkData.properties.hashed_token,
  });
  if (verifyError || !sessionData.session) {
    console.error("mintImpersonatedSession: verifyOtp failed", verifyError, sessionData);
    return null;
  }

  const { access_token, expires_at } = sessionData.session;
  sessionCache.set(userId, {
    accessToken: access_token,
    // expires_at is seconds-since-epoch; fall back to a conservative 5-minute assumption if GoTrue
    // ever omits it, so a missing value can't accidentally cache "forever."
    expiresAtMs: expires_at ? expires_at * 1000 : Date.now() + 5 * 60 * 1000,
  });

  return createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${access_token}` } },
  });
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

  // Memoized per-request too, on top of the cross-request sessionCache — a caller invoking
  // getAsUser() twice in one request (rate-limit check, then the business RPC) never mints twice.
  let asUserPromise: Promise<SupabaseClient | null> | null = null;
  const getAsUser = async (): Promise<SupabaseClient | Response> => {
    asUserPromise ??= mintImpersonatedSession(admin, supabaseUrl, anonKey, apiKey.user_id);
    const client = await asUserPromise;
    if (!client) {
      return Response.json({ error: "AUTH_UNAVAILABLE" }, { status: 503 });
    }
    return client;
  };

  return { userId: apiKey.user_id, getAsUser };
}
