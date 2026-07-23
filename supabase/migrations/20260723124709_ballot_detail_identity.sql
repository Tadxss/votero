-- rpc_get_ballot_detail already runs SECURITY DEFINER and is already creator-gated (raises
-- FORBIDDEN unless the caller is the lobby's creator), so joining across profiles/auth.users here
-- is strictly additive to an already-locked-down function — no new grants needed. Replaces the
-- old `displayName` field (participants.display_name), which nothing ever populated (the voter UI
-- never collected it), with real profile identity now that open-mode voting requires a real
-- account (see 20260723124706_open_ballot_signin_required.sql).
create or replace function public.rpc_get_ballot_detail(p_lobby_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_lobby public.lobbies;
begin
  select * into v_lobby from public.lobbies where id = p_lobby_id;
  if not found then
    raise exception 'LOBBY_NOT_FOUND';
  end if;
  if v_lobby.ballot_mode <> 'open' or v_lobby.creator_id <> auth.uid() then
    raise exception 'FORBIDDEN';
  end if;

  return coalesce(
    (
      select jsonb_agg(jsonb_build_object(
        'participantId', p.id,
        'optionId', v.option_id,
        'firstName', pr.first_name,
        'lastName', pr.last_name,
        'username', pr.username,
        'email', u.email,
        'avatarUrl', pr.avatar_url
      ))
      from public.votes v
      join public.participants p on p.id = v.participant_id
      left join public.profiles pr on pr.id = p.user_id
      left join auth.users u on u.id = p.user_id
      where v.lobby_id = p_lobby_id
    ),
    '[]'::jsonb
  );
end;
$$;
