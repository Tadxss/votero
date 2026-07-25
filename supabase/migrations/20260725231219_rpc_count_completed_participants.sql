-- Real bug found while fixing the "X of Y have voted" progress display: the lobby-results Edge
-- Function tried reading `participants` directly with the admin (service_role) client, but
-- `participants` deliberately has NO service_role grant (see 20260721154753_grants.sql's own
-- comment — every participants/votes access goes through either an authenticated-reachable RLS
-- policy or a SECURITY DEFINER RPC, never a raw service-role grant). This mirrors rpc_get_tally's
-- existing pattern instead of opening a new grant.
create function public.rpc_count_completed_participants(p_lobby_id uuid)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::integer
  from public.participants
  where lobby_id = p_lobby_id and has_voted = true;
$$;

revoke execute on function public.rpc_count_completed_participants(uuid) from public;
grant execute on function public.rpc_count_completed_participants(uuid) to service_role;
