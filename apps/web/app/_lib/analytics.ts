import { track } from "@vercel/analytics";

// A union, not raw strings at each call site, so a typo in an event name is a compile error
// instead of a silently-lost event.
type AnalyticsEvent =
  | "lobby_created"
  | "voting_opened"
  | "lobby_joined"
  | "vote_cast"
  | "results_exported"
  | "lobby_deleted"
  | "sign_in_completed";

export function trackEvent(
  name: AnalyticsEvent,
  props?: Record<string, string | number | boolean>,
) {
  track(name, props);
}
