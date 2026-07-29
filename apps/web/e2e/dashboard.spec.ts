import { test, expect } from "@playwright/test";
import { lobbyCodeFromManageUrl, openVoting, signIn, uniqueEmail } from "./helpers";

test("signed out visitor sees a sign-in prompt, not stats", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByText("Sign in to see stats about the lobbies you've created.")).toBeVisible();
});

test("a fresh signed-in user with zero lobbies sees the empty-state prompt, not zeroed stat cards", async ({
  page,
}) => {
  await signIn(page, uniqueEmail("dashboard-empty"));
  await expect(page.getByText("No lobbies yet")).toBeVisible();
  await expect(page.getByText("Lobbies created")).toHaveCount(0);
});

test("stat tiles, status breakdown, and the voters-by-lobby chart reflect real activity", async ({
  browser,
}) => {
  const page = await (await browser.newContext()).newPage();
  await signIn(page, uniqueEmail("dashboard-stats"));

  await page.goto("/create");
  await page.fill('input[placeholder="Team survey"]', "Dashboard Stats Lobby");
  await page.fill('input[placeholder="Best pizza topping?"]', "Coffee or tea?");
  await page.locator('input[placeholder="Option 1"]').fill("Coffee");
  await page.locator('input[placeholder="Option 2"]').fill("Tea");
  await page.click('button:has-text("Create lobby")');
  await page.waitForURL(/\/lobby\/.+\/manage/, { timeout: 15000 });
  const code = lobbyCodeFromManageUrl(page.url());
  await openVoting(page);

  const voterPage = await (await browser.newContext()).newPage();
  await voterPage.goto(`/vote/${code}`);
  await voterPage.waitForSelector("text=Coffee", { timeout: 15000 });
  await voterPage.getByText("Coffee", { exact: true }).click();
  await voterPage.click('button[type="submit"]');
  await voterPage.waitForSelector("text=thanks for voting", { timeout: 15000 });

  await page.goto("/dashboard");
  await expect(page.getByText("Lobbies created")).toBeVisible();

  // One lobby created, one voter joined, one vote cast — each StatCard pairs its value/label as
  // adjacent siblings, so scope the "1" check to each label's own parent to avoid ambiguity
  // between the three cards.
  for (const label of ["Lobbies created", "Voters joined", "Votes cast"]) {
    const card = page.getByText(label, { exact: true }).locator("..");
    await expect(card.getByText("1", { exact: true })).toBeVisible();
  }

  // Status breakdown: one Open lobby.
  await expect(page.getByText("Open", { exact: true })).toBeVisible();

  // Voters-by-lobby chart shows this lobby and links to its stats page.
  const lobbyLink = page.locator("a", { hasText: "Dashboard Stats Lobby" });
  await expect(lobbyLink).toBeVisible();
  await expect(lobbyLink).toHaveAttribute("href", `/lobby/${code}/stats`);
});
