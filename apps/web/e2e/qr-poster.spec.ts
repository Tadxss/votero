import fs from "node:fs";
import { test, expect } from "@playwright/test";
import { lobbyCodeFromManageUrl } from "./helpers";

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

test("QR poster page: all 3 presets download a nonzero PNG, print presets also download a PDF", async ({
  browser,
}, testInfo) => {
  const { creatorPage, code } = await createLobby(browser, "Poster Test Lobby");

  await creatorPage.click('button:has-text("QR poster")');
  await creatorPage.waitForURL(/\/lobby\/.+\/poster/, { timeout: 15000 });
  expect(lobbyCodeFromManageUrl(creatorPage.url().replace("/poster", "/manage"))).toBe(code);

  for (const [presetLabel, expectPdfButton] of [
    ["A4 Flyer", true],
    ["Table Tent", true],
    ["Slide", false],
  ] as const) {
    await creatorPage.click(`button:has-text("${presetLabel}")`);

    const [pngDownload] = await Promise.all([
      creatorPage.waitForEvent("download"),
      creatorPage.click('button:has-text("Download PNG")'),
    ]);
    expect(pngDownload.suggestedFilename()).toMatch(/\.png$/);
    const pngPath = testInfo.outputPath(`poster-${presetLabel}.png`);
    await pngDownload.saveAs(pngPath);
    expect(fs.statSync(pngPath).size).toBeGreaterThan(0);

    if (expectPdfButton) {
      const [pdfDownload] = await Promise.all([
        creatorPage.waitForEvent("download"),
        creatorPage.click('button:has-text("Download PDF")'),
      ]);
      expect(pdfDownload.suggestedFilename()).toMatch(/\.pdf$/);
      const pdfPath = testInfo.outputPath(`poster-${presetLabel}.pdf`);
      await pdfDownload.saveAs(pdfPath);
      expect(fs.statSync(pdfPath).size).toBeGreaterThan(0);
    } else {
      await expect(creatorPage.locator('button:has-text("Download PDF")')).toHaveCount(0);
    }
  }
});

test("a non-creator visitor cannot access the poster page", async ({ browser }) => {
  const { code } = await createLobby(browser, "Poster Gate Test Lobby");

  const strangerPage = await (await browser.newContext()).newPage();
  await strangerPage.goto(`/lobby/${code}/poster`);
  await expect(
    strangerPage.getByText("Only this lobby's creator can generate a poster for it."),
  ).toBeVisible();
});
