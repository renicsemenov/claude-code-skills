---
name: worklog
description: One skill for keeping work tracked end-to-end — plan the day, clock in, log real hours to Jira, and see the whole picture. Reach for this whenever the user is planning, tracking, or logging their WORK-DAY, even without naming it. START / PLAN a session ("what's next / where were we / plan my day / go plan / let's plan / what should I work on / clock in"), SWITCH between parallel tasks ("switch to X / park this"), WRAP a session ("wrap up / log my time / update the plan"), get an OVERVIEW ("show me all my work / the table / status / what am I missing / what did I do"), REPORT the real work-output picture ("show my output / my results / what have I shipped / my busyness / proof of work / report for my 1:1 / am I at zero"), or RECONSTRUCT a past period ("review last month's work / log what I did / create Jira tasks for what I've done"). Also fires from the SessionStart nudge. Discovers the user's Jira identity at runtime — no hardcoded names or paths. Not for reading a single Jira ticket (use the Atlassian MCP directly).
---

# Worklog — plan · track · log · review

One skill that keeps parallel work from going untracked: every task has a **Jira ticket** and a line in
the **ledger**, real time lands on Jira, and you always know what's next. A few tools — **START (plan +
clock in) · switch · wrap · overview · report · retro** — pick from what the user asked; when ambiguous,
ask. Each task carries a **size** `S`/`M`/`L` (by effort, not ticket type), set when it enters the ledger.

## Config & identity (discover once, never hardcode)

**ONE config file** — `~/.claude/worklog.config.json` (JSON), read by this skill, the worker scripts, and
`scripts/worklog-report-link.py`. If missing, **run first-run setup** — see
[references/setup.md](references/setup.md) — which discovers identity and writes it. Holds, per user:
**identity** `jira_site` · `jira_cloud_id` · `jira_account_id` · `git_author_email` · `repo_roots` ·
`default_projects` · `ticket_style` · `worklog_report_app` · optional `memory_dir`/`checkpoint_dir`; and
**operational** `data_root` · `projects` · `timezone` · `jiraBase` · `report_sources` · `authorship_from`.
Identity is discovered via `atlassianUserInfo` + `getAccessibleAtlassianResources` + `git config user.email` —
never invented. (The file lives in `~/.claude` — not a repo — so it's uncommittable/private; real values are
fine here, never in the published skill code.)

### First-run setup — the data root (ask once, save, never again)

If `data_root` is unset in `~/.claude/worklog.config.json`, run setup **once**:
1. Ask where to keep work-data, offering three choices:
   - **Suggested default:** `~/Documents/worklog-data` (recommend this).
   - **Custom path** the user types.
   - **Link an existing folder** they already use.
2. Save the chosen **absolute** path to `data_root`. **Never ask again.**

Per project, at link time, **ask — it's a suggestion, the user decides** — *"local/private, or shared?"*:

- **Local / private** → folder under `data_root` → **gitignored, never pushed** (the `data_root/.gitignore`
  already ignores it). For your own work.
