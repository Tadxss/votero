import { test, expect } from "@playwright/test";
import { uniqueEmail } from "./helpers";

test("OTP input caps at 6 digits and strips non-digits", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[type="email"]', uniqueEmail("otp-cap"));
  await page.click('button:has-text("Send code")');
  await page.waitForSelector("text=6-digit code", { timeout: 15000 });

  const codeInput = page.locator('input[placeholder="123456"]');
  await codeInput.pressSequentially("12ab34cd56ef78");
  await expect(codeInput).toHaveValue("123456");
});

test("wrong OTP submission shows a friendly error, not a raw/empty one", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[type="email"]', uniqueEmail("otp-wrong"));
  await page.click('button:has-text("Send code")');
  await page.waitForSelector("text=6-digit code", { timeout: 15000 });

  await page.locator('input[placeholder="123456"]').fill("000000");
  await page.click('button:has-text("Verify")');

  const error = page.locator("p.text-red-600").first();
  await expect(error).toBeVisible({ timeout: 10000 });
  const text = await error.textContent();
  expect(text).toBeTruthy();
  expect((text ?? "").length).toBeGreaterThan(10);
  expect(text).not.toContain("{");
});

test("create-lobby inputs cap at 200 chars; voter cap above 10,000 disables submit", async ({
  page,
}) => {
  await page.goto("/create");
  const longString = "x".repeat(250);

  const titleInput = page.locator('input[placeholder="Team survey"]');
  await titleInput.fill(longString);
  await expect(titleInput).toHaveValue("x".repeat(200));

  const qTitleInput = page.locator('input[placeholder="Best pizza topping?"]');
  await qTitleInput.fill(longString);
  await expect(qTitleInput).toHaveValue("x".repeat(200));

  const optionInput = page.locator('input[placeholder="Option 1"]');
  await optionInput.fill(longString);
  await expect(optionInput).toHaveValue("x".repeat(200));

  const capInput = page.locator('input[type="number"]');
  await capInput.fill("999999");
  await optionInput.fill("Pepperoni");
  await page.locator('input[placeholder="Option 2"]').fill("Margherita");
  await expect(page.locator('button:has-text("Create lobby")')).toBeDisabled();

  await capInput.fill("50");
  await expect(page.locator('button:has-text("Create lobby")')).toBeEnabled();
});
