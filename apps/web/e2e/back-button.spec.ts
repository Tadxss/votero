import { test, expect } from "@playwright/test";
import { lobbyCodeFromManageUrl, openVoting } from "./helpers";

test("back button preserves both a choice edit and a draft text answer", async ({ browser }) => {
  const creatorPage = await (await browser.newContext()).newPage();

  await creatorPage.goto("/create");
  await creatorPage.fill('input[placeholder="Team survey"]', "Back Button E2E Test");
  await creatorPage.fill('input[placeholder="Best pizza topping?"]', "Pizza or Lasagna?");
  const optionInputs = creatorPage.locator('input[placeholder^="Option "]');
  await optionInputs.nth(0).fill("Pizza");
  await optionInputs.nth(1).fill("Lasagna");

  await creatorPage.click("text=+ Add question");
  await creatorPage
    .locator('input[placeholder="Best pizza topping?"]')
    .nth(1)
    .fill("One word for tonight?");
  await creatorPage.locator("text=Free text").nth(1).click();

  await creatorPage.click("text=Live");
  await creatorPage.click('button:has-text("Create lobby")');
  await creatorPage.waitForURL(/\/lobby\/.+\/manage/, { timeout: 15000 });
  const code = lobbyCodeFromManageUrl(creatorPage.url());

  await openVoting(creatorPage);

  const voterPage = await (await browser.newContext()).newPage();
  await voterPage.goto(`/vote/${code}`);
  await voterPage.waitForSelector("text=Question 1 of 2", { timeout: 15000 });

  await expect(voterPage.locator('button:has-text("Back")')).toHaveCount(0);

  await voterPage.getByText("Pizza", { exact: true }).click();
  await voterPage.click('button:has-text("Next")');
  await voterPage.waitForSelector("text=Question 2 of 2", { timeout: 15000 });

  await expect(voterPage.locator('button:has-text("Back")')).toHaveCount(1);

  await voterPage.fill("textarea", "draft answer, not submitted");
  await voterPage.click('button:has-text("Back")');
  await voterPage.waitForSelector("text=Question 1 of 2", { timeout: 15000 });

  await expect(voterPage.locator('label:has-text("Pizza") input[type="radio"]')).toBeChecked();

  await voterPage.getByText("Lasagna", { exact: true }).click();
  await voterPage.click('button:has-text("Next")');
  await voterPage.waitForSelector("text=Question 2 of 2", { timeout: 15000 });

  await expect(voterPage.locator("textarea")).toHaveValue("draft answer, not submitted");

  await voterPage.fill("textarea", "final answer");
  await voterPage.click('button:has-text("Submit")');
  await voterPage.waitForSelector("text=thanks for voting", { timeout: 15000 });

  await expect(voterPage.getByText("final answer")).toBeVisible();
  await expect(voterPage.getByText("draft answer")).toHaveCount(0);

  await creatorPage.reload();
  await creatorPage.waitForSelector("text=Results", { timeout: 15000 });
  await expect(creatorPage.getByText("Pizza", { exact: true })).toBeVisible();
  await expect(creatorPage.getByText("Lasagna", { exact: true })).toBeVisible();
});
