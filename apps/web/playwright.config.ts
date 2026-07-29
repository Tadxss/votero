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
  retries: 0,
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
