# Retro — reconstruct a period of work for Jira (the RETRO move)

**Goal:** make the org see what the user actually worked on. Reconstruct everything done over a window
(typically the **last 1–2 months**), size it, cross-check what is already in Jira, then create the
missing tickets **assigned to the user** and log **agreed** times. The org-visibility counterpart to
daily tracking — the ledger goes forward, retro reconstructs the past.

**READ-ONLY until the Jira "go".** Research, size, checkpoint, present — create/log nothing until the
user approves the drafts (the skill's confirm-before-write law).

**Depth over speed.** The user wants a *detailed* reconstruction. Go wide, dig, then return with the
overview. Expect at least one **deepen pass**. Read identity/paths from `~/.claude/worklog/config.md`.

---

## Sources to mine (each catches work the others miss — run in parallel)

1. **Git history — all work repos, this user's identity.** Iterate the repos under
   `config.repo_roots`. Match commits on **`config.git_author_email`** (not one name — people commit
   under several author names / handles).
   - Per repo: `git log --since=<date> --author=<email> --pretty=…` for the message stream.
   - Volume: commit count, `--shortstat` for +/- lines, weekly rhythm (`--date=format:%G-W%V | uniq -c`).
   - Scope split: bucket subjects by `scope(...)` prefix to size each area.
   - A repo with **0 of their commits** in the window is a real finding — say so.
2. **Auto-memory** (if `config.memory_dir` is set) — read `MEMORY.md`, then every relevant
   `project_*.md`. **This is where non-commit work lives** — designs, decisions, PR reviews,
   investigations, ops, already-filed Jira trees. A commit-only pass **under-counts**; memory is what
   surfaces the missing streams.
3. **Session / usage data (time proxy)** — `npx --yes ccusage@latest daily --since <YYYYMMDD> --json`
   gives sessions, **active days**, and spend. `ls ~/.claude/projects/*/` shows per-project transcript
   spread. Note transcripts may all log under one project dir even for other-repo chats.
4. **PR reviews on others' work** — not in their commits. `gh pr list --search "reviewed-by:@me"`
   across repos, plus any review notes in memory. Review + debugging is real effort worth surfacing.
5. **Jira — existing tickets in the window** (the cross-check, so nothing is duplicated). Many teams
   structure work as a **monthly Story + numbered sub-tasks**, so a retro often just fills the
   **current-month gap** and logs times rather than creating everything — check the team's pattern
   (and memory) first. Then confirm with JQL:
   - **Query by `created >= <date>`, NOT `updated >=`.** `updated` catches mass status-sweeps (e.g.
     bulk-updated marketing tickets where the user is only *reporter*) and buries the real rows.
     `created >=` = work actually born in the window.
   - Scope: `(assignee = currentUser() OR reporter = currentUser())`.
   - **Expect huge, ADF-bloated results** that blow the token limit and get saved to a file. Ask for
     `responseContentFormat: "markdown"` + a minimal `fields` list, then `jq` compact rows from the
     saved file — don't read the raw dump.
   - Results cap at ~100; if hit, narrow by project/date and page — don't assume you saw everything.
   Already-ticketed work needs a **link + time**, not a new ticket.

## Reconstruct → workstreams

Group the signals into **named workstreams**, each with: what it delivered, why it is real work
(especially the non-commit ones), status (Done / Shipped / In progress / Merged-verify-pending), and
evidence (PRs, commit counts, memory file). Align names to how the user frames their work; let the
mining add streams they didn't name.

## Size each workstream

Estimate in **engineering-days** (design + build + verify, not wall-clock), calibrated against the
proxies. Map to `S ≈ 1–2d · M ≈ 3–5d · L ≈ 6+d`. This is the *starting point* for the agreed times —
the user adjusts, and the agreed number is what gets logged.

## Present — the table

The shared report table (SKILL.md): **link every ticket key**, group by parent/month, show
status + est/logged. Close with a footprint block (sessions, active days, commits, +/- lines) and a
bottom-line total. Keep evidence attached so a number can be defended.

## Checkpoint (before deepening, and before Jira)

Write the full reconstruction to a durable, gitignored doc under `config.checkpoint_dir`
(e.g. `work-summary-for-jira-<date>.md`). Retro is expensive — checkpoint so a deepen pass or a new
session doesn't lose it. Note the retro + doc path in memory if the project keeps one.

## Deepen loop (offer it; the user often asks anyway)

After the first table, **don't stop** — name what was *not* mined yet (other repos, repos with 0
first-pass hits, unread memory, PR reviews, an earlier start date) and offer a wider sweep that
**extends** the same table with new keys and a revised total; re-checkpoint. Treat one deepen pass as
the default, not the exception.

## Hand off to Jira (only on "go")

1. **Cross-check first** — split into *already ticketed* (link + time) vs *gaps* (create).
2. **Grouping** — ask flat tasks vs a few **epics/Story with sub-tasks**; follow `config.ticket_style`.
3. **Draft bodies** in the team style; assign to the user; show the drafts.
4. **Check existing worklogs** on each target ticket first — add only the **delta** (never double-log).
5. On explicit **go**: `createJiraIssue` for gaps, then log agreed times with `addWorklogToJiraIssue`.
   Optionally transition finished tickets to Done (confirm). Fold the reconstructed tasks into the
   ledger so they live in the daily system going forward, and end with the linked **✅ Everything
   tracked** table.
