-- RPCs / Edge-Function-backing functions (docs/ARCHITECTURE.md "Edge Functions").
--
-- Postgres grants EXECUTE on new functions to PUBLIC by default (unlike tables) — every function
-- below explicitly revokes that default and grants back only to the role that should actually be
-- able to call it, rather than relying on the permissive default.

-- packages/types' domain types (Lobby, LobbyOption) are camelCase, but Postgres/PostgREST column
-- names are snake_case — every RPC below that returns a lobby/option builds it through these two
-- helpers instead of `to_jsonb(row)`, so the JSON shape matches the TS types exactly. (The one
-- place this doesn't apply is a function that `returns public.lobbies` directly — e.g.
-- rpc_cast_vote — where PostgREST serializes the raw row as-is; callers of those specifically read
-- snake_case columns, see cast-vote/index.ts.)
create function public.lobby_to_json(l public.lobbies)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'id', l.id,
    'code', l.code,
    'creatorId', l.creator_id,
    'title', l.title,
    'status', l.status,
    'ballotMode', l.ballot_mode,
    'tallyVisibility', l.tally_visibility,
    'visibility', l.visibility,
    'voterCap', l.voter_cap,
    'joinedCount', l.joined_count,
    'votesCount', l.votes_count,
    'otpRequired', l.otp_required,
    'openedAt', l.opened_at,
    'closedAt', l.closed_at,
    'createdAt', l.created_at,
    'updatedAt', l.updated_at
  );
$$;

create function public.option_to_json(o public.options)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object('id', o.id, 'lobbyId', o.lobby_id, 'label', o.label, 'position', o.position);
$$;

-- rpc_create_lobby: plain RPC, no SECURITY DEFINER needed — a single-statement insert of
-- lobby+options, and the existing RLS insert policies (lobbies_insert_own, options_write_draft_only)
-- already permit a caller to do exactly this for their own lobby. Contrast with the DEFINER
-- functions below, which all exist because RLS/plain-CRUD genuinely isn't sufficient.
create function public.rpc_create_lobby(
  p_title text,
  p_options text[],
  p_voter_cap integer,
  p_ballot_mode ballot_mode,
  p_tally_visibility tally_visibility
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_lobby public.lobbies;
  v_options jsonb;
begin
  if array_length(p_options, 1) is null or array_length(p_options, 1) < 2 then
    raise exception 'AT_LEAST_TWO_OPTIONS_REQUIRED';
  end if;

  insert into public.lobbies (creator_id, title, voter_cap, ballot_mode, tally_visibility)
  values (auth.uid(), p_title, p_voter_cap, p_ballot_mode, p_tally_visibility)
  returning * into v_lobby;

  insert into public.options (lobby_id, label, position)
  select v_lobby.id, label, ord - 1
  from unnest(p_options) with ordinality as t(label, ord);

  select jsonb_agg(public.option_to_json(o) order by o.position) into v_options
  from public.options o
  where o.lobby_id = v_lobby.id;

  return jsonb_build_object('lobby', public.lobby_to_json(v_lobby), 'options', coalesce(v_options, '[]'::jsonb));
end;
$$;

-- rpc_join_lobby: cap enforcement ("read joined_count, compare to cap, conditionally insert")
-- races under concurrent scans at the boundary — `select ... for update` on the lobby row
-- serializes joiners for that lobby, closing the race window. SECURITY DEFINER because
-- `participants` has no client INSERT policy at all (see RLS migration).
create function public.rpc_join_lobby(p_code text, p_display_name text default null)
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
    'lobby', public.lobby_to_json(v_lobby),
    'options', coalesce(v_options, '[]'::jsonb)
  );
end;
$$;

-- rpc_cast_vote: one vote atomically touches four things (insert vote row, flip
-- participants.has_voted, increment lobbies.votes_count, conditionally auto-close) — inherently
-- transactional, and `votes` has zero client INSERT policy at all. `select ... for update` on the
-- lobby row makes the "am I the last voter" auto-close check atomic w.r.t. concurrent votes and a
-- concurrent manual close.
create function public.rpc_cast_vote(p_lobby_id uuid, p_option_id uuid)
returns public.lobbies
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lobby public.lobbies;
  v_participant public.participants;
begin
  select * into v_lobby from public.lobbies where id = p_lobby_id for update;
  if not found then
    raise exception 'LOBBY_NOT_FOUND';
  end if;
  if v_lobby.status <> 'open' then
    raise exception 'LOBBY_NOT_OPEN';
  end if;

  if not exists (select 1 from public.options where id = p_option_id and lobby_id = p_lobby_id) then
    raise exception 'INVALID_OPTION';
  end if;

  select * into v_participant from public.participants
  where lobby_id = p_lobby_id and user_id = auth.uid();
  if not found then
    raise exception 'NOT_JOINED';
  end if;
  if v_participant.has_voted then
    raise exception 'ALREADY_VOTED';
  end if;

  insert into public.votes (lobby_id, participant_id, option_id)
  values (p_lobby_id, v_participant.id, p_option_id);

  update public.participants set has_voted = true where id = v_participant.id;

  update public.lobbies
  set votes_count = votes_count + 1, updated_at = now()
  where id = p_lobby_id
  returning * into v_lobby;

  if v_lobby.joined_count >= v_lobby.voter_cap and v_lobby.votes_count >= v_lobby.joined_count then
    update public.lobbies set status = 'closed', closed_at = now() where id = p_lobby_id
    returning * into v_lobby;
  end if;

  return v_lobby;
