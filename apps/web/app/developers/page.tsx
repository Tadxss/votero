"use client";

import { ApiDocsCodeBlock } from "../_components/ApiDocsCodeBlock";
import { ApiDocsNav, type ApiDocsNavItem } from "../_components/ApiDocsNav";
import { useDocumentTitle } from "../_components/useDocumentTitle";

// Derived from the same env var the app's own Supabase client uses (providers.tsx) so the curl
// examples show the actual base URL for whichever environment this page is being viewed in
// (localhost while developing, the real hosted URL in production) instead of a <project-ref>
// placeholder nobody can copy-paste directly.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://<project-ref>.supabase.co";
const functionsBaseUrl = `${supabaseUrl.replace(/\/$/, "")}/functions/v1`;

const NAV_ITEMS: ApiDocsNavItem[] = [
  { id: "quickstart", label: "Quickstart" },
  { id: "base-url", label: "Base URL" },
  { id: "authentication", label: "Authentication" },
  { id: "rate-limits", label: "Rate limits" },
  { id: "get-me", label: "GET /api-v1-me" },
  { id: "post-create-lobby", label: "POST /api-v1-create-lobby" },
  { id: "get-lobby-results", label: "GET /api-v1-lobby-results" },
  { id: "errors", label: "Errors" },
  { id: "not-in-v1", label: "What's not in v1" },
];

