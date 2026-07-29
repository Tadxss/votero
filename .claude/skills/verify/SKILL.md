---
name: verify
description: Use after making any code change in this repo (apps/web, apps/mobile, packages/*) before telling the user the work is done. Runs type-check/lint/build and, if apps/web or e2e specs changed, the Playwright suite — then reads the diff to confirm no test was weakened just to make things pass. Reports pass/fail with the actual command output, not just "looks good".
---

# Verify a change in votero

Don't report a change as done on the strength of "the code looks right" or a single green run you
didn't actually look at. Run the gates, read their output, and say so explicitly.

## 1. Scope the check to what changed

```sh
git status --short
```

- Only `apps/web/**` changed → `pnpm check-types --filter=web && pnpm lint --filter=web`
- Only `apps/mobile/**` changed → same with `--filter=mobile` (but see reference.md's note on the
  local Node version before treating a `mobile` lint failure as real)
- `packages/shared/**` or `packages/types/**` changed → drop the filter, run repo-wide
  (`pnpm check-types && pnpm lint`) since both apps consume these packages
- Any `apps/web/**` non-docs change → also `pnpm build --filter=web`

## 2. Run the e2e suite when it's actually relevant

Only for changes that touch `apps/web/app/**`, `apps/web/e2e/**`, or shared hooks/behavior a UI flow
depends on. Requires local Supabase running — see `reference.md` for the exact prerequisite check
and the known "supabase_vector_votero stuck restarting" recovery step before assuming a real bug.

```sh
cd apps/web && pnpm test:e2e
```

A single test timing out on a cold-compiled route or a Realtime-subscription-driven UI flip is a
known, already-diagnosed flake class in this repo (see `reference.md`) — before calling it a
regression, re-run just that spec in isolation:

```sh
pnpm exec playwright test e2e/<file>.spec.ts
```

If it passes alone, it was the known flake, not a regression — say so, don't just silently retry
and move on without noting it.

## 3. Read the diff — specifically hunt for weakened tests

```sh
git diff -- apps/web/e2e apps/web/**/*.test.* 2>/dev/null
```

Red flags that mean a test was loosened rather than the code fixed:
- A removed or commented-out `expect(...)` / assertion
- `.skip(` or `.only(` added
- A timeout increased with no comment explaining a real, traced cause (compare against
  `openVoting`'s helper in `apps/web/e2e/helpers.ts` for what a *justified* one looks like)
- An exact match loosened to a fuzzy one, or a specific expected value swapped for something vague

## 4. Report explicitly

State which commands ran, pass/fail for each, and an explicit yes/no on "were any tests weakened to
get here" — don't just say "all good."
