import { test, expect } from "@playwright/test";
import { lobbyCodeFromManageUrl, openVoting } from "./helpers";

async function createDraftLobby(browser: import("@playwright/test").Browser, title: string) {
  const creatorPage = await (await browser.newContext()).newPage();
  await creatorPage.goto("/create");
  await creatorPage.fill('input[placeholder="Team survey"]', title);
  await creatorPage.fill('input[placeholder="Best pizza topping?"]', "Coffee or Tea?");
  const optionInputs1 = creatorPage.locator('input[placeholder^="Option "]');
  await optionInputs1.nth(0).fill("Coffee");
  await optionInputs1.nth(1).fill("Tea");

  await creatorPage.click("text=+ Add question");
  await creatorPage.locator('input[placeholder="Best pizza topping?"]').nth(1).fill("Cats or Dogs?");
  const optionInputsAll = creatorPage.locator('input[placeholder^="Option "]');
  await optionInputsAll.nth(2).fill("Cats");
  await optionInputsAll.nth(3).fill("Dogs");

  await creatorPage.click('button:has-text("Create lobby")');
  await creatorPage.waitForURL(/\/lobby\/.+\/manage/, { timeout: 15000 });
  const code = lobbyCodeFromManageUrl(creatorPage.url());
  return { creatorPage, code };
}

// dnd-kit's keyboard sensor: focus the drag handle, Space to pick up, arrow keys to move,
// Space to drop — far more reliable in Playwright than simulating pixel-accurate pointer drags,
// and it's the same path a keyboard-only user relies on.
async function keyboardReorderDown(page: import("@playwright/test").Page, handle: import("@playwright/test").Locator) {
  // A real click (not a programmatic .focus()) confirms the button is hydrated/interactive and
  // actually takes DOM focus — under system load, a plain .focus() call can race React's own
  // hydration of the dnd-kit listeners on a just-navigated page. toBeFocused() waits it out.
  await handle.click();
  await expect(handle).toBeFocused();
  await page.keyboard.press("Space");
  await page.waitForTimeout(300);
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(300);
  await page.keyboard.press("Space");
  await page.waitForTimeout(300);
}

test("editing a draft lobby's questions: title/option edits and reordering persist", async ({
  browser,
}) => {
  const { creatorPage, code } = await createDraftLobby(browser, "Edit Lobby Test");

  await creatorPage.click('button:has-text("Edit questions")');
  await creatorPage.waitForURL(/\/lobby\/.+\/edit/, { timeout: 15000 });

  // Edit question 1's title and its first option's label.
  await creatorPage.locator('input[placeholder="Best pizza topping?"]').first().fill("Tea or Coffee?");
  await creatorPage.locator('input[placeholder^="Option "]').first().fill("Espresso");

  // Reorder the two questions: "Tea or Coffee?" (now Q1) moves to position 2. Confirmed (with
  // Playwright's built-in retrying `expect`, not a fixed sleep) before saving — dnd-kit's keyboard
  // reorder is an async chain of state updates that can occasionally lag the fixed delays in
  // keyboardReorderDown under system load, and saving before it lands would silently persist the
  // pre-reorder order instead of failing loudly.
  await keyboardReorderDown(
    creatorPage,
    creatorPage.getByRole("button", { name: "Reorder question 1" }),
  );
  await expect(creatorPage.locator('input[placeholder="Best pizza topping?"]').first()).toHaveValue(
    "Cats or Dogs?",
  );

  await creatorPage.click('button:has-text("Save questions")');
  await creatorPage.waitForURL(/\/lobby\/.+\/manage/, { timeout: 15000 });

  // "Cats or Dogs?" should now be first (question order swapped), "Tea or Coffee?" second.
  await expect(creatorPage.getByText("Cats or Dogs?").first()).toBeVisible();

  await openVoting(creatorPage);
  const voterPage = await (await browser.newContext()).newPage();
  await voterPage.goto(`/vote/${code}`);
  await voterPage.waitForSelector("text=Question 1 of 2", { timeout: 15000 });
  // First question voters see should now be "Cats or Dogs?" (order persisted end-to-end).
  await expect(voterPage.getByText("Cats or Dogs?")).toBeVisible();
  await voterPage.getByText("Cats", { exact: true }).click();
  await voterPage.click('button:has-text("Next")');
  await voterPage.waitForSelector("text=Question 2 of 2", { timeout: 15000 });
  await expect(voterPage.getByText("Tea or Coffee?")).toBeVisible();
  await expect(voterPage.getByText("Espresso", { exact: true })).toBeVisible();
});

test("a non-creator cannot access /edit; an already-open lobby blocks editing", async ({
  browser,
}) => {
  const { creatorPage, code } = await createDraftLobby(browser, "Edit Lobby Gate Test");

  const strangerPage = await (await browser.newContext()).newPage();
  await strangerPage.goto(`/lobby/${code}/edit`);
  await expect(
    strangerPage.getByText("Only this lobby's creator can edit its questions."),
  ).toBeVisible();

  await openVoting(creatorPage);
  await creatorPage.goto(`/lobby/${code}/edit`);
  await expect(
    creatorPage.getByText("Questions can only be edited before voting opens."),
  ).toBeVisible();
});

test("create page: drag-and-drop reordering of questions and options via keyboard", async ({
  page,
}) => {
  await page.goto("/create");
  await page.fill('input[placeholder="Team survey"]', "Create DnD Test");
  await page.fill('input[placeholder="Best pizza topping?"]', "First Question");
  const optionInputs = page.locator('input[placeholder^="Option "]');
  await optionInputs.nth(0).fill("Alpha");
  await optionInputs.nth(1).fill("Beta");

  await page.click("text=+ Add question");
  await page.locator('input[placeholder="Best pizza topping?"]').nth(1).fill("Second Question");
  await optionInputs.nth(2).fill("Gamma");
  await optionInputs.nth(3).fill("Delta");

  // Reorder options within question 1: Alpha/Beta -> Beta/Alpha.
  await keyboardReorderDown(
    page,
    page.getByRole("button", { name: "Reorder option 1 of question 1" }),
  );
  await expect(page.locator('input[placeholder^="Option "]').first()).toHaveValue("Beta");

  // Reorder questions: "First Question" moves to position 2.
  await keyboardReorderDown(page, page.getByRole("button", { name: "Reorder question 1" }));
  await expect(page.locator('input[placeholder="Best pizza topping?"]').first()).toHaveValue(
    "Second Question",
  );

  await page.click("text=Live");
  await page.click('button:has-text("Create lobby")');
  await page.waitForURL(/\/lobby\/.+\/manage/, { timeout: 15000 });

  await openVoting(page);
  const voterPage = await (await page.context().browser()!.newContext()).newPage();
  const code = lobbyCodeFromManageUrl(page.url());
  await voterPage.goto(`/vote/${code}`);
  await voterPage.waitForSelector("text=Question 1 of 2", { timeout: 15000 });
  await expect(voterPage.getByText("Second Question")).toBeVisible();
  await expect(voterPage.getByText("Gamma", { exact: true })).toBeVisible();
  await voterPage.getByText("Gamma", { exact: true }).click();
  await voterPage.click('button:has-text("Next")');
  await voterPage.waitForSelector("text=Question 2 of 2", { timeout: 15000 });
  await expect(voterPage.getByText("First Question")).toBeVisible();
  await expect(voterPage.getByText("Beta", { exact: true })).toBeVisible();
});
