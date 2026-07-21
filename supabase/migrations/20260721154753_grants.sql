-- Explicit table-level GRANTs for the Data API roles.
--
-- This project's `auto_expose_new_tables` default is off (the new Supabase default, see
-- supabase/config.toml comment on that key): tables created in `public` are NOT automatically
-- reachable by `anon`/`authenticated`/`service_role` anymore. RLS policies only take effect on top
-- of an existing GRANT — they restrict rows, they don't substitute for the base privilege — so
-- without these, every operation fails with "permission denied for table X" before RLS is even
-- evaluated (confirmed locally: `rpc_create_lobby`, which is SECURITY INVOKER and therefore runs
-- with the caller's own privileges, failed until this migration was added).
--
-- `participants` and `votes` intentionally get NO grants at all here — every write to them goes
-- through a SECURITY DEFINER RPC (rpc_join_lobby, rpc_cast_vote), which runs with the function
-- owner's privileges regardless of what the calling role can do directly. `votes` additionally has
-- no RLS policies (see RLS migration) — no grant + no policy is a stronger lockdown than either
-- alone. `participants` gets a SELECT grant only, so its two read policies
-- (participants_select_creator, participants_select_self) are actually reachable by clients.

grant select, insert, update on public.lobbies to authenticated;
grant select, insert on public.options to authenticated;
grant select on public.participants to authenticated;
grant select on public.profiles to authenticated;

-- generate_lobby_code() was revoked from PUBLIC in the functions migration on the assumption that,
-- as an internal trigger helper, it would never need a direct grant. Wrong: it's called (via the
-- set_lobby_code BEFORE INSERT trigger) from inside rpc_create_lobby's insert into `lobbies`.
-- rpc_create_lobby is SECURITY INVOKER, so that trigger — and its nested call to
-- generate_lobby_code() — runs as the invoking role, which needs its own EXECUTE grant on the
-- nested call. Confirmed locally: `rpc_create_lobby` failed with "permission denied for function
-- generate_lobby_code" until this was added.
grant execute on function public.generate_lobby_code() to authenticated;
grant execute on function public.set_lobby_code() to authenticated;
