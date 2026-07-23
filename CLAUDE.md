# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Votero — a QR-code-based group voting/polling app, shipping to iOS, Android, and Web from a single Turborepo monorepo with shared business logic. See [TECH_STACK.md](TECH_STACK.md) for the mandated stack and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the concrete product design (Postgres schema, RLS policy design, Edge Functions, Realtime channel design, build order, and what's deliberately deferred).

**Status**: backend is built and verified end-to-end (schema, RLS, RPCs, all 4 Edge Functions), both against a local Supabase stack and the real hosted project, deployed live on Vercel. The web creator/voter UI (`apps/web/app/{create,lobby/[code]/manage,vote/[code]}`) plus optional creator accounts + lobby history (`/login`, `/lobbies`, email-OTP sign-in) and profile editing (username + first/last name via a header-triggered modal, `rpc_update_profile`) are built and verified via scripted Playwright browser runs — see `docs/TESTING.md` for the manual walkthrough version. Creator-facing pages (`/create`, `/lobbies`, `/lobby/[code]/manage`) use a responsive wide-dashboard layout on `lg:` and up (two-column forms, a real table on `/lobbies`) while staying single-column on mobile; the voter-facing `/vote/[code]` and `/login` stay centered cards at every size. Signed-in creators are capped at 10 lobbies (enforced in `rpc_create_lobby`, exempting anonymous creators); anonymous-created lobbies self-delete 7 days after creation via a `pg_cron` job; creators can also manually delete any of their own lobbies at any time (trash icon on `/lobbies`, "Delete lobby" on the manage page, both behind a shared `ConfirmDialog`). `/lobbies` also has a table/grid view toggle (desktop only, persisted in `localStorage`). The manage page's QR card has Copy link/Copy code/Share (`navigator.share` with a clipboard fallback) actions, and the home page has a collapsed-by-default "Have a code? Join a lobby" fallback for anyone who can't scan a QR. `apps/mobile` still only has its bare framework scaffold — check the "Build Order" section of `docs/ARCHITECTURE.md` for the precise done/pending breakdown before assuming a piece exists.

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

There is no test runner configured yet in either app.

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

`docs/ARCHITECTURE.md`'s Build Order section (step 2) documents three real bugs found during verification that are worth knowing about before touching the schema: table/function GRANTs are required in addition to RLS (this Supabase version doesn't auto-expose new tables), and a PL/pgSQL variable-name collision in `generate_lobby_code()`.

## Architecture

**Monorepo layout** (pnpm workspaces: `apps/*`, `packages/*`, declared in `pnpm-workspace.yaml`):
- `apps/web` — Next.js (App Router). Routes live in `apps/web/app/`. Tailwind v3 configured directly (no NativeWind — see below). Uses `@repo/eslint-config` and `@repo/typescript-config` as devDependencies rather than local lint/tsconfig rules.
- `apps/mobile` — Expo + Expo Router + NativeWind. Source lives under `apps/mobile/src/`, not the repo root of the app — routes are `apps/mobile/src/app/*`, with `@/*` aliased to `apps/mobile/src/*` (see `apps/mobile/tsconfig.json`). Platform-specific file variants follow Expo's `.web.tsx` suffix convention (e.g. `animated-icon.web.tsx` next to `animated-icon.tsx`) for web vs. native implementations of the same component. `metro.config.js` has pnpm-workspace-specific symlink settings — needed for `@repo/shared`/`@repo/types` to resolve.
- `packages/eslint-config` and `packages/typescript-config` — shared lint/tsconfig presets consumed via `workspace:*` by the apps.
- `packages/types` — hand-written domain types (`src/domain.ts`, camelCase, matching what the RPCs actually return) plus generated Supabase DB types (`src/database.ts`, snake_case, matching Postgres columns — see its header for regeneration).
- `packages/shared` — the Supabase client factory + platform storage adapter interface (`src/supabase/`), a snake_case→camelCase row mapper for the one place a table is read directly instead of through an RPC (`src/supabase/mappers.ts`), a Zustand ballot-selection store, and one TanStack Query hook per operation (`src/hooks/`: `useLobby`, `useCreateLobby`, `useJoinLobby`, `useCastVote`, `useLobbyResults`, `useSetLobbyStatus`, `useLobbyRealtime`). Both apps wrap their root in a `Providers` component (`apps/web/app/providers.tsx`, `apps/mobile/src/providers.tsx`) that constructs the platform-specific Supabase client and TanStack Query client.
- No `packages/ui` yet — deliberately deferred (share business logic first; apps/web has plain Tailwind, not NativeWind, until there are actual shared RN-Web components that need it).

**Turborepo pipeline** (`turbo.json`): `build` depends on upstream packages' `build` (`^build`) and caches `.next/**`; `lint`/`check-types` similarly depend on `^lint`/`^check-types`; `dev` is uncached and persistent. All four workspace packages (`@repo/types`, `@repo/shared`, `web`, `mobile`) have working `lint`/`check-types` scripts wired into this pipeline.

**Product architecture** (schema, RLS, Edge Functions, Realtime design, QR/deep-link design): fully specified in `docs/ARCHITECTURE.md` — read that before implementing any Supabase-related work, since several of the design choices there (e.g. `votes` table has zero client-facing RLS policies *and* zero table grants by design, ballot anonymity is enforced by which server function you call rather than by row-level filtering, `rpc_get_tally` is deliberately reachable only by `service_role`) are load-bearing and easy to accidentally undo with a more "obvious" RLS policy or a convenience grant.
