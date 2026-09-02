#!/usr/bin/env bash
# cleanup-scan — Workflow B discovery. Read-only inventory of stale files, ephemeral scratch, build/cache
# artifacts, and prunable local branches. Usage: scan.sh [repo-dir] (defaults to CWD). Deletes NOTHING.
set -uo pipefail
REPO="${1:-$PWD}"
cd "$REPO" 2>/dev/null || { echo "not a dir: $REPO" >&2; exit 1; }
git rev-parse --git-dir >/dev/null 2>&1 || { echo "not a git repo: $REPO" >&2; exit 1; }

# Portable file mtime -> YYYY-MM-DD (GNU `date -r`, else BSD/macOS `stat -f`).
mtime() { date -r "$1" +%F 2>/dev/null || stat -f %Sm -t %F "$1" 2>/dev/null; }

echo "### Untracked files (age | lines | path)"
git status --porcelain --untracked-files=all | grep '^??' | while read -r _ f; do
  [ -f "$f" ] && printf "%s | %5sL | %s\n" "$(mtime "$f")" "$(wc -l < "$f" | tr -d ' ')" "$f"
done | sort
echo

echo "### Ephemeral scratch (regenerable)"
[ -d .playwright-mcp ] && printf ".playwright-mcp/ : %s (%s files)\n" \
  "$(du -sh .playwright-mcp | cut -f1)" "$(find .playwright-mcp -type f | wc -l | tr -d ' ')"
find "${TMPDIR:-/tmp}" /tmp -maxdepth 6 -path '*scratchpad*' \
  \( -name '*.html' -o -type d -name '*-testing' \) -prune 2>/dev/null | while read -r p; do
  printf "%s : %s\n" "$(du -sh "$p" 2>/dev/null | cut -f1)" "$p"
done
echo

echo "### Build / cache artifacts (gitignored, regenerable)"
for d in .next dist build coverage .turbo .cache node_modules/.cache .vitest .jest .pytest_cache; do
  [ -e "$d" ] && printf "%s : %s\n" "$(du -sh "$d" 2>/dev/null | cut -f1)" "$d"
done
# Guard: a running dev server / build makes its cache load-bearing — never clear it live.
if pgrep -fl 'next dev|next-server|vite|webpack' >/dev/null 2>&1; then
  echo "!! a dev server / build appears to be RUNNING — do NOT clear its build cache (stop it first)"
fi
echo

echo "### Prunable local branches (MERGED = ancestor of main; GONE = deleted on origin/squash-merged)"
git fetch -p origin >/dev/null 2>&1
MAIN=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's@^origin/@@'); MAIN=${MAIN:-main}
for b in $(git for-each-ref --format='%(refname:short)' refs/heads/ | grep -vx "$MAIN"); do
  if git merge-base --is-ancestor "$b" "$MAIN" 2>/dev/null; then echo "MERGED  $b"; fi
done
git branch -vv | awk '/: gone\]/{print "GONE    " $1}'
echo
echo "(review, then grill the user before deleting — see SKILL.md)"
