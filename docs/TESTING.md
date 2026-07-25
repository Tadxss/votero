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
On `/create`, try submitting with an empty title, with fewer than 2 non-empty options on a question, with an empty question title, and with a voter cap of 0. Each should show an inline error and *not* submit. Fill it in properly (title, 2+ options per question, cap ≥ 1) and submit — you should land on `/lobby/<CODE>/manage`.

### 2. Draft state
Right after creating, the manage page shows the QR code, the raw link, and the code, with an **Open voting** button and "Draft" status. Copy the voter link and open it in your voter window (a genuinely separate anonymous session — this now correctly works for a real stranger, not just the creator's own session, after a Build Order step 23 RLS fix) — it should say *"This lobby hasn't opened yet — check back soon."* and show no ballot.

### 3. Open → join → vote
Back in the creator window, click **Open voting**. In the voter window, reload (or it should update live) — you should now see the ballot. Select an option and click **Vote**. The ballot should disappear, replaced by *"You're in — thanks for voting!"*.

### 4. Live vs. hidden tally
Create one lobby with **Tally visibility: Live** and vote in it as a voter — you should see vote counts (a small bar per option) immediately after voting, before the creator closes it. Create a second lobby with **Hidden until closed** and vote — you should only see "X of Y have voted" text, no bars, until the creator closes the lobby.

### 5. Anonymous vs. open ballot
Create one lobby with **Ballot mode: Anonymous**, one with **Open**. For the anonymous one, vote as usual with an anonymous voter session — no sign-in needed, unchanged. For the **Open** one, an anonymous voter session should see a "sign in to vote" gate instead of a ballot (scenario 18 covers this in depth) — sign in as a voter, then vote. Close both from the manage page. On the **Open**-mode manage page, a "Who voted for what" list should appear below the tally, showing that voter's real name/username/email (not a generic "Voter"). On the **Anonymous**-mode manage page, that list should be absent — only the aggregate tally shows.

### 6. Cap enforcement + auto-close
Create a lobby with **Voter cap: 2**. Open it, then join+vote with two separate voter sessions (two incognito windows, or two different browsers). The moment the second vote is cast, the lobby should flip to **Closed** automatically (watch the creator's manage page — no manual close needed) and results should appear immediately. Open a *third* voter session and visit the link — it should say the lobby is full (if it's still technically open) or show results directly (if the auto-close already landed — likely, since auto-close is near-instant).

### 7. Manual close before cap
Create a lobby with a cap of, say, 10. Open it, have one voter vote, then click **Close voting** on the manage page before the cap is reached. The voter (and any new voter visiting the link) should immediately see results instead of a ballot.

### 8. Realtime cross-window
With the manage page open in one window the whole time, watch it update **without refreshing** as a voter joins ("X / Y joined" ticking up) and, for a live-tally lobby, as they vote (the bars updating).

### 9. Refresh mid-flow
After voting in a lobby, refresh the voter page. It should show "You're in — thanks for voting!" again (not the ballot) — this is the `hasVoted` flag round-tripping through `rpc_join_lobby` correctly, so a page refresh never re-shows a ballot to someone who already voted.

### 10. Sign in + lobby history
Go to `/login`, enter an email, click **Send code**. Locally, the code doesn't arrive in a real inbox — open Mailpit at **http://127.0.0.1:54324** and find the email there (hosted uses a real Resend-sent email instead). Enter the 6-digit code and verify — you should land on `/lobbies`, and the header should now show "My Lobbies," your email, and a "Sign out" button instead of "Sign in." Create a lobby now — it should **not** show the "sign in to save this" nudge (you're already signed in), and it should show up on `/lobbies` afterward. Sign out (header button) — `/lobbies` should revert to a "sign in to see your lobbies" prompt, and a lobby created *now*, anonymously, should simply never appear in any history (creation itself must still work with zero friction, no sign-in wall). With at least one lobby in your history, `/lobbies` should also show a **"+ New lobby"** button next to the "My Lobbies" heading — click it and confirm you can create a second (and third, etc.) lobby, up to the 10-lobby cap (scenario 12).

### 11. Edit profile (username + name)
While signed in, click **"Edit profile"** in the header. Try saving a username with a space or symbol (e.g. `bad name!`) — you should get an inline error about the 3–20 character lowercase/digits/underscore format, and nothing should save. Now save a valid username plus a first and last name — the modal should close and the header should immediately switch from your email to `@yourusername`. Reload the page — it should still show `@yourusername` (confirms it persisted, not just local state). Sign in as a *second* test account and try to save the exact same username — you should get "That username is already taken" and nothing should save; pick a different one and it should succeed.

