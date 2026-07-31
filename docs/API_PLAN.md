# Public API — implementation plan (not built yet)

Sketched during the ranked-choice voting session, deliberately deferred so it can be reviewed and
edited on its own before anyone commits to building it. This file is the durable version of that
plan — edit it directly, or hand it to a fresh chat session with "implement docs/API_PLAN.md" and
it has everything needed to pick up cold.

## Why

Let external callers (a script, another app, or an LLM given a prompt like "write me a JSON
payload for a 3-question survey about X") create and inspect lobbies programmatically instead of
only through the web form. The backend is already a set of `SECURITY DEFINER` RPCs behind thin
Edge Functions, so exposing a subset of them to API-key callers is additive, not a rework — the
real work is machine-to-machine auth, a separate rate-limit posture, and documentation, not new
business logic.

## Scope decisions (edit these if you disagree)

- **Creator-side operations only, v1.** Expose lobby creation and reading results; deliberately
  **do not** expose `cast-vote`/`join-lobby` via API key — those represent an end-user voting, not
  a server acting on their behalf. Revisit only if a real use case needs it.
- **API keys, not session JWTs.** Supabase session tokens expire/rotate and aren't meant for
  long-lived server-to-server use. A real API key (opaque token, hashed at rest) is the standard
  pattern here.
- **Versioned from day one** (`/api/v1/...`) even though there's only one version — cheaper to
  reserve the prefix now than migrate existing callers later.

## Auth

New table:

```sql
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  name text not null,               -- creator-facing label, e.g. "Zapier integration"
  key_hash text not null,           -- sha-256 of the actual key; the key itself is never stored
  key_prefix text not null,         -- first ~8 chars, shown in the UI so a user can tell keys apart
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
create unique index api_keys_key_hash_idx on public.api_keys (key_hash);
```

- Key format: something greppable/recognizable, e.g. `vk_live_<32 random chars>` — generated
  client-side-visible exactly once at creation time (standard "shown once" UX, same as
  Stripe/GitHub tokens), only the hash persisted server-side afterward.
- **Only signed-in accounts can generate API keys** — anonymous creators have no stable identity
  for a key to belong to, and this is exactly the kind of durable-account feature that's already
  gated behind sign-in elsewhere in the app (lobby history, the 10-lobby cap).
- A new Edge Function shared-auth helper (or inline in each API function, following the existing
  `withSupabase` wrapper pattern) resolves `Authorization: Bearer <key>` → hash it → look up
  `api_keys` → get `user_id` → proceed as that user for the RPC call. Reject with `401` if missing/
  invalid/revoked; touch `last_used_at` on success (fire-and-forget, don't block the response on it).
- **UI**: a new "API keys" section, likely on the profile/settings area — list existing keys
  (prefix + name + last used, never the full key again), a "Generate new key" button showing the
  full key once, and a revoke button per key.

## Endpoints (v1)

All under a new `supabase/functions/api-v1-*` naming convention (or a single `api` Edge Function
that routes internally by path — pick whichever this project's Edge Function conventions favor
once you're implementing; both are viable, a single router function is simpler to deploy).

| Method | Path | Wraps | Notes |
|---|---|---|---|
| `POST` | `/api/v1/lobbies` | `rpc_create_lobby` | Same JSON body shape the web form already builds (`CreateLobbyInput` — including `maxSelections` and `type: "ranked"` questions, both work for free since the RPC already supports them). |
| `GET` | `/api/v1/lobbies/{code}` | existing `useLobby` read path | Returns lobby + questions, same shape as `CreateLobbyResult`. |
| `GET` | `/api/v1/lobbies/{code}/results` | `lobby-results` Edge Function's existing logic | Only for lobbies the key's owner created (same creator-check `rpc_get_ballot_detail` already does — reuse it, don't invent a new gate). |

Response envelope: reuse the same JSON shapes already defined in `packages/types/src/domain.ts`
(`CreateLobbyResult`, `LobbyResults`, etc.) rather than inventing a parallel API-specific schema —
one source of truth for what a lobby/result looks like.

Error shape: reuse the existing `{"error": "CODE"}` convention (`supabase/functions/_shared/errors.ts`)
so the same error vocabulary applies whether a request came from the web app or the API.

## Rate limiting

Reuse `rpc_check_rate_limit` (already exists, `supabase/migrations/20260730120000_...`), but with
its own `action` bucket per endpoint (e.g. `'api_create_lobby'`) and its own thresholds — API
callers have a different usage shape than a human clicking a form (potentially legitimate bursts
from a script, but also a clearer abuse signal if a single key is hammering the endpoint). Suggest
starting conservative (e.g. 20 lobby creations/hour per key) and loosening based on real usage
rather than guessing generously up front.

## Docs

- **OpenAPI spec** (`docs/openapi.yaml` or similar) — gives generated interactive docs and a
  "try it" UI for free via any OpenAPI viewer, better than hand-written Markdown for an audience
  that's often another program (or another AI) consuming it, not a human reading prose.
- **`docs/API.md`** — the human-facing companion: how to generate a key, a copy-pasteable curl
  example, and explicitly the "why this exists" framing: an example prompt like *"Write a JSON
  payload for a 3-question survey about picking a team lunch spot, one ranked-choice question and
  two regular choice questions, then POST it to `/api/v1/lobbies`"* — showing the actual intended
  workflow, not just a generic reference doc.

## Implementation checklist (for whichever session builds this)

1. `api_keys` table + RLS (a user can only see/revoke their own keys) + grants.
2. Key generation/hashing logic (where — a new RPC `rpc_create_api_key`? A dedicated Edge
   Function? Either works; an RPC is more consistent with this codebase's existing pattern of
   putting logic in Postgres, not Deno).
3. Shared bearer-key-auth resolution used by the new API endpoints.
4. The 3 endpoints above, each a thin wrapper over an existing RPC/read path.
5. Rate-limit bucket(s) for the new endpoints.
6. Frontend: API-keys management UI (list/generate/revoke).
7. `docs/openapi.yaml` + `docs/API.md`.
8. e2e/integration test: generate a key via the UI (or directly via SQL in a test), call
   `POST /api/v1/lobbies` with a real curl/fetch (mirroring the load-test script's pattern of
   calling Edge Functions directly with plain `fetch`, not a browser), confirm the created lobby
   is readable both via the API and the normal web UI.

## Open questions to resolve before/while building (edit this file with your answers)

- Should free/anonymous accounts ever get API access, or is this a "signed-in accounts only"
  feature permanently? (Current lean: signed-in only, ties naturally into whatever paid-tier
  gating gets built later.)
- Single router Edge Function vs. one function per endpoint — no strong reason either way yet.
- Should API-created lobbies count toward the existing 10-lobby cap for signed-in accounts, or
  have their own separate limit? (Current lean: same cap, same counter — one lobby is one lobby
  regardless of how it was created.)
