---
name: ship-pr
description: Run the repo's checks, then branch, commit, push and open a PR; after the owner approves, squash-merge, delete the branch and sync local main. Use when the user asks to push/open a PR or to merge an approved one.
disable-model-invocation: true
---

# Ship a change

Two phases with a hard stop between them: **open** the PR, then **merge only after the user says so**. Approval for one PR doesn't carry to the next.

## Phase 1: open the PR

1. **Branch.** Never commit to `main`. If on `main`, create `feat/…`, `fix/…` or `chore/…`. Keep unrelated changes in separate PRs; if the working tree mixes concerns, ask before splitting.
2. **Check.** Run what CI runs: `npm run lint && npm run build && npm test && npm run smoke:engine` (add `npm run validate:puzzles` if puzzles changed). Fix failures; never skip a check to get green. Existing lint warnings are known; don't add new ones.
3. **Commit.** Conventional-style subject (`feat:`/`fix:`/`chore:`), body explains why. Stage specific files; never commit `.env`, secrets, `public/stockfish/`, or `dist/`. End the message with the attribution line the session specifies.
4. **Push and open.** `git push -u origin HEAD`, then `gh pr create` with: what changed and why, limits/known gaps, and a test plan with checkboxes. Mark the checks you ran as done. If UI changed and you did not look at it in a browser, leave a **unchecked** box saying so; don't claim it works.
5. **Wait for CI.** `gh pr checks <n>`. Report the result and the PR URL, then stop and ask whether to merge.

## Phase 2: merge (only after explicit approval)

1. Re-check state: `gh pr view <n> --json state,mergeable,statusCheckRollup`. Must be open, mergeable, CI green. If a stacked PR's base was merged, rebase onto `main` first and re-run CI.
2. `gh pr merge <n> --squash --delete-branch`.
3. **Sync local main:** `git checkout main && git fetch --prune && git reset --hard origin/main`.
4. **Confirm the engine survived:** `ls public/stockfish` must show `stockfish.js`, `stockfish.wasm`, `VERSION`. If missing, run `npm install` (its postinstall restores it).
5. Delete any leftover local branches or worktrees for the merged work, after looking at what they are.
6. Report: merged commit, branches removed, anything left over.

## Rules

- Don't merge a PR the user hasn't approved in this conversation, even if CI is green and it's your own.
- Don't force-push or rewrite shared history. Resolve conflicts by merging `main` into the branch.
- Don't mention private details (usernames, emails) in PR text.
