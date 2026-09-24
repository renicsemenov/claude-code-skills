# Session plan — format, self-clean, checkpoints (the plan tool)

`~/.claude/worklog/plan-<YYYY-MM-DD>.md` is today's living plan. worklog's START writes/refreshes it,
SWITCH and mid-work update it, WRAP archives it to `~/.claude/worklog/plan-archive/`. Local + gitignored.

## Format

```md
# Plan — <YYYY-MM-DD>
## Focus (today)        # 1–3 items
- [ ] <ticket or task>
## In flight
- [KEY] <label> — 🟡 active | ⏸ paused | 🔴 blocked
## Blocked / waiting
- [KEY] — on <who/what>
## Parked
- <task> — <why>
## ✔ Done this session
- <item> — <evidence: ticket Done / PR merged / hours logged>
```

## Self-clean (verify, then clean — runs on START and overview)

- **Ticketed item:** don't keep a second "done" list — **check Jira/worklog** (status Done, PR merged, or
  time logged). Confirmed ⇒ move to *Done this session* and drop from Focus/In-flight. worklog/Jira owns
  "done", not this file.
- **Non-ticket item** (reply to X, read the spec…): worklog can't see these — use the checkbox; drop when
  checked.
- **Never blind-drop.** If a ticket says Done but the PR is open or there's uncommitted work, **keep it**
  and flag the mismatch. Anything unverifiable stays, with a note.

## Checkpoints

Snapshot progress into the file at key moments — a task finished, a task **switch**, before a risky step,
and on request ("checkpoint") — so a crash / compaction / switch resumes from the last known state. A
checkpoint = update the relevant section + a dated line under the task's note or *Done this session*. Keep
it terse; it's a save-point, not a journal.

## "What have I done?"

List the session's checked non-ticket items **+** run the OVERVIEW query for today's logged/closed tickets.
Don't persist a second copy of what worklog/Jira already knows.
