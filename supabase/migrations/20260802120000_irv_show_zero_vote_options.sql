-- rpc_compute_irv previously only surfaced options that received at least one top-choice vote in
-- a given round — an option stuck at 0 simply had no row in that round's result at all, rather
-- than showing at 0%. Confusing for a viewer watching live ("where did the other candidates go?"),
-- and a real correctness gap too: an option with 0 votes was never actually a candidate for
-- elimination (it never appeared in the aggregated set `v_min_idx` scans), even though standard
-- IRV rules say a 0-vote option is exactly what should be eliminated next.
--
-- Fix: derive the round's option set from every non-eliminated row in public.options (not from
-- whichever options happen to appear in the vote counts), left-joining in each one's top-choice
-- count for this round so a 0-vote option shows explicitly instead of being absent.
create or replace function public.rpc_compute_irv(p_question_id uuid)
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

    select array_agg(o.id order by o.id), array_agg(coalesce(c.cnt, 0) order by o.id)
    into v_option_ids, v_counts
    from public.options o
    left join (
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
    ) c on c.option_id = o.id
    where o.question_id = p_question_id
      and not (o.id = any(v_eliminated));

    v_active_count := coalesce(array_length(v_option_ids, 1), 0);
    if v_active_count = 0 then
      return jsonb_build_object('rounds', '[]'::jsonb, 'winner', null);
    end if;

    v_total := 0;
    for i in 1..v_active_count loop
      v_total := v_total + v_counts[i];
    end loop;

    if v_total = 0 then
      return jsonb_build_object('rounds', '[]'::jsonb, 'winner', null);
    end if;

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
