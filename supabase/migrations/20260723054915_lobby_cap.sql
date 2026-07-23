-- Caps signed-in creators at 10 lobbies (docs/ARCHITECTURE.md "Lobby cap"). Anonymous creators are
-- deliberately excluded — their lobbies already self-delete after 7 days
-- (20260723054859_anonymous_lobby_cleanup.sql), so they don't need a separate cap. Still
-- `security invoker`: the caller already has read access to their own `profiles` row
-- (profiles_select_self) and their own `lobbies` rows (lobbies_select_creator + the existing
-- select grant), so no security-mode change is needed to add this check.
create or replace function public.rpc_create_lobby(
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

  if not (select is_anonymous from public.profiles where id = auth.uid())
     and (select count(*) from public.lobbies where creator_id = auth.uid()) >= 10
  then
    raise exception 'LOBBY_LIMIT_REACHED';
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
