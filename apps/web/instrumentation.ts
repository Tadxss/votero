import * as Sentry from "@sentry/nextjs";

// Next.js calls this once when the server process starts, separately for the Node and Edge
// runtimes (`process.env.NEXT_RUNTIME` tells you which). Both branches share the same DSN — no
// DSN set means each Sentry.init() is a safe no-op. See docs/ARCHITECTURE.md for setup.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0.1,
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0.1,
    });
  }
}

// Next's App Router hook for errors thrown during server rendering (Server Components, route
// handlers, etc.) that would otherwise only show up in server logs.
export const onRequestError = Sentry.captureRequestError;
