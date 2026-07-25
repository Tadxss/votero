-- Voters can now go back and change an answer before finishing the survey (the vote page's
-- stepper gains a "Back" button). Both RPCs' signatures are unchanged, so `create or replace` is
-- safe. Where they used to raise ALREADY_ANSWERED_QUESTION on a second submission for the same
-- question, they now update the existing vote row in place instead — counters/has_voted/auto-close
-- are untouched in that branch, since editing an answer isn't a new answer being counted, just a
-- change to one already counted. This also incidentally fixes the old refresh-mid-survey behavior:
-- resubmitting an already-answered question after a refresh now genuinely updates it instead of
-- being silently discarded.

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
  v_existing_vote_id uuid;
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

  select id into v_existing_vote_id
  from public.votes
  where participant_id = v_participant.id and question_id = v_question_id;

  if v_existing_vote_id is not null then
    update public.votes set option_id = p_option_id, response_text = null
    where id = v_existing_vote_id;

    return v_lobby;
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

create or replace function public.rpc_submit_text_response(
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
  v_existing_vote_id uuid;
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

  select id into v_existing_vote_id
  from public.votes
  where participant_id = v_participant.id and question_id = p_question_id;

  if v_existing_vote_id is not null then
    update public.votes set response_text = v_trimmed, option_id = null
    where id = v_existing_vote_id;

    return v_lobby;
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
