import { test, expect } from "@playwright/test";
import { lobbyCodeFromManageUrl, openVoting, signIn, uniqueEmail } from "./helpers";

test("multi-select choice question: choose up to N, cap enforced, tally counts each pick", async ({
  browser,
}) => {
  const creatorPage = await (await browser.newContext()).newPage();

  await creatorPage.goto("/create");
  await creatorPage.fill('input[placeholder="Team survey"]', "Multi-Select E2E Test");
  await creatorPage.fill('input[placeholder="Best pizza topping?"]', "Pick your toppings");
  const optionInputs = creatorPage.locator('input[placeholder^="Option "]');
  await optionInputs.nth(0).fill("Pepperoni");
  await optionInputs.nth(1).fill("Veggie");
  await creatorPage.click("text=+ Add option");
  await optionInputs.nth(2).fill("Mushroom");

  // Open ballot mode so the manage page's "Who voted for what" list (the grouping fix) is
  // exercised too, not just the tally.
  await creatorPage.getByText("Open", { exact: true }).click();

  const maxSelectionsInput = creatorPage.locator('input[type="number"][max="3"]');
  await maxSelectionsInput.fill("2");

  await creatorPage.click('button:has-text("Create lobby")');
  await creatorPage.waitForURL(/\/lobby\/.+\/manage/, { timeout: 15000 });
  const code = lobbyCodeFromManageUrl(creatorPage.url());

  await openVoting(creatorPage);

  const voterPage = await (await browser.newContext()).newPage();
  const voterEmail = uniqueEmail("multiselect-voter");
  await signIn(voterPage, voterEmail);
  await voterPage.goto(`/vote/${code}`);
  await voterPage.waitForSelector("text=Choose up to 2", { timeout: 15000 });

  await voterPage.getByText("Pepperoni", { exact: true }).click();
  await voterPage.getByText("Veggie", { exact: true }).click();

  // Third option should now be disabled — at the cap of 2.
  const mushroomCheckbox = voterPage.locator('input[type="checkbox"][value]').nth(2);
  await expect(mushroomCheckbox).toBeDisabled();

  await voterPage.click('button:has-text("Vote")');
  await voterPage.waitForSelector("text=thanks for voting", { timeout: 15000 });

  await creatorPage.reload();
  await creatorPage.waitForSelector("text=Results", { timeout: 15000 });

  // Both selected options should be counted in the tally.
  await expect(creatorPage.getByText("Pepperoni", { exact: true })).toBeVisible();
  await expect(creatorPage.getByText("Veggie", { exact: true })).toBeVisible();

  // The "Who voted for what" list should show ONE row for this voter listing both selections —
  // not two separate rows for the same person (the ballot-detail grouping fix).
  await creatorPage.waitForSelector("text=Who voted for what", { timeout: 15000 });
  const voterRow = creatorPage.locator("li", { hasText: voterEmail });
  await expect(voterRow).toHaveCount(1);
  await expect(voterRow).toContainText("Pepperoni");
  await expect(voterRow).toContainText("Veggie");
});

test("classic single-select choice question is unaffected by multi-select support", async ({
  browser,
}) => {
  const creatorPage = await (await browser.newContext()).newPage();

  await creatorPage.goto("/create");
  await creatorPage.fill('input[placeholder="Team survey"]', "Single-Select Regression Test");
  await creatorPage.fill('input[placeholder="Best pizza topping?"]', "Best pizza topping?");
  const optionInputs = creatorPage.locator('input[placeholder^="Option "]');
  await optionInputs.nth(0).fill("Pepperoni");
  await optionInputs.nth(1).fill("Margherita");

  // Exactly 2 options — the "Max selections" input is deliberately not shown for this common
  // case, confirming the new UI doesn't intrude on the default single-select flow.
  await expect(creatorPage.locator("text=Max selections")).toHaveCount(0);

  await creatorPage.click('button:has-text("Create lobby")');
  await creatorPage.waitForURL(/\/lobby\/.+\/manage/, { timeout: 15000 });
  const code = lobbyCodeFromManageUrl(creatorPage.url());

  await openVoting(creatorPage);

  const voterPage = await (await browser.newContext()).newPage();
  await voterPage.goto(`/vote/${code}`);
  await voterPage.waitForSelector('input[type="radio"]', { timeout: 15000 });
  await voterPage.getByText("Pepperoni", { exact: true }).click();
  await voterPage.click('button:has-text("Vote")');
  await voterPage.waitForSelector("text=thanks for voting", { timeout: 15000 });

  await creatorPage.reload();
  await expect(creatorPage.getByText("Pepperoni")).toBeVisible();
});
