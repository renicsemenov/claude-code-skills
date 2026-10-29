# Claude Code skills

Six agent skills for [Claude Code](https://claude.com/claude-code).

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
A head-skill that keeps parallel work from going untracked and drives per-project coverage reports. Bare
`worklog` asks what you want with a menu; a clear request acts straight away. The moves:

- **start / continue** — recall the plan + clock in, or **focus the session on one project** and render its
  sharp status (artifact link · status-by-track · Active→Next).
- **status / map** — a cheap "where am I right now" one-liner, or a map of the whole system and where each
  project's data is linked (📁 local vs 🔗 shared in a repo).
- **switch / wrap** — log the hop between tasks, or at wrap propose hours per ticket and (on your OK) log them
  delta-only, never double-logging.
- **overview / report / retro** — a read-only table of everything; a proof-of-work split of tracked vs
  reads-as-zero output; or reconstruct a past period into sized workstreams + draft the missing tickets.
- **new project / log side-work / tidy** — scaffold a coverage-report project, capture a PR-review/quick-fix so
  it doesn't read as zero, or archive stale plan files.

Identity + config live in one local file (`~/.claude/worklog.config.json`), discovered at runtime; **nothing
personal lives in the skill**, and **every Jira write is drafted and waits for your explicit go**. A
SessionStart hook nudges you at the top of each chat. Its coverage-report mechanics come from the
`coverage-research-report` skill (below) — install both.

### `coverage-research-report`
Produces the house-style **honest-researcher** coverage report: a tabbed HTML artifact built from versioned
markdown section folders (one folder per tab), re-renderable to the **same shareable URL** any time (never a
throwaway chat artifact). Stats are tallied from the prose so they can't drift; every load-bearing finding is
verified by a **fresh independent judge** before it ships; findings are bucketed honestly (drift / gap / bug /
retracted) and routed to an owner. A `Plan` tab tracks status-by-track + who's-in-parallel with direct ticket
links. Uses a vendored [`marked`](https://www.npmjs.com/package/marked) (run `npm i` in the skill dir after a
clone). `worklog` drives it; it also works standalone.

### `review-by-rules`
Reviews a pull request / MR / diff against **layered rules** — the global floor (security · DRY · KISS · reuse ·
no-hardcode) + the project's own `.claude/rules/*.md` + (optionally) a central rule-registry's common floor and
`rule://` pointers. Scales to the task: a single lightweight reviewer for a quick look, or **reviewer + a fresh
independent judger** for a real gate. It **proves every red is PR-introduced vs pre-existing**, and drafts a
verdict it **never posts or merges without an explicit go**.

### `security-review`
A forensic **security** review of a code change — the working diff, a branch, or named files — for real,
exploitable vulnerabilities, **credential-safety first**. Ranks findings by severity with a concrete exploit
path and a fix, and **never applies a fix or touches a secret without confirmation**. Scoped to a change (not a
full-codebase pentest), not a license/style linter.

## Install

Clone and **symlink** the skills into `~/.claude/skills/` (recommended — a `git pull` then keeps them current,
and `worklog`'s SessionStart hook can auto-update):

```bash
git clone https://github.com/renicsemenov/claude-code-skills.git
cd claude-code-skills
for s in grill-me-with-examples cleanup-scan worklog coverage-research-report review-by-rules security-review; do
  ln -s "$PWD/$s" ~/.claude/skills/"$s"
done
chmod +x cleanup-scan/scripts/scan.sh
( cd coverage-research-report && npm i )   # vendors `marked` for the report builder
```

(Or `cp -R <skill> ~/.claude/skills/` to copy instead of symlink.)

Restart Claude Code (or start a new session). The skills auto-register — Claude picks them up from their
description when a matching request comes in. You can also invoke them directly, e.g. `/worklog`,
`/cleanup-scan`, `/grill-me-with-examples`, `/review-by-rules`, `/security-review`.

**`worklog` needs two one-time steps** (see `worklog/references/setup.md`): register the SessionStart nudge with
`bash ~/.claude/skills/worklog/scripts/install-hook.sh`, then run `/worklog` once to self-configure your Jira
identity into `~/.claude/worklog.config.json` (kept local — never committed). It uses the Atlassian MCP for Jira
access. `worklog` + `coverage-research-report` are a pair — install both.

Requires Claude Code. Portable POSIX shell + `git`; `worklog` also uses `python3`; `coverage-research-report`
uses Node + `marked`.

## License

[MIT](LICENSE).