### 12. 10-lobby cap (signed-in accounts only)
As a signed-in creator, create lobbies until `/lobbies` shows "10/10 lobbies" — the "+ New lobby" button should now be disabled with a "Limit reached" note next to it. Confirm the server enforces this too, not just the button: calling `rpc_create_lobby` directly (e.g. via the Studio SQL editor or a raw `supabase.rpc(...)` call) as that same account should fail with `LOBBY_LIMIT_REACHED` even if you bypass the disabled button. As an **anonymous** session (not signed in), confirm you can still create more than 10 lobbies with no cap — the limit only applies to real accounts.

### 13. Anonymous lobby auto-delete (7 days)
This one isn't practical to wait out manually — instead, confirm the mechanics directly: after `npx supabase db reset`, run `select jobid, jobname, schedule, active from cron.job;` (via `docker exec <db container> psql ...` or Studio's SQL editor) and confirm `delete-stale-anonymous-lobbies` is listed and `active`. To exercise the actual deletion without waiting a week, backdate a test lobby (`update lobbies set created_at = now() - interval '8 days' where code = '...'`) for an anonymous-created lobby, then run the job's `DELETE` body directly (see `supabase/migrations/20260723054859_anonymous_lobby_cleanup.sql`) — the lobby (and its options/participants/votes) should disappear. Do the same for a signed-in creator's lobby backdated the same way — it should survive untouched.

### 14. Manual lobby delete + table/grid view
On `/lobbies` with a couple of lobbies, click the trash icon on a row/card — a confirm dialog should appear ("This can't be undone…"); click **Cancel** and confirm nothing was deleted, then repeat and click **Delete** — that lobby should disappear immediately, the others untouched. Open one of the remaining lobbies' manage page and click **Delete lobby** at the bottom — same confirm dialog, and confirming should redirect you to `/lobbies` with that lobby gone. Separately, on `/lobbies` (desktop width), use the table/grid toggle next to "+ New lobby" — switching to grid should show the same lobbies as a card grid instead of rows; reload the page and confirm your last-picked view (table or grid) is remembered.

### 15. Sharing the QR/link/code
On a lobby's manage page, click **Copy link** — it should briefly change to "Copied! ✓," and pasting somewhere should give you the exact `/vote/<code>` URL. Same for **Copy code** (just the 8-character code). Click **Share** — on a phone/mobile browser this should open the native share sheet (Messages, WhatsApp, etc. depending on OS); on a desktop browser without Web Share API support, it should silently fall back to copying the link (same "Copied! ✓" feedback).

