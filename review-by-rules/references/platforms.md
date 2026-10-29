# Platform mechanics — GitHub & Bitbucket

All reads are pre-approved. **Posting a review and merging are gated** (draft-and-hold; merge only on explicit
word + order).

## GitHub (via `gh`)

```bash
# PR metadata, reviews, comments, stacked-ness — fetch `author` too (the self-approval caveat needs it)
gh pr view N --repo ORG/REPO \
  --json title,author,state,isDraft,headRefName,baseRefName,additions,deletions,changedFiles,reviews,comments,url

# is it stacked? (base is another open PR, not main)
gh pr list --repo ORG/REPO --state open --json number,headRefName,baseRefName

# fetch + the PR's OWN delta (stacked → diff vs its base branch, not main)
git fetch origin main <base> <head>
git diff origin/<base>...origin/<head>                 # own delta
git merge-tree --write-tree origin/<base> origin/<head> >/dev/null 2>&1 \
  && echo CLEAN || echo CONFLICTS                      # prove mergeability

# gates — attribute introduced vs inherited
npx tsc --noEmit ; npx eslint <changed files>          # also run on origin/<base> if a failure looks pre-existing
gh pr checks N --repo ORG/REPO
```

**Post the review — ONLY after the user says go** (write the body to a file first, show it). Map the verdict to
the right flag — `--comment` is a NEUTRAL review that does NOT block the merge button, so a BLOCK must use
`--request-changes`:

```bash
gh pr review N --repo ORG/REPO --request-changes --body-file <draft.md>   # BLOCK — a real red that gates merge
gh pr review N --repo ORG/REPO --comment         --body-file <draft.md>   # APPROVE-WITH-NITS — non-blocking notes
gh pr review N --repo ORG/REPO --approve         --body-file <draft.md>   # clean APPROVE
```

**Merge — ONLY on an explicit word + order** (stacked: base PR first; GitHub then auto-retargets the child):

```bash
# discover the repo's merge convention rather than guessing:
gh repo view ORG/REPO --json mergeCommitAllowed,squashMergeAllowed,rebaseMergeAllowed
gh pr merge N --repo ORG/REPO --squash    # use the method the repo actually allows
```

Note: if the user is the PR **author**, GitHub blocks self-approval — tell them, offer another reviewer.

## Bitbucket (own-auth recipe)

Any automation/bot token (e.g. a CI or work-order token) is NOT for human review. Review under the user's
**own** browser session + the internal API:

- Authenticated browser session (the user is logged into Bitbucket), then the internal `/!api/2.0` endpoints
  for diff / comments / approve / merge, passing the `csrftoken` header from the session.
- Reads (diff, comments): fine to gather. **Approve / merge: gated** exactly like GitHub.
- Any bot PR-attribution path is separate and not used for human review.

(Keep the concrete session/API steps in your own notes/memory — this skill points at them rather than
duplicating session details, which can drift.)

## After posting — log the review time

Per the user's rule, PR-review is **human decision/oversight time (~15m, agent did the analysis)**, logged to an
**existing** task (never a new ticket). Offer it; don't do it unattended. The `worklog` skill handles the draft +
double-log check + confirm. Home = the repo's standing review/CI task (e.g. `<TICKET>`); if the standing task is
unknown for this repo, ask rather than create one.
