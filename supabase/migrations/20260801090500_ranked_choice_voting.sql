-- Ranked-choice ("instant-runoff") voting. Builds on the multi-select migration's patterns: a new
-- cast-vote RPC with replace-the-set semantics, the same answered_count/votes_count-increments-
-- once-per-question invariant — plus the one genuinely new piece, rpc_compute_irv, since IRV has
-- to be computed from the full ballot set at read time (elimination rounds depend on every ballot
-- together), not accumulated incrementally like rpc_get_tally's other branches.

alter table public.votes add column rank integer null;

-- rpc_create_lobby: same signature as 20260731120000_multi_select_questions.sql. 'ranked'
-- questions need real option rows and the same 2+-options/profanity checks as 'choice' — but
-- never use max_selections (left at its harmless default of 1, unused for this type).
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

-- The actual algorithm. Each round: every still-active ballot counts toward its highest-ranked
-- option that hasn't been eliminated yet (a ballot whose every ranked option is eliminated simply
-- drops out that round — standard "exhausted ballot" IRV behavior, no special-casing needed since
-- the query below just naturally produces no row for it). If one option has a majority of the
-- round's active ballots, it wins; otherwise the option with the fewest votes is eliminated and
-- the next round runs. Ties for elimination break on lowest option_id — deterministic, not
-- specified as a product requirement, unlikely to matter at this app's scale.
create function public.rpc_compute_irv(p_question_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_eliminated uuid[] := '{}';
  v_rounds jsonb := '[]'::jsonb;
  v_option_ids uuid[];
  v_counts integer[];
  v_round_counts jsonb;
  v_total integer;
  v_winner uuid;
  v_min_count integer;
  v_min_idx integer;
  v_active_count integer;
  v_round_num integer := 0;
begin
  loop
    v_round_num := v_round_num + 1;

    select array_agg(option_id order by option_id), array_agg(cnt order by option_id)
    into v_option_ids, v_counts
    from (
      select v.option_id, count(*)::integer as cnt
      from (
        select distinct on (v2.participant_id) v2.participant_id, v2.option_id
        from public.votes v2
        where v2.question_id = p_question_id
          and v2.option_id is not null
          and not (v2.option_id = any(v_eliminated))
        order by v2.participant_id, v2.rank asc
      ) v
      group by v.option_id
    ) counted;

    v_active_count := coalesce(array_length(v_option_ids, 1), 0);
    if v_active_count = 0 then
      return jsonb_build_object('rounds', '[]'::jsonb, 'winner', null);
    end if;

    v_total := 0;
    for i in 1..v_active_count loop
      v_total := v_total + v_counts[i];
    end loop;

    select jsonb_object_agg(v_option_ids[i]::text, v_counts[i])
    into v_round_counts
    from generate_subscripts(v_option_ids, 1) as i;

    v_rounds := v_rounds || jsonb_build_array(
      jsonb_build_object('round', v_round_num, 'counts', v_round_counts)
    );

    if v_active_count = 1 then
      v_winner := v_option_ids[1];
      exit;
    end if;

    for i in 1..v_active_count loop
      if v_counts[i] * 2 > v_total then
        v_winner := v_option_ids[i];
      end if;
    end loop;
    exit when v_winner is not null;

    v_min_count := v_counts[1];
    v_min_idx := 1;
    for i in 2..v_active_count loop
      if v_counts[i] < v_min_count then
        v_min_count := v_counts[i];
        v_min_idx := i;
      end if;
    end loop;
    v_eliminated := v_eliminated || v_option_ids[v_min_idx];
  end loop;

  return jsonb_build_object('rounds', v_rounds, 'winner', v_winner);
end;
$$;

revoke execute on function public.rpc_compute_irv(uuid) from public;
grant execute on function public.rpc_compute_irv(uuid) to service_role;

-- rpc_get_tally: same (p_lobby_id uuid) signature. Gains a third branch alongside the existing
-- text/else-choice ones — the IRV rounds/winner shape from rpc_compute_irv, concatenated onto the
-- same {questionId, questionTitle, type} base every branch shares.
create or replace function public.rpc_get_tally(p_lobby_id uuid)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'questionId', q.id,
        'questionTitle', q.title,
        'type', q.type
      ) ||
      case
        when q.type = 'text' then jsonb_build_object(
          'responses', coalesce(
            (
              select jsonb_agg(
                jsonb_build_object('text', grp.norm_text, 'count', grp.cnt)
                order by grp.cnt desc, grp.norm_text asc
              )
              from (
                select lower(trim(v.response_text)) as norm_text, count(*) as cnt
                from public.votes v
                where v.question_id = q.id
                group by lower(trim(v.response_text))
              ) grp
            ),
            '[]'::jsonb
          )
        )
        when q.type = 'ranked' then public.rpc_compute_irv(q.id)
        else jsonb_build_object(
          'tally', (
            select coalesce(
              jsonb_agg(
                jsonb_build_object('optionId', o.id, 'count', coalesce(v.cnt, 0))
                order by o.position
              ),
              '[]'::jsonb
            )
            from public.options o
            left join (
              select option_id, count(*) as cnt
              from public.votes
              where question_id = q.id
              group by option_id
            ) v on v.option_id = o.id
            where o.question_id = q.id
          )
        )
      end
      order by q.position
    ),
    '[]'::jsonb
  )
  from public.questions q
  where q.lobby_id = p_lobby_id;
