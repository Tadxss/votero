-- lobbies_select_public originally excluded draft lobbies ("an unopened lobby's QR/link shouldn't
-- leak its existence before the creator opens it" — see the RLS migration's comment). That
-- conflicts with behavior the app already ships: the manage page shows the shareable QR/link/code
-- for a draft lobby too, specifically so a creator can prep sharing (e.g. print flyers, set up
-- Present Mode ahead of an event) before clicking "Open voting" — and confirmed empirically that a
-- genuinely separate anonymous session gets zero rows back today, not the "hasn't opened yet"
-- message the voter UI (and docs/TESTING.md scenario 2) has always claimed it shows. No new
-- exposure here: rpc_join_lobby already refuses to join a non-open lobby, so a draft lobby's
-- joined/vote counts are always zero regardless of who can read the row.
drop policy if exists lobbies_select_public on public.lobbies;
create policy lobbies_select_public on public.lobbies
  for select using (visibility = 'public');
