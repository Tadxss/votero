import { test, expect } from "@playwright/test";
import { lobbyCodeFromManageUrl, openVoting, signIn, uniqueEmail } from "./helpers";

test("static pages set a distinct browser tab title, not the bare default", async ({ page }) => {
  await page.goto("/create");
  await expect(page).toHaveTitle("Create a lobby — Votero");

  await page.goto("/login");
  await expect(page).toHaveTitle("Sign in — Votero");

  await page.goto("/lobbies");
  await expect(page).toHaveTitle("My Lobbies — Votero");

  await page.goto("/dashboard");
  await expect(page).toHaveTitle("Dashboard — Votero");
});

test("a mistyped vote code resolves to 'not found' quickly, not after a long retry delay", async ({
  page,
}) => {
  const start = Date.now();
  await page.goto("/vote/NOTAREALCODE1");
  await page.waitForSelector("text=Lobby not found.", { timeout: 8000 });
  // TanStack Query's own default (3 retries, exponential backoff) used to add ~7-10s here.
  expect(Date.now() - start).toBeLessThan(8000);
});

test("manage/present/stats/vote pages title themselves from the loaded lobby's name", async ({
  browser,
}) => {
  const page = await (await browser.newContext()).newPage();
  await signIn(page, uniqueEmail("title-check"));

  await page.goto("/create");
  await page.fill('input[placeholder="Team survey"]', "Title Check Lobby");
  await page.fill('input[placeholder="Best pizza topping?"]', "Coffee or tea?");
  await page.locator('input[placeholder="Option 1"]').fill("Coffee");
  await page.locator('input[placeholder="Option 2"]').fill("Tea");
  await page.click('button:has-text("Create lobby")');
  await page.waitForURL(/\/lobby\/.+\/manage/, { timeout: 15000 });
  const code = lobbyCodeFromManageUrl(page.url());
  await expect(page).toHaveTitle("Title Check Lobby · Manage — Votero");

  await openVoting(page);

  await page.goto(`/lobby/${code}/present`);
  await expect(page).toHaveTitle("Title Check Lobby · Present — Votero");

  await page.goto(`/lobby/${code}/stats`);
  await expect(page).toHaveTitle("Title Check Lobby · Stats — Votero");

  const voterPage = await (await browser.newContext()).newPage();
  await voterPage.goto(`/vote/${code}`);
  await voterPage.waitForSelector("text=Coffee", { timeout: 15000 });
  await expect(voterPage).toHaveTitle("Title Check Lobby — Votero");
});

test("'Close voting' requires confirmation, can be cancelled, and only closes when confirmed", async ({
  page,
}) => {
  await signIn(page, uniqueEmail("close-confirm"));

  await page.goto("/create");
  await page.fill('input[placeholder="Team survey"]', "Close Confirm Test");
  await page.fill('input[placeholder="Best pizza topping?"]', "Coffee or tea?");
  await page.locator('input[placeholder="Option 1"]').fill("Coffee");
  await page.locator('input[placeholder="Option 2"]').fill("Tea");
  await page.click('button:has-text("Create lobby")');
  await page.waitForURL(/\/lobby\/.+\/manage/, { timeout: 15000 });
  await openVoting(page);

  await page.click('button:has-text("Close voting")');
  await expect(page.getByText("Close voting?")).toBeVisible();
  // The dialog's own confirm button must say "Close voting," never the hardcoded "Delete"
  // default from ConfirmDialog's other (delete-lobby) usage.
  await expect(page.getByRole("button", { name: "Close voting" }).last()).toBeVisible();
  await expect(page.locator('button:has-text("Close voting")')).toHaveCount(2); // page button + dialog button

  await page.click("text=Cancel");
  await expect(page.getByText("Close voting?")).toHaveCount(0);
  await expect(page.locator('button:has-text("Close voting")')).toHaveCount(1); // dialog dismissed

  await page.click('button:has-text("Close voting")');
  await page.getByRole("button", { name: "Close voting" }).last().click();
  await expect(page.getByText("Closed", { exact: true })).toBeVisible({ timeout: 10000 });
});

test("Present Mode stays readable at a phone width for a longer lobby title", async ({
  browser,
}) => {
  const page = await (await browser.newContext({ viewport: { width: 375, height: 700 } })).newPage();
  await signIn(page, uniqueEmail("present-mobile"));

  await page.goto("/create");
  await page.fill('input[placeholder="Team survey"]', "Present Mobile Fix Test");
  await page.fill('input[placeholder="Best pizza topping?"]', "Coffee or tea?");
  await page.locator('input[placeholder="Option 1"]').fill("Coffee");
  await page.locator('input[placeholder="Option 2"]').fill("Tea");
  await page.click('button:has-text("Create lobby")');
  await page.waitForURL(/\/lobby\/.+\/manage/, { timeout: 15000 });
  const code = lobbyCodeFromManageUrl(page.url());
  await openVoting(page);

  await page.goto(`/lobby/${code}/present`);
  const heading = page.getByRole("heading", { name: "Present Mobile Fix Test" });
  await expect(heading).toBeVisible();
  // The title's bounding box should stay well within the 375px viewport, not overflow/wrap into
  // an unbounded stack of lines that pushes the status pill off-screen.
  const box = await heading.boundingBox();
  expect(box?.width).toBeLessThanOrEqual(375);
});
