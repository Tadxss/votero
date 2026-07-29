import { test, expect } from "@playwright/test";
import { lobbyCodeFromManageUrl, openVoting } from "./helpers";

test("classic single-question lobby: no stepper, 'Vote' button, no redundant heading", async ({
  browser,
}) => {
  const creatorPage = await (await browser.newContext()).newPage();

  await creatorPage.goto("/create");
  await creatorPage.fill('input[placeholder="Team survey"]', "Single-Q Regression Test");
  await creatorPage.fill('input[placeholder="Best pizza topping?"]', "Best pizza topping?");
  const optionInputs = creatorPage.locator('input[placeholder^="Option "]');
  await optionInputs.nth(0).fill("Pepperoni");
  await optionInputs.nth(1).fill("Margherita");
  await creatorPage.click("text=Live");

  await creatorPage.click('button:has-text("Create lobby")');
  await creatorPage.waitForURL(/\/lobby\/.+\/manage/, { timeout: 15000 });
  const code = lobbyCodeFromManageUrl(creatorPage.url());

  await openVoting(creatorPage);

  const voterPage = await (await browser.newContext()).newPage();
  await voterPage.goto(`/vote/${code}`);
  await voterPage.waitForSelector('input[type="radio"]', { timeout: 15000 });

  // Single-question lobbies should NOT show a "Question X of Y" stepper indicator.
  await expect(voterPage.locator("text=/Question \\d+ of \\d+/")).toHaveCount(0);

  await voterPage.getByText("Pepperoni", { exact: true }).click();
  const submitButton = voterPage.locator('button[type="submit"]');
  await expect(submitButton).toHaveText(/Vote/);
  await submitButton.click();
  await voterPage.waitForSelector("text=thanks for voting", { timeout: 15000 });

  await creatorPage.reload();
  await expect(creatorPage.getByText("Pepperoni")).toBeVisible();
  // No question-title sub-heading should appear for a single-question lobby.
  await expect(creatorPage.getByText("Best pizza topping?")).toHaveCount(0);
});