$$;

-- rpc_get_ballot_detail: same signature. The else (non-text) branch now always includes `rank`
-- (null for plain choice/multi-select rows, an integer for ranked ones) rather than adding a
-- fourth case branch — the manage page's existing per-participant grouping (built for multi-
-- select) already handles this shape, it just sorts by rank when present.
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
      select jsonb_agg(
        jsonb_build_object(
          'questionId', q.id,
          'questionTitle', q.title,
          'type', q.type,
          'entries', coalesce(
            (
              select jsonb_agg(
                jsonb_build_object(
                  'participantId', p.id,
                  'firstName', pr.first_name,
                  'lastName', pr.last_name,
                  'username', pr.username,
                  'email', u.email,
                  'avatarUrl', pr.avatar_url
                ) ||
                case
                  when q.type = 'text' then jsonb_build_object('responseText', v.response_text)
                  else jsonb_build_object('optionId', v.option_id, 'rank', v.rank)
                end
              )
              from public.votes v
              join public.participants p on p.id = v.participant_id
              left join public.profiles pr on pr.id = p.user_id
              left join auth.users u on u.id = p.user_id
              where v.question_id = q.id
            ),
            '[]'::jsonb
          )
        )
        order by q.position
      )
      from public.questions q
      where q.lobby_id = p_lobby_id
    ),
    '[]'::jsonb
  );
end;
$$;

-- New RPC for ranked questions only — replace-the-set semantics like rpc_cast_vote_multi, but the
-- "set" here is the participant's whole ordered ranking, so every resubmission is a full
-- delete+reinsert rather than a partial diff (there's no meaningful "add one rank" operation).
create function public.rpc_cast_vote_ranked(
  p_lobby_id uuid,
  p_question_id uuid,
  p_ranked_option_ids uuid[]
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
  v_deduped_ids uuid[];
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

  select type into v_question_type
  from public.questions where id = p_question_id and lobby_id = p_lobby_id;
  if not found or v_question_type <> 'ranked' then
    raise exception 'INVALID_QUESTION';
  end if;

  select array_agg(distinct oid) into v_deduped_ids from unnest(p_ranked_option_ids) as oid;
  if v_deduped_ids is null or array_length(v_deduped_ids, 1) < 2 then
    raise exception 'AT_LEAST_TWO_RANKED_OPTIONS_REQUIRED';
  end if;
  if array_length(v_deduped_ids, 1) <> array_length(p_ranked_option_ids, 1) then
    raise exception 'DUPLICATE_OPTION';
  end if;

  select count(*) into v_valid_count
  from public.options where id = any(v_deduped_ids) and question_id = p_question_id;
  if v_valid_count <> array_length(v_deduped_ids, 1) then
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
  where participant_id = v_participant.id and question_id = p_question_id;

  -- Rank order must come from the caller's original array, not v_deduped_ids (array_agg(distinct
  -- ...) gives no ordering guarantee) — already validated above to be duplicate-free.
  insert into public.votes (lobby_id, participant_id, option_id, question_id, rank)
  select p_lobby_id, v_participant.id, oid, p_question_id, rnk
  from unnest(p_ranked_option_ids) with ordinality as t(oid, rnk);

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

revoke execute on function public.rpc_cast_vote_ranked(uuid, uuid, uuid[]) from public;
grant execute on function public.rpc_cast_vote_ranked(uuid, uuid, uuid[]) to authenticated;
