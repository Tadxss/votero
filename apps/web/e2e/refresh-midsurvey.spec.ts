import { test, expect } from "@playwright/test";
import { lobbyCodeFromManageUrl, openVoting } from "./helpers";

// A refresh mid-survey resets the stepper to question 1 (an accepted v1 simplification, not a
// bug) — re-answering an already-answered question must upsert silently, not error.
test("refreshing mid-survey recovers cleanly via the upsert-not-error path", async ({
  browser,
}) => {
  const creatorPage = await (await browser.newContext()).newPage();

  await creatorPage.goto("/create");
  await creatorPage.fill('input[placeholder="Team survey"]', "Refresh Mid-Survey Test");
  await creatorPage.fill('input[placeholder="Best pizza topping?"]', "Coffee or Tea?");
  let optionInputs = creatorPage.locator('input[placeholder^="Option "]');
  await optionInputs.nth(0).fill("Coffee");
  await optionInputs.nth(1).fill("Tea");
  await creatorPage.click("text=+ Add question");
  await creatorPage.locator('input[placeholder="Best pizza topping?"]').nth(1).fill("Cats or Dogs?");
  optionInputs = creatorPage.locator('input[placeholder^="Option "]');
  await optionInputs.nth(2).fill("Cats");
  await optionInputs.nth(3).fill("Dogs");
  await creatorPage.click("text=Live");
  await creatorPage.click('button:has-text("Create lobby")');
  await creatorPage.waitForURL(/\/lobby\/.+\/manage/, { timeout: 15000 });
  const code = lobbyCodeFromManageUrl(creatorPage.url());
  await openVoting(creatorPage);

  const voterPage = await (await browser.newContext()).newPage();
  await voterPage.goto(`/vote/${code}`);
  await voterPage.waitForSelector("text=Question 1 of 2", { timeout: 15000 });

  await voterPage.getByText("Coffee", { exact: true }).click();
  await voterPage.click('button:has-text("Next")');
  await voterPage.waitForSelector("text=Question 2 of 2", { timeout: 15000 });

  await voterPage.reload();
  await voterPage.waitForSelector("text=Question 1 of 2", { timeout: 15000 });

  await voterPage.getByText("Coffee", { exact: true }).click();
  await voterPage.click('button:has-text("Next")');
  // Should silently advance to Q2 (re-answering Q1 upserts) rather than surfacing
  // ALREADY_ANSWERED_QUESTION as a raw error.
  await voterPage.waitForSelector("text=Question 2 of 2", { timeout: 15000 });
  await expect(voterPage.getByText("ALREADY_ANSWERED_QUESTION")).toHaveCount(0);

  await voterPage.getByText("Cats", { exact: true }).click();
  await voterPage.click('button:has-text("Submit")');
  await voterPage.waitForSelector("text=thanks for voting", { timeout: 15000 });
});
