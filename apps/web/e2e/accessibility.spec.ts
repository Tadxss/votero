import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { lobbyCodeFromManageUrl, openVoting } from "./helpers";

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
  const results = await analyze(page);
  assertNoSeriousViolations(results.violations);
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
