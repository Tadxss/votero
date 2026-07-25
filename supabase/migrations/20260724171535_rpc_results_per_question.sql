-- Regroup rpc_get_ballot_detail and rpc_get_tally per question, so the client can render one
-- results block per question without extra round-trips. Both keep their existing
-- (p_lobby_id uuid) signature and jsonb return type, so `create or replace` is safe here (no
-- overload risk).

-- option_to_json predates questions and never exposed question_id — add it so the JSON options
-- returned by rpc_create_lobby/rpc_join_lobby actually match the LobbyOption domain type's
-- questionId field (options fetched directly via useLobby's table read already had it via
-- mapOptionRow). Same (public.options) signature, so `create or replace` is safe.
create or replace function public.option_to_json(o public.options)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'id', o.id, 'lobbyId', o.lobby_id, 'questionId', o.question_id, 'label', o.label, 'position', o.position
  );
$$;

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
          'entries', coalesce(
            (
              select jsonb_agg(jsonb_build_object(
                'participantId', p.id,
                'optionId', v.option_id,
                'firstName', pr.first_name,
                'lastName', pr.last_name,
                'username', pr.username,
                'email', u.email,
                'avatarUrl', pr.avatar_url
              ))
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
      order by q.position
    ),
    '[]'::jsonb
  )
  from public.questions q
  where q.lobby_id = p_lobby_id;
$$;
