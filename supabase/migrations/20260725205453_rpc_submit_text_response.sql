-- rpc_submit_text_response mirrors rpc_cast_vote's structure closely, but is kept as its own
-- function rather than overloading rpc_cast_vote with mutually-exclusive optional params — matches
-- this codebase's existing one-function-one-job convention (rpc_join_lobby/rpc_cast_vote/etc. are
-- each a single, focused action).
create function public.rpc_submit_text_response(
  p_lobby_id uuid,
  p_question_id uuid,
  p_response_text text
)
returns public.lobbies
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lobby public.lobbies;
  v_participant public.participants;
  v_question_type question_type;
  v_trimmed text;
begin
  select * into v_lobby from public.lobbies where id = p_lobby_id for update;
  if not found then
    raise exception 'LOBBY_NOT_FOUND';
  end if;
  if v_lobby.status <> 'open' then
    raise exception 'LOBBY_NOT_OPEN';
  end if;

  select type into v_question_type
  from public.questions where id = p_question_id and lobby_id = p_lobby_id;
  if not found or v_question_type <> 'text' then
    raise exception 'INVALID_QUESTION';
  end if;

  v_trimmed := trim(p_response_text);
  if v_trimmed is null or char_length(v_trimmed) = 0 then
    raise exception 'RESPONSE_TEXT_REQUIRED';
  end if;
  if char_length(v_trimmed) > 300 then
    raise exception 'RESPONSE_TEXT_TOO_LONG';
  end if;

  select * into v_participant from public.participants
  where lobby_id = p_lobby_id and user_id = auth.uid();
  if not found then
    raise exception 'NOT_JOINED';
  end if;

  if exists (
    select 1 from public.votes
    where participant_id = v_participant.id and question_id = p_question_id
  ) then
    raise exception 'ALREADY_ANSWERED_QUESTION';
  end if;

  insert into public.votes (lobby_id, participant_id, question_id, response_text)
  values (p_lobby_id, v_participant.id, p_question_id, v_trimmed);

  update public.participants
  set answered_count = answered_count + 1,
      has_voted = (answered_count + 1 >= v_lobby.question_count)
  where id = v_participant.id;

  update public.lobbies
  set votes_count = votes_count + 1, updated_at = now()
  where id = p_lobby_id
  returning * into v_lobby;

  if v_lobby.joined_count >= v_lobby.voter_cap
     and v_lobby.votes_count >= v_lobby.joined_count * v_lobby.question_count
  then
    update public.lobbies set status = 'closed', closed_at = now() where id = p_lobby_id
    returning * into v_lobby;
  end if;

  return v_lobby;
end;
$$;

revoke execute on function public.rpc_submit_text_response(uuid, uuid, text) from public;
grant execute on function public.rpc_submit_text_response(uuid, uuid, text) to authenticated;
