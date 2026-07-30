// Load/concurrency test for the "everyone scans and votes in the same 30 seconds" scenario — the
// real shape of an in-person event, as opposed to the sequential one-voter-at-a-time flows the
// Playwright suite (../*.spec.ts) exercises. Not a Playwright spec (no browser involved) and not
// wired into CI (latency numbers are too environment-dependent to gate a pipeline on) — this is an
// ad-hoc script, run manually against a local Supabase stack. See docs/TESTING.md.
//
// Deliberately uses plain fetch (not the @supabase/supabase-js client) for auth/RPC/Edge Function
// calls: each simulated voter needs its own independent bearer token, and the SDK client is built
// around a single persisted session, which fights that. The one exception is the live-tally
// broadcast — hand-rolling Supabase Realtime's channel-join/heartbeat protocol isn't worth it, so
// that piece uses @supabase/supabase-js (already an installed dependency) with persistSession:false.
//
// Usage (from apps/web, local Supabase running):
//   node --env-file=.env.local e2e/load/vote-burst.mjs
//   VOTER_COUNT=200 node --env-file=.env.local e2e/load/vote-burst.mjs

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const VOTER_COUNT = Number(process.env.VOTER_COUNT ?? 100);

if (!SUPABASE_URL || !ANON_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.\n" +
      "Run with `node --env-file=.env.local e2e/load/vote-burst.mjs` from apps/web, against a running local Supabase stack.",
  );
  process.exit(1);
}

async function signInAnonymously() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON_KEY },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(`anonymous signup failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

async function createLobby(token, voterCap) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/rpc_create_lobby`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      p_title: `Load test ${new Date().toISOString()}`,
      p_questions: [{ title: "Pick one", type: "choice", options: ["A", "B"] }],
      p_voter_cap: voterCap,
      p_ballot_mode: "anonymous",
      p_tally_visibility: "live",
    }),
  });
  if (!res.ok) throw new Error(`rpc_create_lobby failed: ${res.status} ${await res.text()}`);
  return res.json(); // { lobby: {...}, questions: [...] }
}

async function setLobbyStatus(token, lobbyId, action) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/set-lobby-status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ lobbyId, action }),
  });
  if (!res.ok) throw new Error(`set-lobby-status failed: ${res.status} ${await res.text()}`);
}

async function timedFetch(url, options) {
  const start = performance.now();
  let error;
  try {
    const res = await fetch(url, options);
    const body = await res.json().catch(() => null);
    if (!res.ok) error = body?.error ?? `HTTP ${res.status}`;
  } catch (e) {
    error = e.message;
  }
  return { ok: !error, error, durationMs: performance.now() - start };
}

function percentile(sortedAsc, p) {
  const idx = Math.min(sortedAsc.length - 1, Math.floor((p / 100) * sortedAsc.length));
  return sortedAsc[idx];
}

function summarize(label, results) {
  const durations = results.map((r) => r.durationMs).sort((a, b) => a - b);
  const errors = results.filter((r) => !r.ok);
  console.log(`\n--- ${label} ---`);
  console.log(`  count: ${results.length}, errors: ${errors.length}`);
  if (durations.length > 0) {
    console.log(
      `  latency ms — p50: ${percentile(durations, 50).toFixed(0)}, ` +
        `p95: ${percentile(durations, 95).toFixed(0)}, max: ${durations[durations.length - 1].toFixed(0)}`,
    );
  }
  if (errors.length > 0) {
    const byCode = {};
    for (const e of errors) byCode[e.error] = (byCode[e.error] ?? 0) + 1;
    console.log("  error breakdown:", byCode);
  }
  return { errorCount: errors.length };
}

