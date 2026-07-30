-- Multi-select ("choose up to N") choice questions. `max_selections` defaults to 1, so every
-- existing choice question is unaffected — rpc_cast_vote's single-select behavior stays exactly
-- as it was; multi-select is a new, separate code path (rpc_cast_vote_multi), not a rework.
alter table public.questions add column max_selections integer not null default 1;

-- The old blanket unique(participant_id, question_id) is exactly what made single-select work —
-- and exactly what must relax for multi-select. Nullable option_id/response_text means one
-- combined constraint can't express both invariants, so this splits into two partial indexes:
-- text questions keep their existing "exactly one answer" guarantee, choice questions gain "one
-- row per selected option" instead of "one row per question."
alter table public.votes drop constraint votes_participant_id_question_id_key;

create unique index votes_one_per_text_answer
  on public.votes (participant_id, question_id)
  where response_text is not null;

create unique index votes_one_per_option
  on public.votes (participant_id, question_id, option_id)
  where option_id is not null;

-- question_to_json gains maxSelections so every RPC response (create/join/results) tells the
-- client how many options a question allows. Same (public.questions) signature, `create or
-- replace` is safe.
create or replace function public.question_to_json(q public.questions)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'id', q.id,
    'lobbyId', q.lobby_id,
    'title', q.title,
    'type', q.type,
    'maxSelections', q.max_selections,
    'position', q.position,
    'options', coalesce(
      (select jsonb_agg(public.option_to_json(o) order by o.position)
       from public.options o where o.question_id = q.id),
      '[]'::jsonb
    )
  );
$$;

