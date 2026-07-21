-- RLS policies (docs/ARCHITECTURE.md "RLS policy design").
--
-- `votes` gets zero client SELECT/INSERT policies at all — default deny. RLS can filter rows but
-- can't express "you may see an aggregate count but not the individual row," and any policy
-- permissive enough to compute a client-side tally is also permissive enough to leak the exact
-- voter->option linkage anonymous ballot mode must hide. All access to `votes` goes through the
-- SECURITY DEFINER RPCs in the next migration instead.

alter table public.profiles enable row level security;
alter table public.lobbies enable row level security;
alter table public.options enable row level security;
alter table public.participants enable row level security;
alter table public.votes enable row level security; -- no policies below on purpose

-- profiles: self-read only; rows are otherwise written only by the handle_new_auth_user trigger.
create policy profiles_select_self on public.profiles
  for select using (auth.uid() = id);

-- lobbies: creator sees their own regardless of status; everyone else sees public, non-draft
-- lobbies (an unopened lobby's QR/link shouldn't leak its existence before the creator opens it).
create policy lobbies_select_creator on public.lobbies
  for select using (auth.uid() = creator_id);

create policy lobbies_select_public on public.lobbies
  for select using (visibility = 'public' and status <> 'draft');

create policy lobbies_insert_own on public.lobbies
  for insert with check (auth.uid() = creator_id);

-- Client-side updates are still routed through the set-lobby-status Edge Function for
-- auditability, but the policy itself only needs to guard ownership.
create policy lobbies_update_own on public.lobbies
  for update using (auth.uid() = creator_id)
  with check (auth.uid() = creator_id);

-- options: readable wherever the parent lobby is readable; writable by creator only while draft.
create policy options_select on public.options
  for select using (
    exists (select 1 from public.lobbies l where l.id = options.lobby_id)
  );

create policy options_write_draft_only on public.options
  for all using (
    exists (
      select 1 from public.lobbies l
      where l.id = options.lobby_id and l.creator_id = auth.uid() and l.status = 'draft'
    )
  ) with check (
    exists (
      select 1 from public.lobbies l
      where l.id = options.lobby_id and l.creator_id = auth.uid() and l.status = 'draft'
    )
  );

-- participants: creator can see the full roster (names + has_voted) for their own lobby — safe,
-- since knowing *who joined* and *whether* they voted never reveals *what* they voted for.
create policy participants_select_creator on public.participants
  for select using (
    exists (select 1 from public.lobbies l where l.id = participants.lobby_id and l.creator_id = auth.uid())
  );

-- a participant can see their own row (to know if they've already voted).
create policy participants_select_self on public.participants
  for select using (user_id = auth.uid());

-- No INSERT/UPDATE policy on participants at all — joining goes through rpc_join_lobby only.
