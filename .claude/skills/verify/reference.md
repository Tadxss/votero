# Verify — reference material

## Relationship to the PostToolUse hook

`.claude/settings.json` registers `.claude/hooks/post-write-check.cjs` on `Write` only (not `Edit`
— edits fire far more often, and a full check-types+lint after every one would add real per-edit
latency during normal iteration). It runs check-types + lint scoped to whichever workspace a new
`.ts`/`.tsx` file landed in, and blocks (exit 2) on a real failure. It's a fast, narrow safety net
for brand-new files — it does not replace this skill's full sequence (which also covers edited
files, the e2e suite, and the weakened-test check) before calling a change done.

## Local Supabase prerequisite for e2e

The suite signs in via real email OTP (read back from Mailpit), exercises RLS-gated reads/writes,
and (for status-change flows) depends on a live Postgres Realtime subscription — all of which need
the local stack actually running and healthy, not just "docker ps shows containers."

```sh
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -i supabase
```

If `supabase_vector_votero` shows `Restarting` (a log-forwarding sidecar, unrelated to the
app-facing services, but seen recurring in this environment), or if `curl -s --max-time 5 -o
/dev/null -w "%{http_code}" http://127.0.0.1:54321` doesn't return `200`-ish, restart the stack
before running anything:

```sh
npx supabase start
```

This is idempotent and safe to run even when the stack's already up.

## Dev server health

`playwright.config.ts`'s `webServer` block auto-starts/reuses `pnpm dev`, but if a prior dev server
is hung (a `curl http://localhost:3000` that hangs past ~15s rather than failing fast, or connection
refused with something still bound to the port per `netstat -ano | grep ":3000"`), kill it and let
the suite start a fresh one rather than fighting a stuck process:

```sh
taskkill //F //PID <pid>
```

## Known flaky-test class: cold-environment timing, not a regression

Two distinct symptoms, both already diagnosed and deliberately tolerated rather than "fixed" by
loosening an assertion:

1. **First-compile flakiness** — a freshly-touched/first-visited-in-this-server-instance Next.js
   dev route can time out on the very first Playwright hit (heaviest on tests that visit many
   distinct routes, e.g. `chart-toggle-and-stats.spec.ts`). CI's `playwright.config.ts` sets
   `retries: process.env.CI ? 1 : 0` specifically to absorb this — locally, just re-run the single
   spec once before concluding it's real.
2. **Realtime-propagation timing** — `apps/web/e2e/helpers.ts`'s `openVoting()` waits on the
   "Open voting" → "Close voting" button flip, which is driven entirely by a Postgres Realtime
   `postgres_changes` subscription (`useLobbyRealtime`), not the mutation's own success handler.
   That WebSocket-connect-then-wait-for-CDC path can occasionally exceed even a generous timeout
   under load. The helper's 25s timeout already has headroom baked in; if it still times out,
   re-run that one spec alone before assuming a regression.

Neither of these is a reason to raise a timeout further or loosen an assertion without re-confirming
first — always isolate-and-retry, and only escalate a fix if the isolated retry *also* fails.

## `apps/mobile` lint — a known local-machine false positive

`pnpm lint` (repo-wide) can fail on `mobile#lint` with `Node.js (v20.11.0) is outdated and
unsupported... required: >=20.19.4` on this specific dev machine. Confirmed via a real GitHub
Actions run that this does **not** reproduce in CI (Actions resolves a newer Node 20.x patch) — it's
a local-Node-version issue, not a real lint failure. Don't re-diagnose this from scratch; check the
Node version (`node -v`) before spending time on it again, and rely on the `checks` job in
`.github/workflows/ci.yml` as the real signal for mobile lint/type-check health.

## Weakened-test examples worth recognizing

A genuinely-fixed test and a quietly-loosened one can look identical in a `passed` summary. Compare:

- **Legitimate** (from this repo's actual history): `openVoting`'s timeout went from 15000 to 25000
  *with a traced, written reason* (Realtime dependency identified, documented inline) — not a blind
  bump to make a flaky run go green.
- **Would be a red flag**: the same bump with no comment, or made *while* debugging an unrelated
  failure "just in case," with no understanding of why 15s wasn't enough.

The question to ask before accepting any timeout/assertion change in a test: is there a traced
mechanism explaining why the old value was wrong, or is it a blind loosening to make red go green?
