# Report — what I actually shipped (the REPORT move)

**Goal:** answer *"show me my output / am I at zero?"* honestly. Reconstruct the user's **work output** over
a window and present it as two halves: what the tracking systems **credit** them with (TRACKED) and the real
work that those systems **read as ~zero** (UNTRACKED) — each untracked row carrying *why* it is invisible.
The point is that "not logged" never reads as "not done".

**READ-ONLY. Always.** REPORT never drafts a ticket, never logs time, never writes to Jira, never edits the
ledger. That is RETRO's and WRAP's job, not this one. REPORT's *only* action-offer is to **route an untracked
row into `/worklog retro`** if the user wants it ticketed — and even that is just a handoff, not a write.

This is RETRO's read-only twin: it mines the same signals, but where RETRO ends by *creating* tickets and
logging agreed time, REPORT ends by *showing the gap* and stopping. Read identity/paths from
`~/.claude/worklog/config.md` (`jira_account_id`, `git_author_email`, `repo_roots`, `jira_site`,
`worklog_report_app`, `timezone`) + the ledger (`~/.claude/worklog/active.md` + `archive-*.md`).

---

## Step 0 — Source & period & identity (resolve in LEVELS)

**Resolve TWO things in LEVELS — ask only for what the invocation didn't already give, one question at a
time, and never pop results before both source + period are resolved.** The report reaches **git / `gh` /
qa-service / the ledger**, so a blind run could gather far more than the caller wanted.

**1. Which worklog — Full, a specific source, or gaps.** If the invocation names it, use it; else ask with
the question tool (which **always lets him type his own via _Other_**). **Full is the natural default** (it's
his proof-of-work tool) — but still **ASK on a bare `/worklog report`**:

- **Full** — **every source at once** (Jira worklog + git + `gh` + qa-service + ledger): the complete
  tracked-vs-reads-as-zero picture. The default when he picks nothing.
- **A specific source** — scope to one: **Jira** · **qa-service** · **GitHub** · **Bitbucket** · **Ledger**
  (the personal "not logged" lines) · **or any source he types**. If he names a source not wired here,
  **attempt the nearest available search** (git over a matching checkout · `gh` · an MCP `search`) and say
  honestly if it can't be reached — **never refuse**.
- **Gaps only** — just the untracked / reads-as-zero half.

**2. Which period.** Only treat a period as given if the invocation already carries one; else **choose it
first** (default = current calendar month; accept `current + previous`, or a custom `from-to`). Resolve to
`from`/`to` dates in the config `timezone` and echo the range in one line. A smaller window is faster and
more reliable.

So `/worklog report qa-service October` answered **both** → run straight away. `/worklog report October` →
ask only the source (Full default). Bare `/worklog report` → ask the source, **then** the period.

