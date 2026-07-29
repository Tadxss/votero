import fs from "node:fs";
import { test, expect } from "@playwright/test";
import { lobbyCodeFromManageUrl, openVoting } from "./helpers";

test("mixed choice + free-text survey: grouping, manage/present display, CSV + image export", async ({
  browser,
}, testInfo) => {
  const creatorPage = await (await browser.newContext()).newPage();

  await creatorPage.goto("/create");
  await creatorPage.fill('input[placeholder="Team survey"]', "Free Text E2E Test");
  await creatorPage.fill('input[placeholder="Best pizza topping?"]', "Pizza or Lasagna?");
  const optionInputs = creatorPage.locator('input[placeholder^="Option "]');
  await optionInputs.nth(0).fill("Pizza");
  await optionInputs.nth(1).fill("Lasagna");

  await creatorPage.click("text=+ Add question");
  const questionTitleInputs = creatorPage.locator('input[placeholder="Best pizza topping?"]');
  await questionTitleInputs.nth(1).fill("One word for tonight?");
  await creatorPage.locator("text=Free text").nth(1).click();

  await creatorPage.click("text=Live");
  await creatorPage.click('button:has-text("Create lobby")');
  await creatorPage.waitForURL(/\/lobby\/.+\/manage/, { timeout: 15000 });
  const code = lobbyCodeFromManageUrl(creatorPage.url());

  await openVoting(creatorPage);

  const voter1Page = await (await browser.newContext()).newPage();
  await voter1Page.goto(`/vote/${code}`);
  await voter1Page.waitForSelector("text=Question 1 of 2", { timeout: 15000 });
  await voter1Page.getByText("Pizza", { exact: true }).click();
  await voter1Page.click('button:has-text("Next")');
  await voter1Page.waitForSelector("text=Question 2 of 2", { timeout: 15000 });
  await voter1Page.fill("textarea", "pizza");
  await voter1Page.click('button:has-text("Submit")');
  await voter1Page.waitForSelector("text=thanks for voting", { timeout: 15000 });

  // Different case/whitespace than voter 1 — should group into the same "pizza ×2" badge.
  const voter2Page = await (await browser.newContext()).newPage();
  await voter2Page.goto(`/vote/${code}`);
  await voter2Page.waitForSelector("text=Question 1 of 2", { timeout: 15000 });
  await voter2Page.getByText("Lasagna", { exact: true }).click();
  await voter2Page.click('button:has-text("Next")');
  await voter2Page.waitForSelector("text=Question 2 of 2", { timeout: 15000 });
  await voter2Page.fill("textarea", "Pizza ");
  await voter2Page.click('button:has-text("Submit")');
  await voter2Page.waitForSelector("text=thanks for voting", { timeout: 15000 });

  await expect(voter1Page.getByText("Pizza or Lasagna?")).toBeVisible();
  await expect(voter1Page.getByText("One word for tonight?")).toBeVisible();
  await expect(voter1Page.getByText("pizza", { exact: false }).first()).toBeVisible();
  await expect(voter1Page.getByText("×2")).toBeVisible();

  await creatorPage.reload();
  await creatorPage.waitForSelector("text=Results", { timeout: 15000 });
  await expect(creatorPage.getByText("Pizza or Lasagna?")).toBeVisible();
  await expect(creatorPage.getByText("One word for tonight?")).toBeVisible();
  await expect(creatorPage.getByText("×2")).toBeVisible();

  const [csvDownload] = await Promise.all([
    creatorPage.waitForEvent("download"),
    creatorPage.click('button:has-text("CSV")'),
  ]);
  const csvPath = testInfo.outputPath("ft-results.csv");
  await csvDownload.saveAs(csvPath);
  const csv = fs.readFileSync(csvPath, "utf-8");
  expect(csv).toContain("Pizza or Lasagna?");
  expect(csv).toContain("One word for tonight?");
  expect(csv).toContain("pizza");

  const [imgDownload] = await Promise.all([
    creatorPage.waitForEvent("download"),
    creatorPage.click('button:has-text("Image")'),
  ]);
  const imgPath = testInfo.outputPath("ft-results.png");
  await imgDownload.saveAs(imgPath);
  expect(fs.statSync(imgPath).size).toBeGreaterThan(0);

  await creatorPage.goto(`/lobby/${code}/present`);
  await expect(creatorPage.getByText("Pizza or Lasagna?")).toBeVisible();
  await expect(creatorPage.getByText("One word for tonight?")).toBeVisible();
});
