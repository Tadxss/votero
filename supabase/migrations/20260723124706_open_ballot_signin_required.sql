-- Open-ballot lobbies reveal who voted for what to the creator (rpc_get_ballot_detail) — that's
-- only trustworthy if the identity shown is real, so joining an open-mode lobby now requires a
-- signed-in (non-anonymous) account. Anonymous-mode lobbies are completely unaffected: voting
-- there stays exactly as frictionless as before, since identity is never revealed in that mode.
create or replace function public.rpc_join_lobby(p_code text, p_display_name text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lobby public.lobbies;
  v_participant public.participants;
  v_options jsonb;
begin
  select * into v_lobby from public.lobbies where code = p_code for update;
  if not found then
    raise exception 'LOBBY_NOT_FOUND';
  end if;
  if v_lobby.status <> 'open' then
    raise exception 'LOBBY_NOT_OPEN';
  end if;

  if v_lobby.ballot_mode = 'open'
     and (select is_anonymous from public.profiles where id = auth.uid())
  then
    raise exception 'SIGN_IN_REQUIRED';
  end if;

  select * into v_participant from public.participants
  where lobby_id = v_lobby.id and user_id = auth.uid();

  if not found then
    if v_lobby.joined_count >= v_lobby.voter_cap then
      raise exception 'LOBBY_FULL';
    end if;

    insert into public.participants (lobby_id, user_id, display_name)
    values (v_lobby.id, auth.uid(), p_display_name)
    returning * into v_participant;

    update public.lobbies set joined_count = joined_count + 1, updated_at = now()
    where id = v_lobby.id
    returning * into v_lobby;
  end if;

  select jsonb_agg(public.option_to_json(o) order by o.position) into v_options
  from public.options o
  where o.lobby_id = v_lobby.id;

  return jsonb_build_object(
    'participantId', v_participant.id,
    'hasVoted', v_participant.has_voted,
    'lobby', public.lobby_to_json(v_lobby),
    'options', coalesce(v_options, '[]'::jsonb)
  );
end;
$$;
