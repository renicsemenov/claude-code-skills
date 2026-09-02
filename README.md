# Claude Code skills

Two agent skills for [Claude Code](https://claude.com/claude-code).

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

## Install

```bash
mkdir -p ~/.claude/skills
cp -R grill-me-with-examples cleanup-scan ~/.claude/skills/
chmod +x ~/.claude/skills/cleanup-scan/scripts/scan.sh
```

Restart Claude Code (or start a new session). The skills auto-register — Claude picks them up from their
description when a matching request comes in. You can also invoke them directly:

- `/cleanup-scan` — then pick what to clean.
- `/grill-me-with-examples` — to be walked through a design decision with visual options.

Requires Claude Code. No other dependencies (the discovery script is portable POSIX shell + `git`).

## License

[MIT](LICENSE).
