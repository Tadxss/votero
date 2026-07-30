import leoProfanity from "leo-profanity";

// Client-side pre-check only, for instant form feedback — the authoritative check is
// `contains_profanity` in Postgres (supabase/migrations), which can't be bypassed by calling an
// RPC directly. Keep in sync if the wordlist ever changes: see that migration's comment.
export function containsProfanity(text: string): boolean {
  return leoProfanity.check(text);
}
