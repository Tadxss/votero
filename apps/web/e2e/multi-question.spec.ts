import { test, expect } from "@playwright/test";
import { lobbyCodeFromManageUrl, openVoting } from "./helpers";

test("multi-question survey: stepper, per-question tallies on manage + present", async ({
  browser,
}) => {
  const creatorPage = await (await browser.newContext()).newPage();

  await creatorPage.goto("/create");
  await creatorPage.fill('input[placeholder="Team survey"]', "Multi-Q E2E Test");

  await creatorPage.fill('input[placeholder="Best pizza topping?"]', "Coffee or Tea?");
  const optionInputs1 = creatorPage.locator('input[placeholder^="Option "]');
  await optionInputs1.nth(0).fill("Coffee");
  await optionInputs1.nth(1).fill("Tea");

  await creatorPage.click("text=+ Add question");
  const questionTitleInputs = creatorPage.locator('input[placeholder="Best pizza topping?"]');
  await questionTitleInputs.nth(1).fill("Cats or Dogs?");
  const optionInputsAll = creatorPage.locator('input[placeholder^="Option "]');
  await optionInputsAll.nth(2).fill("Cats");
  await optionInputsAll.nth(3).fill("Dogs");

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

  await voterPage.getByText("Cats", { exact: true }).click();
  await voterPage.click('button:has-text("Submit")');
  await voterPage.waitForSelector("text=thanks for voting", { timeout: 15000 });

  await expect(voterPage.getByText("Coffee or Tea?")).toBeVisible();
  await expect(voterPage.getByText("Cats or Dogs?")).toBeVisible();

  await creatorPage.reload();
  await expect(creatorPage.getByText("Coffee or Tea?")).toBeVisible();
  await expect(creatorPage.getByText("Cats or Dogs?")).toBeVisible();
  await expect(creatorPage.getByText("Coffee", { exact: true })).toBeVisible();
  await expect(creatorPage.getByText("Cats", { exact: true })).toBeVisible();

  await creatorPage.goto(`/lobby/${code}/present`);
  await expect(creatorPage.getByText("Coffee or Tea?")).toBeVisible();
  await expect(creatorPage.getByText("Cats or Dogs?")).toHaveCount(0);
  await creatorPage.click('button:has-text("Next")');
  await expect(creatorPage.getByText("Cats or Dogs?")).toBeVisible();
  await expect(creatorPage.getByText("Coffee or Tea?")).toHaveCount(0);
});
