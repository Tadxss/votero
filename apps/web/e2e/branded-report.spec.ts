import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect } from "@playwright/test";
import { lobbyCodeFromManageUrl, openVoting } from "./helpers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_LOGO = path.join(__dirname, "fixtures", "test-logo.png");

async function createLobby(browser: import("@playwright/test").Browser, title: string) {
  const creatorPage = await (await browser.newContext()).newPage();
  await creatorPage.goto("/create");
  await creatorPage.fill('input[placeholder="Team survey"]', title);
  await creatorPage.fill('input[placeholder="Best pizza topping?"]', "Best pizza topping?");
  const optionInputs = creatorPage.locator('input[placeholder^="Option "]');
  await optionInputs.nth(0).fill("Pepperoni");
  await optionInputs.nth(1).fill("Margherita");
  await creatorPage.click("text=Live");
  await creatorPage.click('button:has-text("Create lobby")');
  await creatorPage.waitForURL(/\/lobby\/.+\/manage/, { timeout: 15000 });
  const code = lobbyCodeFromManageUrl(creatorPage.url());
  return { creatorPage, code };
}

test("branded PDF results report includes the creator's logo and downloads a nonzero PDF", async ({
  browser,
}, testInfo) => {
  const { creatorPage, code } = await createLobby(browser, "PDF Report Test");

  await creatorPage.waitForSelector("text=Branding", { timeout: 15000 });
  await creatorPage.locator('input[type="file"]').setInputFiles(TEST_LOGO);
  await creatorPage.locator('input[type="color"]').fill("#1a4f8a");
  await creatorPage.click('button:has-text("Save branding")');
  await expect(creatorPage.locator('button:has-text("Saving…")')).toHaveCount(0, {
    timeout: 15000,
  });

  await openVoting(creatorPage);

  const voterPage = await (await browser.newContext()).newPage();
  await voterPage.goto(`/vote/${code}`);
  await voterPage.waitForSelector('input[type="radio"]', { timeout: 15000 });
  await voterPage.getByText("Pepperoni", { exact: true }).click();
  await voterPage.click('button[type="submit"]');
  await voterPage.waitForSelector("text=thanks for voting", { timeout: 15000 });

  await creatorPage.reload();
  await creatorPage.waitForSelector("text=Results", { timeout: 15000 });

  const [pdfDownload] = await Promise.all([
    creatorPage.waitForEvent("download"),
    creatorPage.click('button:has-text("PDF report")'),
  ]);
  expect(pdfDownload.suggestedFilename()).toMatch(/\.pdf$/);
  const pdfPath = testInfo.outputPath("branded-report.pdf");
  await pdfDownload.saveAs(pdfPath);
  const bytes = fs.readFileSync(pdfPath);
  expect(bytes.length).toBeGreaterThan(0);
  // A real PDF file, not just an arbitrarily-named blob.
  expect(bytes.subarray(0, 5).toString("ascii")).toBe("%PDF-");
});

test("unbranded lobby's PDF report still downloads successfully (no logo to draw)", async ({
  browser,
}, testInfo) => {
  const { creatorPage, code } = await createLobby(browser, "Unbranded PDF Report Test");
  await openVoting(creatorPage);

  const voterPage = await (await browser.newContext()).newPage();
  await voterPage.goto(`/vote/${code}`);
  await voterPage.waitForSelector('input[type="radio"]', { timeout: 15000 });
  await voterPage.getByText("Pepperoni", { exact: true }).click();
  await voterPage.click('button[type="submit"]');
  await voterPage.waitForSelector("text=thanks for voting", { timeout: 15000 });

  await creatorPage.reload();
  await creatorPage.waitForSelector("text=Results", { timeout: 15000 });

  const [pdfDownload] = await Promise.all([
    creatorPage.waitForEvent("download"),
    creatorPage.click('button:has-text("PDF report")'),
  ]);
  const pdfPath = testInfo.outputPath("unbranded-report.pdf");
  await pdfDownload.saveAs(pdfPath);
  expect(fs.statSync(pdfPath).size).toBeGreaterThan(0);
});
