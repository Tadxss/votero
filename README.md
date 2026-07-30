# Votero

A QR-code-based group voting/polling app — create a lobby, share a QR code, people scan to vote. Ships to iOS, Android, and Web from a single Turborepo monorepo with shared business logic.

See [docs/FEATURES.md](docs/FEATURES.md) for a plain-language tour of what Votero does, [TECH_STACK.md](TECH_STACK.md) for the stack, [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the product design (schema, RLS, Edge Functions, Realtime, build order), [docs/TESTING.md](docs/TESTING.md) for a manual walkthrough of every creator/voter scenario, and [docs/CASE_STUDY.md](docs/CASE_STUDY.md) for a portfolio-style writeup of the engineering decisions behind it.

## What's inside

- `apps/web` — [Next.js](https://nextjs.org/) (App Router), Tailwind CSS
- `apps/mobile` — [Expo](https://expo.dev/) (React Native) with Expo Router, NativeWind
- `packages/eslint-config` — shared `eslint` configuration
- `packages/typescript-config` — shared `tsconfig.json`s
- `packages/types` — domain types + generated Supabase DB types
- `packages/shared` — Supabase client, TanStack Query hooks, Zustand store, shared by both apps
- `supabase/` — Postgres schema, RLS policies, RPCs, and Edge Functions (see `docs/ARCHITECTURE.md`)

Package manager is **pnpm** — install from the repo root with `pnpm install`.

**Status**: backend (schema/RLS/RPCs/Edge Functions), the web creator/voter UI (responsive wide-dashboard layout for creator pages, centered cards for the public voter flow), optional creator accounts + lobby history (email-OTP sign-in), profile editing (username + first/last name), a 10-lobby cap for signed-in accounts, 7-day auto-cleanup of anonymous lobbies, manual lobby delete, a table/grid view toggle, QR/link/code sharing (copy + native share), and a "Join a lobby" button with an in-browser camera QR scanner (code-entry fallback included), an anonymous-creator auto-delete notice, sign-in-required open-ballot voting with verified voter identity (name/username/email) in the "who voted for what" list, profile pictures, scheduled (time-based) auto-close, a fullscreen "Present Mode" for projecting live results at an event, multi-question surveys (a lobby can ask 1+ questions, voted through a one-at-a-time stepper on `/vote/[code]`), downloadable results (CSV/PNG export from the manage page), free-text questions (voters type a short answer instead of picking an option, with responses grouped by frequency into a lightweight word-cloud-style display), and letting voters go back and change an earlier answer before finishing a survey are built, verified end-to-end, and deployed live. Mobile UI is not built yet — see `docs/ARCHITECTURE.md`'s Build Order for the current state.

## Develop

```sh
pnpm install
pnpm dev              # runs all apps' dev servers via turbo
pnpm dev --filter=web
pnpm dev --filter=mobile
```

Copy `apps/web/.env.local.example` → `apps/web/.env.local` and `apps/mobile/.env.example` → `apps/mobile/.env`, filling in Supabase URL/anon key (local `supabase start` output, or your hosted project's).

## Build / Lint / Typecheck

```sh
pnpm build
pnpm lint
pnpm check-types
```

## Supabase

```sh
npx supabase start   # local stack (requires Docker Desktop)
npx supabase db reset
npx supabase db push          # push migrations to the linked hosted project
npx supabase functions deploy
npx supabase config push      # sync config.toml auth/api/storage settings to the hosted project
```

## Remote Caching

> [!TIP]
> Vercel Remote Cache is free for all plans. Get started today at [vercel.com](https://vercel.com/signup?utm_source=remote-cache-sdk&utm_campaign=free_remote_cache).

Turborepo can use [Remote Caching](https://turborepo.dev/docs/core-concepts/remote-caching) to share cache artifacts across machines and CI. Authenticate with `turbo login`, then link this repo with `turbo link`.
