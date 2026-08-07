---
description: Review pending changes with a fresh-eyes subagent, then commit, push, and open a PR — one step instead of doing each manually
---

The user wants the full commit → push → PR flow for the current branch's pending work. Do this in
order, and don't skip the review step even if the session already ran `verify` — the point of the
subagent is a read that doesn't carry this session's own bias, not a repeat of the mechanical checks.

1. **See what's actually changing.**
   ```sh
   git status --short
   git diff HEAD
   git log --oneline main..HEAD   # commits this branch has that main doesn't, if any exist already
   ```
   If there's nothing staged or committed beyond `main`, say so and stop — nothing to review or ship.

2. **Confirm `verify` has run for this work.** If you (this session) haven't already run the
   `verify` skill against the current changes, run it now — the code-reviewer subagent assumes
   type-check/lint/build/e2e are clean and reviews for things those checks can't catch, not as a
   substitute for them.

3. **Spawn the `code-reviewer` subagent** (foreground — you need its findings before continuing) with
   a self-contained prompt: what changed and why (from the diff and this session's context), which
   files, and ask it to review against its own checklist. Do not pre-filter what you show it or hint
   at what you expect it to find — that defeats the purpose of a fresh read.

4. **Handle findings.** If the subagent reports anything, show the user the findings before doing
   anything else. Fix what's clearly right to fix; for anything ambiguous or that changes scope, ask
   the user rather than deciding unilaterally. Re-run `verify` if you changed code after the review.
   If the subagent reports nothing, say so plainly and move on — don't manufacture a "still worth
   double-checking" detour.

5. **Commit** (only what's relevant — review `git status` for stray/unintended files first), matching
   this repo's commit message conventions (see recent `git log` for voice/format — short imperative
   summary, no filler). Follow the Git Safety Protocol from your system instructions: new commits, not
   `--amend`, no `--no-verify`, confirm before anything destructive.

6. **Push and open the PR** via `gh pr create`, following your system instructions' PR template
   (short title, `## Summary` + `## Test plan` body via heredoc). Base it on the actual commit range
   for this branch, not just the latest commit.

7. **If a Slack MCP server is configured and CLAUDE.md lists a channel for it**, post the PR link
   there. Otherwise skip this step silently — most sessions won't have this configured.

8. Report the PR URL back to the user.
