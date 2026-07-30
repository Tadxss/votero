-- Rate limiting: every participant (including anonymous voters) authenticates via Supabase
-- anonymous auth, so auth.uid() is always present — a per-identity limiter inside the existing
-- SECURITY DEFINER/INVOKER RPCs needs no new Edge Function and no IP capture. This is a
-- safety-net threshold against retry storms/scripted abuse, not a user-facing quota: an abuser
-- could still rotate anonymous sessions to reset it, the same accepted limitation this codebase
-- already has for "one vote per person" (best-effort, not airtight).
create table public.rate_limit_hits (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  action text not null,
  created_at timestamptz not null default now()
);
create index rate_limit_hits_user_action_created_idx
  on public.rate_limit_hits (user_id, action, created_at);

create function public.rpc_check_rate_limit(p_action text, p_max_count integer, p_window interval)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  -- Opportunistic cleanup keeps the table small without a cron job — fine at beta volume.
  delete from public.rate_limit_hits where created_at < now() - interval '1 day';

  select count(*) into v_count from public.rate_limit_hits
  where user_id = auth.uid() and action = p_action and created_at > now() - p_window;

  if v_count >= p_max_count then
    raise exception 'RATE_LIMITED';
  end if;

  insert into public.rate_limit_hits (user_id, action) values (auth.uid(), p_action);
end;
$$;

revoke execute on function public.rpc_check_rate_limit(text, integer, interval) from public;
grant execute on function public.rpc_check_rate_limit(text, integer, interval) to authenticated;

-- Content moderation: wordlist is leo-profanity's default English dictionary
-- (packages/shared/src/profanity.ts uses the same package client-side for instant feedback —
-- keep both in sync if the list ever changes). Word-boundary regex so e.g. "raccoon" doesn't
-- trip on "coon".
create function public.contains_profanity(p_text text)
returns boolean
language sql
immutable
as $$
  select p_text ~* ('\y(' || array_to_string(array[
    '2g1c', 'acrotomophilia', 'anal', 'anilingus', 'anus', 'apeshit', 'arsehole', 'ass',
    'asshole', 'assmunch', 'autoerotic', 'babeland', 'bangbros', 'bareback', 'barenaked',
    'bastard', 'bastardo', 'bastinado', 'bbw', 'bdsm', 'beaner', 'beaners', 'bestiality',
    'bimbos', 'birdlock', 'bitch', 'bitches', 'blowjob', 'blumpkin', 'bollocks', 'bondage',
    'boner', 'boob', 'boobs', 'bukkake', 'bulldyke', 'bullshit', 'bunghole', 'busty', 'butt',
    'buttcheeks', 'butthole', 'camgirl', 'camslut', 'camwhore', 'carpetmuncher', 'circlejerk',
    'clit', 'clitoris', 'clusterfuck', 'cock', 'cocks', 'coprolagnia', 'coprophilia',
    'cornhole', 'coon', 'coons', 'creampie', 'cum', 'cumming', 'cunnilingus', 'cunt',
    'darkie', 'daterape', 'deepthroat', 'dendrophilia', 'dick', 'dildo', 'dingleberry',
    'dingleberries', 'doggiestyle', 'doggystyle', 'dolcett', 'domination', 'dominatrix',
    'dommes', 'dvda', 'ecchi', 'ejaculation', 'erotic', 'erotism', 'escort', 'eunuch',
    'faggot', 'fecal', 'felch', 'fellatio', 'feltch', 'femdom', 'figging', 'fingerbang',
    'fingering', 'fisting', 'footjob', 'frotting', 'fuck', 'fucked', 'fuckin', 'fucking',
    'fucktards', 'fudgepacker', 'futanari', 'genitals', 'goatcx', 'goatse', 'gokkun',
    'goodpoop', 'goregasm', 'grope', 'g-spot', 'guro', 'handjob', 'hardcore', 'hentai',
    'homoerotic', 'honkey', 'hooker', 'humping', 'incest', 'intercourse', 'jailbait',
    'jigaboo', 'jiggaboo', 'jiggerboo', 'jizz', 'juggs', 'kike', 'kinbaku', 'kinkster',
    'kinky', 'knobbing', 'lolita', 'lovemaking', 'masturbate', 'milf', 'motherfucker',
    'muffdiving', 'nambla', 'nawashi', 'negro', 'neonazi', 'nigga', 'nigger', 'nimphomania',
    'nipple', 'nipples', 'nude', 'nudity', 'nympho', 'nymphomania', 'octopussy', 'omorashi',
    'orgasm', 'orgy', 'paedophile', 'paki', 'panties', 'panty', 'pedobear', 'pedophile',
    'pegging', 'penis', 'pissing', 'pisspig', 'playboy', 'ponyplay', 'poof', 'poon',
    'poontang', 'punany', 'poopchute', 'porn', 'porno', 'pornography', 'pthc', 'pubes',
    'pussy', 'queaf', 'queef', 'quim', 'raghead', 'rape', 'raping', 'rapist', 'rectum',
    'rimjob', 'rimming', 'sadism', 'santorum', 'scat', 'schlong', 'scissoring', 'semen',
    'sex', 'sexo', 'sexy', 'shemale', 'shibari', 'shit', 'shitblimp', 'shitty', 'shota',
    'shrimping', 'skeet', 'slanteye', 'slut', 's&m', 'smut', 'snatch', 'snowballing',
    'sodomize', 'sodomy', 'spic', 'splooge', 'spooge', 'spunk', 'strapon', 'strappado',
    'suck', 'sucks', 'swastika', 'swinger', 'threesome', 'throating', 'tit', 'tits',
    'titties', 'titty', 'topless', 'tosser', 'towelhead', 'tranny', 'tribadism', 'tubgirl',
    'tushy', 'twat', 'twink', 'twinkie', 'undressing', 'upskirt', 'urophilia', 'vagina',
    'vibrator', 'vorarephilia', 'voyeur', 'vulva', 'wank', 'wetback', 'xx', 'xxx', 'yaoi',
    'yiffy', 'zoophilia'
  ], '|') || ')\y');