end;
$$;

-- rpc_set_lobby_status: creator-only open/close. RLS already lets the creator UPDATE their own
-- lobby row, but that policy can't restrict *which* transitions are valid or protect the
-- denormalized joined_count/votes_count from being corrupted by a direct client update — routing
-- through this function (self-checked via auth.uid(), not a grant restriction) centralizes that.
create function public.rpc_set_lobby_status(p_lobby_id uuid, p_action text)
returns public.lobbies
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lobby public.lobbies;
begin
  select * into v_lobby from public.lobbies where id = p_lobby_id for update;
  if not found then
    raise exception 'LOBBY_NOT_FOUND';
  end if;
  if v_lobby.creator_id <> auth.uid() then
    raise exception 'FORBIDDEN';
  end if;

  if p_action = 'open' then
    if v_lobby.status <> 'draft' then
      raise exception 'LOBBY_NOT_DRAFT';
    end if;
    update public.lobbies set status = 'open', opened_at = now(), updated_at = now()
    where id = p_lobby_id
    returning * into v_lobby;
  elsif p_action = 'close' then
    if v_lobby.status <> 'open' then
      raise exception 'LOBBY_NOT_OPEN';
    end if;
    update public.lobbies set status = 'closed', closed_at = now(), updated_at = now()
    where id = p_lobby_id
    returning * into v_lobby;
  else
    raise exception 'INVALID_ACTION';
  end if;

  return v_lobby;
end;
$$;

-- rpc_get_ballot_detail: participant->option linkage, only for ballot_mode='open' creators.
-- Self-checked via auth.uid(), so — unlike rpc_get_tally below — it's safe to grant directly to
-- `authenticated` and call with the caller's own JWT.
create function public.rpc_get_ballot_detail(p_lobby_id uuid)
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
      select jsonb_agg(jsonb_build_object(
        'participantId', p.id,
        'displayName', p.display_name,
        'optionId', v.option_id
      ))
      from public.votes v
      join public.participants p on p.id = v.participant_id
      where v.lobby_id = p_lobby_id
    ),
    '[]'::jsonb
  );
end;
$$;

-- rpc_get_tally: pure aggregate, no participant identity — always safe *content*, but it has no
-- internal auth.uid() check of its own (an aggregate doesn't know who's asking), so unlike every
-- function above it must NOT be directly callable by clients: that's the only thing stopping a
-- client from reading a `tally_visibility='hidden'` lobby's live tally before the creator closes
-- it. It's granted to service_role only (see below) — the lobby-results Edge Function decides
-- whether the caller is allowed to see it (live / closed / is-creator) *before* calling this with
-- the service-role key, not the other way around.
create function public.rpc_get_tally(p_lobby_id uuid)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
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
    where lobby_id = p_lobby_id
    group by option_id
  ) v on v.option_id = o.id
  where o.lobby_id = p_lobby_id;
$$;

-- Lock down default PUBLIC execute, then grant back only what each function actually needs.
revoke execute on function public.rpc_create_lobby(text, text[], integer, ballot_mode, tally_visibility) from public;
revoke execute on function public.rpc_join_lobby(text, text) from public;
revoke execute on function public.rpc_cast_vote(uuid, uuid) from public;
revoke execute on function public.rpc_set_lobby_status(uuid, text) from public;
revoke execute on function public.rpc_get_ballot_detail(uuid) from public;
revoke execute on function public.rpc_get_tally(uuid) from public;
revoke execute on function public.lobby_to_json(public.lobbies) from public;
revoke execute on function public.option_to_json(public.options) from public;
revoke execute on function public.generate_lobby_code() from public;
revoke execute on function public.set_lobby_code() from public;
revoke execute on function public.handle_new_auth_user() from public;

grant execute on function public.rpc_create_lobby(text, text[], integer, ballot_mode, tally_visibility) to authenticated;
grant execute on function public.rpc_join_lobby(text, text) to authenticated;
grant execute on function public.rpc_cast_vote(uuid, uuid) to authenticated;
grant execute on function public.rpc_set_lobby_status(uuid, text) to authenticated;
grant execute on function public.rpc_get_ballot_detail(uuid) to authenticated;
-- rpc_get_tally: service_role only — see comment on the function definition above.
grant execute on function public.rpc_get_tally(uuid) to service_role;
-- rpc_create_lobby is SECURITY INVOKER, so its nested calls to these two run as the calling
-- (authenticated) role too — they need their own grant, not just the outer function's.
grant execute on function public.lobby_to_json(public.lobbies) to authenticated;
grant execute on function public.option_to_json(public.options) to authenticated;
