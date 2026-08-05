---
description: Append a shipped feature/fix as the next numbered entry in docs/ARCHITECTURE.md's Build Order section
---

The user just finished shipping something and wants it logged in `docs/ARCHITECTURE.md`'s Build
Order section — the file's own header and root `CLAUDE.md` both say that section is the single
source of truth for what shipped, in what order, and why (`CLAUDE.md` explicitly: "update *that*
file when you ship something, not this one").

What was shipped: $ARGUMENTS

Do this:

1. Find the current last numbered entry in the Build Order section (`grep -n "^[0-9]\+\. \*\*" docs/ARCHITECTURE.md | tail -1`) to get the next number.
2. Look at `git diff`/`git log` (and the description above) to understand what actually changed — file paths touched, any schema/migration involved, any real bug hit along the way. Don't guess; read the diff.
3. Write one new entry matching the existing format exactly:
   - `N. **Short title**: ✅ *done*. <description>` — dense prose, not bullets, matching the voice of
     surrounding entries (state what changed, why, which files/migrations were involved, and call
     out any real bug found and fixed during the work — that's a recurring and valuable pattern in
     this log, see e.g. entries 2, 9, 23, 63).
   - If a migration was added, name its exact filename.
   - If verification was actually done (tests run, manual smoke test), say so concretely — this log
     never claims "done" without saying how it was checked, don't be the first entry that does.
4. Insert it immediately after the current last entry, before the "Explicitly deferred" section.
5. Show the user the diff and let them adjust wording before treating this as final — this is
   documentation of record, not a throwaway summary.

Do not touch the root `CLAUDE.md` status paragraph unless the user separately asks — it's
deliberately a summary that only needs a one-line mention if it goes stale, per its own instructions.
