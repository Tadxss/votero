import { nextJsConfig } from "@repo/eslint-config/next-js";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nextJsConfig,
  // Node-executed CommonJS tool config, not application source.
  { ignores: ["postcss.config.cjs", "tailwind.config.cjs"] },
];
