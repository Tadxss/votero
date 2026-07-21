# App Tech Stack & Scaffolding Brief

## Goal

Build one app that ships to **iOS**, **Android**, and **Web**, using a single monorepo with shared business logic between mobile and web.

## Team Context

- Team skillset: JavaScript / TypeScript & React

---

## Tech Stack

### Mobile (iOS & Android)

- **Expo (React Native)** — core framework
- **Expo Router** — file-based navigation
- **EAS Build & Submit** — cloud builds + App Store/Play Store submission (no Mac required for iOS builds)

### Web

- **Next.js** (App Router) — marketing site + web app
- **React Native Web** — allows reusing RN components inside Next.js where useful

### Shared Code Layer

- **Turborepo** (or Nx) — monorepo tooling to share logic across mobile + web
- Shared package(s) for: API/data calls, TypeScript types, business logic, hooks

### Styling

- **NativeWind** — Tailwind syntax usable across both React Native and Next.js for consistent styling

### State & Data Management

- **Zustand** (or Redux Toolkit) — client state
- **TanStack Query** — server state, caching, syncing

### Backend / Database

- **Supabase**

- Postgres database (relational, SQL, joins, foreign keys)
- Auth
- Storage
- Realtime subscriptions
- Row Level Security (RLS) for direct client queries without a custom API layer
- Auto-generated TypeScript types from DB schema
- **Supabase Edge Functions** (Deno-based) — for complex server-side logic beyond basic CRUD (multi-step transactions, third-party API orchestration, webhooks)

---

## Repository Structure

**One repository (monorepo)** — not separate repos for mobile/web.

```
my-app/
├── apps/
│   ├── mobile/          ← Expo (React Native) app
│   └── web/              ← Next.js app
├── packages/
│   ├── shared/            ← business logic, API calls, hooks
│   ├── types/              ← shared TypeScript types (incl. Supabase-generated)
│   └── ui/                  ← (optional) shared components using NativeWind
├── package.json             ← root config
├── turbo.json                 ← Turborepo pipeline config
└── tsconfig.json
```

### Rationale for monorepo

- Shared code lives in one place (`packages/shared`) — both apps import from it directly, no publishing to npm or copy-pasting
- One commit can update a shared type/API function and both apps see the change immediately
- Turborepo caches builds/tests intelligently, avoiding full rebuilds on every change
- One CI/CD pipeline can build/test/deploy both apps, only rebuilding what changed

---

## Notes / Trade-offs to Keep in Mind

- Don't try to force 100% UI-sharing between mobile and web immediately — native and web components differ enough that this often costs more time than it saves early on. Share business logic/data first; unify UI gradually if NativeWind + React Native Web makes sense for your design.
- Use Supabase Edge Functions or a Next.js API route layer for anything beyond simple CRUD — don't try to cram complex logic into RLS policies.
- Auth, storage, and DB client setup (`@supabase/supabase-js`) should live in the shared package so both apps use identical session handling.

---

## Suggested Scaffolding Steps for Claude Code

1. Initialize a Turborepo (or Nx) monorepo at the root.
2. Scaffold `apps/mobile` with `npx create-expo-app` (TypeScript template) and set up Expo Router.
3. Scaffold `apps/web` with `npx create-next-app` (TypeScript, App Router).
4. Create `packages/shared`, `packages/types`, and optionally `packages/ui`.
5. Set up Supabase client in `packages/shared` (env vars for URL/anon key, typed client).
6. Configure NativeWind in both `apps/mobile` and `apps/web` for shared Tailwind-style utility classes.
7. Set up Zustand and TanStack Query in `packages/shared` where feasible, wired into each app.
8. Add root-level `turbo.json` pipeline for `build`, `dev`, `lint`, and `typecheck` tasks across both apps.

---

## Project-specific decisions

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the concrete app concept (Votero — QR-code group voting), schema, RLS design, and build order chosen on top of this stack brief.
