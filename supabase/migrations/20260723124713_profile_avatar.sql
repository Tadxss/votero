-- Profile picture support: a new profiles.avatar_url column, an "avatars" storage bucket, and
-- rpc_update_profile extended to write it. Kept inside the same trusted RPC as
-- username/first/last name rather than a plain client `.update()` — profiles intentionally has no
-- general update grant/policy (only rpc_update_profile can write), specifically so username
-- changes can't bypass the uniqueness check via a raw client update; a separate narrower RLS
-- policy just for avatar_url isn't practical in Postgres RLS, so extending the one write path is
-- the simplest safe option.

alter table public.profiles add column avatar_url text;

create or replace function public.profile_to_json(p public.profiles)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'id', p.id,
    'username', p.username,
    'firstName', p.first_name,
    'lastName', p.last_name,
    'avatarUrl', p.avatar_url,
    'createdAt', p.created_at
  );
$$;

-- Adding a parameter changes the function's argument-type signature, so `create or replace` on the
-- old (text,text,text) declaration would just create a second overloaded function instead of
-- replacing it (Postgres matches overloads by declared argument list, and a call with exactly 3
-- named args would then ambiguously/incorrectly resolve to the untouched old version) — drop the
-- old signature explicitly first.
drop function if exists public.rpc_update_profile(text, text, text);

create function public.rpc_update_profile(
  p_username text,
  p_first_name text,
  p_last_name text,
  p_avatar_url text default null
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
      last_name = nullif(trim(p_last_name), ''),
      avatar_url = nullif(trim(p_avatar_url), '')
  where id = auth.uid()
  returning * into v_profile;

  return public.profile_to_json(v_profile);
end;
$$;

revoke execute on function public.rpc_update_profile(text, text, text, text) from public;
grant execute on function public.rpc_update_profile(text, text, text, text) to authenticated;

-- Storage bucket created via SQL (not config.toml's [storage.buckets], which is local-CLI-only
-- and never reaches the hosted project via config push/db push).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "Avatar images are publicly accessible" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "Users can upload their own avatar" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update their own avatar" on storage.objects
  for update using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own avatar" on storage.objects
  for delete using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );
