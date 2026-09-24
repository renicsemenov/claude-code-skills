# Worklog — setup (first run & install)

Two one-time steps: **install** (the SessionStart nudge) and **first-run config** (discover identity).
Everything personal lives in `~/.claude/worklog/` (ledger + config) — never in the shared skill files.

## Install the SessionStart nudge

Run the bundled installer, which appends the hook to the user's `settings.json` (preserving any
existing hooks) and points it at the skill's copy of the script:

```
bash "<this-skill-dir>/scripts/install-hook.sh"
```

It is idempotent — safe to re-run. The hook prints a short reminder + in-flight tasks at the top of
every new session so tracking "pops up" without being asked. It reads only `~/.claude/worklog/active.md`
and is silent on a post-compaction restart.

## First-run config (`~/.claude/worklog/config.md`)

If the config is missing when any move runs, create it. **Discover** what you can; **ask** for the rest.

Discover (no guessing):
- `atlassianUserInfo` → `jira_account_id`, `display_name`, `timezone`.
- `getAccessibleAtlassianResources` → `jira_cloud_id` and `jira_site` (the `url` host, e.g.
  `acme.atlassian.net`) — used for the `…/browse/<KEY>` links.
- `git config user.email` → `git_author_email` (how retro matches this person's commits).

Ask once (store the answers):
- `repo_roots` — the directory(ies) under which their work repos live (e.g. `~/work` or `~/src`).
- `default_projects` — the Jira project keys they usually work in (optional; retro also finds these).
- `ticket_style` — the team's Jira convention for Story / Sub-task bodies (free text).
- `memory_dir` — path to the project's Claude memory (`MEMORY.md` + `project_*.md`), if they keep one;
  else leave blank and the plan-recall step is skipped.
- `checkpoint_dir` — where retro writes its durable summary (a gitignored local docs dir).
- `worklog_report_app` — the `<appId>/<pageId>` of the Jira Worklogs report app, for deep links.
  Capture it once: ask the user to open their team's worklogs report and paste the URL; take the path
  segment between `/jira/apps/` and `/worklogs-jira-page`. Leave blank if the team has no such app.

Write it as simple `key: value` front-matter-ish lines so it is easy to read back and edit by hand.
None of these are secrets (IDs and paths only) — but still never write tokens/cookies here.

## Template

```md
# Worklog config (local — not shared, not committed)

jira_site: <acme.atlassian.net>
jira_cloud_id: <uuid>
jira_account_id: <id>
display_name: <name>
timezone: <IANA tz>
git_author_email: <email used on commits>
repo_roots: <~/work>
default_projects: [<ABC>, <DEF>]
worklog_report_app: <appId>/<pageId>   # or blank
ticket_style: |
  Story: <team convention>. Sub-task: <team convention>.
memory_dir: <path or blank>
checkpoint_dir: <path or blank>
```