async function main() {
  console.log(`Votero vote-burst load test — ${VOTER_COUNT} concurrent voters against ${SUPABASE_URL}`);

  console.log("\nSetting up: signing in creator, creating lobby, opening voting...");
  const creatorToken = await signInAnonymously();
  const { lobby, questions } = await createLobby(creatorToken, VOTER_COUNT);
  await setLobbyStatus(creatorToken, lobby.id, "open"); // action: "open" | "close"
  const optionId = questions[0].options[0].id;
  console.log(`Lobby ${lobby.code} (${lobby.id}) created and open, voterCap=${lobby.voterCap}`);

  const { createClient } = await import("@supabase/supabase-js");
  // Explicit `ws` transport rather than relying on Node's native WebSocket — portable across Node
  // versions (native WebSocket only landed in later Node 20.x/22, and isn't present on every
  // machine that might run this script, e.g. an older local `>=20.19.4` install).
  const { WebSocket } = await import("ws");
  const realtimeClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false },
    realtime: { transport: WebSocket },
  });
  const broadcastTimestamps = [];
  const channel = realtimeClient.channel(`lobby:${lobby.id}:tally`);
  channel.on("broadcast", { event: "tally" }, () => {
    broadcastTimestamps.push(performance.now());
  });
  await new Promise((resolve, reject) => {
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") resolve();
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        reject(new Error(`Realtime subscribe failed: ${status}`));
      }
    });
  });

  console.log(`\nMinting ${VOTER_COUNT} anonymous voter sessions concurrently...`);
  const mintStart = performance.now();
  const tokens = await Promise.all(Array.from({ length: VOTER_COUNT }, () => signInAnonymously()));
  console.log(`  done in ${(performance.now() - mintStart).toFixed(0)}ms`);

  console.log(`\nJoining lobby (${VOTER_COUNT} concurrent requests)...`);
  const joinStart = performance.now();
  const joinResults = await Promise.all(
    tokens.map((token) =>
      timedFetch(`${SUPABASE_URL}/functions/v1/join-lobby`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: lobby.code }),
      }),
    ),
  );
  console.log(`  wall-clock: ${(performance.now() - joinStart).toFixed(0)}ms`);
  summarize("Join burst", joinResults);

  console.log(`\nVoting (${VOTER_COUNT} concurrent requests)...`);
  const voteStart = performance.now();
  const voteResults = await Promise.all(
    tokens.map((token) =>
      timedFetch(`${SUPABASE_URL}/functions/v1/cast-vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ lobbyId: lobby.id, optionId }),
      }),
    ),
  );
  const voteWallMs = performance.now() - voteStart;
  console.log(`  wall-clock: ${voteWallMs.toFixed(0)}ms`);
  const { errorCount: voteErrorCount } = summarize("Vote burst", voteResults);

  // Give the broadcast fan-out a moment to catch up after the last vote response lands.
  await new Promise((r) => setTimeout(r, 2000));
  await channel.unsubscribe();

  console.log("\n--- Broadcast fan-out ---");
  console.log(`  received: ${broadcastTimestamps.length} / ${VOTER_COUNT} expected`);
  if (broadcastTimestamps.length > 0) {
    const lastBroadcast = Math.max(...broadcastTimestamps);
    console.log(
      `  last broadcast landed ${(lastBroadcast - voteStart).toFixed(0)}ms after the vote burst ` +
        `started (burst wall-clock was ${voteWallMs.toFixed(0)}ms)`,
    );
  }

  // Correctness: re-fetch the lobby as the creator and confirm no votes/joins were lost under
  // contention on rpc_cast_vote/rpc_join_lobby's `for update` lock.
  const finalRes = await fetch(
    `${SUPABASE_URL}/rest/v1/lobbies?id=eq.${lobby.id}&select=joined_count,votes_count`,
    { headers: { apikey: ANON_KEY, Authorization: `Bearer ${creatorToken}` } },
  );
  const [finalLobby] = await finalRes.json();

  console.log("\n--- Correctness ---");
  console.log(`  joined_count: ${finalLobby?.joined_count} (expected ${VOTER_COUNT})`);
  console.log(`  votes_count: ${finalLobby?.votes_count} (expected ${VOTER_COUNT})`);

  const joinedOk = finalLobby?.joined_count === VOTER_COUNT;
  const votesOk = finalLobby?.votes_count === VOTER_COUNT;
  const passed = joinedOk && votesOk && voteErrorCount === 0;

  console.log(
    `\n${passed ? "PASS" : "FAIL"}: ${
      passed
        ? "no lost votes/joins, no unexpected errors"
        : "see above — a real correctness regression, not just a slow run"
    }`,
  );
  process.exitCode = passed ? 0 : 1;
}

main().catch((err) => {
  console.error("Load test crashed:", err);
  process.exitCode = 1;
});
