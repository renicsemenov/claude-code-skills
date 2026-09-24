---
name: worklog
description: One skill for keeping work tracked end-to-end — plan the day, clock in, log real hours to Jira, and see the whole picture. Use to START / PLAN a session ("what's next / where were we / plan my day / clock in"), SWITCH between parallel tasks, WRAP a session ("wrap up / log my time / update the plan"), get an OVERVIEW ("show me all my work / the table / status / what am I missing"), or RECONSTRUCT a past period ("review last month's work / create Jira tasks for what I've done"). Also fires from the SessionStart nudge. Discovers the user's Jira identity at runtime — no hardcoded names or paths. Not for reading a single Jira ticket (use the Atlassian MCP directly).
---

# Worklog — plan · track · log · review

One skill that keeps parallel work from going untracked: every task has a **Jira ticket** and a line in
the **ledger**, real time lands on Jira, and you always know what's next. A few tools — **START (plan +
clock in) · switch · wrap · overview · retro** — pick from what the user asked; when ambiguous, ask. Each
task carries a **size** `S`/`M`/`L` (by effort, not ticket type), set when it enters the ledger.

## Config & identity (discover once, never hardcode)

Read `~/.claude/worklog/config.md`. If missing, **run first-run setup** — see
[references/setup.md](references/setup.md) — which discovers identity and writes it. Holds, per user:
`jira_site`, `jira_cloud_id`, `jira_account_id`, `git_author_email`, `repo_roots`, `default_projects`,
`ticket_style`, optional `memory_dir` / `checkpoint_dir` / `worklog_report_app`. Discovered via
`atlassianUserInfo` + `getAccessibleAtlassianResources` + `git config user.email` — never invented.

- **Ledger:** `~/.claude/worklog/active.md` — source of truth; keep the `- [STATE] …` line format (the
  SessionStart hook greps it). Monthly archives → `~/.claude/worklog/archive-YYYY-MM.md`.
- **Jira links:** always render a key as `[PROJ-42](https://<jira_site>/browse/PROJ-42)` — one click.

## Jira tools (deferred — load before use)

Load per move, e.g. `ToolSearch("select:mcp__claude_ai_Atlassian__searchJiraIssuesUsingJql,mcp__claude_ai_Atlassian__addWorklogToJiraIssue")`.
Prefer `mcp__claude_ai_Atlassian__*`; the `…_Atlassian_Rovo__*` twins are a fallback.

