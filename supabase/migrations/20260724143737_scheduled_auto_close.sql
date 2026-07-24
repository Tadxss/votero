-- Optional time-based auto-close: a creator can set closes_at at creation time, and a pg_cron
-- sweep flips any open lobby past that time to closed — same convention (closed_at = now()) the
-- cap-triggered auto-close in rpc_cast_vote already uses. Runs every minute rather than daily
-- (like the anonymous-lobby cleanup job) since "closes on this date and time" needs to actually
-- feel timely; a lazy check inside rpc_join_lobby/rpc_cast_vote was considered but skipped — both
-- read from the plain `lobbies` table (not through an RPC) on the client, so the row needs to
-- already be 'closed' in the database for the UI to react, and the existing Realtime subscription
-- on `lobbies` already pushes this sweep's update to any open page instantly once it commits.

alter table public.lobbies add column closes_at timestamptz;

create or replace function public.lobby_to_json(l public.lobbies)
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
    'closesAt', l.closes_at,
    'openedAt', l.opened_at,
    'closedAt', l.closed_at,
    'createdAt', l.created_at,
    'updatedAt', l.updated_at
  );
$$;

-- Adding a parameter changes the declared argument-type signature, so `create or replace` on the
-- old 5-arg declaration would create a second overloaded function instead of replacing it (same
-- reasoning as rpc_update_profile's p_avatar_url addition) — drop the old signature explicitly.
drop function if exists public.rpc_create_lobby(text, text[], integer, ballot_mode, tally_visibility);

create function public.rpc_create_lobby(
  p_title text,
  p_options text[],
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
  v_options jsonb;
begin
  if array_length(p_options, 1) is null or array_length(p_options, 1) < 2 then
    raise exception 'AT_LEAST_TWO_OPTIONS_REQUIRED';
  end if;

  if p_closes_at is not null and p_closes_at <= now() then
    raise exception 'CLOSES_AT_MUST_BE_FUTURE';
  end if;

  if not (select is_anonymous from public.profiles where id = auth.uid())
     and (select count(*) from public.lobbies where creator_id = auth.uid()) >= 10
  then
    raise exception 'LOBBY_LIMIT_REACHED';
  end if;

  insert into public.lobbies (creator_id, title, voter_cap, ballot_mode, tally_visibility, closes_at)
  values (auth.uid(), p_title, p_voter_cap, p_ballot_mode, p_tally_visibility, p_closes_at)
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

revoke execute on function public.rpc_create_lobby(text, text[], integer, ballot_mode, tally_visibility, timestamptz) from public;
grant execute on function public.rpc_create_lobby(text, text[], integer, ballot_mode, tally_visibility, timestamptz) to authenticated;

select cron.schedule(
  'auto-close-scheduled-lobbies',
  '* * * * *',
  $$
    update public.lobbies
    set status = 'closed', closed_at = now(), updated_at = now()
    where status = 'open' and closes_at is not null and closes_at <= now();
  $$
);