**Scope — Full, or one source.** If the caller chose **Full** (or bare `report`), show every section below.
If they chose a **specific source**, show **only that source's rows**: **Jira** → the worklog table + the
deep link; **qa-service** → the TRACKED qa-service stats (`qa_team_stats` / `project_stats` / test runs) +
the attribution gap; **GitHub** → git commits + `gh` PR reviews over the GitHub checkouts; **Bitbucket** →
git commits over the bb checkout(s) (bb PR-review mining isn't wired — say so if asked); **Ledger** → the
`active.md` / `archive-*.md` "not logged" lines. If the caller typed a **source not listed**, attempt the
nearest available search (git / `gh` / MCP `search`); if it can't be reached, say so plainly rather than
inventing rows.

**Fold the caller's aliases.** The user may commit and act under more than one spelling. Resolve them at
runtime from `map_identity` / `list_people` — the person whose `email` matches `config.git_author_email` —
and union every alias (plus any `otherIdentities` / `known:false` spelling of them landing in `others`) when
matching a board, a commit author, or a `createdBy`. **Never hardcode a name or a person id.**

## The honesty guards (non-negotiable - encode these in every number)

These are the difference between an honest report and a misleading one. Violating any of them turns "not
recorded" into a false "you did nothing".

- **`null` != 0.** A `null` week in `qa_team_stats` means *that week has no data source* - "not recorded",
  **not** zero work. Say "not recorded", never render it as 0.
- **Authorship only from 2026-09-15.** `qa_team_stats` `requirements`/`testCases`/`automated` and the
  `project_stats` leaderboards record an author only from **2026-09-15** onward, and nothing earlier is
  backfilled. For any window reaching before that date, say **"not recorded before 15 Sep"** - never show 0
  for the earlier span.
- **Volume, not value.** `qa_team_stats` and `project_stats` count *output volume*, not worth. Present them
  as **evidence of activity, never as a people-ranking or a you-vs-team scoreboard.** Never rank the user
  against teammates with these numbers.
- **Every untracked row carries a reason.** An untracked row without a *why* reads as a confession of nothing
  done. Always attach one of: `review` / `agent-orchestrated` / `research-audit` / `product-eng-commit` /
  `no-ticket-by-choice`.

## Load the tools

`ToolSearch("select:mcp__claude_ai_QA_Service__qa_team_stats,mcp__claude_ai_QA_Service__project_stats,mcp__claude_ai_QA_Service__list_test_runs,mcp__claude_ai_QA_Service__list_people,mcp__claude_ai_QA_Service__map_identity,mcp__claude_ai_QA_Service__code_authorship_gaps,mcp__claude_ai_QA_Service__list_products")`
plus the Jira read tools:
`ToolSearch("select:mcp__claude_ai_Atlassian__searchJiraIssuesUsingJql")`.

---

## TRACKED - what the systems credit (run in parallel)

Everything here has the user's name *inside a system*. It is the half that already "counts".

1. **`qa_team_stats {productId, weeks}` - the richest source.** Per-QA-engineer **weekly** series within one
   product: `requirements`, `testCases`, `automated` (each a `{hand, imported}` cell - never add the two),
   plus `attributedTests` (git-authored test FILES backing an automated case). Find the user's row by their
   folded aliases; read `otherIdentities` / any `known:false` cell for a *teammate's spelling of the user*
   still landing in `others` and fold it. **Data only exists from 2026-09-15** - honour the two guards above.
   Run it per product the user works (from `list_products`); there is no cross-product total, so report
   per-product.
2. **`project_stats {productId}` boards** - the four leaderboards (cases authored / requirements authored /
   tests automated / versions approved), each split hand vs `imported` with an `unattributed` column.
   Pull the user's hand/imported figures; carry the `unattributed` majority as a caveat (it is mostly
   pre-15-Sep and never backfilled), not as the user's zero.
3. **`list_test_runs {productId}` -> filter `createdBy` = the user's email, origin `mcp`.** This is the **only
   execution surface that carries his name** - the runs he kicked off. The tool has no per-user filter, so
   filter the returned rows client-side on `createdBy` in {his aliases/email}. Count runs + their verdict
   progress.
4. **Jira worklog** - `searchJiraIssuesUsingJql` with
   `worklogAuthor = currentUser() AND worklogDate >= "<from>" AND worklogDate <= "<to>"` (ask
   `responseContentFormat: "markdown"` + minimal `fields`). These are the hours already logged. Also emit the
   **worklog-report deep link** for one-click verification (see below).

## UNTRACKED - the real work that reads as ~zero (run in parallel)

Everything here is real output that the boards above **cannot see**. Each row gets a **reason**.

1. **Ledger "not logged" lines** - grep `active.md` + `archive-*.md` for session lines already annotated
   like `~Nh, not logged (review)`. The user flagged these himself. -> reason: `review` (or whatever the
   annotation says).
