---
description: Scaffold a new Supabase migration file with the repo's timestamp-prefixed naming convention
---

Create a new empty migration file under `supabase/migrations/` for: $ARGUMENTS

Do this:

1. Check the most recent existing filenames (`ls supabase/migrations | tail -5`) to confirm the
   naming convention is still `YYYYMMDDHHMMSS_description.sql` (14-digit UTC timestamp, underscore,
   short snake_case description — e.g. `20260804090000_api_keys.sql`).
2. Generate a timestamp for *now* (don't reuse or guess an old one — it must sort after every
   existing migration) and a short snake_case description derived from $ARGUMENTS.
3. Create the file with a header comment naming what it does, then leave the SQL body for the user
   to fill in (don't invent schema/RLS/RPC content — that needs actual design, not a template).
4. Remind the user of the actual next steps from `CLAUDE.md`, since this repo's local type-gen has a
   documented gotcha:
   - `npx supabase db reset` to apply it locally (destructive to local data — confirm before running
     it for them)
   - Regenerating `packages/types/src/database.ts` needs the `docker run` workaround documented in
     that file's header comment, **not** `supabase gen types typescript --local` directly (that
     shells out to `podman` unconditionally on this machine and fails)
   - `npx supabase db push` to push to the linked hosted project once verified locally

Do not run `db reset` or `db push` yourself without the user explicitly confirming — both mutate
real database state (local data loss / a live hosted project respectively).
