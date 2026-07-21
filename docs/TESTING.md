# Manual Testing Guide — Web (Creator + Voter Flow)

This walks every scenario in the web app by hand. It assumes the local Supabase stack is running (`npx supabase start`) and `apps/web/.env.local` points at it (see `README.md`). Start the app with `pnpm dev --filter=web` and open **http://localhost:3000**.

Use **two separate browser profiles** (e.g. a normal window + an Incognito/private window, or two different browsers) for creator vs. voter — each gets its own anonymous Supabase session, exactly like two different phones scanning the same QR code. Reusing the same window for both roles will make you the creator *and* a participant, which won't exercise the real multi-person flow.

This was already verified once end-to-end with a scripted browser (Playwright) covering scenarios 1–7 and 10 below — this guide is for you to repeat it by hand and to cover the scenarios a script doesn't (5, 9).

## Setup

1. `npx supabase start` (Docker Desktop must be running).
2. `pnpm dev --filter=web`.
3. Creator window: `http://localhost:3000/create`.

## Scenarios

### 1. Create-form validation
On `/create`, try submitting with an empty title, with fewer than 2 non-empty options, and with a voter cap of 0. Each should show an inline error and *not* submit. Fill it in properly (title, 2+ options, cap ≥ 1) and submit — you should land on `/lobby/<CODE>/manage`.

### 2. Draft state
Right after creating, the manage page shows the QR code, the raw link, and the code, with an **Open voting** button and "Draft" status. Copy the voter link and open it in your voter window — it should say *"This lobby hasn't opened yet — check back soon."* and show no ballot.

### 3. Open → join → vote
Back in the creator window, click **Open voting**. In the voter window, reload (or it should update live) — you should now see the ballot. Select an option and click **Vote**. The ballot should disappear, replaced by *"You're in — thanks for voting!"*.

### 4. Live vs. hidden tally
Create one lobby with **Tally visibility: Live** and vote in it as a voter — you should see vote counts (a small bar per option) immediately after voting, before the creator closes it. Create a second lobby with **Hidden until closed** and vote — you should only see "X of Y have voted" text, no bars, until the creator closes the lobby.

### 5. Anonymous vs. open ballot
Create one lobby with **Ballot mode: Anonymous**, one with **Open**. Have at least one voter vote in each, then close both from the manage page. On the **Open**-mode manage page, a "Who voted for what" table should appear below the tally. On the **Anonymous**-mode manage page, that table should be absent — only the aggregate tally shows.

### 6. Cap enforcement + auto-close
Create a lobby with **Voter cap: 2**. Open it, then join+vote with two separate voter sessions (two incognito windows, or two different browsers). The moment the second vote is cast, the lobby should flip to **Closed** automatically (watch the creator's manage page — no manual close needed) and results should appear immediately. Open a *third* voter session and visit the link — it should say the lobby is full (if it's still technically open) or show results directly (if the auto-close already landed — likely, since auto-close is near-instant).

### 7. Manual close before cap
Create a lobby with a cap of, say, 10. Open it, have one voter vote, then click **Close voting** on the manage page before the cap is reached. The voter (and any new voter visiting the link) should immediately see results instead of a ballot.

### 8. Realtime cross-window
With the manage page open in one window the whole time, watch it update **without refreshing** as a voter joins ("X / Y joined" ticking up) and, for a live-tally lobby, as they vote (the bars updating).

### 9. Refresh mid-flow
After voting in a lobby, refresh the voter page. It should show "You're in — thanks for voting!" again (not the ballot) — this is the `hasVoted` flag round-tripping through `rpc_join_lobby` correctly, so a page refresh never re-shows a ballot to someone who already voted.

### 10. Sign in + lobby history
Go to `/login`, enter an email, click **Send code**. Locally, the code doesn't arrive in a real inbox — open Mailpit at **http://127.0.0.1:54324** and find the email there (hosted uses a real Resend-sent email instead). Enter the 6-digit code and verify — you should land on `/lobbies`, and the header should now show "My Lobbies," your email, and a "Sign out" button instead of "Sign in." Create a lobby now — it should **not** show the "sign in to save this" nudge (you're already signed in), and it should show up on `/lobbies` afterward. Sign out (header button) — `/lobbies` should revert to a "sign in to see your lobbies" prompt, and a lobby created *now*, anonymously, should simply never appear in any history (creation itself must still work with zero friction, no sign-in wall).

### 11. Resetting between test runs
- **Local**: `npx supabase db reset` wipes all lobbies/votes/test users and reapplies migrations fresh.
- **Hosted project**: delete test lobby rows via Supabase Studio, or delete the underlying test `auth.users` rows (Authentication → Users in the dashboard, or the admin API) — deleting a user cascades to their created lobbies and participant rows.

## Known cosmetic quirk

The tally bar has a `transition-all` CSS animation — if you screenshot or glance at it in the exact instant right after a vote lands, the bar may look like a tiny dot mid-animation rather than its final width. It settles within a couple hundred milliseconds; this is not a data bug (the number label next to it is always correct immediately).
