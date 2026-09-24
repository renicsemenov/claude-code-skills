# Claude Code skills

Three agent skills for [Claude Code](https://claude.com/claude-code).

## Skills

### `grill-me-with-examples`
Interviews you through a decision one branch at a time — but *shows* the options instead of only describing
them. A fidelity ladder, cheapest first:

1. **Plain terminal** — options with ✓/✕ pros/cons and a `(Recommended)` default (data-model, architecture,
   naming, sequencing).
2. **Illustrated terminal** — the same, plus an ASCII sketch / side-by-side / before-after in each option
   (layout-ish or structural calls that need showing but not pixels).
3. **Interactive web mockup** — a clickable Artifact in your project's real design tokens (look, spacing,
   density, hover).

When the right fidelity is a toss-up it asks you (recommended tier pre-marked); when it's obvious it just
proceeds. Before publishing a web mockup it self-checks fidelity — real tokens (extracted, not guessed), real
data (not lorem), no CSP errors, controls that actually re-render — so you never decide on a mock that lies.

### `cleanup-scan`
One cleanup entry point. It asks **what** to clean, then handles any of:

- **Code** — dead / superseded / duplicate / unreachable code, each *verified* against real usage before it's
  ever suggested (guilty-until-proven-dead).
- **Files & scratch** — stale docs, planning notes, session summaries, web mockups, screenshots, temp scripts,
  `/tmp` clones.
- **Branches** — merged or gone-on-origin **local** branches (handles the squash-merge "looks-unmerged-but-isn't"
  case).
- **Build / cache artifacts** — `.next`, `dist`, `coverage`, `.turbo`, test caches, `.DS_Store`.

Every removal is gated behind a per-item / per-group grill — **it never deletes anything unconfirmed**, never
touches a remote branch without asking, and won't clear a build cache while a dev server is running.

### `worklog`
Keeps parallel work from going untracked: every task is tied to a **Jira ticket** and a local ledger, and
real hours land on Jira. It has five moves, picked from what you say:

- **start** (`"clock in" / "what's next"`) — recalls the plan from the ledger + your notes, maps each task to
  its Jira ticket, and clocks in.
- **switch** (`"park this"`) — logs the hop between parallel tasks.
- **wrap** (`"log my time" / "wrap up"`) — proposes hours per ticket, and on your OK logs them
  (delta-only, never double-logging).
- **timemachine** (`"show me all my work"`) — a read-only table of everything, each Jira key a clickable link.
- **retro** (`"review last month's work"`) — reconstructs a past period from git + notes + session data into
  sized workstreams and drafts the missing Jira tickets, for org visibility.

A **SessionStart hook** nudges you at the top of every chat, and — when installed from a git clone — keeps
itself up to date (auto-`pull` on a clean tree, a nudge when you have local edits). Identity (Jira site,
account, timezone) is **discovered at runtime** or read from a local `~/.claude/worklog/config.md`; nothing
personal lives in the skill. **Every Jira write is drafted and waits for your explicit go** — it never
creates, logs, or transitions unattended.

## Install

```bash
mkdir -p ~/.claude/skills
cp -R grill-me-with-examples cleanup-scan worklog ~/.claude/skills/
chmod +x ~/.claude/skills/cleanup-scan/scripts/scan.sh
```

> Tip: to get `worklog`'s auto-update, `git clone` this repo somewhere and **symlink** the skills into
> `~/.claude/skills/` instead of copying — then a `git pull` (or the SessionStart auto-pull) keeps them current.

Restart Claude Code (or start a new session). The skills auto-register — Claude picks them up from their
description when a matching request comes in. You can also invoke them directly:

- `/cleanup-scan` — then pick what to clean.
- `/grill-me-with-examples` — to be walked through a design decision with visual options.
- `/worklog` — then track time, log to Jira, or reconstruct a past period.

**`worklog` needs two one-time steps** (see `worklog/references/setup.md`): register the SessionStart nudge
with `bash ~/.claude/skills/worklog/scripts/install-hook.sh`, then run `/worklog` once to self-configure your
Jira identity (`~/.claude/worklog/config.md`, kept local — never committed). It uses the Atlassian MCP for
Jira access.

Requires Claude Code. No other dependencies (portable POSIX shell + `git`; `worklog` also uses `python3`).

## License

[MIT](LICENSE).
