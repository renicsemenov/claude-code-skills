# Cleanup Scan — reference

## Candidate categories (what to hunt in phase 2)

- **Dead code** — functions/exports/branches/files never reached from any entrypoint.
- **Unused symbols** — exports with no importer; params never read (often `_`-prefixed); vars written, never read.
- **Abandoned "blind fix" attempts** — code added to chase a bug that was actually fixed elsewhere; two
  mechanisms for one job where one silently wins.
- **Superseded workarounds** — a patch for a limitation that a later change removed; a compat shim for a
  migration long done.
- **Duplicates / near-duplicates** — two renderers/helpers/validators that do the same thing; copy-pasted
  blocks that drifted.
- **Unreachable stubs** — functions that always `throw "not implemented"` — but see false-positive #4.
- **Vestigial config** — env vars / flags / constants read nowhere, or legacy-named fallbacks nothing sets.
- **Stale TODO/FIXME** — referencing a problem already resolved (verify it really is).

## Verification playbook (phase 3)

For each candidate, run the check that matches its kind. Cite the evidence in the verdict.

- **"Unused export/function"** → grep the symbol across the repo (and dynamic dispatch: string keys, registries,
  DI containers, route tables). Zero non-test, non-self references → SAFE. Referenced → find the reference and
  judge if *that* caller is itself dead (recurse, don't loop forever).
- **"Unreachable branch/path"** → trace back to an entrypoint. Is the guarding condition ever true in a
  deployed/dev/test config? A branch only hit on a *fallback* or *dev* path is **reachable** → REJECT.
- **"Unused param"** → confirm no body reference (mind destructuring/`arguments`); removing it means updating
  every caller — count them, it's part of the change.
- **"Vestigial env/const"** → grep the exact name incl. infra (terraform/compose/CI yaml/docs). Set anywhere →
  keep. A legacy-named fallback (`X || OLD_X`) with real back-compat value: leave it — removing has downside,
  ~no upside.
- **"Superseded/duplicate"** → confirm the replacement fully covers the old one's cases (inputs, edge cases,
  callers) before dropping the old.
- **"Value never read"** → for persisted/DB values, grep the read side across the whole stack (a column may be
  written server-side and read only in a component or an API response mapper).

## False-positive catalog (the traps that make naive scans dangerous)

1. **Fallback/dev-path code** — a single-worker mutex, a local-only executor, a degraded-mode branch. Looks
   dead because the happy path bypasses it; runs the moment the primary path is unavailable. LOAD-BEARING.
2. **Read somewhere non-obvious** — a persisted field surfaced only in one component; a config consumed at
   runtime by name; reflection/serialization. Grep the *whole* stack before calling it unread.
3. **Our own just-added code** — a fix written earlier this session gets re-flagged as "recent, maybe
   redundant". If it's the change you just made, it is not cleanup. REJECT.
4. **Incomplete-feature stub** — an always-throwing placeholder for functionality not built yet. That's an
   honest not-ready signal, not fixed-problem cruft. Dropping it deletes a feature's seam. Keep unless the
   user confirms the feature is abandoned.
5. **Pending-decision gate** — a `TODO(owner): pending sign-off` blocking a path on purpose. Not dead; it's a
   held decision. Leave.
6. **Kept-for-symmetry / interface stability** — a param or field retained so a shared signature matches across
   implementations. Removing it is churn, not cleanup — flag as optional at most.

## Approval UX notes

- `AskUserQuestion` allows up to 4 questions per call, 2–4 options each, and per-answer notes. For >4 items,
  iterate in batches or use one `multiSelect` approval list.
- Always give a per-item recommendation and mark low-value items "optional" — don't make the user adjudicate
  trivia as if it were load-bearing.
- Offer **Deep-dive** as a first-class choice: the right response to "I'm not sure" is more investigation, not
  a default to delete.
- Record REJECTED-and-why so a future run doesn't resurface settled false positives.

## After applying

Run build + lint + tests. Report exactly what passed and any pre-existing failures (don't claim a red you
inherited). If nothing was approved, say so plainly — "the subsystem is clean" is a valid, honest outcome and
better than manufacturing churn.

---

# Workspace reference (Workflow B — files · branches · caches)

## Discovery commands

