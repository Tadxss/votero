-- Anonymous-created lobbies (and everything hanging off them) self-delete 7 days after creation;
-- lobbies created by a signed-in account never auto-delete (docs/ARCHITECTURE.md "User profiles" /
-- "Auto-cleanup"). `options`/`participants`/`votes` all already have `on delete cascade` on their
-- `lobby_id` foreign key (init migration), so deleting the `lobbies` row is sufficient — no need to
-- touch those tables here. `profiles.is_anonymous` is a permanent signal for this app: there is no
-- anonymous-to-real-account upgrade path, so it never changes after signup.

create extension if not exists pg_cron;

select cron.schedule(
  'delete-stale-anonymous-lobbies',
  '0 3 * * *',
  $$
    delete from public.lobbies l
    using public.profiles p
    where p.id = l.creator_id
      and p.is_anonymous
      and l.created_at < now() - interval '7 days';
  $$
);
