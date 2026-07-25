-- rpc_cast_vote's parameters are unchanged (question_id is looked up server-side from the option
-- row, never trusted from the client, so it can't be mismatched). "Already voted" becomes
-- "already answered THIS question" (ALREADY_ANSWERED_QUESTION), checked against the new
-- unique(participant_id, question_id) constraint rather than the old blanket has_voted flag.
-- has_voted is now "answered every question" (answered_count >= question_count). Auto-close stays
-- an O(1) arithmetic comparison: votes_count >= joined_count * question_count is equivalent to
-- "every joined participant answered every question," since the new unique constraint guarantees
-- no duplicate counts it.
create or replace function public.rpc_cast_vote(p_lobby_id uuid, p_option_id uuid)
returns public.lobbies
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lobby public.lobbies;
  v_participant public.participants;
  v_question_id uuid;
begin
  select * into v_lobby from public.lobbies where id = p_lobby_id for update;
  if not found then
    raise exception 'LOBBY_NOT_FOUND';
  end if;
  if v_lobby.status <> 'open' then
    raise exception 'LOBBY_NOT_OPEN';
  end if;

  select question_id into v_question_id
  from public.options where id = p_option_id and lobby_id = p_lobby_id;
  if not found then
    raise exception 'INVALID_OPTION';
  end if;

  select * into v_participant from public.participants
  where lobby_id = p_lobby_id and user_id = auth.uid();
  if not found then
    raise exception 'NOT_JOINED';
  end if;

  if exists (
    select 1 from public.votes
    where participant_id = v_participant.id and question_id = v_question_id
  ) then
    raise exception 'ALREADY_ANSWERED_QUESTION';
  end if;

  insert into public.votes (lobby_id, participant_id, option_id, question_id)
  values (p_lobby_id, v_participant.id, p_option_id, v_question_id);

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
