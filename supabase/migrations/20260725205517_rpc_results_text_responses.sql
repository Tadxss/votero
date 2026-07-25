-- rpc_get_tally and rpc_get_ballot_detail branch per question type. Both keep their existing
-- (p_lobby_id uuid) signature and jsonb return type, so `create or replace` is safe.

-- text questions: grouped by lower(trim(response_text)) — a v1 simplification, exact-match-after-
-- normalization only ("Pizza" and "pizzas" don't merge). This is the anonymous-safe aggregate view
-- (visible per tally_visibility, mirrors "tally" for choice questions), never attributed to a voter.
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

-- text questions: raw, unnormalized responseText per entry — this view already shows individual
-- identity (open ballot mode, creator-only), so no aggregation makes sense here, matching how
-- choice questions show a raw per-participant optionId today.
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
                  else jsonb_build_object('optionId', v.option_id)
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
