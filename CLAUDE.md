# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Votero — a QR-code-based group voting/polling app, shipping to iOS, Android, and Web from a single Turborepo monorepo with shared business logic. See [TECH_STACK.md](TECH_STACK.md) for the mandated stack and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the concrete product design (Postgres schema, RLS policy design, Edge Functions, Realtime channel design, build order, and what's deliberately deferred).

**Status**: backend (schema, RLS, RPCs, all Edge Functions) and the web app's core flows are built and verified end-to-end, both locally and on the real hosted project deployed live on Vercel — creator/voter UI, optional accounts + lobby history, multi-question surveys (choice and free-text questions, mixable), Present Mode, a creator Dashboard, dark mode, CSV/image export, `/terms` + `/privacy`, Vercel Analytics, Sentry error monitoring, and a GitHub Actions CI pipeline (lint/type-check/build/e2e on every push). `apps/mobile` is still just the bare Expo scaffold.

This paragraph is deliberately a summary, not a changelog — **`docs/ARCHITECTURE.md`'s numbered Build Order section is the single source of truth** for what shipped, in what order, why, and what's deliberately deferred. Update *that* file when you ship something, not this one — this file only needs a one-line mention if the summary above goes stale.

## Commands

Package manager is **pnpm** (`packageManager: pnpm@9.0.0` in root `package.json`) — never run `npm install` inside an individual app, it creates a conflicting lockfile/`node_modules` outside the workspace. Install/run everything from the repo root unless iterating on one app.

```sh
pnpm install              # install all workspace deps from repo root
pnpm dev                  # turbo run dev — runs all apps' dev servers
pnpm build                # turbo run build
pnpm lint                 # turbo run lint
pnpm check-types          # turbo run check-types
pnpm format               # prettier --write across the repo
```

Per-app dev servers (each has its own scripts too):
```sh
cd apps/web && pnpm dev      # Next.js dev server on port 3000
cd apps/mobile && pnpm start # Expo dev server (then press a/i/w, or: pnpm android / pnpm ios / pnpm web)
```

`apps/mobile` has no test runner configured yet. `apps/web` has a Playwright end-to-end suite (`apps/web/e2e/`, 21 tests across every core flow — creating/voting/managing lobbies, sign-in, the Dashboard, the chart toggle + stats page, and the UX-audit fixes) — see `docs/TESTING.md` for what each spec covers and the local prerequisites:
```sh
cd apps/web && pnpm test:e2e     # headless run — requires local Supabase running + the dev server
cd apps/web && pnpm test:e2e:ui  # interactive UI mode, for debugging a single spec
```

### Supabase

Requires Docker Desktop running. From repo root:
```sh
npx supabase start        # boots the local stack (Postgres, Auth, Realtime, Storage, Studio, Edge Functions)
npx supabase db reset     # reapplies all migrations from scratch (destructive to local data)
npx supabase functions deploy   # deploy Edge Functions to the linked hosted project
npx supabase db push             # push new migrations to the linked hosted project
npx supabase config push         # sync config.toml (e.g. [auth] settings) to the linked hosted project — separate from db push
```
This repo is already linked (`supabase link`) to a hosted project. `apps/web/.env.local` and `apps/mobile/.env` (both gitignored — copy from their `.example` files) point at the **local** stack (`http://127.0.0.1:54321`) by default; swap in the hosted project's URL/anon key to test against it instead. See `packages/types/src/database.ts`'s header comment for how to regenerate types — the documented `supabase gen types typescript --local` fails on this machine (shells out to `podman` unconditionally) and needs a `docker run` workaround.

### Error monitoring (Sentry)

`@sentry/nextjs` is wired up (`apps/web/instrumentation.ts`, `instrumentation-client.ts`, `app/global-error.tsx`, `next.config.js`) and **active locally** — `NEXT_PUBLIC_SENTRY_DSN` is set in `apps/web/.env.local` (gitignored) and confirmed reaching Sentry's ingest API. **Still needed**: add the same DSN to the Vercel project's environment variables so production errors are captured too (a dashboard setting, not a code change). See `apps/web/.env.local.example` for the full variable list (the DSN plus three optional build-time-only vars for source-map upload) and `docs/ARCHITECTURE.md` Build Order step 44 for what each file does.

