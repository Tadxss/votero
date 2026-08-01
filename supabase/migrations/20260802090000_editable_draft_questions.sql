-- Lets a creator edit a draft (not-yet-opened) lobby's questions/options/order. Safe because a
-- `status = 'draft'` lobby is provably guaranteed to have zero participants/votes (rpc_join_lobby
-- and every cast-vote RPC hard-require status = 'open' before touching those tables) — so
-- deleting and reinserting a draft lobby's questions (options cascade via their existing
-- `on delete cascade` FK) can never orphan real vote data. `questions`/`options` already have a
-- `*_write_draft_only` RLS policy scoped to exactly this case (creator + draft) — this migration
-- is the first thing to actually exercise it via a real client feature.

-- Extracted out of rpc_create_lobby's inline validation loop so create and the new update RPC
-- below enforce identical rules (question count, option count, maxSelections bounds, profanity)
-- from one source instead of two copies drifting apart over time.
create function public.validate_lobby_questions(p_questions jsonb)
returns void
language plpgsql
as $$
declare
  v_question_count integer;
  v_question jsonb;
  v_question_type question_type;
  v_max_selections integer;
  v_option_count integer;
  v_option text;
begin
  v_question_count := jsonb_array_length(p_questions);
  if v_question_count is null or v_question_count < 1 then
    raise exception 'AT_LEAST_ONE_QUESTION_REQUIRED';
  end if;

  for v_question in select * from jsonb_array_elements(p_questions)
  loop
    v_question_type := coalesce(v_question ->> 'type', 'choice')::question_type;
    v_option_count := jsonb_array_length(v_question -> 'options');

    if v_question_type in ('choice', 'ranked') and (v_option_count is null or v_option_count < 2) then
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

    if v_question_type in ('choice', 'ranked') then
      for v_option in select * from jsonb_array_elements_text(v_question -> 'options')
      loop
        if public.contains_profanity(v_option) then
          raise exception 'INAPPROPRIATE_CONTENT';
        end if;
      end loop;
    end if;
  end loop;
end;
$$;

-- rpc_create_lobby: same signature as 20260801090500_ranked_choice_voting.sql, now delegating its
-- validation loop to validate_lobby_questions instead of inlining it.
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
  v_q_position integer;
  v_question_id uuid;
  v_questions_json jsonb;
begin
  perform public.rpc_check_rate_limit('create_lobby', 5, interval '10 minutes');

  if public.contains_profanity(p_title) then
    raise exception 'INAPPROPRIATE_CONTENT';
  end if;

  perform public.validate_lobby_questions(p_questions);
  v_question_count := jsonb_array_length(p_questions);

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

    if v_question_type in ('choice', 'ranked') then
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

-- New: lets a creator replace a draft lobby's entire question set (edit title/options/order).
-- security invoker, same posture as rpc_create_lobby — the existing *_write_draft_only RLS
-- policies are the actual authorization backstop; the explicit checks below exist to raise a
-- clean error instead of a silent zero-rows-affected delete/insert.
create function public.rpc_update_lobby_questions(
  p_lobby_id uuid,
  p_questions jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_lobby public.lobbies;
  v_question jsonb;
  v_question_type question_type;
  v_max_selections integer;
  v_q_position integer;
  v_question_id uuid;
  v_question_count integer;
  v_questions_json jsonb;
begin
  perform public.rpc_check_rate_limit('update_lobby_questions', 20, interval '10 minutes');

  select * into v_lobby from public.lobbies where id = p_lobby_id for update;
  if not found then
    raise exception 'LOBBY_NOT_FOUND';
  end if;
  if v_lobby.creator_id <> auth.uid() then
    raise exception 'FORBIDDEN';
  end if;
  if v_lobby.status <> 'draft' then
    raise exception 'LOBBY_NOT_DRAFT';
  end if;

  perform public.validate_lobby_questions(p_questions);
  v_question_count := jsonb_array_length(p_questions);

  -- Safe: a draft lobby has zero participants/votes (see migration header) — options cascade-
  -- delete automatically via their existing `on delete cascade` FK to questions.
  delete from public.questions where lobby_id = p_lobby_id;

  v_q_position := 0;
  for v_question in select * from jsonb_array_elements(p_questions)
  loop
    v_question_type := coalesce(v_question ->> 'type', 'choice')::question_type;
    v_max_selections := coalesce((v_question ->> 'maxSelections')::integer, 1);

    insert into public.questions (lobby_id, title, type, max_selections, position)
    values (p_lobby_id, v_question ->> 'title', v_question_type, v_max_selections, v_q_position)
    returning id into v_question_id;

    if v_question_type in ('choice', 'ranked') then
      insert into public.options (question_id, lobby_id, label, position)
      select v_question_id, p_lobby_id, opt, opt_ord - 1
      from jsonb_array_elements_text(v_question -> 'options') with ordinality as o(opt, opt_ord);
    end if;

    v_q_position := v_q_position + 1;
  end loop;

  update public.lobbies set question_count = v_question_count, updated_at = now()
  where id = p_lobby_id
  returning * into v_lobby;

  select jsonb_agg(public.question_to_json(q) order by q.position) into v_questions_json
  from public.questions q
  where q.lobby_id = p_lobby_id;

  return jsonb_build_object(
    'lobby', public.lobby_to_json(v_lobby),
    'questions', coalesce(v_questions_json, '[]'::jsonb)
  );
end;
$$;

revoke execute on function public.rpc_update_lobby_questions(uuid, jsonb) from public;
grant execute on function public.rpc_update_lobby_questions(uuid, jsonb) to authenticated;

-- questions only had select/insert granted (20260724170359_multi_question_schema.sql) — nothing
-- before this ever deleted a question row directly (lobby deletion cascades instead, which runs
-- with the relation owner's rights, not the invoking role's grants). rpc_update_lobby_questions is
-- the first thing to delete rows directly, under security invoker, so the authenticated role needs
-- an explicit grant — RLS's *_write_draft_only policy still controls which rows. options doesn't
-- need this: its rows are only ever removed via the on delete cascade from a deleted question.
grant delete on public.questions to authenticated;