### 16. Join a lobby (scan or type)
On the home page (`/`), you should see two buttons: **"Create a lobby"** and **"Join a lobby."** Click **Join a lobby** — a modal should offer **"Scan QR code"** and **"Enter code instead."** Try **Enter code instead**: type a real lobby's code and click **Join →** — you should land on that lobby's `/vote/[code]`. Now try **Scan QR code** (needs a real device with a camera — this can't be faked in a normal browser tab): grant camera access, point it at another lobby's QR (shown on a second phone/monitor), and confirm it navigates you to that lobby automatically once it locks onto the code. Deny camera access (or test on a browser without camera support) — it should show a friendly message and let you switch to code entry instead, never getting stuck. While scanning, click **"Use code instead"** — it should cleanly switch to the code input (and the camera light/indicator should turn off, confirming the stream actually stopped).

### 17. 7-day-deletion notice
Create a lobby **without** signing in first — its manage page should show a small notice near the top: "This lobby isn't tied to an account, so it'll be automatically deleted on `<date>`..." with the date being exactly 7 days from today, and a "Sign in" link. Sign in, create a *second* lobby while signed in — its manage page should show **no such notice** at all.

### 18. Verified identity for open-ballot voting + profile pictures
Create an **Open**-mode lobby, open it. In a fresh anonymous/incognito voter window, visit its `/vote/[code]` link — you should see "This lobby shows who voted for what — sign in to vote," not a ballot. Click **Sign in to vote**, complete the OTP sign-in as a *different* test account than the creator — you should land back on the same `/vote/[code]` (not `/lobbies`) and be able to vote normally. Back on the creator's manage page, the "Who voted for what" list should show that voter's real identity: if they haven't set a name/username, their email; if they have, their name with `@username` underneath. As that voter, open **Edit profile**, click **Change photo**, and upload an image under 2MB — the preview should update immediately, and after **Save** the header should show the photo instead of the colored-initial circle; reload and confirm it's still there. Back on the creator's manage page, that voter's ballot-list entry should now show their photo too. Finally, confirm an **Anonymous**-mode lobby is completely unaffected — an anonymous voter session should auto-join and vote with no sign-in gate at all, exactly as before.

### 19. Scheduled (time-based) auto-close
On `/create`, try picking an "Auto-close at" time in the past — you should get an inline "Auto-close time must be in the future" error and the form shouldn't submit. Set one a few minutes in the future instead, create and open the lobby — its manage page should show "⏰ Auto-closes `<date>, <time>`" below the join progress bar. Open the voter link (`/vote/[code]`) in a separate window — it should show the same time as "⏰ Voting closes `<date>, <time>`" right above the ballot, so voters aren't caught off guard. Confirm the cron job exists (`select jobid, jobname, schedule, active from cron.job;` via Studio or `docker exec <db container> psql ...`) — `auto-close-scheduled-lobbies` should be listed, `active`, running every minute. To exercise it without waiting: backdate the lobby (`update lobbies set closes_at = now() - interval '1 minute' where code = '...'`), then run the job's exact `UPDATE` body directly (see `supabase/migrations/20260724143737_scheduled_auto_close.sql`) — the lobby should flip to `closed`, and reloading its manage page should show "Closed" with the auto-close line gone (it only shows while not yet closed). A lobby created with no auto-close time set should be completely unaffected by any of this.

### 20. Present Mode
On a lobby's manage page, click **🖥️ Present Mode** — it should open `/lobby/[code]/present` in a new tab with **no site header/nav at all**. While the lobby is still `Draft`, this page should show the QR code plus "Scan to get ready — voting opens soon" — try loading it in a completely separate/incognito window (not the creator's own session) to confirm a stranger can see this too, not just the creator. Open voting — the present page should switch to showing the live tally (bigger bars/text than the manage page) if tally visibility is **Live**, or just "X of Y have voted" progress if **Hidden**. Confirm it never shows a "who voted for what" list even for an **Open**-ballot-mode lobby — that view is meant to be projected/public, so individual voter identity must never appear there regardless of ballot mode. Close the lobby — the present page should show final results with the winner crowned, same as the manage page.

### 21. Multi-question surveys
On `/create`, click **+ Add question** to add a second question, each with its own title and options. Submit — you should land on `/lobby/<CODE>/manage`. Open voting, then vote in a second (voter) window: `/vote/[code]` should show a stepper ("Question 1 of 2"), not one long scrollable page. Answer question 1, click **Next →** — it should advance to "Question 2 of 2" without submitting yet. Answer question 2, click **Submit ✋** — you should land on the same "thanks for voting" screen as a single-question lobby, showing both questions' tallies (or progress text, depending on tally visibility) stacked vertically, each with its own sub-heading. On the manage page and in Present Mode, confirm both questions' tallies appear the same way, each labeled with its own title. For an **Open**-mode multi-question lobby, confirm the "who voted for what" list appears once per question on the manage page, correctly split by question.

Refresh mid-survey: after answering question 1 of 2 but before submitting question 2, reload the voter page. The stepper restarts at question 1 (a known v1 simplification, not a bug) — resubmit the same answer for question 1 and confirm it silently advances to question 2 with no error shown, then finish normally.

Regression-check a classic single-question lobby (don't click "+ Add question" at all): confirm `/vote/[code]` shows **no** "Question 1 of 1" stepper indicator, the button still reads **Vote ✋** (not "Submit ✋"), and the manage page/Present Mode omit the now-redundant single-question sub-heading — a single-question lobby should look and behave exactly as it did before this feature.

### 22. Resetting between test runs
- **Local**: `npx supabase db reset` wipes all lobbies/votes/test users and reapplies migrations fresh.
- **Hosted project**: delete test lobby rows via Supabase Studio, or delete the underlying test `auth.users` rows (Authentication → Users in the dashboard, or the admin API) — deleting a user cascades to their created lobbies and participant rows.

## Known cosmetic quirk

The tally bar has a `transition-all` CSS animation — if you screenshot or glance at it in the exact instant right after a vote lands, the bar may look like a tiny dot mid-animation rather than its final width. It settles within a couple hundred milliseconds; this is not a data bug (the number label next to it is always correct immediately).