function C({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-[var(--input-bg)] px-1 py-0.5 text-xs">{children}</code>;
}

function Section({
  id,
  heading,
  children,
}: {
  id: string;
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 flex flex-col gap-3">
      <h2 className="font-display text-lg font-bold text-[var(--foreground)]">{heading}</h2>
      <div className="flex flex-col gap-3 text-sm leading-relaxed text-[var(--foreground-muted)]">
        {children}
      </div>
    </section>
  );
}

// Solid bg + white text rather than StatusPill.tsx's translucent-tint style — that combo
// (bg-accent-400/20 + text-accent-600) measures 4.48:1 at this badge's 12px bold size, just under
// WCAG AA's 4.5:1 (confirmed by an axe scan). brand-700/white is already a proven AA pairing in
// this app (see Button.tsx's primary variant, 12.80:1); accent-600/white clears it the same way.
function MethodBadge({ method }: { method: "GET" | "POST" }) {
  const styles = method === "GET" ? "bg-accent-600 text-white" : "bg-brand-700 text-white";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${styles}`}>
      {method}
    </span>
  );
}

function EndpointSection({
  id,
  method,
  path,
  children,
}: {
  id: string;
  method: "GET" | "POST";
  path: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 flex flex-col gap-3">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[var(--foreground)]">
        <MethodBadge method={method} />
        <code className="text-base">{path}</code>
      </h2>
      <div className="flex flex-col gap-3 text-sm leading-relaxed text-[var(--foreground-muted)]">
        {children}
      </div>
    </section>
  );
}

function ParamTable({
  rows,
}: {
  rows: { field: string; type: string; required: string; description: string }[];
}) {
  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- same scrollable-region-focusable fix as ApiDocsCodeBlock.tsx
    <div tabIndex={0} className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-300 dark:border-neutral-800">
            <th className="py-1.5 pr-4 font-semibold text-[var(--foreground)]">Field</th>
            <th className="py-1.5 pr-4 font-semibold text-[var(--foreground)]">Type</th>
            <th className="py-1.5 pr-4 font-semibold text-[var(--foreground)]">Required</th>
            <th className="py-1.5 font-semibold text-[var(--foreground)]">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.field} className="border-b border-neutral-200 last:border-0 dark:border-neutral-800">
              <td className="py-1.5 pr-4 align-top">
                <code className="text-xs">{row.field}</code>
              </td>
              <td className="py-1.5 pr-4 align-top text-xs">{row.type}</td>
              <td className="py-1.5 pr-4 align-top text-xs">{row.required}</td>
              <td className="py-1.5 align-top">{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DevelopersPage() {
  useDocumentTitle("API documentation");

  return (
    <main className="relative flex-1 px-4 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
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

        <div className="flex gap-10 lg:items-start">
          <ApiDocsNav items={NAV_ITEMS} />

          <div className="flex min-w-0 flex-1 animate-pop-in flex-col gap-8 rounded-3xl border border-neutral-300 bg-[var(--surface)] p-6 shadow-sm dark:border-neutral-800 sm:p-8">
            <Section id="quickstart" heading="Quickstart">
              <ol className="list-decimal pl-5">
                <li>
                  Sign in, then generate a key from <strong>API keys</strong> in the header — see{" "}
                  <a href="#authentication" className="text-brand-600 underline dark:text-brand-300">
                    Authentication
                  </a>
                  .
                </li>
                <li>
                  Create a lobby — see{" "}
                  <a href="#post-create-lobby" className="text-brand-600 underline dark:text-brand-300">
                    POST /api-v1-create-lobby
                  </a>
                  . The response includes the lobby&apos;s join code.
                </li>
                <li>
                  Fetch progress and results any time — see{" "}
                  <a href="#get-lobby-results" className="text-brand-600 underline dark:text-brand-300">
                    GET /api-v1-lobby-results
                  </a>
                  .
                </li>
              </ol>
            </Section>

            <Section id="base-url" heading="Base URL">
              <p>All endpoints are Supabase Edge Functions under:</p>
              <ApiDocsCodeBlock code={`${functionsBaseUrl}/api-v1-<endpoint>`} />
            </Section>

            <Section id="authentication" heading="Authentication">
              <p>
                Every request needs <C>Authorization: Bearer &lt;key&gt;</C>. The raw key
                (<C>vk_live_...</C>) is shown exactly once when generated — copy it immediately,
                only its hash is stored afterward. A key is tied to your account and inherits your
                normal lobby-creation limits (including the 10-lobby cap — see{" "}
                <a href="#errors" className="text-brand-600 underline dark:text-brand-300">
                  Errors
                </a>
                ).
              </p>
              <p>Revoked or unrecognized keys get a 401:</p>
              <ApiDocsCodeBlock code={`{ "error": "INVALID_API_KEY" }`} />
            </Section>

            <Section id="rate-limits" heading="Rate limits">
              <p>Each endpoint has its own bucket, separate from the web app&apos;s own limits:</p>
              {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- same scrollable-region-focusable fix as ApiDocsCodeBlock.tsx */}
              <div tabIndex={0} className="overflow-x-auto">
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
                Exceeding a limit returns 429 with <C>{`{"error": "RATE_LIMITED"}`}</C>. Lobby
                creation also has a second, stricter limit underneath the API&apos;s own bucket:
                your account can create at most <strong>5 lobbies per 10 minutes</strong>{" "}
                (the same limit the web app&apos;s creation form is subject to) — whichever limit
                is hit first returns <C>RATE_LIMITED</C>.
              </p>
            </Section>

            <EndpointSection id="get-me" method="GET" path="/api-v1-me">
              <p>Confirms a key is valid. No side effects, no rate limit.</p>
              <ApiDocsCodeBlock
                code={`curl ${functionsBaseUrl}/api-v1-me \\\n  -H "Authorization: Bearer vk_live_..."`}
              />
              <ApiDocsCodeBlock
                code={`{ "ok": true, "userId": "3f06f4ea-d868-4ce2-9308-b979b0797979" }`}
              />
            </EndpointSection>

            <EndpointSection id="post-create-lobby" method="POST" path="/api-v1-create-lobby">
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

              <p className="font-semibold text-[var(--foreground)]">Body fields</p>
              <ParamTable
                rows={[
                  { field: "title", type: "string", required: "Yes", description: "1–200 characters." },
                  { field: "questions", type: "array", required: "Yes", description: "At least 1 question — see question fields below." },
                  { field: "voterCap", type: "integer", required: "Yes", description: "1–10,000. Max number of participants who can join." },
                  {
                    field: "ballotMode",
                    type: `"anonymous" | "open"`,
                    required: "Yes",
                    description: `"anonymous": nobody — including you — can see who voted for what, only aggregate tallies. "open": you can see each voter's individual ballot via ballotDetail on the results endpoint.`,
                  },
                  {
                    field: "tallyVisibility",
                    type: `"live" | "hidden"`,
                    required: "Yes",
                    description: `"live": results are visible while the lobby is still open. "hidden": results are only visible once you close the lobby.`,
                  },
                  { field: "closesAt", type: "ISO 8601 timestamp", required: "No", description: "Schedules an automatic close. Must be in the future. Omit for no scheduled close." },
                ]}
              />

              <p className="font-semibold text-[var(--foreground)]">Question object fields</p>
              <ParamTable
                rows={[
                  { field: "title", type: "string", required: "Yes", description: "1–200 characters." },
                  {
                    field: "type",
                    type: `"choice" | "text" | "ranked"`,
                    required: "Yes",
                    description: `"choice": pick one, or up to N — see maxSelections. "text": free-response, no options. "ranked": rank every option in order (instant-runoff tallying).`,
                  },
                  {
                    field: "options",
                    type: "string[]",
                    required: "For choice/ranked",
                    description: "At least 2 options, each 1–200 characters. Ignored for text questions.",
                  },
                  {
                    field: "maxSelections",
                    type: "integer",
                    required: "No",
                    description: "choice only, 1..options.length. Omit for classic single-select; set above 1 for \"choose up to N.\" Not applicable to ranked — every option is always ranked.",
                  },
                ]}
              />

              <p className="font-semibold text-[var(--foreground)]">Example: mixed question types</p>
              <p>
                A 3-question survey combining all 3 types — one ranked-choice question, one
                multi-select (&quot;choose up to N&quot;) question, and one free-text question:
              </p>
              <ApiDocsCodeBlock
                code={`{
  "title": "Team offsite planning",
  "questions": [
    { "title": "Rank these venues", "type": "ranked", "options": ["Beach house", "Mountain cabin", "City loft"] },
    { "title": "Which activities interest you?", "type": "choice", "options": ["Hiking", "Cooking class", "Board games", "Spa"], "maxSelections": 2 },
    { "title": "Anything else we should plan for?", "type": "text" }
  ],
  "voterCap": 25,
  "ballotMode": "open",
  "tallyVisibility": "hidden"
}`}
              />

              <p>
                The response includes the generated <C>code</C> voters use to join at{" "}
                <C>votero.app/vote/&lt;code&gt;</C>.
              </p>
            </EndpointSection>

            <EndpointSection id="get-lobby-results" method="GET" path="/api-v1-lobby-results">
              <p>
                Reads progress/tally/ballot-detail for a lobby <strong>you created</strong> — a
                foreign or nonexistent code both return 404, deliberately indistinguishable, so a
                wrong code can&apos;t be used to probe whether someone else&apos;s code exists.
              </p>

              <p className="font-semibold text-[var(--foreground)]">Query parameters</p>
              <ParamTable
                rows={[
                  { field: "code", type: "string", required: "Yes", description: "The lobby's human-readable join code, e.g. 7S8XDH6C." },
                ]}
              />

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
                <C>tally</C> is <C>null</C> until the lobby is closed or tally visibility is{" "}
                <C>live</C>. <C>ballotDetail</C> is only populated for <C>open</C>-ballot lobbies.
              </p>
            </EndpointSection>

            <Section id="errors" heading="Errors">
              <p>
                All errors are <C>{`{"error": "SOME_CODE"}`}</C> with a matching HTTP status:
              </p>
              {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- same scrollable-region-focusable fix as ApiDocsCodeBlock.tsx */}
              <div tabIndex={0} className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-neutral-300 dark:border-neutral-800">
                      <th className="py-1.5 pr-4 font-semibold text-[var(--foreground)]">Code</th>
                      <th className="py-1.5 pr-4 font-semibold text-[var(--foreground)]">Status</th>
                      <th className="py-1.5 pr-4 font-semibold text-[var(--foreground)]">Applies to</th>
                      <th className="py-1.5 font-semibold text-[var(--foreground)]">Meaning</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["INVALID_API_KEY", "401", "All endpoints", "missing, unrecognized, or revoked key"],
                      ["RATE_LIMITED", "429", "create-lobby, lobby-results", "too many requests in the current window (see Rate limits)"],
                      ["MISSING_CODE", "400", "lobby-results", "code query param missing"],
                      ["LOBBY_NOT_FOUND", "404", "lobby-results", "no lobby with that code owned by this key's account"],
                      ["AT_LEAST_ONE_QUESTION_REQUIRED", "400", "create-lobby", "questions array is empty"],
                      ["AT_LEAST_TWO_OPTIONS_REQUIRED", "400", "create-lobby", "a choice or ranked question has fewer than 2 options"],
                      ["INVALID_MAX_SELECTIONS", "400", "create-lobby", "maxSelections is below 1 or above the question's option count"],
                      ["INAPPROPRIATE_CONTENT", "400", "create-lobby", "the lobby title, a question title, or an option label failed the profanity filter"],
                      ["CLOSES_AT_MUST_BE_FUTURE", "400", "create-lobby", "closesAt is not in the future"],
                      ["LOBBY_LIMIT_REACHED", "400", "create-lobby", "your account already has 10 lobbies (the same cap the web app enforces)"],
                    ].map(([code, status, appliesTo, meaning]) => (
                      <tr key={code} className="border-b border-neutral-200 last:border-0 dark:border-neutral-800">
                        <td className="py-1.5 pr-4 align-top">
                          <code className="text-xs">{code}</code>
                        </td>
                        <td className="py-1.5 pr-4 align-top">{status}</td>
                        <td className="py-1.5 pr-4 align-top">{appliesTo}</td>
                        <td className="py-1.5 align-top">{meaning}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>
                Field-length/range violations (e.g. <C>voterCap</C> outside 1–10,000, a title over
                200 characters) return a 400 with a raw database error message rather than one of
                the codes above — validate against the limits in the parameter tables above to
                avoid hitting these.
              </p>
            </Section>

            <Section id="not-in-v1" heading="What's not in v1">
              <ul className="list-disc pl-5">
                <li>No vote-casting or lobby-joining via API key — that represents an end-user voting, not a server acting on their behalf.</li>
                <li>No standalone lobby-read endpoint — create-lobby&apos;s response already has everything a caller who just created a lobby needs.</li>
                <li>No integration (Zapier, HubSpot, etc.) — this is the raw API; where to point it is a separate, later decision.</li>
              </ul>
            </Section>

            <p className="text-xs text-[var(--foreground-muted)]">
              Full machine-readable reference: <C>docs/openapi.yaml</C> in the repo.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
