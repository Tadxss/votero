import type { Page } from "@playwright/test";

const MAILPIT_URL = "http://127.0.0.1:54324";

interface MailpitMessage {
  To: { Address: string }[];
  Snippet: string;
}

interface MailpitListResponse {
  messages: MailpitMessage[];
}

// Local Supabase routes outgoing auth emails to Mailpit instead of a real inbox — this reads the
// 6-digit sign-in code back out the same way a human would read their email.
export async function getLatestOtp(email: string): Promise<string> {
  const res = await fetch(`${MAILPIT_URL}/api/v1/messages?limit=10`);
  const data = (await res.json()) as MailpitListResponse;
  const msg = data.messages.find((m) => m.To?.[0]?.Address === email);
  if (!msg) throw new Error(`No mail found for ${email}`);
  const match = msg.Snippet.match(/\b(\d{6})\b/);
  const otp = match?.[1];
  if (!otp) throw new Error(`No 6-digit code found in: ${msg.Snippet}`);
  return otp;
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
}

// Full sign-in flow through the real UI (not a shortcut/API bypass) — exercises the same OTP
// send/verify path a real user hits.
export async function signIn(page: Page, email: string): Promise<void> {
  await page.goto("/login");
  await page.fill('input[type="email"]', email);
  await page.click('button:has-text("Send code")');
  await page.waitForSelector("text=6-digit code", { timeout: 15000 });
  await page.waitForTimeout(1000); // give Mailpit a moment to receive the message
  const otp = await getLatestOtp(email);
  await page.fill('input[placeholder="123456"]', otp);
  await page.click('button:has-text("Verify")');
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
}

export function lobbyCodeFromManageUrl(url: string): string {
  const match = url.match(/\/lobby\/([^/]+)\/manage/);
  const code = match?.[1];
  if (!code) throw new Error(`Not a manage-page URL: ${url}`);
  return code;
}

export async function openVoting(page: Page): Promise<void> {
  await page.click('button:has-text("Open voting")');
  // The button flip isn't driven by the mutation's own success handler — useSetLobbyStatus only
  // invalidates lobby-results. It's useLobbyRealtime's postgres_changes subscription that picks up
  // the UPDATE and invalidates the lobby query, a WebSocket-connect-then-wait-for-CDC path that can
  // take longer than a plain request/response on a supabase start that only just booted in CI.
  await page.waitForSelector('button:has-text("Close voting")', { timeout: 25000 });
}
