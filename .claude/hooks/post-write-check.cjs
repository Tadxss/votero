#!/usr/bin/env node
// PostToolUse hook, Write only: a new file is rare enough (unlike Edit, which fires on every
// small change) that a full check-types + lint on the affected workspace here is basically free,
// and it catches a typo in a brand-new file before it sits unnoticed for several more edits.
"use strict";

const { execSync } = require("child_process");
const path = require("path");

let input = "";
process.stdin.on("data", (chunk) => {
  input += chunk;
});
process.stdin.on("end", () => {
  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    process.exit(0);
  }
  run(payload);
});

function run(payload) {
  if (payload.tool_name !== "Write") process.exit(0);

  const filePath = payload.tool_input && payload.tool_input.file_path;
  if (!filePath) process.exit(0);

  const normalized = String(filePath).replace(/\\/g, "/");
  if (!/\.(ts|tsx)$/.test(normalized)) process.exit(0);

  // Match with or without a leading slash so this works for both absolute paths (what real tool
  // calls report) and a bare repo-relative path (e.g. in manual testing).
  let filterArg = null;
  if (/(^|\/)apps\/web\//.test(normalized)) filterArg = "web";
  else if (/(^|\/)apps\/mobile\//.test(normalized)) filterArg = "mobile";
  else if (/(^|\/)packages\/shared\//.test(normalized)) filterArg = "@repo/shared";
  else if (/(^|\/)packages\/types\//.test(normalized)) filterArg = "@repo/types";
  if (!filterArg) process.exit(0);

  const repoRoot = payload.cwd || path.resolve(__dirname, "..", "..");

  try {
    execSync(`pnpm check-types --filter=${filterArg}`, {
      cwd: repoRoot,
      stdio: "pipe",
      encoding: "utf-8",
    });
    execSync(`pnpm lint --filter=${filterArg}`, {
      cwd: repoRoot,
      stdio: "pipe",
      encoding: "utf-8",
    });
    process.exit(0);
  } catch (err) {
    const output = (err.stdout || "") + (err.stderr || "");

    // Known local-machine false positive (see .claude/skills/verify/reference.md): this dev
    // machine's Node is older than what `expo lint` requires, which fails mobile lint here even
    // though CI (newer Node) passes it clean. Surface it without hard-blocking the turn.
    if (filterArg === "mobile" && /parseEnv is not a function|is outdated and unsupported/.test(output)) {
      process.stderr.write(
        `post-write-check: mobile lint hit the known local-Node-version false positive (see .claude/skills/verify/reference.md) -- not blocking on it.\n\n${output}\n`,
      );
      process.exit(1);
    }

    process.stderr.write(
      `post-write-check: check-types/lint failed for "${filterArg}" after writing ${filePath}\n\n${output}\n`,
    );
    process.exit(2);
  }
}
