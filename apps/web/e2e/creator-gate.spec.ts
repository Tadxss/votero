import { test, expect } from "@playwright/test";
import { lobbyCodeFromManageUrl } from "./helpers";

test("manage page hides creator-only controls from a non-creator visitor", async ({ browser }) => {
  const creatorPage = await (await browser.newContext()).newPage();

  await creatorPage.goto("/create");
  await creatorPage.fill('input[placeholder="Team survey"]', "Creator Gate Test");
  await creatorPage.fill('input[placeholder="Best pizza topping?"]', "Best pizza topping?");
  const optionInputs = creatorPage.locator('input[placeholder^="Option "]');
  await optionInputs.nth(0).fill("Pepperoni");
  await optionInputs.nth(1).fill("Margherita");
  await creatorPage.click('button:has-text("Create lobby")');
  await creatorPage.waitForURL(/\/lobby\/.+\/manage/, { timeout: 15000 });
  const code = lobbyCodeFromManageUrl(creatorPage.url());

  // Creator's own view: Open voting button, no visitor notice.
  await expect(creatorPage.locator('button:has-text("Open voting")')).toBeVisible();
  await expect(creatorPage.getByText("only its creator can")).toHaveCount(0);

  // A stranger loading the same manage link: notice shown, no Open/Delete buttons, read-only
  // QR/share section still visible.
  const strangerPage = await (await browser.newContext()).newPage();
  await strangerPage.goto(`/lobby/${code}/manage`);
  await expect(strangerPage.locator('button:has-text("Open voting")')).toHaveCount(0);
  await expect(strangerPage.locator('button:has-text("Delete lobby")')).toHaveCount(0);
  await expect(strangerPage.getByText("only its creator can")).toBeVisible();
  await expect(strangerPage.getByText("Copy link")).toBeVisible();
});
