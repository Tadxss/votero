-- Branding per lobby: an optional logo + accent color a creator can set on their own lobby,
-- shown on the voter-facing vote page and Present Mode. See docs/ARCHITECTURE.md / the
-- client-pitch brainstorm this shipped from for the "why" — schema-light on purpose, mirrors the
-- existing avatar-upload pattern (20260723124713_profile_avatar.sql) for the storage bucket/RLS.

alter table public.lobbies
  add column brand_logo_url text,
  add column brand_color text; -- hex e.g. '#2a78d6'; null = no custom branding

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
    'questionCount', l.question_count,
    'brandLogoUrl', l.brand_logo_url,
    'brandColor', l.brand_color,
    'closesAt', l.closes_at,
    'openedAt', l.opened_at,
    'closedAt', l.closed_at,
    'createdAt', l.created_at,
    'updatedAt', l.updated_at
  );
$$;

-- WCAG relative-luminance/contrast helpers — reused by rpc_update_lobby_branding below to keep a
-- user-submitted brand color legible as white text (same 4.5:1 AA threshold this project's
-- accessibility pass already settled on for the brand-700 palette shade, see
-- apps/web/app/_components/Button.tsx), without requiring the client to know what WCAG means.
create function public.srgb_to_linear(c double precision)
returns double precision
language sql
immutable
as $$
  select case when c <= 0.03928 then c / 12.92 else power((c + 0.055) / 1.055, 2.4) end;
$$;

create function public.relative_luminance(r int, g int, b int)
returns double precision
language sql
immutable
as $$
  select 0.2126 * public.srgb_to_linear(r / 255.0)
       + 0.7152 * public.srgb_to_linear(g / 255.0)
       + 0.0722 * public.srgb_to_linear(b / 255.0);
$$;

-- Creator-only, same auth.uid() self-check style as rpc_set_lobby_status. Rather than rejecting a
-- brand color that fails contrast against white text, uniformly darken it (scale all three
-- channels toward black in fixed steps, recomputing contrast each step) until it passes — a
-- client picking their own brand color shouldn't hit a validation error over something as
-- non-obvious as a contrast ratio.
create function public.rpc_update_lobby_branding(
  p_lobby_id uuid,
  p_brand_logo_url text,
  p_brand_color text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lobby public.lobbies;
  v_color text := nullif(trim(p_brand_color), '');
  v_r int;
  v_g int;
  v_b int;
  v_scale double precision := 1.0;
  v_contrast double precision;
begin
  select * into v_lobby from public.lobbies where id = p_lobby_id for update;
  if not found then
    raise exception 'LOBBY_NOT_FOUND';
  end if;
  if v_lobby.creator_id <> auth.uid() then
    raise exception 'FORBIDDEN';
  end if;

  if v_color is not null then
    if v_color !~* '^#[0-9a-f]{6}$' then
      raise exception 'INVALID_BRAND_COLOR';
    end if;

    v_r := ('x' || substr(v_color, 2, 2))::bit(8)::int;
    v_g := ('x' || substr(v_color, 4, 2))::bit(8)::int;
    v_b := ('x' || substr(v_color, 6, 2))::bit(8)::int;

    loop
      v_contrast := 1.05 / (public.relative_luminance(
        round(v_r * v_scale)::int, round(v_g * v_scale)::int, round(v_b * v_scale)::int
      ) + 0.05);
      exit when v_contrast >= 4.5 or v_scale <= 0.05;
      v_scale := v_scale - 0.05;
    end loop;

    v_color := '#' || lpad(to_hex(round(v_r * v_scale)::int), 2, '0')
                    || lpad(to_hex(round(v_g * v_scale)::int), 2, '0')
                    || lpad(to_hex(round(v_b * v_scale)::int), 2, '0');
  end if;

  update public.lobbies
  set brand_logo_url = nullif(trim(p_brand_logo_url), ''),
      brand_color = v_color,
      updated_at = now()
  where id = p_lobby_id
  returning * into v_lobby;

  return public.lobby_to_json(v_lobby);
end;
$$;

revoke execute on function public.rpc_update_lobby_branding(uuid, text, text) from public;
grant execute on function public.rpc_update_lobby_branding(uuid, text, text) to authenticated;
grant execute on function public.lobby_to_json(public.lobbies) to authenticated;

-- Storage bucket mirroring the `avatars` bucket exactly (20260723124713_profile_avatar.sql) —
-- public-read, write scoped by folder-name-equals-auth.uid() so an anonymous creator (who still
-- has a stable auth.uid() via Supabase anonymous auth) can upload their lobby's logo too.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lobby-logos', 'lobby-logos', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "Lobby logos are publicly accessible" on storage.objects
  for select using (bucket_id = 'lobby-logos');

create policy "Users can upload their own lobby logos" on storage.objects
  for insert with check (
    bucket_id = 'lobby-logos' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update their own lobby logos" on storage.objects
  for update using (
    bucket_id = 'lobby-logos' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own lobby logos" on storage.objects
  for delete using (
    bucket_id = 'lobby-logos' and (storage.foldername(name))[1] = auth.uid()::text
  );
