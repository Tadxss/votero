import { defineConfig, devices } from "@playwright/test";

// Requires the local Supabase stack running (`npx supabase start` from the repo root) — these
// tests sign in via real email OTP, read the code back from Mailpit's API (127.0.0.1:54324), and
// exercise RLS-gated reads/writes against the local Postgres instance. See docs/TESTING.md.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // most specs sign in/create/vote against shared local Supabase state
  // Separate spec files still run concurrently across workers by default even with
  // fullyParallel: false — that contended enough (including Supabase's own OTP rate limit) to
  // cause spurious timeouts. One worker keeps every test fully sequential.
  workers: 1,
  // A fresh CI checkout compiles every route for the first time in that worker — a heavy,
  // many-route test can occasionally tip past the 30s test timeout purely on cold-compile time,
  // the same "first-compile flakiness" observed locally all session (retrying once always passed).
  // Locally the dev server + .next cache usually persist across runs, so failures there are more
  // likely real — keep retries off there for a fast, honest fail.
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
