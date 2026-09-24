---
name: worklog
description: Time-tracking discipline that keeps every task tied to a Jira ticket and logs real hours. Use at the START of a work session ("what's next / where were we / clock in"), when SWITCHING between parallel tasks, at the END of a session ("wrap up / log my time / update the plan"), for a whole-work REPORT ("show me all my work / the table / status of everything / what's open"), and to RECONSTRUCT a past period for org visibility ("review last month's work / summarise what I did / create Jira tasks for what I've done since <date>"). Also fires from the SessionStart nudge. Discovers the user's Jira identity at runtime — no hardcoded names or paths. Not for reading a single Jira ticket (use the Atlassian MCP directly).
---

# Worklog — task ↔ Jira ↔ time

Keeps parallel work from going untracked: every task has a **Jira ticket** and a line in the
**local ledger**, and real time lands on Jira. Five moves — **start · switch · wrap · timemachine ·
retro** — pick from what the user asked; when ambiguous, ask.

Each task carries a **size** `S`/`M`/`L` (by effort, not ticket type), set when it enters the ledger.

## Config & identity (discover once, never hardcode)

Read `~/.claude/worklog/config.md`. If it is missing, **run first-run setup** — see
[references/setup.md](references/setup.md) — which discovers identity and writes the config. The config
holds, per user: `jira_site` (e.g. `acme.atlassian.net`), `jira_cloud_id`, `jira_account_id`,
`git_author_email` (to match commits), `repo_roots` (where work repos live), `default_projects`,
`ticket_style`, and optional `memory_dir`/`checkpoint_dir`. These are **discovered** via
`atlassianUserInfo` (accountId, name, tz) + `getAccessibleAtlassianResources` (cloudId + site) +
`git config user.email` — never invented.

- **Ledger:** `~/.claude/worklog/active.md` — single source of truth; keep the `- [STATE] …` line
  format (the SessionStart hook greps it). Archives → `~/.claude/worklog/archive-YYYY-MM.md`.
- **Jira links:** always render a key as a Markdown link `[PROJ-42](https://<jira_site>/browse/PROJ-42)`
  so it is one click in the terminal. Every table below shows keys this way.

## Jira tools (deferred — load before use)

Load per move with e.g. `ToolSearch("select:mcp__claude_ai_Atlassian__searchJiraIssuesUsingJql,mcp__claude_ai_Atlassian__addWorklogToJiraIssue")`.
Prefer `mcp__claude_ai_Atlassian__*`; the `…_Atlassian_Rovo__*` twins are a fallback.

| Need | Tool |
|---|---|
| Find tickets | `searchJiraIssuesUsingJql` (`created >= <date>`, not `updated`; ask `responseContentFormat: "markdown"` + minimal `fields`) |
| Read a ticket / its worklogs | `getJiraIssue` |
| Create ticket / sub-task | `createJiraIssue` (+ `getJiraProjectIssueTypesMetadata`) |
| **Log time** | `addWorklogToJiraIssue` (`timeSpent` like `"2h 30m"`, `started` = today in the user's tz) |
| Progress note | `addCommentToJiraIssue` |
| Move status | `transitionJiraIssue` (+ `getTransitionsForJiraIssue`) |

## Locked behaviour (do not change without asking)

1. **Draft + confirm every Jira write.** Search first; draft the ticket/worklog/comment/transition;
   show it and **wait for an explicit "go"**. Never create, log, comment, or transition unattended.
2. **Time = estimate then confirm.** Propose hours from what actually happened (not session
   wall-clock); the user adjusts; then log. If they state hours outright, log exactly that.
3. **Ticket level per size.** Story + Sub-tasks only when a task has **3+ distinct work-streams**;
   else one flat Task/Story. Follow the team pattern in `config.ticket_style`.
4. **Never merge, never close a ticket** for the user. Transitions are fine but still confirm.
5. **Never double-log.** Before logging on a ticket that may already have time, read its worklogs and
   add only the **delta**. Never blind-log a full number.
6. **Never print credentials** in the ledger, config, or Jira text.

## The five moves

**START** — "what's next / clock in". Read the ledger + the plan (`config.memory_dir` MEMORY.md /
`project_*.md`, if the project keeps one) and read them back. For each in-flight task confirm its
ticket (`getJiraIssue`); for a task with no ticket, search, then draft-confirm-create per the size
rule. Mark the chosen task(s) `[ACTIVE]`, stamp start with `date`, note repo/branch.

**SWITCH** — "park this / switching to …". Close the left task: append a `+Nh` session line to its
ledger block, set `[PAUSED]`. Bring up the new one: `[ACTIVE]`, fresh `date`, recall its last note. No
Jira write (time logs at wrap).

**WRAP** — "wrap up / log my time / update the plan". Tally unlogged hours per task and **propose** a
worklog per ticket; on "go", `addWorklogToJiraIssue` (delta-only, rule 5) + optional comment. Update
the plan/memory if the project keeps one. Move finished tasks to `## Done — <date>` / the monthly
archive; clear `[ACTIVE]`. Close with **✅ Everything tracked** and the linked table (see below).

**TIMEMACHINE** — "show me all my work / the table". Read-only. Gather the ledger + archives + Jira
(`assignee = currentUser()`), reconcile live status (`statusCategory` → planned/in-progress/done;
overlay `[BLOCKED]`; no ticket ⇒ **NO TICKET**), and render the linked table. Offer an **Artifact**
board if they want it visual (load `artifact-design` first). Surfaces gaps; performs no writes.

**RETRO** — "review last month's work / create Jira tasks for what I did". Substantial — **read
[references/retro.md](references/retro.md) first.** Mine git (all `repo_roots`, match
`git_author_email`) + memory + session data (`ccusage`) into sized workstreams, cross-check Jira
(`created >=`), checkpoint, offer a deepen pass, then draft tickets + agreed times. READ-ONLY until go.

## The report table (wrap & timemachine & retro share this shape)

Group by ticket parent / month; **link every key**; show status + logged (+ size/est where relevant):

| Ticket | Work | Status | Logged |
|---|---|---|---|
| [PROJ-42](https://acme.atlassian.net/browse/PROJ-42) | Code-sync data model | in-progress | 13.5h |
| 🆕 [PROJ-101](https://acme.atlassian.net/browse/PROJ-101) | Sharded CI reporting | done | 5h |

Mark newly-created tickets `🆕`. End with per-group subtotals + a grand total, and note how much was
logged **this session** vs already on Jira. Finish with a one-line **✅ Everything tracked — N tickets,
Xh logged**.

**Also offer the Jira worklog-report deep link** (the Tempo/Worklogs app, scoped to this user + range)
so they can verify in Jira in one click — only if `config.worklog_report_app` is set:
`python3 scripts/worklog-report-link.py --start <YYYY-MM-DD> --end <YYYY-MM-DD> [--period week]`.
It reads site / app-path / accountId / tz from config. If the field is unset, ask the user to paste one
worklogs-report URL once and store its `<appId>/<pageId>` as `worklog_report_app`.

## Notes

- A task spanning repos is still **one** ledger task; note both repos, log time on the owning ticket.
- If the skill ever fires inside a spawned sub-agent session (not a top-level chat), do nothing.