-- rpc_create_lobby: same (p_title, p_questions jsonb, ...) signature as
-- 20260730120000_rate_limiting_and_content_moderation.sql, so `create or replace` is safe. Adds
-- max_selections extraction/validation alongside the existing type handling.
create or replace function public.rpc_create_lobby(
  p_title text,
  p_questions jsonb,
  p_voter_cap integer,
  p_ballot_mode ballot_mode,
  p_tally_visibility tally_visibility,
  p_closes_at timestamptz default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_lobby public.lobbies;
  v_question_count integer;
  v_question jsonb;
  v_question_type question_type;
  v_max_selections integer;
  v_option_count integer;
  v_q_position integer;
  v_question_id uuid;
  v_questions_json jsonb;
  v_option text;
begin
  perform public.rpc_check_rate_limit('create_lobby', 5, interval '10 minutes');

  v_question_count := jsonb_array_length(p_questions);
  if v_question_count is null or v_question_count < 1 then
    raise exception 'AT_LEAST_ONE_QUESTION_REQUIRED';
  end if;

  if public.contains_profanity(p_title) then
    raise exception 'INAPPROPRIATE_CONTENT';
  end if;

  for v_question in select * from jsonb_array_elements(p_questions)
  loop
    v_question_type := coalesce(v_question ->> 'type', 'choice')::question_type;
    v_option_count := jsonb_array_length(v_question -> 'options');

    if v_question_type = 'choice' and (v_option_count is null or v_option_count < 2) then
      raise exception 'AT_LEAST_TWO_OPTIONS_REQUIRED';
    end if;

    v_max_selections := coalesce((v_question ->> 'maxSelections')::integer, 1);
    if v_question_type = 'choice'
       and (v_max_selections < 1 or v_max_selections > v_option_count)
    then
      raise exception 'INVALID_MAX_SELECTIONS';
    end if;

    if public.contains_profanity(v_question ->> 'title') then
      raise exception 'INAPPROPRIATE_CONTENT';
    end if;

    if v_question_type = 'choice' then
      for v_option in select * from jsonb_array_elements_text(v_question -> 'options')
      loop
        if public.contains_profanity(v_option) then
          raise exception 'INAPPROPRIATE_CONTENT';
        end if;
      end loop;
    end if;
  end loop;

  if p_closes_at is not null and p_closes_at <= now() then
    raise exception 'CLOSES_AT_MUST_BE_FUTURE';
  end if;

  if not (select is_anonymous from public.profiles where id = auth.uid())
     and (select count(*) from public.lobbies where creator_id = auth.uid()) >= 10
  then
    raise exception 'LOBBY_LIMIT_REACHED';
  end if;

  insert into public.lobbies (
    creator_id, title, voter_cap, ballot_mode, tally_visibility, closes_at, question_count
  )
  values (
    auth.uid(), p_title, p_voter_cap, p_ballot_mode, p_tally_visibility, p_closes_at, v_question_count
  )
  returning * into v_lobby;

  v_q_position := 0;
  for v_question in select * from jsonb_array_elements(p_questions)
  loop
    v_question_type := coalesce(v_question ->> 'type', 'choice')::question_type;
    v_max_selections := coalesce((v_question ->> 'maxSelections')::integer, 1);

    insert into public.questions (lobby_id, title, type, max_selections, position)
    values (v_lobby.id, v_question ->> 'title', v_question_type, v_max_selections, v_q_position)
    returning id into v_question_id;

    if v_question_type = 'choice' then
      insert into public.options (question_id, lobby_id, label, position)
      select v_question_id, v_lobby.id, opt, opt_ord - 1
      from jsonb_array_elements_text(v_question -> 'options') with ordinality as o(opt, opt_ord);
    end if;

    v_q_position := v_q_position + 1;
  end loop;

  select jsonb_agg(public.question_to_json(q) order by q.position) into v_questions_json
  from public.questions q
  where q.lobby_id = v_lobby.id;

  return jsonb_build_object(
    'lobby', public.lobby_to_json(v_lobby),
    'questions', coalesce(v_questions_json, '[]'::jsonb)
  );
end;
$$;

-- New RPC for multi-select questions only (max_selections > 1) — replace-the-set semantics,
-- matching the vote page's existing "accumulate locally, submit once" model rather than a
-- per-click toggle. rpc_cast_vote (single-select, unchanged) refuses to touch a multi-select
-- question, and this refuses anything else, keeping the two paths cleanly separated.
create function public.rpc_cast_vote_multi(
  p_lobby_id uuid,
  p_question_id uuid,
  p_option_ids uuid[]
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
  v_max_selections integer;
  v_option_ids uuid[];
  v_valid_count integer;
  v_had_any_before boolean;
begin
  perform public.rpc_check_rate_limit('cast_vote', 60, interval '5 minutes');

  select * into v_lobby from public.lobbies where id = p_lobby_id for update;
  if not found then
    raise exception 'LOBBY_NOT_FOUND';
  end if;
  if v_lobby.status <> 'open' then
    raise exception 'LOBBY_NOT_OPEN';
  end if;

  select type, max_selections into v_question_type, v_max_selections
  from public.questions where id = p_question_id and lobby_id = p_lobby_id;
  if not found or v_question_type <> 'choice' or v_max_selections <= 1 then
    raise exception 'INVALID_QUESTION';
  end if;

  select array_agg(distinct oid) into v_option_ids from unnest(p_option_ids) as oid;
  if v_option_ids is null or array_length(v_option_ids, 1) is null then
    raise exception 'AT_LEAST_ONE_OPTION_REQUIRED';
  end if;
  if array_length(v_option_ids, 1) > v_max_selections then
    raise exception 'MAX_SELECTIONS_EXCEEDED';
  end if;

  select count(*) into v_valid_count
  from public.options where id = any(v_option_ids) and question_id = p_question_id;
  if v_valid_count <> array_length(v_option_ids, 1) then
    raise exception 'INVALID_OPTION';
  end if;

  select * into v_participant from public.participants
  where lobby_id = p_lobby_id and user_id = auth.uid();
  if not found then
    raise exception 'NOT_JOINED';
  end if;

  select exists(
    select 1 from public.votes
    where participant_id = v_participant.id and question_id = p_question_id
  ) into v_had_any_before;

  delete from public.votes
  where participant_id = v_participant.id
    and question_id = p_question_id
    and option_id <> all(v_option_ids);

  insert into public.votes (lobby_id, participant_id, option_id, question_id)
  select p_lobby_id, v_participant.id, oid, p_question_id
  from unnest(v_option_ids) as oid
  on conflict do nothing;

  if not v_had_any_before then
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
  end if;

  return v_lobby;
end;
$$;

revoke execute on function public.rpc_cast_vote_multi(uuid, uuid, uuid[]) from public;
grant execute on function public.rpc_cast_vote_multi(uuid, uuid, uuid[]) to authenticated;
