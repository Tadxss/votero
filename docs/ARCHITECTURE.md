# Votero — Architecture & MVP Plan

## Context

The goal is one cross-platform app (iOS + Android + Web, single monorepo, shared business logic) — built as a portfolio/demo piece that's also plausibly monetizable. Votero is a **QR-code-based group voting/polling app**: a creator makes a "lobby" with a question and options, shares a QR code / link, and people scan it to vote — no account required to vote, with optional accounts for creators to keep history.

This concept was picked specifically because it exercises every distinctive part of the stack better than the alternatives considered: Supabase **Realtime** is the headline feature (live join/vote progress, instant open→closed transitions), **anonymous auth** fits "vote without an account" naturally, **RLS** has a genuinely hard problem to solve (hiding voter identity in anonymous-ballot mode), and **Edge Functions** are needed for real reasons (atomic cap enforcement, atomic vote-casting + auto-close), not just as a stack checkbox. Monetization precedent exists (Slido/Mentimeter/StrawPoll: free tier + paid creator tier), and "embed this on any website later" falls out of the URL design almost for free.

**Terminology note**: "unanimous vs not unanimous" voting (product owner's original phrasing) means **anonymous vs attributed (open) ballot mode** — i.e. whether the creator can see who voted for what, not a consensus/decision rule. Code/schema use `ballot_mode: 'anonymous' | 'open'`.

### Confirmed MVP scope
- Public lobbies only for MVP: creator sets a numeric voter cap; first N people to scan/join get to vote. (Private invite-by-username rosters are a deferred feature — schema must not preclude it.)
- Ballot mode is creator-configurable per lobby: **anonymous** (creator sees only aggregate results) or **open** (creator sees who voted for what).
- Tally visibility is creator-configurable per lobby: **live** (everyone sees counts update in real time) or **hidden** (only "X/Y voted" progress until the creator closes the lobby).
- Lobby lifecycle: draft → open → closed. Creator opens/closes manually; auto-closes when the cap is reached and everyone who joined has voted.
- No-account voting via Supabase anonymous auth sessions, persisted per device; one-vote-per-person enforced best-effort via that session (industry-standard, deliberately not solved with OTP for MVP — but the schema reserves a column so a per-lobby OTP toggle can be added later without a rewrite).
- Optional real accounts: creators get persistent lobby history; anonymous sessions are upgradeable to permanent accounts later.
- QR encodes a plain `https://` URL (not a custom scheme) so voting works with zero app install — this is deliberate, since random QR-scanners must not be forced to install anything. The same URL is set up (not built yet) to later support universal/app-link interception by the native app, and later still, iframe embedding on third-party sites.
- Deferred but explicitly *not precluded* architecturally: private invite rosters, per-lobby OTP verification, embeddable third-party widget, a shared `packages/ui` component library (share logic first, unify UI later if it makes sense).

---

## Architecture

### Postgres schema
```sql
create type lobby_status as enum ('draft', 'open', 'closed');
create type ballot_mode as enum ('anonymous', 'open');
create type tally_visibility as enum ('live', 'hidden');
create type lobby_visibility as enum ('public', 'private'); -- only 'public' used in MVP

create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  is_anonymous boolean not null default true,
  created_at   timestamptz not null default now()
); -- populated by an `on auth.users insert` trigger

create table public.lobbies (
  id               uuid primary key default gen_random_uuid(),
  code             text unique not null,             -- short QR/link code, see below
  creator_id       uuid not null references auth.users(id) on delete cascade,
  title            text not null check (char_length(title) between 1 and 200),
  status           lobby_status not null default 'draft',
  ballot_mode      ballot_mode not null default 'anonymous',
  tally_visibility tally_visibility not null default 'hidden',
  visibility       lobby_visibility not null default 'public',  -- future private-lobby hook
  voter_cap        integer not null check (voter_cap > 0 and voter_cap <= 10000),
  joined_count     integer not null default 0,        -- denormalized, maintained only by rpc_join_lobby
  votes_count      integer not null default 0,         -- denormalized, maintained only by rpc_cast_vote
  otp_required     boolean not null default false,     -- future per-lobby stronger-verification hook, unused in MVP
  opened_at        timestamptz,
  closed_at        timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table public.options (
  id       uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references public.lobbies(id) on delete cascade,
  label    text not null check (char_length(label) between 1 and 200),
  position integer not null,
  unique (lobby_id, position)
);

create table public.participants (
  id           uuid primary key default gen_random_uuid(),
  lobby_id     uuid not null references public.lobbies(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  display_name text,                        -- shown in open-ballot detail only
  has_voted    boolean not null default false,
  joined_at    timestamptz not null default now(),
  unique (lobby_id, user_id),
  unique (lobby_id, id)                      -- lets votes FK-compose (lobby_id, participant_id)
);

create table public.votes (
  id             uuid primary key default gen_random_uuid(),
  lobby_id       uuid not null references public.lobbies(id) on delete cascade,
  participant_id uuid not null,
  option_id      uuid not null references public.options(id) on delete cascade,
  created_at     timestamptz not null default now(),
  unique (lobby_id, participant_id),          -- hard one-vote-per-person guarantee
  foreign key (lobby_id, participant_id) references public.participants(lobby_id, id) on delete cascade
);
```

Key points:
- `code` (8-char Crockford base32, ambiguous chars excluded, collision-retried trigger default) is the only public lobby identifier — never expose the uuid `id` for lookup.
- `joined_count`/`votes_count` are denormalized onto `lobbies` specifically so a single Realtime subscription on that one row drives all progress UI (see Realtime below).
- Anonymous vs. open ballot is a property of the **lobby**, never a flag on the vote row — visibility is enforced entirely by which server function you're allowed to call, not by data shape.
- `visibility` and `otp_required` columns exist now, unused in MVP, specifically so private-roster and stronger-verification can land later as additive changes, not migrations that touch the hot path.

### RLS policy design
Enable RLS everywhere. **`votes` gets zero client SELECT/INSERT policies at all — default deny.** RLS can filter rows but can't express "you may see an aggregate count but not the individual row," and any policy permissive enough to compute a client-side tally is also permissive enough to leak the exact voter→option linkage anonymous mode must hide. So:
- `lobbies`: creator sees their own (any status); everyone else sees `public` + non-`draft` lobbies.
- `options`: readable wherever the parent lobby is readable; writable by creator only while `status = 'draft'`.
- `participants`: creator can see the full roster (names + `has_voted` boolean) for their own lobby — safe, since knowing *who joined* and *whether* they voted never reveals *what* they voted for; a participant can see their own row. No client INSERT policy — joining goes through `rpc_join_lobby` only.
- `votes`: no policies at all. All access (insert, tally, ballot detail) goes through `SECURITY DEFINER` RPCs below.

**RLS is not enough on its own — table/function GRANTs are required too.** This Supabase version's default is `auto_expose_new_tables` off: new tables are **not** automatically reachable by `anon`/`authenticated` the way older Supabase docs/tutorials assume. A GRANT is what lets a role attempt an operation at all; RLS then further restricts *which rows* that operation can see/touch. Without the GRANT, every query fails with "permission denied for table X" before RLS is ever evaluated. `supabase/migrations/..._grants.sql` grants exactly: `select, insert, update` on `lobbies`, `select, insert` on `options`, `select` on `participants` and `profiles` — and nothing at all on `votes` (the strongest possible lockdown: no policy *and* no grant). The same rule applies to functions invoked transitively from an invoker-mode call — see `generate_lobby_code`'s grant in that migration.

### Edge Functions (Deno) wrapping `SECURITY DEFINER` Postgres RPCs
Thin Edge Functions validate input/auth and call Postgres functions that do the atomic transactional work (locking primitives live in Postgres, not Deno).

- **`rpc_create_lobby`** — plain RPC, no true Edge Function needed (single-statement insert of lobby+options, no race, nothing sensitive to hide). Called out to contrast with the three below.
- **`join-lobby` → `rpc_join_lobby(code, display_name)`** — needed because cap enforcement ("read joined_count, compare to cap, conditionally insert") races under concurrent scans at the boundary; the RPC does `select ... for update` on the lobby row to serialize joiners, checks for an idempotent re-join, then inserts + increments atomically.
- **`cast-vote` → `rpc_cast_vote(lobby_id, option_id)`** — needed because one vote touches four things atomically (insert vote row, flip `participants.has_voted`, increment `lobbies.votes_count`, conditionally flip `status → closed`), and auto-close ("cap reached AND all joined have voted") must be checked inside the same transaction as the increment to avoid racing a manual close. `select ... for update` on the lobby row serializes this per-lobby.
- **`lobby-results` → `rpc_get_tally` (pure aggregate, no identity, always safe) + `rpc_get_ballot_detail` (participant→option linkage, internally gated to `ballot_mode='open' AND creator_id=auth.uid()`, else `FORBIDDEN`)** — two separate function shapes so the identity-carrying shape structurally cannot be requested except by the one path allowed to see it. The Edge Function composes: progress (always safe) + tally (if `tally_visibility='live'` or lobby closed or caller is creator) + ballot detail (only if open-mode creator).
- **`set-lobby-status`** — creator-only open/close, routed through a function rather than a raw client UPDATE for auditability and to centralize the auto-close-vs-manual-close interaction.

### Realtime design
Two primitives for two sensitivity levels:
- **Postgres Changes on `lobbies` only** (`alter publication supabase_realtime add table public.lobbies`) — delivers `status`/`joined_count`/`votes_count` changes to any client the existing `lobbies` SELECT policies already allow. Drives "X/Y joined," "X/Y voted," and the draft→open→closed transition. **`participants` and `votes` are never added to the realtime publication** — replicating `votes` would leak the exact voter→option linkage via the replication payload itself, regardless of any RLS policy.
- **Broadcast channel `lobby:{id}:tally`** — published only by the server side of `cast-vote`, after it has computed `rpc_get_tally`, with a payload of `{counts: [...]}` only — never a participant id. Clients only subscribe when `tally_visibility='live'`. Recommend Realtime Authorization on this topic (gate subscription to callers who can currently SELECT that lobby row) as defense in depth.

### QR / URL / deep-link design
- QR encodes `https://vote.<domain>/vote/{code}` — always a plain https URL, never a custom scheme, so any camera app opens it directly with zero install.
- `apps/web/app/vote/[code]/page.tsx` branches on lobby status: draft → "not open yet"; open+unjoined → bootstrap anonymous auth session + `join-lobby` + show ballot; open+voted → progress/live tally; closed → results (+ ballot detail if open-mode creator).
- Universal/App Links (wired later, not now): because the primary link is always plain https, registering `ios.associatedDomains` / Android App Links intent filters later makes the *same* link open the native app when installed and fall through to the browser otherwise — no architecture change, just two static `.well-known` files plus a mirrored Expo Router route.
- Embeddable widget (deferred): `/vote/[code]` is self-contained (bootstraps its own session, no assumption of being the top window), so a later `?embed=1` iframe mode needs no schema/RLS/Edge Function changes.

---

## Build Order

1. **Scaffold monorepo** — Turborepo, `apps/mobile` (`create-expo-app`, Expo Router), `apps/web` (`create-next-app`, App Router), empty `packages/shared` + `packages/types`, root `turbo.json`/`tsconfig.base.json`, NativeWind configured in both apps. ✅ *done.*
2. **Supabase schema**: `supabase init`; `supabase/migrations/..._init.sql` (enums/tables above), `..._rls.sql`, `..._functions.sql` (all RPCs above + `generate_lobby_code`), `..._realtime.sql` (publication + authorization policy), `..._grants.sql` (explicit table/function GRANTs — see below). ✅ *done and verified against a real local Postgres* (Docker Desktop installed, `supabase start`). Three real bugs were found and fixed by that verification, all worth knowing about: (1) this Supabase version's `auto_expose_new_tables` default is off, so tables are **not** auto-granted to `anon`/`authenticated` anymore — RLS policies only restrict rows on top of an existing GRANT, they don't substitute for one, so a `..._grants.sql` migration explicitly grants exactly what each role needs; (2) the same applies to functions called transitively from an invoker-mode RPC (`generate_lobby_code`, called from `rpc_create_lobby`'s trigger, needed its own grant); (3) a PL/pgSQL variable named `code` in `generate_lobby_code()` collided with the `lobbies.code` column, requiring a rename to `v_code`. Full lifecycle smoke-tested directly via psql (cap enforcement, one-vote-per-person, auto-close, `rpc_get_tally` correctly denied to `authenticated` and only usable via `service_role`, `rpc_get_ballot_detail` correctly `FORBIDDEN` for non-creators *and* for the creator on an anonymous-mode lobby, `votes` table completely unreachable directly).
3. **Edge Functions**: `supabase/functions/{join-lobby,cast-vote,lobby-results,set-lobby-status}/index.ts`, using the `@supabase/server` `withSupabase({ auth: 'user' })` wrapper (current Supabase CLI template convention) — `ctx.supabase` is caller-scoped (RLS/grants apply, correct `auth.uid()`), `ctx.supabaseAdmin` is service-role (used only for `rpc_get_tally`, per its function-level comment). ✅ *done and verified end-to-end* against the local stack via real anonymous-auth sessions (signup → create lobby → open → join → vote → results), including confirming `lobby-results` correctly hides `ballotDetail` from a non-creator caller while still returning the live tally to everyone.

   **Hosted project**: linked to the real Supabase project (`supabase link`), all 5 migrations pushed (`supabase db push`), all 4 Edge Functions deployed (`supabase functions deploy`), and Auth config synced (`supabase config push` — this is how `enable_anonymous_sign_ins` and other `[auth]` settings in `config.toml` actually reach a hosted project; it's a separate step from migrations). The full end-to-end flow above was re-run against the hosted project directly (not just local) with identical results. One config gotcha hit along the way: `config.toml`'s default `[storage.vector] enabled = true` makes `config push` fail with a 402 on any project not on a paid plan — set to `false` since this app doesn't use Storage. Local dev env files (`apps/web/.env.local`, `apps/mobile/.env`, both gitignored) point at the **local** stack (`http://127.0.0.1:54321`) by default; switch them to the hosted project's URL/anon key for staging-like testing.
4. **packages/types**: hand-written `domain.ts` for the enums/DTOs above ✅ *done*; `database.ts` ✅ *done — real generated types*, produced via a `docker run` of the `postgres-meta` image directly (see the file's header comment for the exact command and why: `supabase gen types typescript --local` on this machine's CLI version shells out to `podman` unconditionally rather than the configured Docker runtime, and fails).
5. **packages/shared**: Supabase client with a platform-pluggable storage adapter (RN AsyncStorage vs web localStorage), TanStack Query hooks (`useLobby`, `useCreateLobby`, `useJoinLobby`, `useCastVote`, `useLobbyResults`, `useSetLobbyStatus`, `useLobbyRealtime`), a small Zustand store for in-progress ballot selection UI state. ✅ *done.*
6. **Web creator flow**: `apps/web/app/create/page.tsx` (form → `rpc_create_lobby`), `apps/web/app/lobby/[code]/manage/page.tsx` (QR via `qrcode.react`, open/close, live progress/results). ✅ *done and verified via a scripted Playwright browser run (see docs/TESTING.md).*
7. **Web voter flow**: `apps/web/app/vote/[code]/page.tsx` per the status-branch behavior above. ✅ *done and verified* — including the auto-join-on-mount behavior, `hasVoted`-aware refresh handling, and the `LOBBY_FULL` error path.
8. **Mobile creator + voter flow**: Expo Router equivalents of steps 6–7, `react-native-qrcode-svg` for QR display, same `packages/shared` hooks — deliberately not sharing UI components yet (share logic first). *Not started.*
9. **Realtime wiring verification**: confirm the `lobbies` Postgres Changes subscription end-to-end on both apps; confirm the `lobby:{id}:tally` broadcast round-trip from `cast-vote` to a live-tally UI. ✅ *done for web* — verified live "X/Y joined" updates and the live-tally broadcast round-trip with two independent anonymous sessions in separate browser contexts. Mobile side still blocked on step 8.

   **Bugs found building the web UI** (all fixed): (1) two different pnpm-resolved React instances (`apps/web` vs. `packages/shared`, pulled apart by `apps/mobile`'s exact React pin) silently broke React Context — `QueryClientProvider`'s context wasn't visible to hooks running under the other React copy. Fixed with a root `pnpm.overrides` pinning `react`/`react-dom` to one version workspace-wide; this would have hit the mobile build too once it used these hooks with a provider. (2) `useLobby`'s query fired before `useEnsureSession` had a session, hitting `lobbies` as unauthenticated `anon` (which has no grant) and 401ing — masked by TanStack Query's default retry. Fixed by giving `useLobby` an `enabled` option and gating it on session-readiness in both pages. (3) `rpc_join_lobby` never returned `has_voted`, so a page refresh after voting would show the ballot again — added a migration (`..._join_result_has_voted.sql`) to include it.
10. **Accounts/history**: ✅ *done*, with one deliberate change from the original sketch — no anonymous→permanent upgrade. Creators sign in with an email OTP code (`supabase.auth.signInWithOtp`/`verifyOtp`) *before* creating a lobby to have it tied to a real account; a lobby created anonymously stays anonymous forever, there's no retroactive "claim my past anonymous lobbies" flow (email-confirmation-based linking can silently break across browser contexts — not worth it for what it buys). New `packages/shared` hooks: `useAuthUser`, `useSignInWithOtp`, `useVerifyOtp`, `useSignOut`, `useMyLobbies`. New pages: `/login` (two-step email → code), `/lobbies` ("My Lobbies", gated on `useAuthUser().isSignedIn`, not on lobby creation), a persistent `Header` component. `/create` keeps working fully anonymously — the only addition is a one-line, ignorable "sign in to save this to your history" nudge.
    - **Real bug found deploying this**: Supabase's free tier refuses to customize an auth email template while using its default (shared) email sender — `supabase config push` failed with a 400 until a custom SMTP provider was configured. Fixed by wiring up Resend (free tier) via the Management API (`PATCH /v1/projects/{ref}/config/auth`, fields `smtp_host`/`smtp_port`/`smtp_user`/`smtp_pass`/`smtp_admin_email`/`smtp_sender_name`), sending from Resend's shared `onboarding@resend.dev` address (no custom domain verified yet). The custom OTP-code email template (`supabase/templates/magic_link.html`, using `{{ .Token }}` instead of the default `{{ .ConfirmationURL }}` link — so verification always completes by typing the code back into the same tab, never a link that could open a different browser context) is applied to the **hosted** project only via that same Management API call, not via `supabase config push` — doing it through `config.toml` would force local dev to also route through Resend instead of the free, instant, fully-scriptable local Mailpit catcher (`http://127.0.0.1:54324`, has a REST API used to fetch the OTP code programmatically in tests). Local and hosted are intentionally slightly divergent here: same template content, different delivery mechanism.
    - Verified end-to-end, fully automated: local via Playwright + Mailpit's API (request code → fetch the email → extract the code → verify → confirm the created-while-signed-in lobby shows up in `/lobbies` → sign out reverts to the signed-out prompt). Hosted was verified structurally (config applied correctly, `signInWithOtp` accepted) — actually receiving/reading the emailed code on the live site needs a real inbox, so that last step is on whoever tests the deployed site.
11. **Polish/deploy groundwork**: EAS build profiles, web hosting env config, `.well-known` files for future universal links, CI (turbo remote cache, typecheck/lint — the check-types/lint/build pipeline itself is ✅ *done and green* across all four packages). *Not started.*
12. **User profiles (username + first/last name)**: ✅ *done*. Extends the `profiles` table that already existed (auto-populated by the `handle_new_auth_user` trigger on every `auth.users` insert) with `username` (unique, `^[a-z0-9_]{3,20}$`, lowercase-normalized), `first_name`, `last_name` — no new table. All three fields are independently optional and never gate anything: a small "Edit profile" link in the `Header` opens a `ProfileModal`, never an auto-popup. Reads go through the existing `profiles_select_self` RLS policy directly (`useProfile`); writes go through a new SECURITY DEFINER RPC, `rpc_update_profile`, because checking "is this username taken by someone else" requires reading across other users' rows, which RLS deliberately blocks for plain clients (same reasoning as `rpc_join_lobby`/`rpc_cast_vote`) — this also means no new RLS update policy or table UPDATE grant was needed, only `execute` on the function. Raises `INVALID_USERNAME`/`USERNAME_TAKEN` as plain exception messages, mapped to friendly text client-side. New `packages/shared`: `useProfile`, `useUpdateProfile`, `mapProfileRow`. New `apps/web`: `_components/ProfileModal.tsx`. Verified end-to-end via Playwright (format validation, save + Header update, persistence across reload, cross-user uniqueness conflict, then a distinct successful save).

## Explicitly deferred (schema/architecture already accommodates, not built now)
- Private invite-by-username rosters (`lobby_visibility='private'`, additive `invited_by`/`invite_status` columns on `participants` later).
- Per-lobby OTP verification (`lobbies.otp_required` column already reserved; branch slots into `rpc_join_lobby`/`rpc_cast_vote` later).
- Embeddable third-party widget (`/vote/[code]` already self-contained).
- Shared `packages/ui` component library.

---

## Verification

- **Local Supabase**: `supabase start`, apply migrations, seed a test lobby; call each RPC directly via `supabase.rpc(...)` in the SQL editor/psql to confirm cap enforcement (simulate concurrent joins), one-vote enforcement, and auto-close firing exactly when the last cap'd participant votes. ✅ *done* — see Build Order step 2's notes for the bugs this surfaced.
- **Edge Functions**: `supabase functions serve`, hit `join-lobby`/`cast-vote`/`lobby-results` with `curl`/Postman using both an anonymous session token and the creator's token; confirm `rpc_get_ballot_detail` returns `FORBIDDEN` when `ballot_mode='anonymous'` or caller isn't the creator. ✅ *done*, both locally and against the hosted project (Build Order step 3).
- **Anonymous-mode leak check**: with a lobby in `ballot_mode='anonymous'`, attempt (as the creator, via direct `supabase-js` client) to `select * from votes` or subscribe to `postgres_changes` on `votes`/`participants` — confirm both are refused (no policy / not in publication), proving the leak is structurally blocked, not just hidden in the UI. ✅ *done* — also confirmed `rpc_get_ballot_detail` is `FORBIDDEN` for the *creator themselves* on an anonymous-mode lobby, not just for other callers.
- **Web**: run `apps/web` dev server, create a lobby, open `/vote/[code]` in a second private/incognito window (simulating a fresh anonymous scanner), vote, confirm the creator's manage page updates live (Postgres Changes) and, for a live-tally lobby, confirm the broadcast-driven tally updates without a page refresh. *Blocked on Build Order step 6–7 (no UI yet).*
- **Mobile**: run `apps/mobile` via Expo Go, repeat the voter flow, and confirm the same `packages/shared` hooks drive identical behavior against the same Supabase project. *Blocked on Build Order step 8 (no UI yet).*
