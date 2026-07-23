-- Lets a signed-in creator delete their own lobby at any status, whenever they choose
-- (docs/ARCHITECTURE.md "Lobby delete"). No RPC needed — unlike create/update, delete has no
-- extra business logic beyond "is this my lobby," which `auth.uid() = creator_id` already
-- expresses fully, so a plain RLS-gated client `.delete()` is sufficient (same reasoning already
-- used for the direct-read hooks like useMyLobbies). `options`/`participants`/`votes` need no
-- extra handling — all three already `on delete cascade` on their `lobby_id` foreign key.
create policy lobbies_delete_own on public.lobbies
  for delete using (auth.uid() = creator_id);

grant delete on public.lobbies to authenticated;
