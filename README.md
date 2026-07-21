# Votero

A QR-code-based group voting/polling app — create a lobby, share a QR code, people scan to vote. Ships to iOS, Android, and Web from a single Turborepo monorepo with shared business logic.

See [TECH_STACK.md](TECH_STACK.md) for the stack and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the product design (schema, RLS, Edge Functions, Realtime, build order).

## What's inside

- `apps/web` — [Next.js](https://nextjs.org/) (App Router)
- `apps/mobile` — [Expo](https://expo.dev/) (React Native) with Expo Router
- `packages/eslint-config` — shared `eslint` configuration
- `packages/typescript-config` — shared `tsconfig.json`s
- `packages/shared`, `packages/types` — planned (business logic, Supabase client, generated DB types); not created yet

Package manager is **pnpm** — install from the repo root with `pnpm install`.

## Develop

```sh
pnpm install
pnpm dev              # runs all apps' dev servers via turbo
pnpm dev --filter=web
pnpm dev --filter=mobile
```

## Build / Lint / Typecheck

```sh
pnpm build
pnpm lint
pnpm check-types
```

## Remote Caching

> [!TIP]
> Vercel Remote Cache is free for all plans. Get started today at [vercel.com](https://vercel.com/signup?utm_source=remote-cache-sdk&utm_campaign=free_remote_cache).

Turborepo can use [Remote Caching](https://turborepo.dev/docs/core-concepts/remote-caching) to share cache artifacts across machines and CI. Authenticate with `turbo login`, then link this repo with `turbo link`.
