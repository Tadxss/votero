"use client";

import { ApiDocsCodeBlock } from "../_components/ApiDocsCodeBlock";
import { useDocumentTitle } from "../_components/useDocumentTitle";

// Derived from the same env var the app's own Supabase client uses (providers.tsx) so the curl
// examples show the actual base URL for whichever environment this page is being viewed in
// (localhost while developing, the real hosted URL in production) instead of a <project-ref>
// placeholder nobody can copy-paste directly.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://<project-ref>.supabase.co";
const functionsBaseUrl = `${supabaseUrl.replace(/\/$/, "")}/functions/v1`;

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-lg font-bold text-[var(--foreground)]">{heading}</h2>
      <div className="flex flex-col gap-3 text-sm leading-relaxed text-[var(--foreground-muted)]">
        {children}
      </div>
    </section>
  );
}

export default function DevelopersPage() {
  useDocumentTitle("API documentation");

  return (
    <main className="relative flex-1 px-4 py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-3xl font-bold text-[var(--foreground)]">
            API documentation
          </h1>
          <p className="text-sm text-[var(--foreground-muted)]">
            Create lobbies and read their results programmatically. Generate a key from the{" "}
            <strong>API keys</strong> menu (sign in first) in the header, then follow the examples
            below.
          </p>
        </div>

        <div className="flex animate-pop-in flex-col gap-8 rounded-3xl border border-neutral-300 bg-[var(--surface)] p-6 shadow-sm dark:border-neutral-800 sm:p-8">
          <Section heading="Base URL">
            <p>All endpoints are Supabase Edge Functions under:</p>
            <ApiDocsCodeBlock code={`${functionsBaseUrl}/api-v1-<endpoint>`} />
          </Section>

          <Section heading="Authentication">
            <p>
              Every request needs <code className="rounded bg-[var(--input-bg)] px-1 py-0.5 text-xs">Authorization: Bearer &lt;key&gt;</code>.
              The raw key (<code className="rounded bg-[var(--input-bg)] px-1 py-0.5 text-xs">vk_live_...</code>) is
              shown exactly once when generated — copy it immediately, only its hash is stored
              afterward. A key is tied to your account and inherits your normal lobby-creation
              limits.
            </p>
            <p>Revoked or unrecognized keys get a 401:</p>
            <ApiDocsCodeBlock code={`{ "error": "INVALID_API_KEY" }`} />
          </Section>

          <Section heading="Rate limits">
            <p>Each endpoint has its own bucket, separate from the web app&apos;s own limits:</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-300 dark:border-neutral-800">
                    <th className="py-1.5 pr-4 font-semibold text-[var(--foreground)]">Endpoint</th>
                    <th className="py-1.5 font-semibold text-[var(--foreground)]">Limit</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800">
                    <td className="py-1.5 pr-4">POST /api-v1-create-lobby</td>
                    <td className="py-1.5">20 requests / hour / key</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-4">GET /api-v1-lobby-results</td>
                    <td className="py-1.5">60 requests / hour / key</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              Exceeding a limit returns 429 with <code className="rounded bg-[var(--input-bg)] px-1 py-0.5 text-xs">{`{"error": "RATE_LIMITED"}`}</code>.
            </p>
          </Section>

          <Section heading="GET /api-v1-me">
            <p>Confirms a key is valid. No side effects, no rate limit.</p>
            <ApiDocsCodeBlock
              code={`curl ${functionsBaseUrl}/api-v1-me \\\n  -H "Authorization: Bearer vk_live_..."`}
            />
            <ApiDocsCodeBlock
              code={`{ "ok": true, "userId": "3f06f4ea-d868-4ce2-9308-b979b0797979" }`}
            />
          </Section>

          <Section heading="POST /api-v1-create-lobby">
            <p>Creates a lobby, identical in shape to what the web form&apos;s &quot;Create lobby&quot; button sends.</p>
            <ApiDocsCodeBlock
              code={`curl -X POST ${functionsBaseUrl}/api-v1-create-lobby \\
  -H "Authorization: Bearer vk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Where should we eat lunch?",
    "questions": [
      { "title": "Pick a spot", "type": "choice", "options": ["Tacos", "Sushi", "Salad"] }
    ],
    "voterCap": 30,
    "ballotMode": "anonymous",
    "tallyVisibility": "live"
  }'`}
            />
            <p>
              <code className="rounded bg-[var(--input-bg)] px-1 py-0.5 text-xs">ballotMode</code> is{" "}
              <code className="rounded bg-[var(--input-bg)] px-1 py-0.5 text-xs">anonymous</code> or{" "}
              <code className="rounded bg-[var(--input-bg)] px-1 py-0.5 text-xs">open</code>;{" "}
              <code className="rounded bg-[var(--input-bg)] px-1 py-0.5 text-xs">tallyVisibility</code> is{" "}
              <code className="rounded bg-[var(--input-bg)] px-1 py-0.5 text-xs">live</code> or{" "}
              <code className="rounded bg-[var(--input-bg)] px-1 py-0.5 text-xs">hidden</code>.
              Question <code className="rounded bg-[var(--input-bg)] px-1 py-0.5 text-xs">type</code> is{" "}
              <code className="rounded bg-[var(--input-bg)] px-1 py-0.5 text-xs">choice</code>,{" "}
              <code className="rounded bg-[var(--input-bg)] px-1 py-0.5 text-xs">text</code>, or{" "}
              <code className="rounded bg-[var(--input-bg)] px-1 py-0.5 text-xs">ranked</code>. An
              optional <code className="rounded bg-[var(--input-bg)] px-1 py-0.5 text-xs">closesAt</code>{" "}
              ISO timestamp schedules an auto-close. The response includes the generated{" "}
              <code className="rounded bg-[var(--input-bg)] px-1 py-0.5 text-xs">code</code> voters use
              to join at <code className="rounded bg-[var(--input-bg)] px-1 py-0.5 text-xs">votero.app/vote/&lt;code&gt;</code>.
            </p>
          </Section>

          <Section heading="GET /api-v1-lobby-results">
            <p>
              Reads progress/tally/ballot-detail for a lobby <strong>you created</strong> — a
              foreign or nonexistent code both return 404, deliberately indistinguishable, so a
              wrong code can&apos;t be used to probe whether someone else&apos;s code exists.
            </p>
            <ApiDocsCodeBlock
              code={`curl "${functionsBaseUrl}/api-v1-lobby-results?code=7S8XDH6C" \\\n  -H "Authorization: Bearer vk_live_..."`}
            />
            <ApiDocsCodeBlock
              code={`{
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
}`}
            />
            <p>
              <code className="rounded bg-[var(--input-bg)] px-1 py-0.5 text-xs">tally</code> is{" "}
              <code className="rounded bg-[var(--input-bg)] px-1 py-0.5 text-xs">null</code> until the
              lobby is closed or tally visibility is <code className="rounded bg-[var(--input-bg)] px-1 py-0.5 text-xs">live</code>.{" "}
              <code className="rounded bg-[var(--input-bg)] px-1 py-0.5 text-xs">ballotDetail</code> is
              only populated for <code className="rounded bg-[var(--input-bg)] px-1 py-0.5 text-xs">open</code>-ballot
              lobbies.
            </p>
          </Section>

          <Section heading="Errors">
            <p>
              All errors are <code className="rounded bg-[var(--input-bg)] px-1 py-0.5 text-xs">{`{"error": "SOME_CODE"}`}</code>{" "}
              with a matching HTTP status:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-300 dark:border-neutral-800">
                    <th className="py-1.5 pr-4 font-semibold text-[var(--foreground)]">Code</th>
                    <th className="py-1.5 pr-4 font-semibold text-[var(--foreground)]">Status</th>
                    <th className="py-1.5 font-semibold text-[var(--foreground)]">Meaning</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800">
                    <td className="py-1.5 pr-4">INVALID_API_KEY</td>
                    <td className="py-1.5 pr-4">401</td>
                    <td className="py-1.5">missing, unrecognized, or revoked key</td>
                  </tr>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800">
                    <td className="py-1.5 pr-4">RATE_LIMITED</td>
                    <td className="py-1.5 pr-4">429</td>
                    <td className="py-1.5">too many requests in the current window</td>
                  </tr>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800">
                    <td className="py-1.5 pr-4">MISSING_CODE</td>
                    <td className="py-1.5 pr-4">400</td>
                    <td className="py-1.5">code query param missing on lobby-results</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-4">LOBBY_NOT_FOUND</td>
                    <td className="py-1.5 pr-4">404</td>
                    <td className="py-1.5">no lobby with that code owned by this key&apos;s account</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Section>

          <Section heading="What's not in v1">
            <ul className="list-disc pl-5">
              <li>No vote-casting or lobby-joining via API key — that represents an end-user voting, not a server acting on their behalf.</li>
              <li>No standalone lobby-read endpoint — create-lobby&apos;s response already has everything a caller who just created a lobby needs.</li>
              <li>No integration (Zapier, HubSpot, etc.) — this is the raw API; where to point it is a separate, later decision.</li>
            </ul>
          </Section>

          <p className="text-xs text-[var(--foreground-muted)]">
            Full machine-readable reference:{" "}
            <code className="rounded bg-[var(--input-bg)] px-1 py-0.5">docs/openapi.yaml</code> in
            the repo.
          </p>
        </div>
      </div>
    </main>
  );
}
