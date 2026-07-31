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

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

// Returns the color actually persisted (which may differ from the input if the RPC's
// contrast-safeguard darkened it) so callers can assert against ground truth rather than a
// hardcoded guess.
async function saveBranding(
  creatorPage: import("@playwright/test").Page,
  color: string,
  logoPath?: string,
): Promise<string> {
  await creatorPage.waitForSelector("text=Branding", { timeout: 15000 });
  if (logoPath) {
    await creatorPage.locator('input[type="file"]').setInputFiles(logoPath);
  }
  await creatorPage.locator('input[type="color"]').fill(color);
  await creatorPage.click('button:has-text("Save branding")');
  await expect(creatorPage.locator('button:has-text("Saving…")')).toHaveCount(0, {
    timeout: 15000,
  });
  await creatorPage.reload();
  await creatorPage.waitForSelector("text=Branding", { timeout: 15000 });
  return creatorPage.locator('input[type="color"]').inputValue();
}

test("branded lobby: logo + accent color show on vote page and Present Mode", async ({
  browser,
}) => {
  const { creatorPage, code } = await createLobby(browser, "Branded Lobby Test");
  // Comfortably above the 4.5:1 WCAG threshold against white already, so the persisted color is
  // exactly what was submitted — the auto-darkening safeguard is covered by its own test below.
  const persistedColor = await saveBranding(creatorPage, "#1a4f8a", TEST_LOGO);
  await openVoting(creatorPage);

  const voterPage = await (await browser.newContext()).newPage();
  await voterPage.goto(`/vote/${code}`);
  await voterPage.waitForSelector('input[type="radio"]', { timeout: 15000 });
  await expect(voterPage.locator('img[src*="lobby-logos"]')).toBeVisible();
  await voterPage.getByText("Pepperoni", { exact: true }).click();
  const submitButton = voterPage.locator('button[type="submit"]');
  await expect(submitButton).toHaveCSS("background-color", hexToRgb(persistedColor));

  const presentPage = await (await browser.newContext()).newPage();
  await presentPage.goto(`/lobby/${code}/present`);
  await expect(presentPage.locator('img[src*="lobby-logos"]')).toBeVisible();
});

test("unbranded lobby renders with the default accent color", async ({ browser }) => {
  const { creatorPage, code } = await createLobby(browser, "Unbranded Lobby Test");
  await openVoting(creatorPage);

  const voterPage = await (await browser.newContext()).newPage();
  await voterPage.goto(`/vote/${code}`);
  await voterPage.waitForSelector('input[type="radio"]', { timeout: 15000 });
  await expect(voterPage.locator('img[src*="lobby-logos"]')).toHaveCount(0);
  await voterPage.getByText("Pepperoni", { exact: true }).click();
  const submitButton = voterPage.locator('button[type="submit"]');
  // brand-700 (#D41F44), the same fixed shade Button.tsx fell back to before this feature existed.
  await expect(submitButton).toHaveCSS("background-color", "rgb(212, 31, 68)");
});

test("a low-contrast brand color is auto-darkened server-side to stay WCAG-legible", async ({
  browser,
}) => {
  const { creatorPage } = await createLobby(browser, "Low Contrast Branding Test");
  const persistedColor = await saveBranding(creatorPage, "#ffff00");
  expect(persistedColor.toLowerCase()).not.toBe("#ffff00");

  // Confirm the persisted color actually clears 4.5:1 against white text (WCAG AA).
  const r = parseInt(persistedColor.slice(1, 3), 16);
  const g = parseInt(persistedColor.slice(3, 5), 16);
  const b = parseInt(persistedColor.slice(5, 7), 16);
  const linear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const luminance = 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
  const contrast = 1.05 / (luminance + 0.05);
  expect(contrast).toBeGreaterThanOrEqual(4.5);
});
