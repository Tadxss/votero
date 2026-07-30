import { test, expect } from "@playwright/test";
import { lobbyCodeFromManageUrl, openVoting, signIn, uniqueEmail } from "./helpers";

// Ballots chosen so round 1 has no majority (forcing a real elimination, not just a first-round
// win) and the eliminated candidate's second choice changes the outcome — the same scenario
// hand-verified against rpc_compute_irv directly via psql during development:
//   v1: A,B,C   v2: A,C,B   v3: B,A,C   v4: B,C,A   v5: C,A,B
// Round 1: A=2, B=2, C=1 (no majority of 5) -> C eliminated.
// Round 2: C's ballot (C,A,B) redistributes to A -> A=3, B=2 -> A wins with a majority.
const BALLOTS = [
  ["Apple", "Banana", "Cherry"],
  ["Apple", "Cherry", "Banana"],
  ["Banana", "Apple", "Cherry"],
  ["Banana", "Cherry", "Apple"],
  ["Cherry", "Apple", "Banana"],
];

async function castRankedBallot(page: import("@playwright/test").Page, order: string[]) {
  await page.waitForSelector("text=Tap options in order of preference", { timeout: 15000 });
  for (const label of order) {
    await page.getByText(label, { exact: true }).click();
  }
  await page.click('button:has-text("Vote")');
  await page.waitForSelector("text=thanks for voting", { timeout: 15000 });
}

test("ranked-choice voting: instant-runoff produces the correct winner after an elimination round", async ({
  browser,
}) => {
  const creatorPage = await (await browser.newContext()).newPage();

  await creatorPage.goto("/create");
  await creatorPage.fill('input[placeholder="Team survey"]', "Ranked Choice E2E Test");
  await creatorPage.fill('input[placeholder="Best pizza topping?"]', "Favorite fruit?");
  await creatorPage.getByText("Ranked", { exact: true }).click();
  const optionInputs = creatorPage.locator('input[placeholder^="Option "]');
  await optionInputs.nth(0).fill("Apple");
  await optionInputs.nth(1).fill("Banana");
  await creatorPage.click("text=+ Add option");
  await optionInputs.nth(2).fill("Cherry");

  // Cap voting at exactly 5 so the lobby auto-closes once all 5 ballots are in, giving us a
  // "closed" state to check the winner-crowning behavior without a separate manual-close step.
  await creatorPage.fill('input[min="1"][max="10000"]', "5");

  await creatorPage.click('button:has-text("Create lobby")');
  await creatorPage.waitForURL(/\/lobby\/.+\/manage/, { timeout: 15000 });
  const code = lobbyCodeFromManageUrl(creatorPage.url());

  await openVoting(creatorPage);

  for (const ballot of BALLOTS) {
    const voterPage = await (await browser.newContext()).newPage();
    await voterPage.goto(`/vote/${code}`);
    await castRankedBallot(voterPage, ballot);
  }

  await creatorPage.reload();
  await creatorPage.waitForSelector("text=Closed", { timeout: 15000 });

  // Two elimination rounds should be visible (round 1 has no majority, round 2 decides it).
  await expect(creatorPage.getByText("Round 1")).toBeVisible();
  await expect(creatorPage.getByText("Round 2")).toBeVisible();

  // Apple wins the runoff 3-2 after Cherry (fewest first-choice votes) is eliminated and its
  // ballot's second choice (Apple) is redistributed.
  await expect(creatorPage.getByLabel("Winner")).toBeVisible();
  const round2 = creatorPage.locator("text=Round 2").locator("..");
  await expect(round2.getByText("Apple")).toBeVisible();
});

test("ranked ballot detail shows a voter's full ordered ranking, not just one pick", async ({
  browser,
}) => {
  const creatorPage = await (await browser.newContext()).newPage();

  await creatorPage.goto("/create");
  await creatorPage.fill('input[placeholder="Team survey"]', "Ranked Ballot Detail Test");
  await creatorPage.fill('input[placeholder="Best pizza topping?"]', "Favorite fruit?");
  await creatorPage.getByText("Ranked", { exact: true }).click();
  const optionInputs = creatorPage.locator('input[placeholder^="Option "]');
  await optionInputs.nth(0).fill("Apple");
  await optionInputs.nth(1).fill("Banana");
  await creatorPage.getByText("Open", { exact: true }).click();

  await creatorPage.click('button:has-text("Create lobby")');
  await creatorPage.waitForURL(/\/lobby\/.+\/manage/, { timeout: 15000 });
  const code = lobbyCodeFromManageUrl(creatorPage.url());

  await openVoting(creatorPage);

  const voterPage = await (await browser.newContext()).newPage();
  const voterEmail = uniqueEmail("ranked-voter");
  await signIn(voterPage, voterEmail);
  await voterPage.goto(`/vote/${code}`);
  await castRankedBallot(voterPage, ["Banana", "Apple"]);

  await creatorPage.reload();
  await creatorPage.waitForSelector("text=Who voted for what", { timeout: 15000 });
  const voterRow = creatorPage.locator("li", { hasText: voterEmail });
  await expect(voterRow).toHaveCount(1);
  await expect(voterRow).toContainText("1. Banana");
  await expect(voterRow).toContainText("2. Apple");
});
