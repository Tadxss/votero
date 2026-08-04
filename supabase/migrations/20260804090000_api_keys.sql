-- Public API v1: API keys for signed-in accounts, so external callers (a script, a future
-- integration, or an LLM-driven client) can create lobbies and read results without a Supabase
-- session. See docs/API_PLAN.md for the full design; this migration builds exactly the `api_keys`
-- table + key-management RPCs it sketches — the bearer-auth Edge Function layer that resolves a
-- key on each request lives in supabase/functions/_shared/apiAuth.ts, not here.

create extension if not exists pgcrypto;

create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  name text not null,
  key_hash text not null,
  key_prefix text not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
create unique index api_keys_key_hash_idx on public.api_keys (key_hash);
create index api_keys_user_id_idx on public.api_keys (user_id);

alter table public.api_keys enable row level security;

-- A user can see only their own keys. No update/delete policy for direct client access —
-- revocation only happens through rpc_revoke_api_key (security definer, bypasses RLS/grants), so
-- a client can never directly overwrite key_hash or un-revoke a key.
create policy api_keys_select_self on public.api_keys
  for select using (user_id = auth.uid());

-- Generates a new key, returning the raw key exactly once — only key_hash/key_prefix persist
-- after this call returns, matching the Stripe/GitHub "shown once" convention.
create function public.rpc_create_api_key(p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_raw text;
  v_key text;
  v_row public.api_keys;
begin
  v_raw := encode(gen_random_bytes(24), 'hex');
  v_key := 'vk_live_' || v_raw;

  insert into public.api_keys (user_id, name, key_hash, key_prefix)
  values (auth.uid(), p_name, encode(digest(v_key, 'sha256'), 'hex'), left(v_key, 12))
  returning * into v_row;

  return jsonb_build_object(
    'id', v_row.id,
    'name', v_row.name,
    'keyPrefix', v_row.key_prefix,
    'createdAt', v_row.created_at,
    'key', v_key
  );
end;
$$;

-- Soft-revoke, scoped to the caller's own key.
create function public.rpc_revoke_api_key(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.api_keys
  set revoked_at = now()
  where id = p_id and user_id = auth.uid() and revoked_at is null;

  if not found then
    raise exception 'KEY_NOT_FOUND';
  end if;
end;
$$;

revoke execute on function public.rpc_create_api_key(text) from public;
grant execute on function public.rpc_create_api_key(text) to authenticated;

revoke execute on function public.rpc_revoke_api_key(uuid) from public;
grant execute on function public.rpc_revoke_api_key(uuid) to authenticated;

-- RLS alone isn't enough on this Supabase version — a table also needs an explicit GRANT before
-- PostgREST/authenticated roles can touch it at all (see docs/ARCHITECTURE.md Build Order step 2).
-- select only for authenticated — insert/update/delete all go through the security-definer RPCs
-- above. service_role also needs its own explicit grant (RLS doesn't apply to it, but this
-- Supabase version still enforces table grants even for service_role) — it's used directly by
-- supabase/functions/_shared/apiAuth.ts to look up a key by hash and touch last_used_at, since
-- that lookup has to happen *before* any caller identity is known.
grant select on public.api_keys to authenticated;
grant select, update on public.api_keys to service_role;

-- supabase/functions/api-v1-lobby-results looks a lobby up by `code` (not the internal UUID a
-- caller doesn't have) using the service-role admin client, before it knows who the caller is —
-- existing code only ever reads `lobbies` through the caller-scoped client (grants.sql grants
-- `authenticated` only), so service_role has never needed its own grant here until now.
grant select on public.lobbies to service_role;
