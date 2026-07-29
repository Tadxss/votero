import { test, expect } from "@playwright/test";
import { lobbyCodeFromManageUrl, openVoting } from "./helpers";

test("free-text badge cloud: grouping, truncation, and PNG export", async ({ browser }, testInfo) => {
  const creatorPage = await (await browser.newContext()).newPage();

  await creatorPage.goto("/create");
  await creatorPage.fill('input[placeholder="Team survey"]', "Badge Cloud Test");
  await creatorPage.fill(
    'input[placeholder="Best pizza topping?"]',
    "Any final thoughts on tonight's event?",
  );
  await creatorPage.locator("text=Free text").click();
  await creatorPage.click("text=Live");
  await creatorPage.click('button:has-text("Create lobby")');
  await creatorPage.waitForURL(/\/lobby\/.+\/manage/, { timeout: 15000 });
  const code = lobbyCodeFromManageUrl(creatorPage.url());
  await openVoting(creatorPage);

  const responses = [
    "great",
    "great",
    "great",
    "amazing night honestly",
    "This was such a genuinely wonderful and thoughtfully organized event, thank you so much to everyone involved!",
    "loved it",
    "meh",
  ];

  for (const text of responses) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`/vote/${code}`);
    await page.waitForSelector("textarea", { timeout: 15000 });
    await page.fill("textarea", text);
    await page.click('button[type="submit"]');
    await page.waitForSelector("text=thanks for voting", { timeout: 15000 });
    await ctx.close();
  }

  const strangerPage = await (await browser.newContext()).newPage();
  await strangerPage.goto(`/lobby/${code}/present`);
  await expect(strangerPage.getByText("…", { exact: false }).first()).toBeVisible({
    timeout: 10000,
  });
  const bodyText = await strangerPage.textContent("body");
  expect(bodyText).not.toContain(
    "This was such a genuinely wonderful and thoughtfully organized event",
  );
  expect(bodyText).toContain("×3");

  await creatorPage.reload();
  await creatorPage.waitForSelector("text=Results", { timeout: 15000 });
  const [imgDownload] = await Promise.all([
    creatorPage.waitForEvent("download"),
    creatorPage.click('button:has-text("Image")'),
  ]);
  const imgPath = testInfo.outputPath("badge-cloud-export.png");
  await imgDownload.saveAs(imgPath);
});
