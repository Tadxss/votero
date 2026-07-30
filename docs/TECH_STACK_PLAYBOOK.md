# Tech Stack Playbook

A reusable reference distilled from building Votero (a QR-code group voting app) — the stack
itself, the patterns that worked, and the specific gotchas hit along the way. Written to be useful
on a **different** project using the same stack, not just as Votero's own documentation (that
lives in `docs/ARCHITECTURE.md`/`TECH_STACK.md` in this repo).

## The stack

| Layer | Choice | Notes |
|---|---|---|
| Monorepo tooling | Turborepo | `apps/*`, `packages/*`, pnpm workspaces. Nx is a reasonable alternative — Turborepo was simpler to configure for a two-app (web + mobile) monorepo. |
| Package manager | pnpm | Workspace protocol (`workspace:*`) for internal packages. Never `npm install` inside a single app — creates a conflicting lockfile outside the workspace. |
| Mobile | Expo (React Native) + Expo Router | File-based routing, matches Next.js's mental model. EAS Build/Submit for cloud builds — no Mac needed for iOS. |
| Web | Next.js (App Router) | Plain Tailwind is fine here even if mobile uses NativeWind — don't force NativeWind onto web until there are actual shared RN-Web components that need it (see "Don't over-share UI early" below). |
| Shared styling | NativeWind | Tailwind syntax across RN and Next.js. Only wire it into the web app once you have concrete components to share — see below. |
| Client state | Zustand | Lightweight; only reach for it when local component/URL state genuinely isn't enough (a ballot-selection store here was later retired once per-question local state covered the actual need). |
| Server state | TanStack Query | One hook per operation/mutation, not one giant API-client object — makes each hook's cache-invalidation behavior visible at the call site instead of buried in a shared abstraction. |
| Backend | Supabase (Postgres, Auth, Storage, Realtime, Edge Functions, RLS) | See the dedicated section below — this is where most of the hard-won lessons are. |
| Testing | Playwright (`@playwright/test`) | Real browser e2e, committed from day one, not ad-hoc scripts in a session scratchpad. |
| Accessibility | `eslint-plugin-jsx-a11y` + `@axe-core/playwright` | Lint-time + test-time automated coverage; still not a substitute for real screen-reader testing. |
| Error monitoring | Sentry (`@sentry/nextjs`) | Covers browser + server + edge runtimes. |
| Analytics | Vercel Analytics | Cookieless, no consent-banner implications, free with a Vercel deploy. A typed `trackEvent(name, props)` wrapper over a closed union of event names catches typos at compile time instead of silently losing events. |
| CI/CD | GitHub Actions | Two jobs: fast `checks` (lint/type-check/build), slower `e2e` (boots a real local Supabase stack via `supabase/setup-cli`, runs the full Playwright suite against it). |

## Repository structure

```
my-app/
├── apps/
│   ├── mobile/          ← Expo (React Native)
│   └── web/              ← Next.js
├── packages/
│   ├── shared/            ← Supabase client factory, one TanStack Query hook per operation
│   ├── types/              ← hand-written domain types (camelCase) + generated DB types (snake_case)
│   └── eslint-config/, typescript-config/  ← shared lint/tsconfig presets, workspace:* deps
├── turbo.json
└── pnpm-workspace.yaml
```

`packages/types` splitting hand-written domain types from generated DB types (rather than using
the generated snake_case types directly everywhere) kept the app-facing API stable across schema
churn — a column rename only touches the mapper layer (`packages/shared/src/supabase/mappers.ts`),
not every call site.

## Backend/Supabase patterns

**RLS is not enough on its own — grants are required too.** Modern Supabase defaults
`auto_expose_new_tables` to *off*: a new table isn't reachable by `anon`/`authenticated` just
because RLS policies exist on it. A GRANT is what lets a role attempt an operation at all; RLS then
restricts which *rows*. Forgetting the GRANT produces a confusing "permission denied for table X"
that has nothing to do with your policy logic — check grants first if a policy that "should work"
doesn't. The same applies to functions called *transitively* from an invoker-mode RPC (a trigger
function called from `rpc_create_lobby`, for example, needed its own explicit grant even though the
top-level RPC had one).