`docs/ARCHITECTURE.md`'s Build Order section (step 2) documents three real bugs found during verification that are worth knowing about before touching the schema: table/function GRANTs are required in addition to RLS (this Supabase version doesn't auto-expose new tables), and a PL/pgSQL variable-name collision in `generate_lobby_code()`.

### CI

`.github/workflows/ci.yml` runs on every push/PR to `main`/`develop`: a `checks` job (`pnpm lint`, `pnpm check-types`, `pnpm build`) and an `e2e` job (boots a real local Supabase stack via `supabase/setup-cli`, then runs the full `apps/web/e2e/` suite against it). See `docs/ARCHITECTURE.md` Build Order step 45.

## Architecture

**Monorepo layout** (pnpm workspaces: `apps/*`, `packages/*`, declared in `pnpm-workspace.yaml`):
- `apps/web` — Next.js (App Router). Routes live in `apps/web/app/`. Tailwind v3 configured directly (no NativeWind — see below). Uses `@repo/eslint-config` and `@repo/typescript-config` as devDependencies rather than local lint/tsconfig rules.
- `apps/mobile` — Expo + Expo Router + NativeWind. Source lives under `apps/mobile/src/`, not the repo root of the app — routes are `apps/mobile/src/app/*`, with `@/*` aliased to `apps/mobile/src/*` (see `apps/mobile/tsconfig.json`). Platform-specific file variants follow Expo's `.web.tsx` suffix convention (e.g. `animated-icon.web.tsx` next to `animated-icon.tsx`) for web vs. native implementations of the same component. `metro.config.js` has pnpm-workspace-specific symlink settings — needed for `@repo/shared`/`@repo/types` to resolve.
- `packages/eslint-config` and `packages/typescript-config` — shared lint/tsconfig presets consumed via `workspace:*` by the apps.
- `packages/types` — hand-written domain types (`src/domain.ts`, camelCase, matching what the RPCs actually return) plus generated Supabase DB types (`src/database.ts`, snake_case, matching Postgres columns — see its header for regeneration).
- `packages/shared` — the Supabase client factory + platform storage adapter interface (`src/supabase/`), a snake_case→camelCase row mapper for the one place a table is read directly instead of through an RPC (`src/supabase/mappers.ts`), and one TanStack Query hook per operation (`src/hooks/`: `useLobby`, `useCreateLobby`, `useJoinLobby`, `useCastVote`, `useSubmitTextResponse`, `useLobbyResults`, `useSetLobbyStatus`, `useLobbyRealtime`). (A Zustand ballot-selection store used to live here too — retired once per-question local state was needed for the vote page's Back button, see `docs/ARCHITECTURE.md` Build Order.) Both apps wrap their root in a `Providers` component (`apps/web/app/providers.tsx`, `apps/mobile/src/providers.tsx`) that constructs the platform-specific Supabase client and TanStack Query client.
- No `packages/ui` yet — deliberately deferred (share business logic first; apps/web has plain Tailwind, not NativeWind, until there are actual shared RN-Web components that need it).

**Turborepo pipeline** (`turbo.json`): `build` depends on upstream packages' `build` (`^build`) and caches `.next/**`; `lint`/`check-types` similarly depend on `^lint`/`^check-types`; `dev` is uncached and persistent. All four workspace packages (`@repo/types`, `@repo/shared`, `web`, `mobile`) have working `lint`/`check-types` scripts wired into this pipeline.

**Product architecture** (schema, RLS, Edge Functions, Realtime design, QR/deep-link design): fully specified in `docs/ARCHITECTURE.md` — read that before implementing any Supabase-related work, since several of the design choices there (e.g. `votes` table has zero client-facing RLS policies *and* zero table grants by design, ballot anonymity is enforced by which server function you call rather than by row-level filtering, `rpc_get_tally` is deliberately reachable only by `service_role`) are load-bearing and easy to accidentally undo with a more "obvious" RLS policy or a convenience grant.
