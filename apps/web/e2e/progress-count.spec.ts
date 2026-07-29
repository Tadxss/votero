import { test, expect } from "@playwright/test";
import { lobbyCodeFromManageUrl, openVoting } from "./helpers";

// Regression test for a real bug: with a multi-question survey and Hidden tally visibility, a
// stranger's "X of Y have voted" progress used to count raw vote rows (one per question per
// voter) instead of completed participants — 2 voters x 2 questions showed "4 of 2 have voted".
test("present-mode progress count reflects completed voters, not raw vote rows", async ({
  browser,
}) => {
  const creatorPage = await (await browser.newContext()).newPage();

  await creatorPage.goto("/create");
  await creatorPage.fill('input[placeholder="Team survey"]', "Company Checks");
  await creatorPage.fill('input[placeholder="Best pizza topping?"]', "Question 1?");
  let optionInputs = creatorPage.locator('input[placeholder^="Option "]');
  await optionInputs.nth(0).fill("A");
  await optionInputs.nth(1).fill("B");
  await creatorPage.click("text=+ Add question");
  await creatorPage.locator('input[placeholder="Best pizza topping?"]').nth(1).fill("Question 2?");
  optionInputs = creatorPage.locator('input[placeholder^="Option "]');
  await optionInputs.nth(2).fill("C");
  await optionInputs.nth(3).fill("D");
  // Leave tally visibility at its default (Hidden) — don't click Live.
  await creatorPage.click('button:has-text("Create lobby")');
  await creatorPage.waitForURL(/\/lobby\/.+\/manage/, { timeout: 15000 });
  const code = lobbyCodeFromManageUrl(creatorPage.url());
  await openVoting(creatorPage);

  for (let i = 0; i < 2; i++) {
    const page = await (await browser.newContext()).newPage();
    await page.goto(`/vote/${code}`);
    await page.waitForSelector("text=Question 1 of 2", { timeout: 15000 });
    await page.getByText("A", { exact: true }).click();
    await page.click('button:has-text("Next")');
    await page.waitForSelector("text=Question 2 of 2", { timeout: 15000 });
    await page.getByText("C", { exact: true }).click();
    await page.click('button:has-text("Submit")');
    await page.waitForSelector("text=thanks for voting", { timeout: 15000 });
  }

  // A stranger's view is the one that actually sees the hidden-tally "X of Y have voted"
  // fallback — the creator always sees the full tally regardless of tally_visibility.
  const strangerPage = await (await browser.newContext()).newPage();
  await strangerPage.goto(`/lobby/${code}/present`);
  await expect(strangerPage.getByText("2 of 2 have voted")).toBeVisible({ timeout: 10000 });
});
