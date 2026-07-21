# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Votero — a QR-code-based group voting/polling app, shipping to iOS, Android, and Web from a single Turborepo monorepo with shared business logic. See [TECH_STACK.md](TECH_STACK.md) for the mandated stack and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the concrete product design (Postgres schema, RLS policy design, Edge Functions, Realtime channel design, build order, and what's deliberately deferred).

**Status**: early scaffolding. `apps/web` and `apps/mobile` exist as bare framework scaffolds; Supabase (schema/RLS/Edge Functions), `packages/shared`, `packages/types`, and NativeWind are not wired up yet. Check the "Build Order" section of `docs/ARCHITECTURE.md` for what's done vs. pending before assuming a piece exists.

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

## Architecture

**Monorepo layout** (pnpm workspaces: `apps/*`, `packages/*`, declared in `pnpm-workspace.yaml`):
- `apps/web` — Next.js (App Router). Routes live in `apps/web/app/`. Uses `@repo/eslint-config` and `@repo/typescript-config` as devDependencies rather than local lint/tsconfig rules.
- `apps/mobile` — Expo + Expo Router. Source lives under `apps/mobile/src/`, not the repo root of the app — routes are `apps/mobile/src/app/*`, with `@/*` aliased to `apps/mobile/src/*` (see `apps/mobile/tsconfig.json`). Platform-specific file variants follow Expo's `.web.tsx` suffix convention (e.g. `animated-icon.web.tsx` next to `animated-icon.tsx`) for web vs. native implementations of the same component.
- `packages/eslint-config` and `packages/typescript-config` — shared lint/tsconfig presets consumed via `workspace:*` by the apps.
- `packages/shared` and `packages/types` — planned (per `TECH_STACK.md` and `docs/ARCHITECTURE.md`) to hold the Supabase client, TanStack Query hooks, Zustand stores, and generated DB types shared between both apps. Not created yet.

**Turborepo pipeline** (`turbo.json`): `build` depends on upstream packages' `build` (`^build`) and caches `.next/**`; `lint`/`check-types` similarly depend on `^lint`/`^check-types`; `dev` is uncached and persistent.

**Product architecture** (schema, RLS, Edge Functions, Realtime design, QR/deep-link design): fully specified in `docs/ARCHITECTURE.md` — read that before implementing any Supabase-related work, since several of the design choices there (e.g. `votes` table has zero client-facing RLS policies by design, ballot anonymity is enforced by which server function you call rather than by row-level filtering) are load-bearing and easy to accidentally undo with a more "obvious" RLS policy.
