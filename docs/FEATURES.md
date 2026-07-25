# Votero — What it is & what it does

For the technical design (schema, RLS, Edge Functions), see [ARCHITECTURE.md](ARCHITECTURE.md). This
doc is the plain-language version: what Votero is, who it's for, and what it can do today.

## What it is

Votero is a QR-code-based group voting and polling app. Someone creates a "lobby" — a question (or
several), each with a few options — shares a QR code or link, and people scan it to vote. No app
install, no account required to vote.

Think: a live poll for a meetup, classroom, team meeting, or event, where the audience votes from
their own phone in a few seconds.

## Who it's for

Anyone who needs a quick group decision or live audience poll: event organizers, teachers,
meetup/conference hosts, teams picking a lunch spot, friends settling an argument. The creator can
optionally sign in to keep a history of past lobbies; voters never need to.

## The core flow

1. **Create** a lobby: give it a title, add a question (or several) with 2+ options each, set a
   voter cap and a few privacy settings.
2. **Share** the QR code, the link, or the short 8-character code (for anyone who can't scan).
3. **Vote**: people scan/open the link, optionally join with a display name, and pick an option per
   question — no account needed.
4. **Results**: the creator watches votes come in live, then closes the lobby (or it closes itself
   once everyone's voted).

## Features

### Creating a lobby
- One question or several — a multi-question survey walks voters through one question at a time
  ("Question 2 of 4") instead of one long scrollable form.
- Each question can be **multiple-choice** (pick an option) or **free text** (type a short
  answer) — a survey can freely mix both.
- A voter cap (first N people to join get to vote).
- Optional scheduled auto-close (pick a date/time and the lobby closes itself, no one needs to be
  watching).
- A QR code, a shareable link, and a short human-readable code, all generated automatically.

### Privacy controls (set per lobby, at creation)
- **Ballot mode** — *Anonymous*: the creator only ever sees aggregate results, never who voted for
  what. *Open*: the creator sees each voter's choice next to their name/username — this mode
  requires the voter to be signed in, since a free-text name can't be trusted for real attribution.
- **Tally visibility** — *Live*: everyone watches vote counts update in real time. *Hidden*: voters
  only see "X of Y have voted" progress until the creator closes the lobby, so early results can't
  sway later voters.

### Voting
- No account needed — vote as a guest in seconds.
- A camera-based QR scanner (or manual code entry) to join a lobby from the home page.
- Live progress and results update instantly on screen without refreshing, powered by realtime
  updates.
- Refreshing mid-vote never re-shows a ballot you already completed.
- On a multi-question survey, a **← Back** button lets you revisit an earlier question and change
  your answer before you finish — once you've finished, though, that's final.

### Results & closing
- Manual close (creator clicks "Close voting") or automatic close (the voter cap is filled, or a
  scheduled time passes).
- A winner is crowned once voting closes (ties aren't crowned).
- Free-text answers are grouped by frequency and shown as a set of words/phrases sized by how
  common each one is — a lightweight word-cloud effect, no manual tallying needed.
- **Present Mode**: a fullscreen, no-clutter view meant to be projected on a screen at a live
  event — big QR code, live tallies, no site navigation, and it never reveals individual voter
  identity even in Open ballot mode, since a projected screen is public by definition.
- **Download results**: a "⬇️ CSV" and a "🖼️ Image" button on the manage page save a permanent
  record of the tally — useful since anonymous (no-account) lobbies auto-delete after 7 days and
  would otherwise be gone for good.

### Creator accounts (optional)
- Sign in with just an email (no password) to keep a permanent history of every lobby you've
  created.
- Edit a profile: username, first/last name, a profile picture.
- Anonymously created lobbies are never tied to an account after the fact — signing in only
  affects what you create *afterward*.
- Anonymous (no-account) lobbies auto-delete after 7 days; signed-in creators' lobbies persist
  until they delete them.
- A dashboard of your lobbies with a table/grid view toggle, and one-click delete.

## What's not built yet

The web app (creator + voter flows) is fully built and live. A native mobile app (iOS/Android) is
planned but not built yet — the same backend and business logic are already shared and ready for
it. See `docs/ARCHITECTURE.md`'s Build Order for the exact done/pending breakdown, and the
"Explicitly deferred" section there for ideas that are designed for but intentionally not built
yet (private invite-only lobbies, per-lobby stronger identity verification, an embeddable
third-party widget).
