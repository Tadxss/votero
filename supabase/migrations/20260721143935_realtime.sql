-- Realtime wiring (docs/ARCHITECTURE.md "Realtime design").

-- `lobbies` only: status/joined_count/votes_count changes are safe to replicate to any client the
-- existing SELECT policies already allow. `participants`/`votes` are deliberately NEVER added to
-- this publication — replicating `votes` would leak the exact voter->option linkage via the
-- replication payload itself, regardless of any RLS policy on the table.
alter publication supabase_realtime add table public.lobbies;

-- Realtime Authorization (defense in depth): gate subscriptions to the `lobby:{id}:tally`
-- broadcast topic to callers who could currently SELECT that lobby row. The broadcast payload
-- itself only ever contains aggregate counts (never participant identity) — constructed
-- server-side by the cast-vote Edge Function — so this isn't the primary control, but there's no
-- reason to let an arbitrary client subscribe to a topic for a lobby they can't otherwise see.
--
-- NOTE: Realtime Authorization is a newer, still-evolving Supabase feature. This policy shape
-- (`realtime.topic()` against `realtime.messages`) matches Supabase's documented pattern as of
-- writing, but verify it against `supabase start` / the target project once Docker is available —
-- it could not be exercised locally while writing this migration.
create policy lobby_tally_broadcast_select on realtime.messages
  for select
  to authenticated
  using (
    realtime.topic() like 'lobby:%:tally'
    and exists (
      select 1 from public.lobbies l
      where l.id::text = split_part(realtime.topic(), ':', 2)
    )
  );
