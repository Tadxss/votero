import * as Sentry from "@sentry/nextjs";

// Runs in the browser. No DSN set (NEXT_PUBLIC_SENTRY_DSN unset) means Sentry.init() is a no-op —
// safe for local dev before a Sentry project exists. See docs/ARCHITECTURE.md for setup.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Fraction of transactions sent for performance monitoring — kept low since this is for error
  // visibility first, not detailed perf tracing.
  tracesSampleRate: 0.1,
});

// Required (as of SDK 10) for Sentry to instrument client-side route transitions.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
