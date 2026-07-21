-- Adds username + first/last name to the existing `profiles` table (docs/ARCHITECTURE.md
-- "User profiles"). Extends the table created in the init migration rather than adding a new one.

alter table public.profiles
  add column username text unique,
  add column first_name text,
  add column last_name text;

create function public.profile_to_json(p public.profiles)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'id', p.id,
    'username', p.username,
    'firstName', p.first_name,
    'lastName', p.last_name,
    'createdAt', p.created_at
  );
$$;

-- rpc_update_profile: SECURITY DEFINER because checking "is this username taken by someone else"
-- requires reading across other users' profile rows, which profiles_select_self RLS deliberately
-- blocks for plain clients — same reasoning as rpc_join_lobby/rpc_cast_vote elsewhere. Because
-- this runs as the function owner, no client-facing RLS update policy or table UPDATE grant is
-- needed on `profiles` at all — only EXECUTE on this function.
create function public.rpc_update_profile(
  p_username text,
  p_first_name text,
  p_last_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text := nullif(lower(trim(p_username)), '');
  v_profile public.profiles;
begin
  if v_username is not null and v_username !~ '^[a-z0-9_]{3,20}$' then
    raise exception 'INVALID_USERNAME';
  end if;

  if v_username is not null and exists (
    select 1 from public.profiles
    where lower(username) = v_username and id <> auth.uid()
  ) then
    raise exception 'USERNAME_TAKEN';
  end if;

  update public.profiles
  set username = v_username,
      first_name = nullif(trim(p_first_name), ''),
      last_name = nullif(trim(p_last_name), '')
  where id = auth.uid()
  returning * into v_profile;

  return public.profile_to_json(v_profile);
end;
$$;

revoke execute on function public.profile_to_json(public.profiles) from public;
revoke execute on function public.rpc_update_profile(text, text, text) from public;

grant execute on function public.profile_to_json(public.profiles) to authenticated;
grant execute on function public.rpc_update_profile(text, text, text) to authenticated;
