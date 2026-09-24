#!/usr/bin/env bash
# Worklog SessionStart nudge. Prints a short reminder (added to session context) so
# time-tracking "pops up" at the start of every chat. Paired with the worklog skill.
# Reads only the local ledger; contains no personal data — safe to share.
#
# Kept terse — this text is injected into every session's context.

set -euo pipefail

LEDGER="$HOME/.claude/worklog/active.md"

# SessionStart passes JSON on stdin ({source,...}). Skip on a post-compaction
# restart so we don't re-nag mid-session.
payload="$(cat 2>/dev/null || true)"
case "$payload" in
  *'"source"'*'"compact"'*) exit 0 ;;
esac

echo "⏱ WORKLOG — time-tracking is active."

if [[ -f "$LEDGER" ]] && grep -q '^- \[' "$LEDGER" 2>/dev/null; then
  echo "In-flight tasks (from ~/.claude/worklog/active.md):"
  # Lines look like:  - [ACTIVE] PROJ-42 · [M] label · 2.5h · last 2026-01-01
  grep '^- \[' "$LEDGER" | sed 's/^- /   • /' | head -8
else
  echo "No task is currently being tracked."
fi

cat <<'EOF'
→ Starting or continuing work? Run /worklog to recall the plan (memory + ledger) and clock in.
→ End of session, or "log my time / update the plan"? Run /worklog to log Jira time and wrap up.
EOF

# --- Skill self-update (best-effort; never blocks or fails the session) ---
# If this skill lives in a git repo, keep it fresh: auto-pull when the tree is clean,
# nudge when there are local edits. The staleness compare is LOCAL (last fetch); the
# network fetch is backgrounded + throttled, so session start gains no latency.
set +e
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." 2>/dev/null && pwd)"
REPO="$(git -C "$SKILL_DIR" rev-parse --show-toplevel 2>/dev/null)"
if [[ -n "$REPO" ]] && git -C "$REPO" rev-parse '@{u}' >/dev/null 2>&1; then
  STAMP="$HOME/.claude/worklog/.last-skill-fetch"
  now="$(date +%s)"; last=0; [[ -f "$STAMP" ]] && last="$(cat "$STAMP" 2>/dev/null || echo 0)"
  if (( now - last > 21600 )); then
    ( git -C "$REPO" -c http.lowSpeedLimit=1000 -c http.lowSpeedTime=5 fetch --quiet \
        && echo "$now" > "$STAMP" ) >/dev/null 2>&1 &
  fi
  behind="$(git -C "$REPO" rev-list --count 'HEAD..@{u}' 2>/dev/null || echo 0)"
  if [[ "$behind" -gt 0 ]]; then
    if [[ -z "$(git -C "$REPO" status --porcelain 2>/dev/null)" ]]; then
      git -C "$REPO" merge --ff-only --quiet '@{u}' 2>/dev/null \
        && echo "🔄 worklog skill auto-updated ($behind new commit(s))."
    else
      echo "⚠ worklog skill is $behind commit(s) behind origin — local changes present; run: git -C $REPO pull"
    fi
  fi
fi
set -e