**`SECURITY DEFINER` RPCs, not client-side RLS, for anything with real business logic.** Direct
table RLS can express "you may see this row" but not "you may see an aggregate but never the
individual row" — any policy permissive enough to compute a client-side tally is also permissive
enough to leak individual-vote-level data. The pattern that worked: give the sensitive table **zero
client-facing RLS policies and zero grants at all** (default deny, both directions), and route every
read/write through a `SECURITY DEFINER` Postgres function that enforces the actual business rule
server-side. Visibility becomes a property of *which function you're allowed to call*, not a filter
condition — much easier to reason about and audit than a permissive policy trying to encode a
conditional.

**A PL/pgSQL variable name colliding with a column name is a real, easy-to-hit bug.** A local
variable named the same as a table column (e.g. `code` inside a function that also reads/writes a
`code` column) can shadow or ambiguously resolve depending on context — prefix local variables
(`v_code`, `v_lobby`, etc.) as a blanket convention, not just where it happens to bite.

**Rate limiting**: if every user (including anonymous ones, via `signInAnonymously()`) authenticates
before touching the backend, `auth.uid()` is always present — a generic hit-log table
(`user_id, action, created_at`) plus a `SECURITY DEFINER` checker function
(`check_rate_limit(action, max_count, window)`) called as the first statement in any sensitive RPC
covers this with **no new Edge Function and no IP capture needed**. Known limitation to accept
rather than solve: a user can reset their own limit by minting a new anonymous session — fine for
throttling retry storms and casual abuse, not airtight against a determined attacker. Don't over-build
this; a real IP-based/Edge-Function-level limiter is only worth it if the anonymous-session-rotation
gap actually matters for your threat model.

