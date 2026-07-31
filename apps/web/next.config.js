import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // @repo/shared and @repo/types are raw TS source (no build step) — Next needs to
  // transpile them itself rather than treating them as pre-built node_modules.
  transpilePackages: ["@repo/shared", "@repo/types"],
  turbopack: {
    resolveAlias: {
      // jspdf is only ever dynamically import()ed inside browser event handlers (never actually
      // executed during SSR), but Turbopack still needs to statically resolve the module graph
      // for the "use client" pages that reference it — its default/"node" export condition pulls
      // in fflate's Node worker_threads path, which Turbopack can't bundle. Force the plain
      // browser ES build instead, which has no such Node-only code.
      jspdf: "jspdf/dist/jspdf.es.min.js",
    },
  },
};

// Wraps the config with Sentry's build-time behavior (wires up instrumentation, and uploads
// source maps when SENTRY_AUTH_TOKEN/SENTRY_ORG/SENTRY_PROJECT are set — all optional, unset
// locally and safe to leave unset in CI/build environments that don't need readable stack traces
// in Sentry). See docs/ARCHITECTURE.md for setup.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  widenClientFileUpload: true,
  webpack: {
    treeshake: { removeDebugLogging: true },
    automaticVercelMonitors: false, // no cron jobs in this app to monitor
  },
});