| Need | Tool |
|---|---|
| Find tickets | `searchJiraIssuesUsingJql` (ask `responseContentFormat: "markdown"` + minimal `fields`) |
| Read a ticket / its worklogs | `getJiraIssue` |
| Create ticket / sub-task | `createJiraIssue` (+ `getJiraProjectIssueTypesMetadata`) |
| **Log time** | `addWorklogToJiraIssue` (`timeSpent` like `"2h 30m"`, `started` = the real day in the user's tz; pass `worklogId` to **update/split** an existing one) |
| Progress note | `addCommentToJiraIssue` |
| Move status | `transitionJiraIssue` (+ `getTransitionsForJiraIssue`) |

## Locked behaviour (do not change without asking)

1. **Draft + confirm every Jira write.** Search first; draft it; **wait for an explicit "go"**. Never
   create, log, comment, or transition unattended.
2. **Time = estimate then confirm.** Propose hours from what actually happened; the user adjusts; log that.
3. **Ticket level per size.** Story + Sub-tasks only at **3+ distinct work-streams**; else one flat ticket.
   Follow `config.ticket_style`.
4. **Never merge, never close a ticket** for the user. Transitions are fine but still confirm.
5. **Never double-log.** Read existing worklogs first; add only the **delta**. And **≤ ~8h per calendar
   day** — never stack multiple days onto one `started` date (retro spreads across real days).
6. **Never print credentials** in the ledger, config, or Jira text.

## The session plan (living, self-cleaning, checkpointed)

`~/.claude/worklog/plan-<YYYY-MM-DD>.md` — today's plan: the 1–3 focus tasks, in-flight, blockers, parked,
and a `✔ done this session` tail. Model-maintained (not a hook). Full format + mechanics:
[references/plan.md](references/plan.md).

- **Self-cleans on START/overview — verify, then clean.** Ticketed items: don't keep a second "done" list
  — **check Jira/worklog** (status Done / PR merged / time logged) and drop when confirmed. Non-ticket
  items ride checkboxes. **Never blind-drop** — keep anything unverified and say so (e.g. "Jira says Done
  but the PR is open" ⇒ keep it).
- **Checkpoints.** Snapshot progress into the plan file at key moments — a task done, a switch, before a
  risky step — so a crash / compaction / switch never loses where you were; resume reads the last one.
- WRAP archives it to `~/.claude/worklog/plan-archive/` and clears the active one. Local + gitignored.

## The moves

**START — plan + clock in** ("what's next / where were we / plan my day / clock in").
1. **Self-clean** the session plan (verify-then-drop, above).
2. **Recall as a linked table** — read `config.memory_dir` (`project_next_steps` + relevant `project_*.md`)
   + the ledger, render in-flight work as a board (every key linked):

   | Task | Jira | State | Next / blocker |
   |---|---|---|---|

   States: 🟡 active · ⏸ paused · 🔴 blocked · ⚪ planned · ✅ done. One tight line each for **next** and
   **parked**; flag uncommitted/branch work that's not in the ledger.
3. **Pick focus** — *propose* today's 1–3 focus tasks; don't hard-block — let the user just proceed or
   redirect in their own words. Write/refresh the session plan.
4. **Clock in** — for the chosen task(s): confirm the Jira ticket (`getJiraIssue`); no ticket → search,
   then draft-confirm-create per the size rule. Mark `[ACTIVE]`, stamp start with `date`, note repo/branch.

**SWITCH** ("park this / switching to …"). Park the left task (append a `+Nh` session line, set
`[PAUSED]`); bring up the new one (`[ACTIVE]`, fresh `date`, recall its last note). **Checkpoint** the
plan. No Jira write (time logs at wrap).

**WRAP** ("wrap up / log my time"). Tally unlogged hours per task and **propose** a worklog per ticket; on
"go", `addWorklogToJiraIssue` (delta-only, rule 5). **≤8h/day**, real dates. Update `project_next_steps`;
move finished tasks to the monthly archive; **archive the session plan** and clear it. Close with **✅
Everything tracked** + the linked table + the report link.

**OVERVIEW** ("show me all my work / the table / what am I missing"). Read-only. **Choose the period
first** (current month · current + previous · custom — smaller = faster and more reliable). Query by what
you **LOGGED**: `worklogAuthor = currentUser() AND worklogDate >= "<from>" AND worklogDate <= "<to>"` — a
bulk status-sweep never pollutes it (`assignee … AND updated >=` drags it in and caps out). Reconcile live
status, render the linked table (note `aggregatetimespent` is lifetime — the report link gives exact
in-window). **Gaps:** `assignee = currentUser() AND statusCategory != Done AND updated >= <from>` for
worked-but-unlogged, plus no-ticket work → **propose/create** the missing tickets (draft-confirm). A
**`missing`** variant shows gaps only. Offer an **Artifact** board if they want it visual.

**RETRO** ("review last month / create Jira tasks for what I did"). Substantial — **read
[references/retro.md](references/retro.md) first.** Mine git (all `repo_roots`, match `git_author_email`)
+ memory + `ccusage` into sized workstreams, cross-check Jira (`created >=`), checkpoint, offer a deepen
pass, then draft tickets + **day-spread** logged times. READ-ONLY until go.

## The report table (wrap · overview · retro share this shape)

Group by ticket parent / month; **link every key**; show status + logged:

| Ticket | Work | Status | Logged |
|---|---|---|---|
| [PROJ-42](https://acme.atlassian.net/browse/PROJ-42) | Code-sync data model | 🟡 in-progress | 13.5h |
| 🆕 [PROJ-101](https://acme.atlassian.net/browse/PROJ-101) | Sharded CI reporting | ✅ done | 5h |

Mark newly-created tickets `🆕`. End with subtotals + a grand total, and note how much was logged **this
session** vs already on Jira. Finish with **✅ Everything tracked — N tickets, Xh logged**.

**Offer the Jira worklog-report deep link** (scoped to the user + range) for one-click verification — if
`config.worklog_report_app` is set:
`python3 scripts/worklog-report-link.py --start <YYYY-MM-DD> --end <YYYY-MM-DD> [--period week]`. Unset ⇒
ask the user to paste one worklogs-report URL once and store its `<appId>/<pageId>`.

## Notes

- A task spanning repos is still **one** ledger task; note both repos, log time on the owning ticket.
- If the skill ever fires inside a spawned sub-agent session (not a top-level chat), do nothing.
