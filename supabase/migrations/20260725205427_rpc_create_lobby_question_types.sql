-- question_to_json gains 'type' so every RPC response (create/join/results) tells the client how
-- to render each question. Same (public.questions) signature, so `create or replace` is safe.
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
    'position', q.position,
    'options', coalesce(
      (select jsonb_agg(public.option_to_json(o) order by o.position)
       from public.options o where o.question_id = q.id),
      '[]'::jsonb
    )
  );
$$;

-- rpc_create_lobby's own Postgres signature (p_questions jsonb, ...) is unchanged — only the shape
-- *inside* that jsonb gains an optional "type" per question — so this is `create or replace`, not a
-- drop+recreate.
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
  v_q_position integer;
  v_question_id uuid;
  v_questions_json jsonb;
begin
  v_question_count := jsonb_array_length(p_questions);
  if v_question_count is null or v_question_count < 1 then
    raise exception 'AT_LEAST_ONE_QUESTION_REQUIRED';
  end if;

  for v_question in select * from jsonb_array_elements(p_questions)
  loop
    v_question_type := coalesce(v_question ->> 'type', 'choice')::question_type;
    if v_question_type = 'choice' and (
      jsonb_array_length(v_question -> 'options') is null
      or jsonb_array_length(v_question -> 'options') < 2
    ) then
      raise exception 'AT_LEAST_TWO_OPTIONS_REQUIRED';
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

    insert into public.questions (lobby_id, title, type, position)
    values (v_lobby.id, v_question ->> 'title', v_question_type, v_q_position)
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
