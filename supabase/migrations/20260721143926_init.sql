-- Core schema for Votero (docs/ARCHITECTURE.md "Postgres schema").

create type lobby_status as enum ('draft', 'open', 'closed');
create type ballot_mode as enum ('anonymous', 'open');
create type tally_visibility as enum ('live', 'hidden');
create type lobby_visibility as enum ('public', 'private'); -- only 'public' used in MVP

create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  is_anonymous boolean not null default true,
  created_at   timestamptz not null default now()
);

-- Keeps `profiles` in sync with auth.users so both apps can read a lightweight profile row
-- via the normal Data API instead of the (inaccessible from PostgREST) auth schema directly.
create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, is_anonymous)
  values (
    new.id,
    new.raw_user_meta_data ->> 'display_name',
    coalesce(new.is_anonymous, false)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create table public.lobbies (
  id               uuid primary key default gen_random_uuid(),
  code             text unique not null,
  creator_id       uuid not null references auth.users(id) on delete cascade,
  title            text not null check (char_length(title) between 1 and 200),
  status           lobby_status not null default 'draft',
  ballot_mode      ballot_mode not null default 'anonymous',
  tally_visibility tally_visibility not null default 'hidden',
  visibility       lobby_visibility not null default 'public', -- future private-lobby hook, see rpc_join_lobby
  voter_cap        integer not null check (voter_cap > 0 and voter_cap <= 10000),
  joined_count     integer not null default 0,  -- denormalized, maintained only by rpc_join_lobby
  votes_count      integer not null default 0,  -- denormalized, maintained only by rpc_cast_vote
  otp_required     boolean not null default false, -- future per-lobby stronger-verification hook, unused in MVP
  opened_at        timestamptz,
  closed_at        timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table public.options (
  id       uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references public.lobbies(id) on delete cascade,
  label    text not null check (char_length(label) between 1 and 200),
  position integer not null,
  unique (lobby_id, position)
);

create table public.participants (
  id           uuid primary key default gen_random_uuid(),
  lobby_id     uuid not null references public.lobbies(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  display_name text,
  has_voted    boolean not null default false,
  joined_at    timestamptz not null default now(),
  unique (lobby_id, user_id),
  unique (lobby_id, id) -- lets votes FK-compose (lobby_id, participant_id)
);

create table public.votes (
  id             uuid primary key default gen_random_uuid(),
  lobby_id       uuid not null references public.lobbies(id) on delete cascade,
  participant_id uuid not null,
  option_id      uuid not null references public.options(id) on delete cascade,
  created_at     timestamptz not null default now(),
  unique (lobby_id, participant_id), -- hard one-vote-per-person guarantee
  foreign key (lobby_id, participant_id) references public.participants(lobby_id, id) on delete cascade
);

create index options_lobby_id_idx on public.options(lobby_id);
create index participants_lobby_id_idx on public.participants(lobby_id);
create index votes_lobby_id_option_id_idx on public.votes(lobby_id, option_id);

-- Short, human/QR-friendly public identifier — never expose the uuid `id` for lobby lookup.
-- Crockford base32 alphabet, ambiguous characters (0/O/1/I/L) excluded.
create function public.generate_lobby_code()
returns text
language plpgsql
as $$
declare
  alphabet text := '23456789ABCDEFGHJKMNPQRSTVWXYZ';
  code text;
begin
  loop
    code := '';
    for i in 1..8 loop
      code := code || substr(alphabet, floor(random() * length(alphabet) + 1)::int, 1);
    end loop;
    exit when not exists (select 1 from public.lobbies where lobbies.code = code);
  end loop;
  return code;
end;
$$;

create function public.set_lobby_code()
returns trigger
language plpgsql
as $$
begin
  if new.code is null then
    new.code := public.generate_lobby_code();
  end if;
  return new;
end;
$$;

create trigger lobbies_set_code
  before insert on public.lobbies
  for each row execute function public.set_lobby_code();
