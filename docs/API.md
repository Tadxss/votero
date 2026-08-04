# Votero Public API (v1)

Create lobbies and read their results programmatically — a script, another app, or an LLM given a
prompt like *"write me a JSON payload for a 3-question survey about picking a team lunch spot"*
can drive Votero without going through the web form.

## Base URL

```
https://<project-ref>.supabase.co/functions/v1/api-v1-<endpoint>
```

Replace `<project-ref>` with this project's Supabase project ref (visible in the dashboard URL, or
ask whoever manages the hosted Votero project). There's no `votero.app/api/v1/...` vanity URL in
v1 — this repo has no Next.js API-route proxy layer, and adding one just for a prettier URL was out
of scope. A future v2 could add that as a thin proxy in front of the same functions.

## Authentication

Every request needs `Authorization: Bearer <key>`. Generate a key by signing in at
[votero.app](https://votero.app) → **API keys** in the header menu → **Generate key**. The raw key
(`vk_live_...`) is shown exactly once — copy it immediately, only its hash is stored afterward. A
key is tied to your account and inherits your normal lobby-creation limits.

Revoked or unrecognized keys get a `401`:

```json
{ "error": "INVALID_API_KEY" }
```

## Rate limits

Each endpoint has its own bucket, separate from the web app's own limits:

| Endpoint | Limit |
|---|---|
| `POST /api-v1-create-lobby` | 20 requests / hour / key |
| `GET /api-v1-lobby-results` | 60 requests / hour / key |

Exceeding a limit returns `429` with `{"error": "RATE_LIMITED"}`. Lobby creation also has a second,
stricter limit underneath the API's own bucket: your account can create at most **5 lobbies per 10
minutes** (the same limit the web app's creation form is subject to) — whichever limit is hit first
returns `RATE_LIMITED`.

## Endpoints

### `GET /api-v1-me`

Confirms a key is valid. No side effects, no rate limit.

```sh
curl https://<project-ref>.supabase.co/functions/v1/api-v1-me \
  -H "Authorization: Bearer vk_live_..."
```

```json
{ "ok": true, "userId": "3f06f4ea-d868-4ce2-9308-b979b0797979" }
```

### `POST /api-v1-create-lobby`

Creates a lobby, identical in shape to what the web form's "Create lobby" button sends.

```sh
curl -X POST https://<project-ref>.supabase.co/functions/v1/api-v1-create-lobby \
  -H "Authorization: Bearer vk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Where should we eat lunch?",
    "questions": [
      { "title": "Pick a spot", "type": "choice", "options": ["Tacos", "Sushi", "Salad"] }
    ],
    "voterCap": 30,
    "ballotMode": "anonymous",
    "tallyVisibility": "live"
  }'
```

Body fields:

| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | string | yes | 1–200 characters |
| `questions` | array | yes | at least 1 — see question object fields below |
| `voterCap` | number | yes | 1–10,000 — max participants who can join |
| `ballotMode` | `"anonymous"` \| `"open"` | yes | `"anonymous"`: nobody — including you — can see who voted for what, only aggregate tallies. `"open"`: you can see each voter's individual ballot via `ballotDetail` on the results endpoint. |
| `tallyVisibility` | `"live"` \| `"hidden"` | yes | `"live"`: results visible while the lobby is open. `"hidden"`: results only visible once the lobby closes. |
| `closesAt` | ISO timestamp | no | schedules an auto-close; must be in the future |

Question object fields:

| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | string | yes | 1–200 characters |
| `type` | `"choice"` \| `"text"` \| `"ranked"` | yes | `"choice"`: pick one, or up to N (see `maxSelections`). `"text"`: free-response, no options. `"ranked"`: rank every option in order (instant-runoff tallying). |
| `options` | string[] | for `choice`/`ranked` | at least 2, each 1–200 characters. Ignored for `text` questions. |
| `maxSelections` | number | no | `choice` only, `1..options.length`. Omit for classic single-select; set above 1 for "choose up to N." Not applicable to `ranked` — every option is always ranked. |

Example: a 3-question survey combining all 3 types — one ranked-choice question, one multi-select
("choose up to N") question, and one free-text question:

```json
{
  "title": "Team offsite planning",
  "questions": [
    { "title": "Rank these venues", "type": "ranked", "options": ["Beach house", "Mountain cabin", "City loft"] },
    { "title": "Which activities interest you?", "type": "choice", "options": ["Hiking", "Cooking class", "Board games", "Spa"], "maxSelections": 2 },
    { "title": "Anything else we should plan for?", "type": "text" }
  ],
  "voterCap": 25,
  "ballotMode": "open",
  "tallyVisibility": "hidden"
}
```

Response: the same `CreateLobbyResult` shape the web app uses (`lobby` + `questions`, including the
generated `code` voters use to join at `votero.app/vote/<code>`).

### `GET /api-v1-lobby-results?code=<code>`

Reads progress/tally/ballot-detail for a lobby **you created** — a foreign or nonexistent code
both return `404`, deliberately indistinguishable, so a wrong code can't be used to probe whether
someone else's code exists.

```sh
curl "https://<project-ref>.supabase.co/functions/v1/api-v1-lobby-results?code=7S8XDH6C" \
  -H "Authorization: Bearer vk_live_..."
```

```json
{
  "progress": { "joined": 12, "cap": 30, "completedCount": 10 },
  "tally": [
    {
      "questionId": "...",
      "questionTitle": "Pick a spot",
      "type": "choice",
      "tally": [{ "optionId": "...", "count": 7 }, { "optionId": "...", "count": 3 }]
    }
  ],
  "ballotDetail": null
}
```

`tally` is `null` until the lobby is closed or `tallyVisibility` is `"live"` — same visibility rule
the web app's Present Mode and vote page follow. `ballotDetail` is only populated for
`ballotMode: "open"` lobbies (it names who voted for what); `null` for anonymous lobbies.

## Errors

All errors are `{"error": "SOME_CODE"}` with a matching HTTP status — the same vocabulary the web
app's own network calls use (`supabase/functions/_shared/errors.ts`).

| Code | Status | Applies to | Meaning |
|---|---|---|---|
| `INVALID_API_KEY` | 401 | all endpoints | missing, unrecognized, or revoked key |
| `AUTH_UNAVAILABLE` | 503 | create-lobby, lobby-results | your key is valid, but minting a session for your account failed transiently — retry |
| `RATE_LIMITED` | 429 | create-lobby, lobby-results | too many requests in the current window (see Rate limits) |
| `MISSING_CODE` | 400 | lobby-results | `code` query param missing |
| `LOBBY_NOT_FOUND` | 404 | lobby-results | no lobby with that code owned by this key's account |
| `AT_LEAST_ONE_QUESTION_REQUIRED` | 400 | create-lobby | `questions` array is empty |
| `AT_LEAST_TWO_OPTIONS_REQUIRED` | 400 | create-lobby | a `choice` or `ranked` question has fewer than 2 options |
| `INVALID_MAX_SELECTIONS` | 400 | create-lobby | `maxSelections` is below 1 or above the question's option count |
| `INAPPROPRIATE_CONTENT` | 400 | create-lobby | the lobby title, a question title, or an option label failed the profanity filter |
| `CLOSES_AT_MUST_BE_FUTURE` | 400 | create-lobby | `closesAt` is not in the future |
| `LOBBY_LIMIT_REACHED` | 400 | create-lobby | your account already has 10 lobbies (the same cap the web app enforces) |

Field-length/range violations (e.g. `voterCap` outside 1–10,000, a title over 200 characters)
return a `400` with a raw database error message rather than one of the codes above — validate
against the limits in the field tables above to avoid hitting these.

## What's not in v1

- **No vote-casting or lobby-joining via API key** — those represent an end-user voting, not a
  server acting on their behalf; deliberately out of scope.
- **No lobby-read endpoint** — `POST /api-v1-create-lobby`'s response already has everything a
  caller who just created a lobby needs; there's no separate "look up a lobby I didn't just create."
- **No integration (Zapier, HubSpot, etc.)** — this is the raw API. Where to point it is a
  separate, later decision.

See [`docs/openapi.yaml`](./openapi.yaml) for a machine-readable spec covering the same 3 endpoints.