2. **Git commits** over `repo_roots` on `git_author_email` - `git -C <repo> log --since=<from> --until=<to>
   --author=<author> --oneline --shortstat` per repo. This surfaces the body of engineering invisible to the
   QA boards - e.g. the **qa-service PRODUCT commits** (the service's own code, not test cases). -> reason:
   `product-eng-commit`. **Worktree-safe + dedup:** some checkouts are git *worktrees* of ONE repo (`.git` is
   a **file** there — never test for a `.git` directory; run `git -C <repo> log` directly). Worktrees sharing
   a repo return the **same** commits, so **dedup by commit hash across checkouts** and count unique hashes,
   not the per-checkout sum. Match the author robustly (`git_author_email` may be unset in config → fall back
   to `git config user.name/.email`). Scratch to `$TMPDIR`, never a hardcoded tmp path.
3. **The automation attribution gap** - `code_authorship_gaps {productId}` returns `total` automated files
   vs `missing` (no git-authorship row). When `qa_team_stats` credits the user with N `automated` but the
   git-file board (`attributedTests`) shows far fewer, the delta is files whose authorship **hasn't been
   ingested** (`ingest_code_authors` not run) - the work exists, the credit doesn't. Report it as a *gap in
   attribution*, not missing work. -> reason: `research-audit` / `product-eng-commit` as fits; label it
   clearly as an attribution gap, with both numbers.
4. **Research / audit output** - line counts of docs the user authored under `docs/research/...` and
   `config.checkpoint_dir` (`docs/qa-service/local/`) in the window (`git log --diff-filter=A` + `wc -l`, or
   `git log --since --author -- <paths>`). Coherence audits, coverage reports, design docs. -> reason:
   `research-audit`.
5. **Agent-orchestrated builds** - **HONESTY GAP, read carefully.** `list_jobs` has **no per-user author
   field** (its only filters are product and kind), so an agent job **cannot be attributed to the user via
   the API.** Do **NOT** infer the user's agent work from `list_jobs`. Instead surface agent-orchestrated
   builds from the **ledger / Jira** (where the user recorded them), and mark every such row **`~estimated`**.
   -> reason: `agent-orchestrated`.

> The `list_jobs` attribution gap is a known limitation - state it in the output so a reader understands why
> agent work is estimated and not pulled from a system of record.

---

## Present - the output (match the user's style)

Lead with a **plain-words summary block FIRST** (3-5 sentences, simple words): am I at zero or not, where my
output actually is, and the one-line reason the systems under-count it. Then the sections, compact tables,
green/yellow/red:

### 1. Tracked & visible

| Source | Output | Period | Note |
|---|---|---|---|
| qa-team-stats (automated) | 🟢 N hand / M imported | this month | not recorded before 15 Sep |
| test runs (mcp) | 🟢 N runs | this month | only execution surface w/ his name |
| Jira worklog | 🟡 Xh logged | this month | - |

### 2. Real work that reads as ~zero

| Work | Evidence | Reads-as | **Reason** |
|---|---|---|---|
| qa-service product commits | 🟢 309 commits (git) | 0 on QA boards | `product-eng-commit` |
| automation attribution gap | 🔴 117 credited / 2 on git-board | ~85% files unattributed | `research-audit` |
| research / audit docs | 🟢 N docs, M lines | invisible to boards | `research-audit` |
| agent-orchestrated builds | 🟡 ~estimated (ledger/Jira) | can't attribute via API | `agent-orchestrated` |

(Every row in section 2 MUST carry a reason - an untracked row without one reads as "not done".)

### 3. Footprint band

A one-line activity band: **active days / commits (+/- lines) / PRs reviewed / test runs** over the window.
Derive active days from git commit dates (and `ccusage daily` if present); PRs reviewed from
`gh pr list --search "reviewed-by:@me"` across `repo_roots`.

### Bottom line

One honest sentence: *tracked shows X; the real footprint is Y; the gap is attribution, not absence.* Then
the **worklog report** deep link:
`python3 scripts/worklog-report-link.py --start <from> --end <to>` (reads site/user/app from config; if
`worklog_report_app` is unset, ask the user to paste one worklogs-report URL once).

**Compact by default — a tiny "expand" hint.** The tables are the compact view. End with **one small line**
noting the user can ask to see any single source in full (full Jira worklog table · full qa-service stats ·
every commit/review · the ledger lines) — e.g. *"expand qa-service" / "full Jira"*. Keep it a **tiny hint,
not a mode** — the **primary** offer stays the gap-fix (below); this just says detail is one ask away.

## After the report - the ONE action-offer (optional, read-only until the user acts)

REPORT writes nothing. The single thing it may offer: *"Row X in section 2 has no ticket - want to route it
into `/worklog retro` to get it ticketed and logged?"* - a **handoff to RETRO**, which owns the
draft-and-confirm Jira writes. REPORT itself never creates, logs, or edits. If the user says no, the report
just stands.
