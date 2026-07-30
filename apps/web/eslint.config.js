import { nextJsConfig } from "@repo/eslint-config/next-js";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nextJsConfig,
  // Node-executed tool config/scripts, not application source — need Node globals (`process`) the
  // shared browser/React-focused config doesn't provide.
  { ignores: ["postcss.config.cjs", "tailwind.config.cjs", "next.config.js", "e2e/load/**"] },
];
