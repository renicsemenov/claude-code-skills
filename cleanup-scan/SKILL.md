---
name: cleanup-scan
description: One cleanup entry point for a project. Asks what to clean, then handles any of — CODE (dead/superseded/duplicate/unreachable code, verified before removal), FILES & scratch (stale docs, planning notes, session summaries, web mockups, screenshots, temp scripts, /tmp clones), BRANCHES (merged or gone-on-origin local branches), and BUILD/CACHE artifacts (.next, dist, coverage, caches). Every removal is gated behind a per-item / per-group grill; nothing is deleted unconfirmed. Use when the user wants to clean up / tidy the workspace, remove dead or unused code, drop old files/docs/mockups/screenshots, prune merged branches, clear build caches, or asks "what can we delete / remove / prune".
---

# Cleanup Scan

One skill for tidying a project. It spans two domains — **CODE** (removable source) and **WORKSPACE** (files,
branches, caches on disk). Start by asking *what* to clean, then run each chosen domain. Every removal is gated
behind a grill; the whole value is **not deleting something load-bearing**.

## The one rule

**Never edit or delete anything until the user has confirmed that specific item/group.** Discovery is read-only;
deletion happens only after an explicit answer. Show `git status` before and after so the change is visible.

## Step 0 — Pick the scope (always start here)

`AskUserQuestion`, **multiSelect** — "What do you want to clean up?":
- **Code** — dead / superseded / duplicate / unreachable code inside source files → workflow **A**.
- **Files & scratch** — stale docs, planning notes, session summaries, web mockups/pickers, screenshots, temp
  scripts, `/tmp` clones → workflow **B**.
- **Branches** — merged / gone-on-origin local git branches → workflow **B**.
- **Build / cache artifacts** — `.next`, `dist`, `build`, `coverage`, `.turbo`, test caches, `.DS_Store` →
  workflow **B**.

Run the selected domains (skip Step 0 only if the user already named the scope, e.g. "prune merged branches").
Code and Workspace are independent — do them in either order; report each separately.

---

## Workflow A — CODE (guilty-until-proven-dead)

A naive "looks unused" scan is worse than useless — it confidently recommends deleting load-bearing code. Treat
every candidate as guilty until the verification pass proves it dead.

1. **Scope.** Confirm target (whole repo or subsystems). If large, **partition into non-overlapping subsystems**.
   Note languages + the test/build/lint commands + any recent work that motivated the scan (debris follows a
   refactor — ask what changed).
2. **Hunt (read-only, parallel).** One **read-only** explore agent per partition, dispatched in a single message.
   Each hunts the candidate categories in [REFERENCE.md](REFERENCE.md) and returns file:line + what + why. Tell
   them explicitly: **do not edit**; flag anything that looks dead but may be load-bearing.
3. **Verify — the load-bearing phase (do NOT skip).** For **every** candidate, prove removability yourself
   (grep/read — don't trust the hunt's claim). Each ends **SAFE / LIKELY / RISKY / REJECTED**. Ruthlessly reject
   false positives: fallback/dev-path code, values read somewhere non-obvious, incomplete-feature stubs, and
   **code the current session just added**. Keep a short "why kept" on rejects so the next scan doesn't re-flag.
4. **Approve — grill, per item.** Present SAFE/LIKELY/RISKY survivors (say how many were rejected + why).
   `AskUserQuestion` per item: **Approve · Reject · Deep-dive · Add note**. ≤4 items → one question each; many →
   a `multiSelect` "approve which?" (SAFE first), deep-dives in a follow-up round. Lead with your recommendation.
5. **Apply.** Edit only approved items, smallest change first. Run build + lint + tests; report what passed.

## Workflow B — WORKSPACE (files · branches · caches)

Lighter than code: the "verification" is *is this referenced / merged / busy?*, then a grouped grill.

1. **Discover (read-only).** Run `scripts/scan.sh [repo-dir]` — inventories untracked files, ephemeral scratch,
   build/cache artifacts, and prunable branches, all with age + size. (Commands in [REFERENCE.md](REFERENCE.md).)
2. **Categorize.** Sort each candidate; never propose deleting a **must-keep**.

   | Bucket | Examples | Default |
   |---|---|---|
   | **Must-keep** | referenced by memory / an active design doc / current work; newest handoff | KEEP (exclude from grill) |
   | **Shipped-work tracker** | per-fix notes, verification findings for merged+deployed work | delete (state's in memory + git history) |
   | **Superseded** | a doc a later one replaced; an old session summary | delete (offer "keep newest") |
   | **Ephemeral / regenerable** | screenshots, `/tmp` mockups, `/tmp` clones, `_seed`/`_verify` scripts | bulk-clear (still list it) |
   | **Build / cache artifact** | `.next` `dist` `coverage` `.turbo` test caches `.DS_Store` | bulk-clear IF no dev/build running |
   | **Merged branch** | local branch merged OR gone-on-origin | prune **local only** |

   Find must-keeps by grepping memory + surviving docs for each candidate's basename — a referenced file is
   load-bearing.
3. **Grill (the gate).** Show the full picture — **KEEP** list, then delete-candidates grouped by bucket with
   age/size. Then `AskUserQuestion`, a **multiSelect** of the delete-groups (terse, grill-me style; ephemeral +
   cache bulk-clears as their own ticks). Offer "delete all but newest" for summaries. If the user has a
   candidate open in their IDE, **flag it by name**. On overlapping/contradictory picks or a freehand note, take
   the most inclusive consistent reading and say what you did.
4. **Apply (only confirmed).** `rm -v` files; `rm -rf` ephemeral + confirmed cache dirs. **Before any build
   cache** (`.next`/`dist`/`.turbo`/…) verify no dev server / build is running (`lsof -ti :<port>`, `pgrep -fl
   'next dev|vite|webpack'`) — a shared build dir cleared under a live process corrupts it; skip + tell the user
   to stop it. **Branches:** `git fetch -p`, then `git branch -D` the confirmed **local** branches (`-d` refuses
   squash-merged ones; `-D` is right *because you verified* merged/gone — see REFERENCE.md). End with
   `git status --short` + a one-line summary (files removed, MB reclaimed, branches pruned, what remains).

## Safety guardrails

- **Never delete a remote branch, push, or force-anything without explicit confirmation** — a shared action.
  This skill prunes **local** branches only; if the remote still exists, leave it and say so.
 
- **Personal scratch/design docs live untracked in `docs/`** — intentional, not litter. Only *old/superseded*
  ones are candidates; an active design doc stays.
- **Deleting authored content needs confirmation**; pure regenerable artifacts (screenshots, temp clones, caches)
  may be bulk-proposed. Local file/branch deletion is otherwise a safe local op.
- Before deleting a file, glance at it — if its content contradicts how it was described (still-relevant, or you
  didn't create it), surface that instead of deleting.
- **Heavier reclaimables** (`git gc`, `docker system prune`, global package caches) touch shared/global state —
  surface the command for the user to run; don't run them in a tidy.

## Scale to the ask
"quick look / prune branches" → the one relevant domain, high-confidence items only. "deep audit / be thorough"
→ full code partition + adversarial verify + the RISKY tier, and every workspace bucket. When unsure, lean
conservative: a missed cleanup costs nothing; a wrong deletion breaks prod.

## Reference
Code candidate categories + verification playbook + false-positive catalog; and the workspace discovery
commands, the merged-vs-gone-on-origin branch logic, cache guardrails, and must-keep grep patterns:
[REFERENCE.md](REFERENCE.md).
