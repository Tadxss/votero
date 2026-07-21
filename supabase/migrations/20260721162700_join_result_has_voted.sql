-- The voter UI needs to know, right after joining, whether this participant already voted (e.g.
-- on a page refresh after voting earlier) to render "waiting" instead of the ballot again.
-- rpc_join_lobby already looks up v_participant (which has has_voted) but never returned it.
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