### Untracked files in the repo (age · lines · path)
```bash
# portable file mtime -> YYYY-MM-DD (GNU date, else BSD/macOS stat)
mtime() { date -r "$1" +%F 2>/dev/null || stat -f %Sm -t %F "$1" 2>/dev/null; }
git -C "$REPO" status --porcelain --untracked-files=all | grep '^??' | while read -r _ f; do
  [ -f "$REPO/$f" ] && printf "%s  |  %sL  |  %s\n" "$(mtime "$REPO/$f")" "$(wc -l < "$REPO/$f" | tr -d ' ')" "$f"
done
```
Temp scripts commonly look like `_*.mjs` / `_*.mts` / `_scratch*` in the repo root.

### Ephemeral scratch (regenerable)
```bash
du -sh "$REPO/.playwright-mcp" 2>/dev/null                 # browser screenshots/snapshots
# web mockups / grill pickers + cloned scratch repos under the OS temp dir
find "${TMPDIR:-/tmp}" /tmp -path '*scratchpad*' \( -name '*.html' -o -type d -name '*-testing' \) -prune 2>/dev/null
```
Screenshots come back on the next browser run, mockups can be rebuilt, `/tmp` clones re-clone — safe to
bulk-clear once shown.

### Build / cache artifacts (gitignored, regenerable — usually the biggest space win)
```bash
for d in .next dist build coverage .turbo .cache node_modules/.cache .vitest .jest .pytest_cache; do
  [ -e "$REPO/$d" ] && printf "%s : %s\n" "$(du -sh "$REPO/$d" 2>/dev/null | cut -f1)" "$d"
done
find "$REPO" -name '__pycache__' -type d -prune 2>/dev/null | head
find "$REPO" -name '.DS_Store' 2>/dev/null | wc -l | xargs echo ".DS_Store files:"
```
**Guardrail — a live dev server / build makes its cache load-bearing.** Clearing `.next` (or any shared build
dir) while `next dev`/`vite`/a build is running corrupts it. Check first, and SKIP the cache if busy:
```bash
lsof -ti :3000 :5173 >/dev/null 2>&1 && echo "DEV RUNNING — do NOT clear .next"   # adjust ports (next/vite)
pgrep -fl 'next dev|next-server|vite|webpack' | head
```

## Branch logic — merged vs gone-on-origin (the important bit)

A **squash-merge** replaces the branch's commits with one new commit on main, so the original branch tip is **not
an ancestor of main** — `git merge-base --is-ancestor <b> main` reports it *unmerged* even though it's fully
merged. The reliable second signal is **gone-on-origin**: after a PR merges with "delete branch", the remote is
removed, and `git fetch -p` marks the local tracking ref `[gone]`. Treat **merged-ancestor OR gone-on-origin** as
safe-to-prune.

```bash
git -C "$REPO" fetch -p origin                       # prune stale remote-tracking refs first
MAIN=$(git -C "$REPO" symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's@^origin/@@'); MAIN=${MAIN:-main}
for b in $(git -C "$REPO" for-each-ref --format='%(refname:short)' refs/heads/ | grep -vx "$MAIN"); do
  git -C "$REPO" merge-base --is-ancestor "$b" "$MAIN" 2>/dev/null && echo "MERGED  $b"   # (a) classic merge
done
git -C "$REPO" branch -vv | awk '/: gone\]/{print "GONE    " $1}'                          # (b) squash-merged
```
Union of (a)+(b) = the prune set → `git branch -D <names>` (`-d` refuses squash-merged; `-D` is safe **because
you verified** merged-or-gone). **Local only** — the remotes are already deleted; never `git push origin
--delete` without explicit user confirmation.

**Ambiguity check (a branch neither merged-ancestor nor gone):** verify its *content* is on main before proposing
deletion — `git log --oneline "$MAIN".."$b"` for unique commits, then grep main for a distinctive symbol it
introduced (`git grep -l someSymbol "$MAIN" -- path/`). On main → merged (squashed), safe. Not on main → live
work, **keep**.

## Must-keep detection

A candidate is load-bearing if a surviving doc — or the project's notes/memory — references it:
```bash
# grep the repo's own docs (and any agent-memory dir the project keeps) for the candidate's basename
grep -rl "candidate-basename-without-ext" "$REPO/docs" 2>/dev/null
```
Any hit → **KEEP**, exclude from the grill. Also always keep: an active/just-written design doc, and (by default)
the single newest session summary as the latest handoff.

## Heavier reclaimables — SURFACE the command, don't run it in a tidy
```bash
git count-objects -vH | grep -E 'size-pack|size-garbage'   # → suggest `git gc` if large
docker system df                                            # → suggest `docker system prune` (user runs it)
```
These touch shared/global state or rewrite the object store — mention them; let the user decide + run.
