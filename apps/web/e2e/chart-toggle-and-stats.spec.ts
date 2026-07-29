import { test, expect } from "@playwright/test";
import { lobbyCodeFromManageUrl, openVoting, signIn, uniqueEmail } from "./helpers";

test("bar/donut chart toggle + detailed stats page access gating", async ({ browser }) => {
  const creatorPage = await (await browser.newContext()).newPage();
  await signIn(creatorPage, uniqueEmail("charts-creator"));

  await creatorPage.goto("/create");
  await creatorPage.fill('input[placeholder="Team survey"]', "Chart Test Survey");
  await creatorPage.fill('input[placeholder="Best pizza topping?"]', "Best pizza topping?");
  await creatorPage.locator('input[placeholder="Option 1"]').fill("Pepperoni");
  await creatorPage.locator('input[placeholder="Option 2"]').fill("Veggie");
  await creatorPage.click("text=Live");
  await creatorPage.click('button:has-text("Create lobby")');
  await creatorPage.waitForURL(/\/lobby\/.+\/manage/, { timeout: 15000 });
  const code = lobbyCodeFromManageUrl(creatorPage.url());
  await openVoting(creatorPage);

  for (const choice of ["Pepperoni", "Pepperoni", "Pepperoni", "Veggie"]) {
    const vCtx = await browser.newContext();
    const vPage = await vCtx.newPage();
    await vPage.goto(`/vote/${code}`);
    await vPage.waitForSelector("text=Pepperoni", { timeout: 15000 });
    await vPage.getByText(choice, { exact: true }).click();
    await vPage.click('button[type="submit"]');
    await vPage.waitForSelector("text=thanks for voting", { timeout: 15000 });
    await vCtx.close();
  }

  // Manage page: "Detailed stats" link visible for the signed-in creator, links to /stats.
  await creatorPage.reload();
  await expect(creatorPage.getByText("Detailed stats")).toBeVisible();
  await creatorPage.click("text=Detailed stats");
  await creatorPage.waitForURL(/\/stats/, { timeout: 15000 });

  // Bar view (default) shows both options with counts/percentages.
  await expect(creatorPage.getByText("Pepperoni")).toBeVisible();
  await expect(creatorPage.getByText("75%")).toBeVisible();

  // Toggle to donut — same data, different chart. "votes" (the donut's center label) is exact
  // to disambiguate from the "Votes cast" StatCard label also on this page.
  await creatorPage.click('button[aria-label="Donut chart"]');
  await expect(creatorPage.getByText("votes", { exact: true })).toBeVisible();
  await expect(creatorPage.getByText("75%")).toBeVisible();

  // Present Mode shows the same toggle independently.
  const presentPage = await (await browser.newContext()).newPage();
  await presentPage.goto(`/lobby/${code}/present`);
  await expect(presentPage.locator('button[aria-label="Donut chart"]')).toBeVisible();
  await presentPage.click('button[aria-label="Donut chart"]');
  await expect(presentPage.getByText("votes", { exact: true })).toBeVisible();

  // Dashboard's per-lobby chart row links to the stats page.
  await creatorPage.goto("/dashboard");
  const statsLinkHref = await creatorPage.getAttribute("a:has-text('Chart Test Survey')", "href");
  expect(statsLinkHref).toBe(`/lobby/${code}/stats`);

  // Access gating: signed-out visitor sees a sign-in prompt, not the charts.
  const anonPage = await (await browser.newContext()).newPage();
  await anonPage.goto(`/lobby/${code}/stats`);
  await expect(anonPage.getByText("Sign in to see detailed stats")).toBeVisible();

  // Access gating: a signed-in but different account sees a forbidden message.
  const strangerPage = await (await browser.newContext()).newPage();
  await signIn(strangerPage, uniqueEmail("charts-stranger"));
  await strangerPage.goto(`/lobby/${code}/stats`);
  await expect(
    strangerPage.getByText("Only this lobby's creator can view detailed stats."),
  ).toBeVisible();
});

test("mixed choice + free-text survey: one shared toggle, applies only to the choice question", async ({
  page,
  browser,
}) => {
  await signIn(page, uniqueEmail("mixed-stats"));

  await page.goto("/create");
  await page.fill('input[placeholder="Team survey"]', "Mixed Stats Test");
  await page.fill('input[placeholder="Best pizza topping?"]', "Coffee or tea?");
  await page.locator('input[placeholder="Option 1"]').fill("Coffee");
  await page.locator('input[placeholder="Option 2"]').fill("Tea");
  await page.click("text=+ Add question");
  await page.locator('input[placeholder="Best pizza topping?"]').nth(1).fill("Any comments?");
  await page.locator("text=Free text").nth(1).click();
  await page.click("text=Live");
  await page.click('button:has-text("Create lobby")');
  await page.waitForURL(/\/lobby\/.+\/manage/, { timeout: 15000 });
  const code = lobbyCodeFromManageUrl(page.url());
  await openVoting(page);

  const voterPage = await (await browser.newContext()).newPage();
  await voterPage.goto(`/vote/${code}`);
  await voterPage.waitForSelector("text=Coffee", { timeout: 15000 });
  await voterPage.getByText("Coffee", { exact: true }).click();
  await voterPage.click('button:has-text("Next")');
  await voterPage.waitForSelector("textarea", { timeout: 15000 });
  await voterPage.fill("textarea", "Great survey!");
  await voterPage.click('button[type="submit"]');
  await voterPage.waitForSelector("text=thanks for voting", { timeout: 15000 });

  await page.goto(`/lobby/${code}/stats`);
  await expect(page.getByText("Coffee or tea?")).toBeVisible();
  await expect(page.getByText("Any comments?")).toBeVisible();
  await expect(page.getByText("great survey", { exact: false })).toBeVisible();
  await expect(page.locator('button[aria-label="Donut chart"]')).toHaveCount(1);
});