$$;

-- rpc_create_lobby: same (p_title, p_questions, ...) signature as
-- 20260725205427_rpc_create_lobby_question_types.sql, so `create or replace` is safe. Adds a
-- time-windowed rate-limit check (5 lobbies / 10 min) on top of the existing lifetime 10-lobby
-- cap for signed-in creators — the new check also covers anonymous creators, who previously had
-- no cap of any kind — plus a profanity check on the title and every question title/option.
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
    if v_question_type = 'choice' and (
      jsonb_array_length(v_question -> 'options') is null
      or jsonb_array_length(v_question -> 'options') < 2
    ) then
      raise exception 'AT_LEAST_TWO_OPTIONS_REQUIRED';
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

-- rpc_join_lobby: same signature as 20260724171003_rpc_join_lobby_multi_question.sql. Rate-limit
-- guards against lobby-code brute-forcing/enumeration via repeated join attempts.
create or replace function public.rpc_join_lobby(p_code text, p_display_name text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lobby public.lobbies;
  v_participant public.participants;
  v_questions_json jsonb;
begin
  perform public.rpc_check_rate_limit('join_lobby', 15, interval '5 minutes');

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

  select jsonb_agg(public.question_to_json(q) order by q.position) into v_questions_json
  from public.questions q
  where q.lobby_id = v_lobby.id;

  return jsonb_build_object(
    'participantId', v_participant.id,
    'hasVoted', v_participant.has_voted,
    'lobby', public.lobby_to_json(v_lobby),
    'questions', coalesce(v_questions_json, '[]'::jsonb)
  );
end;
$$;

-- rpc_cast_vote: same signature as 20260725220112_rpc_vote_upsert_allow_edits.sql. Rate limit is
-- a generous safety net (60/5min) against retry storms, not a real quota — one vote per question
-- is already structurally enforced by the unique(participant_id, question_id) constraint.
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
  perform public.rpc_check_rate_limit('cast_vote', 60, interval '5 minutes');

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

-- rpc_submit_text_response: same signature as 20260725220112_rpc_vote_upsert_allow_edits.sql.
-- Rate limit mirrors rpc_cast_vote's; profanity check added on the trimmed response text.
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
  perform public.rpc_check_rate_limit('submit_text_response', 60, interval '5 minutes');

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
  if public.contains_profanity(v_trimmed) then
    raise exception 'INAPPROPRIATE_CONTENT';
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
