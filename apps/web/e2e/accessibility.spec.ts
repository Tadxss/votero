import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { lobbyCodeFromManageUrl, openVoting, signIn, uniqueEmail } from "./helpers";

// Serious/critical-only: axe's "moderate"/"minor" impact violations (e.g. color-contrast on a
// palette this app already ships) are a broader design-system conversation, not a regression gate.
function assertNoSeriousViolations(violations: { id: string; impact?: string | null }[]) {
  const serious = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
}

function analyze(page: import("@playwright/test").Page) {
  return new AxeBuilder({ page }).analyze();
}

test("home page has no serious/critical automated a11y violations", async ({ page }) => {
  await page.goto("/");
  const results = await analyze(page);
  assertNoSeriousViolations(results.violations);
});

test("create-lobby page has no serious/critical automated a11y violations", async ({ page }) => {
  await page.goto("/create");
  const results = await analyze(page);
  assertNoSeriousViolations(results.violations);
});

test("login page has no serious/critical automated a11y violations", async ({ page }) => {
  await page.goto("/login");
  const results = await analyze(page);
  assertNoSeriousViolations(results.violations);
});

test("developers page has no serious/critical automated a11y violations", async ({ page }) => {
  await page.goto("/developers");
  const results = await analyze(page);
  assertNoSeriousViolations(results.violations);
});

test("vote page has no serious/critical automated a11y violations", async ({ page }) => {
  await page.goto("/create");
  await page.fill('input[placeholder="Team survey"]', "A11y Scan Lobby");
  await page.fill('input[placeholder="Best pizza topping?"]', "Best pizza topping?");
  const optionInputs = page.locator('input[placeholder^="Option "]');
  await optionInputs.nth(0).fill("Pepperoni");
  await optionInputs.nth(1).fill("Margherita");
  await page.click('button:has-text("Create lobby")');
  await page.waitForURL(/\/lobby\/.+\/manage/, { timeout: 15000 });
  const code = lobbyCodeFromManageUrl(page.url());
  await openVoting(page);

  await page.goto(`/vote/${code}`);
  await page.waitForSelector('input[type="radio"]', { timeout: 15000 });
  // The options list mounts with a 0.25s pop-in fade/scale animation (see tailwind.config.cjs) —
  // scanning mid-animation catches a transient low-opacity contrast state that isn't what a user
  // ever actually sees settled on screen.
  await page.waitForTimeout(300);
  const results = await analyze(page);
  assertNoSeriousViolations(results.violations);
});

test("privacy page has no serious/critical automated a11y violations", async ({ page }) => {
  await page.goto("/privacy");
  const results = await analyze(page);
  assertNoSeriousViolations(results.violations);
});

test("terms page has no serious/critical automated a11y violations", async ({ page }) => {
  await page.goto("/terms");
  const results = await analyze(page);
  assertNoSeriousViolations(results.violations);
});

test("manage/present/poster pages have no serious/critical automated a11y violations", async ({
  page,
}) => {
  // Deliberately anonymous (no signIn) — a lobby's creator can reach all three of these pages
  // without an account, so scanning them shouldn't take on sign-in as a dependency it doesn't need.
  await page.goto("/create");
  await page.fill('input[placeholder="Team survey"]', "A11y Pages Lobby");
  await page.fill('input[placeholder="Best pizza topping?"]', "Best pizza topping?");
  const optionInputs = page.locator('input[placeholder^="Option "]');
  await optionInputs.nth(0).fill("Pepperoni");
  await optionInputs.nth(1).fill("Margherita");
  await page.click('button:has-text("Create lobby")');
  await page.waitForURL(/\/lobby\/.+\/manage/, { timeout: 15000 });
  const code = lobbyCodeFromManageUrl(page.url());
  await page.waitForSelector("text=A11y Pages Lobby");
  // The QR card mounts with a 0.25s animate-pop-in fade/scale (tailwind.config.cjs) — same
  // transient-opacity false positive already diagnosed and fixed for the vote-page scan below.
  await page.waitForTimeout(300);

  assertNoSeriousViolations((await analyze(page)).violations);

  await page.goto(`/lobby/${code}/present`);
  await page.waitForSelector(`text=${code}`);
  await page.waitForTimeout(300);
  assertNoSeriousViolations((await analyze(page)).violations);

  await page.goto(`/lobby/${code}/poster`);
  await page.waitForSelector("img, svg", { timeout: 15000 });
  await page.waitForTimeout(300);
  assertNoSeriousViolations((await analyze(page)).violations);
});

test("dashboard, My Lobbies, and stats pages (signed in) have no serious/critical automated a11y violations", async ({
  page,
}) => {
  await signIn(page, uniqueEmail("a11y-signed-in"));

  // Empty states first, before this account has created anything.
  await page.goto("/dashboard");
  await page.waitForSelector("text=No lobbies yet");
  await page.waitForTimeout(300);
  assertNoSeriousViolations((await analyze(page)).violations);

  await page.goto("/lobbies");
  await page.waitForSelector("text=No lobbies yet");
  await page.waitForTimeout(300);
  assertNoSeriousViolations((await analyze(page)).violations);

  // Stats only renders its full creator view for a real signed-in account (see stats/page.tsx),
  // so it needs its own lobby created under this same signed-in session.
  await page.goto("/create");
  await page.fill('input[placeholder="Team survey"]', "A11y Stats Lobby");
  await page.fill('input[placeholder="Best pizza topping?"]', "Best pizza topping?");
  const optionInputs = page.locator('input[placeholder^="Option "]');
  await optionInputs.nth(0).fill("Pepperoni");
  await optionInputs.nth(1).fill("Margherita");
  await page.click('button:has-text("Create lobby")');
  await page.waitForURL(/\/lobby\/.+\/manage/, { timeout: 15000 });
  const code = lobbyCodeFromManageUrl(page.url());

  await page.goto(`/lobby/${code}/stats`);
  await page.waitForSelector("text=Voters joined");
  await page.waitForTimeout(300);
  assertNoSeriousViolations((await analyze(page)).violations);
});

test.describe("dark mode", () => {
  test.use({ colorScheme: "dark" });

  test("home page has no serious/critical automated a11y violations in dark mode", async ({
    page,
  }) => {
    await page.goto("/");
    const results = await analyze(page);
    assertNoSeriousViolations(results.violations);
  });

  test("create-lobby page has no serious/critical automated a11y violations in dark mode", async ({
    page,
  }) => {
    await page.goto("/create");
    const results = await analyze(page);
    assertNoSeriousViolations(results.violations);
  });
});

test("Join a lobby modal traps focus, closes on Escape, and restores focus to its trigger", async ({
  page,
}) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Join a lobby" });
  await trigger.click();

  const dialog = page.getByRole("dialog", { name: "Join a lobby" });
  await expect(dialog).toBeVisible();

  // Tab forward past every focusable element in the dialog — focus must never land outside it.
  const focusableCount = await dialog
    .locator('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')
    .count();
  for (let i = 0; i < focusableCount + 2; i++) {
    await page.keyboard.press("Tab");
    const activeInsideDialog = await page.evaluate(() => {
      const dialogEl = document.querySelector('[role="dialog"]');
      return Boolean(dialogEl && document.activeElement && dialogEl.contains(document.activeElement));
    });
    expect(activeInsideDialog).toBe(true);
  }

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});
