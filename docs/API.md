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

Exceeding a limit returns `429` with `{"error": "RATE_LIMITED"}`.

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

| Field | Type | Notes |
|---|---|---|
| `title` | string | required |
| `questions` | array | at least 1. Each: `{ title, type: "choice"\|"text"\|"ranked", options?, maxSelections? }`. `options` required (min 2) for `choice`/`ranked`; `maxSelections` optional, choice-only, for "choose up to N." |
| `voterCap` | number | required |
| `ballotMode` | `"anonymous"` \| `"open"` | required |
| `tallyVisibility` | `"live"` \| `"hidden"` | required — `hidden` means results only show once the lobby closes |
| `closesAt` | ISO timestamp | optional — schedules an auto-close |

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
app's own network calls use (`supabase/functions/_shared/errors.ts`). Common ones:

| Code | Status | Meaning |
|---|---|---|
| `INVALID_API_KEY` | 401 | missing, unrecognized, or revoked key |
| `RATE_LIMITED` | 429 | too many requests in the current window |
| `MISSING_CODE` | 400 | `code` query param missing on `api-v1-lobby-results` |
| `LOBBY_NOT_FOUND` | 404 | no lobby with that code owned by this key's account |
| `AT_LEAST_ONE_QUESTION_REQUIRED`, `AT_LEAST_TWO_OPTIONS_REQUIRED`, etc. | 400 | same validation errors the create-lobby form surfaces |

## What's not in v1

- **No vote-casting or lobby-joining via API key** — those represent an end-user voting, not a
  server acting on their behalf; deliberately out of scope.
- **No lobby-read endpoint** — `POST /api-v1-create-lobby`'s response already has everything a
  caller who just created a lobby needs; there's no separate "look up a lobby I didn't just create."
- **No integration (Zapier, HubSpot, etc.)** — this is the raw API. Where to point it is a
  separate, later decision.

See [`docs/openapi.yaml`](./openapi.yaml) for a machine-readable spec covering the same 3 endpoints.
