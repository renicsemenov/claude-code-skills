---
name: review-by-rules
description: Review a pull request / MR / diff against layered rules — global (security, DRY, KISS, reuse, no-hardcode) + the project's own .claude/rules + whatever the repo links to (a central rule-registry's common-rule floor, if your org has one, plus rule:// pointers). Scales to the task: a single lightweight reviewer for a quick look, or reviewer + a FRESH independent judger for a real gate. Proves every red is PR-introduced vs pre-existing, and drafts a verdict it never posts or merges without an explicit go. Use when asked to review / check / judge a PR, MR or diff on GitHub or Bitbucket against the project's or global rules, or "review PR #N", "check this against our rules".
---

# review-by-rules

Review a change the way we actually do it: against the **layered** rule set that governs *this* repo, with an
**independent judge** that must prove its reds, and a **draft-and-hold** posture that never posts or merges on
its own.

## Scale to the task (reviewer-only vs full gate)

The skill right-sizes itself — don't fan out a judge for a one-line change:

- **Quick look** (a small PR, a WIP sanity check, "just eyeball this") → run the **reviewer pass only**: resolve
  the rules, review the delta, cite findings. No judger, no formal verdict ceremony.
- **Real gate** (merge decision, a colleague's PR, anything load-bearing or contested) → the **full** flow:
  reviewer **then a fresh independent judger**, prove-pre-existing on every red, reconciled verdict, draft-hold.

When unsure which, default to the full gate for anything that will be merged or posted; use reviewer-only for
exploratory reads. The non-negotiables below hold in **both** modes.

## The non-negotiables (these never change — they come from the user's rules)

1. **Draft and hold.** Produce the verdict + the exact review text, **show it, and WAIT.** Post only on an
   explicit "post/push", under the user's own handle. **Never merge** — merge only on an explicit word **and**
   order. (A colleague's PR where the user is the author can't be self-approved on GitHub — say so, offer another reviewer.)
2. **The judge is a FRESH independent agent — never a context-inheriting fork.** A fork inherits this chat and
   *mimics* instead of judging (observed: a fork returned 0 tool-uses and parroted the parent). Spawn the judger
   as `general-purpose` with an explicit prompt, no shared context.
3. **Prove every red is PR-introduced, not pre-existing.** Before blaming the PR for a failing test / tsc / lint
   error, check it against a clean base (`git merge-tree`, or run the same gate on `origin/<base>`). A red that
   already exists on main is not this PR's fault — say so.
4. **Judge against the repo's OWN rules**, layered (below) — not a generic or remembered bar.
5. **Content over labels.** Judge a suspected duplicate / a "prettier-only" change / a "just a rename" by the
   actual diff, not the description.

## Flow

1. **Identify the PR(s) and platform.** GitHub → `gh`; Bitbucket → the own-auth recipe. Get base branch, head,
   draft state, existing reviews, and whether a PR is **stacked** (its base is another open PR, not `main`).
2. **Resolve the layered rules** for the repo → [references/rules-resolution.md](references/rules-resolution.md).
   Global + project `.claude/rules/` + linked (a central rule registry's repo→rules lookup, if your org has
   one, plus `rule://` pointers). Produce one rule set.
3. **Pick the mode** — ASK the user (unless they already said which):
   - **Parallel fan-out** — for several independent PRs: per PR, a reviewer agent **then** its fresh judger,
     all PRs concurrently. Fast.
   - **Sequential (planned)** — make an **ordered plan** first (stacked/dependency order — e.g. #209 before the
     #210 that's based on it; else priority), then review→judge **one PR at a time**, reporting between each.
     Default to this when PRs are stacked or the user wants to stay in the loop.
4. **Review (per PR, its OWN delta).** For a stacked PR, diff against its base PR, not the combined blob
   (`git diff origin/<base>...origin/<head>`). The reviewer reads the full changed files, checks each layered
   rule, runs `tsc`/lint, and scans the red-flag list → [references/judge-prompts.md](references/judge-prompts.md).
5. **Judge (per PR).** A fresh independent agent re-checks the reviewer's findings against the rules AND the
   code, kills any finding it can't substantiate, proves reds pre-existing-vs-introduced, and returns its own
   verdict. Reviewer + judge → one reconciled verdict.
6. **Verdict + draft.** `APPROVE` / `APPROVE-WITH-NITS` / `BLOCK`, every claim cited `file:line`, nits split
   blocking vs minor. Draft the review comment text. **Show it. Hold.** → [references/platforms.md](references/platforms.md)
   for how to post once the user says go, and how to log the review time afterward.

## Mode & platform quick-ref

| | GitHub | Bitbucket |
|---|---|---|
| PR data | `gh pr view N --json …` | own-auth `/!api/2.0` (see platforms.md) |
| Diff | `gh pr diff` / `git diff base...head` | browser session + API |
| Post (on go) | `gh pr review N --request-changes`(BLOCK) `/--comment`(nits) `/--approve` `--body-file` | `/!api/2.0` comment/approve |
| Merge | **only on explicit word + order** | **never unattended** |

## Verify before you commit to a verdict

- Cite `file:line` for everything. A claim you didn't open is a bug you haven't found.
- A finding the judge can't reproduce is dropped, not shipped.
- If tsc/lint fails, attribute it: introduced-by-this-PR or inherited — with the command you ran.
- Stacked PR: merge order matters — the base PR merges first; say so in the report.

See also: `review-commit` (local uncommitted/commit diff, same rule-reading spirit, no PR platform).