- **Shared** → folder in a **team repo path** (e.g. a shared research project → the repo's research folder) →
  **committed + shared with the team, NOT ignored.** e.g. a shared research project → the repo's
  `docs/research/…`.

Save the choice to the `projects` map (`{ <name>: { path, shared } }`) — `shared:true/false` *is* the
commit-vs-ignore switch. A project is section-folders: one folder per report tab (see `<data_root>/README.md`).

### Credentials — never ask; use the native connected MCPs

Worker skills **never prompt for credentials or tokens.** They use the **MCPs already connected in Claude** —
Atlassian for Jira/Confluence, etc. (OAuth'd in the client). Any token that is genuinely needed comes from
validated **env/config only**, never typed into a file, a prompt, or a tool argument. (This is the credential
floor — it holds for every worker skill.)

- **Ledger:** `~/.claude/worklog/active.md` — source of truth; keep the `- [STATE] …` line format (the
  SessionStart hook greps it). Monthly archives → `~/.claude/worklog/archive-YYYY-MM.md`.
  - **For a workstream that has a `coverage-research-report`:** that report's md `tracks[]` block is the
    **authoritative** status store for its tracks (judged, at each checkpoint). worklog shows a **provisional**
    one-line roll-up here, read **up** from that block by **Jira key** (status glyph + now/next + the artifact
    link only — never hours, never another workstream). The roll-up is reconciled — **overwritten from the report
    at each checkpoint**; intra-session edits here are provisional day-notes. worklog **reads** the report base,
    **never writes** it. The ~90% of tasks with no report stay plain ledger lines, authoritative here as usual.
    - **Deterministic read:** get the roll-up with the report skill's helper rather than eyeballing the md —
      `node ~/.claude/skills/coverage-research-report/read-tracks.js <report.md> [--jira KEY] [--json]`. It emits
      `jira · glyph · now_next · updated · artifact` only (shareable-safe; no hours/other-workstream/names).
- **Jira links:** always render a key as `[PROJ-42](https://<jira_site>/browse/PROJ-42)` — one click.

## worklog is the HEAD-skill — it drives worker scripts + skills (don't hand-roll)

worklog is the **manager/router**: it knows which worker does what, unites/searches across projects, and routes.
The mechanics are **scripts it calls** + the **`coverage-research-report`** skill — no MCP; everything runs in
your context. **worklog = manager · scripts/skills = tools · the data folders = data.**

**Worker scripts** (`~/projects/claude-code-skills/worklog/scripts/`) — callable directly too:
- `daily-focus.js [--json]` — unite every registered project's `plan/tracks.json` → today's focus grouped by
  status. This is the *"show me all plans / where does everything stand"* answer.
- `status.js [--today YYYY-MM-DD]` — a cheap read-only *"where am I right now"*: in-flight ledger lines +
  today's plan focus + the cross-project roll-up. No skill spin-up.
- `tidy.js [--today YYYY-MM-DD] [--dry]` — housekeeping: archive `plan-<date>.md` files older than today
  into `plan-archive/` (leaves active.md alone).
- `init-workstream.js --name "…" [--path DIR] [--shared]` — scaffold a full report project (section folders +
  READMEs + `report.config.json` + `plan/tracks.json`) and register it. **Local** (under `data_root`, gitignored)
  unless **`--shared`** (a team repo path, committed).
- `log-activity.js --title … --date … [--kind pr-review] [--jira …] [--project …]` — capture side/ad-hoc work
  (PR review, quick fix) as a dated short-story so it doesn't read as zero.
- `prepare-time-log.js --jira … --hours … --date …` — a cred-free Jira worklog **DRAFT**; the **write stays in
  this skill** via the connected Atlassian MCP after a read-existing-worklogs double-log check + confirm.

**Report mechanics** — the `coverage-research-report` skill (`~/.claude/skills/coverage-research-report/`):
- `read-tracks.js <report> [--jira K]` — a project's authoritative tracks roll-up (the worklog daily read).
- `build-report.js` with `REPORT_DIR=<project>` — render the tabbed artifact from section folders; **publish via
  the Artifact tool** (never auto-published; the shareable URL is owned there).

**Data homes:** the ledger in `~/.claude/worklog/active.md`; the single config (identity + operational) in
`~/.claude/worklog.config.json`; **project data in `data_root`** (your chosen folder, e.g.
`~/Documents/worklog-data/`, gitignored) or a **shared** repo path. The config `projects` map (`{name:{path, shared, artifact, shared_source?, note?}}`) is
how worklog finds each one.

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
   The script `scripts/prepare-time-log.js` normalises the draft (→ `Xh Ym` + `started` at 09:00 in-tz), but the
   **write stays here** via `addWorklogToJiraIssue` after the confirm + a read-existing-worklogs double-log check.
   The script never writes Jira.
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

## Routing — act when it's clear, ask when it's not

worklog is the entry point. Decide between **acting directly** and **asking**:

- **Clear intent → act, don't ask.** When the invocation or the live context names the move — args
  (`log 2h on X`, `show all plans`, `wrap up`), or the conversation makes it obvious (just finished a task →
  WRAP; "where do things stand" → daily-focus/overview; "what's next" → START) — run the right move/tool
  straight away. Don't interrogate for what's already clear.
- **Bare / ambiguous `worklog` → ASK with options.** No args, no obvious context: present a short menu (via
  AskUserQuestion, which always leaves an "Other") and let the user pick, then act:
  - **Continue a project** (continue) · **Plan / what's next** (START) · **Show all plans** (daily-focus) ·
    **Status** (status) · **Map / where's my data** (worklog-map) · **Tidy** (tidy) · **Log time**
    (prepare-time-log → confirm → Jira) · **New project / report** (init-workstream) · **Log side work**
    (log-activity) · **Overview / report** · **Wrap up**.
  - **"Continue a project" flow:** run `node scripts/continue.js` (no arg) → it lists the projects; let the
    user pick one → run `node scripts/continue.js <project>`. It renders a **sharp status**: the artifact link
    + the status-by-track table + the plan's Active→Next. Then **focus the session on that project** — say
    *"working on `<project>` this session — here's its artifact + status"* — and proceed on it.

### Proactively offer worklog for big new work — and REUSE, never duplicate

When the user starts a **big research / audit / multi-step workstream** (not a quick one-off), proactively
offer to track it: *"want me to set this up as a worklog project (trackable + a shareable report)?"* But FIRST
**check `config.projects` for an existing one** (match the feature/ticket/name):
- **A project already exists** → offer to **reuse/continue it** (open its folder, update its `tracks.json`),
  never scaffold a duplicate. (Same anti-duplication discipline as test-registration.)
- **None exists** → offer `init-workstream` (ask local-vs-shared). Don't force it on small/throwaway work.

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

**CONTINUE** ("continue the <X> project / pick up where I left off on <X> / let's work on <X>"). Focus the
session on one project. Run `node scripts/continue.js [<project>]` — with no arg it lists the projects to pick
from; with a name it renders a **sharp status**: the artifact link + the status-by-track table (from
`plan/tracks.json`) + the plan's Active→Next. Then **lock the session to that project** — say *"working on
`<project>` this session — artifact + status above"* — and proceed on it (update its `tracks.json` at your
checkpoint).

**MAP** ("show me the worklog system / where is my data / where's X linked"). Read-only. Run
`node scripts/worklog-map.js [--tree]` — prints the system layout (🧠 brain · 🛠️ engine · ⚙️ config · 📁 data)
and **where every registered project lives**: 📁 local (under `data_root`, gitignored) vs 🔗 shared (committed
in a team repo) — a project can be BOTH (local data + a repo copy) — plus its artifact ⭐owner + tabs. The
"where does everything live / what's linked where" answer.

**STATUS** ("quick status / where am I right now"). Read-only, **no skill spin-up** — run
`node scripts/status.js` directly. Prints the in-flight ledger lines (active.md), today's plan focus
(`plan-<today>.md` if present), and the cross-project roll-up grouped by status. The cheap "right now" glance.

**TIDY** ("tidy / archive old plans"). Housekeeping — run `node scripts/tidy.js` (preview with `--dry`
first). Moves every `plan-<date>.md` older than today into `plan-archive/`; does NOT touch active.md.

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

**REPORT** ("show my output / my results / what have I shipped / my busyness / proof of work / report for
my 1:1 / am I at zero"). RETRO's **read-only twin** — **read [references/report.md](references/report.md)
first.** Reconstructs **your work output** over a window and splits it into **TRACKED** (what the systems
credit — Jira worklog + whatever **product trackers you wire in `config.report_sources`**, e.g. a
test-management / team-stats MCP and its boards) vs **"reads-as-zero" UNTRACKED** (git product commits, the
automation attribution gap, research/audit docs, agent-orchestrated builds) — **every untracked row carrying
WHY it's invisible** (review · agent-orchestrated · research-audit · product-eng-commit · no-ticket-by-choice)
— plus a footprint band and the worklog deep link. **Strictly READ-ONLY** — it NEVER drafts/creates/logs to
Jira or touches the ledger (that's RETRO/WRAP); its only action-offer is routing an untracked row into
`/worklog retro`. Encode the honesty guards: a `null` week = "not recorded" not 0; count authorship only from
**`config.authorship_from`** (never show 0 before it); the counts are **output-volume, never a people-ranking**.

*Resolve TWO things in LEVELS — ask only for what the invocation didn't already give, one question at a
time, and never pop results before both source + period are resolved.* The report reaches **git · `gh` ·
your configured `report_sources` · the ledger**, so a blind run could gather far more than the caller wanted.

1. **Which worklog — Full, a specific source, or gaps.** If the invocation names it, use it; else ask with
   the question tool (which **always lets you type your own via _Other_**). **Full is the natural default**
   (it's your proof-of-work tool) — but still **ASK on a bare `/worklog report`**:
   - **Full** — **every source at once** (Jira worklog + git + `gh` + your `report_sources` + ledger): the
     complete tracked-vs-reads-as-zero picture. The default when you pick nothing.
   - **A specific source** — scope to one: **Jira** · **a wired `report_source`** · **GitHub** · **Bitbucket** ·
     **Ledger** (the personal "not logged" lines) · **or any source you type**. A specific pick shows **only
     that source's rows**; Full shows all. If you name a source not wired here, **attempt the nearest available
     search** (git over a matching checkout · `gh` · an MCP `search`) and say honestly if it can't be reached —
     **never refuse**.
   - **Gaps only** — just the untracked / reads-as-zero half.
2. **Which period.** If the invocation names it (`… October`, `last 2 weeks`), use it; else ask (current
   month · current + previous · custom).

   So `/worklog report <source> October` answered **both** → run straight away, no questions.
   `/worklog report October` → period given, ask only the source (Full default). Bare `/worklog report` →
   ask the source, **then** the period. Identity stays **personal** (`~/.claude/worklog.config.json`) — no
   team-member discovery.

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