**Content moderation**: put the authoritative check in the same `SECURITY DEFINER` RPC that writes
the data (can't be bypassed by calling the RPC directly with different arguments), and mirror the
same wordlist client-side for instant form feedback. A word-boundary regex (`\y(word1|word2)\y` in
Postgres) avoids flagging a bad word embedded inside an innocuous larger word.

**Realtime broadcast fan-out has no built-in batching** — if you fire a broadcast from inside every
write (e.g. "send updated tally after every vote"), a burst of near-simultaneous writes means an
equal burst of independent broadcasts. Fine at moderate scale (tested clean at 100 concurrent
writers in this project — see the load-testing section below), but don't assume it's free at very
large burst sizes without measuring; there's no batching to fall back on unless you add it yourself.

**Generate types, don't hand-maintain them** — `supabase gen types typescript` from the schema, not
manually transcribed columns. Regenerate after every migration; a hand-maintained type is a type
that quietly drifts.

## Frontend patterns

**One TanStack Query hook per operation**, not a generic API client — `useCreateLobby`,
`useCastVote`, etc., each with its own `mutationFn` and its own explicit `invalidateQueries` calls
in `onSuccess`. Makes the cache-invalidation behavior of each action visible and greppable, instead
of centralized in a place that has to know about every consumer.

**Don't over-share UI between mobile and web early.** Share business logic
(`packages/shared`/`packages/types`) from day one — that's cheap and has an obvious payoff. Defer a
shared `packages/ui` until there are *concrete* components that need to exist on both platforms;
forcing NativeWind onto a web app that doesn't need RN-Web components yet just adds a build-config
dependency for no benefit.

**A no-account path plus optional real accounts**, rather than requiring sign-up, worked well for a
casual/low-friction product: anonymous auth sessions persisted per device cover the common case, and
sign-in only affects what's created *afterward* (no anonymous→permanent upgrade path) — simpler and
more robust than trying to migrate an anonymous session's data onto a real account, which can
silently break across browser contexts.

## Testing strategy

**Commit the e2e suite from the start** — ad-hoc scripts that only exist in a session/scratchpad are
not reusable, not runnable by a future contributor (human or AI), and vanish when the session ends.
A `helpers.ts` (shared sign-in flow, code-parsing utilities) removes duplication across specs early.

**`workers: 1` for a Supabase-backed suite**, even though it's slower — most specs share local
Supabase state (rate limits, auth state), and running spec files concurrently across workers
produced spurious timeouts that had nothing to do with real bugs. A CI-only `retries: 1` absorbs
cold-compile-on-first-run flakiness without masking real local failures (kept at 0 retries
locally, where the dev-server cache usually already exists).

**Accessibility**: `eslint-plugin-jsx-a11y`'s flat recommended config catches real, fixable issues
at lint time (missing `<html lang>`, `<svg role="img">` with no accessible name, `autoFocus` in
places that do steal focus on page load) — but also flags legitimate patterns it can't distinguish
from real bugs, like a click-outside-to-dismiss modal backdrop (Escape is the keyboard equivalent;
suppress with an inline comment explaining why, don't just disable the rule file-wide). A small
`@axe-core/playwright` spec scanning key pages catches color-contrast and ARIA issues automated
tooling *can* verify — but isn't a substitute for real screen-reader testing, and hover-only states
won't be caught by a static-snapshot scan.

**Load/concurrency testing doesn't need a browser or a dedicated tool.** If your backend exposes
plain HTTP endpoints (Supabase Edge Functions, a REST API) that accept a bearer token, a small Node
script using built-in `fetch` and `Promise.all` — minting N sessions concurrently, firing N requests
concurrently, measuring latency distribution and a correctness check afterward — isolates the real
bottleneck (database lock contention, broadcast fan-out) from tooling overhead. Spinning up N real
Playwright browser contexts to simulate N concurrent users makes Playwright's own overhead the
bottleneck instead, masking the actual signal. Don't wire this into CI — latency numbers are too
environment-dependent for a pass/fail gate; treat it as an ad-hoc benchmark, but do gate the
*correctness* check (no lost writes under contention) since that's a real regression, not noise.

## CI/CD gotchas

- **`check-types`/`build` running repo-wide** will type-check/build packages you don't normally
  touch day-to-day (e.g. a mobile app you're not actively working on) — the first CI run is often
  the first time those get exercised together, and can surface real, previously-invisible gaps
  (missing ambient type declarations for non-`.ts` imports like `.css`/`.module.css` in a
  React-Native/NativeWind context, for instance).
- A build step that needs environment variables your dev workflow always has set (Supabase URL/anon
  key, for instance) may fail in CI if a job never had them set — even if your app is written to
  degrade gracefully when they're absent locally (e.g. skip mounting a provider), a **static
  prerender** at build time can still call a hook that assumes the provider exists. Fake/demo
  credentials are enough to satisfy this at build time if the client library doesn't make a network
  call on construction.
- The local-dev Supabase anon key baked into a CI workflow is the CLI's well-known deterministic
  demo key (same for any project that hasn't overridden the default JWT secret) — not a secret worth
  hiding, and the same value every contributor's own gitignored `.env.local` already has.

## A rough build order that worked

1. Scaffold the monorepo (Turborepo/pnpm workspaces), both apps, shared packages.
2. Supabase: schema + RLS + grants + RPCs, verified directly against a real local Postgres via
   `psql`/Studio before wiring up any client code — cheaper to catch a grants/RLS bug at this layer
   than after a UI is built on top of it.
3. Core product flows, web first if mobile is genuinely secondary for now — don't block web
   progress on mobile parity.
4. Commit a real e2e suite as flows solidify, not at the very end — retrofitting tests onto a large
   already-built surface is a much bigger lift than growing the suite alongside the features.
5. CI pipeline once the e2e suite exists (no suite to run yet means no e2e job to add).
6. Error monitoring + analytics — cheap to add, disproportionately valuable once anyone outside
   your immediate circle is using it.
7. Security/abuse-surface pass (rate limiting, content moderation) and an accessibility pass —
   both are easy to defer indefinitely if nothing forces the question; do them once the core
   product is stable rather than "eventually."
8. Load/concurrency testing for whatever your product's actual burst scenario is (everyone using it
   at once, a scheduled drop, etc.) — informative, not a blocker, but worth knowing the real numbers
   before a real event depends on them.
