#!/usr/bin/env bash
# Idempotently register the worklog SessionStart nudge in the user's Claude settings.
# Appends alongside any existing hooks; never clobbers them. Safe to re-run.

set -euo pipefail

HOOK="$HOME/.claude/skills/worklog/scripts/session-start-hook.sh"
SETTINGS="$HOME/.claude/settings.json"

chmod +x "$HOOK"
mkdir -p "$HOME/.claude/worklog"

python3 - "$SETTINGS" "$HOOK" <<'PY'
import json, sys, os, pathlib
settings_path, hook = sys.argv[1], sys.argv[2]
p = pathlib.Path(settings_path)
data = json.loads(p.read_text()) if p.exists() and p.read_text().strip() else {}
hooks = data.setdefault("hooks", {})
ss = hooks.setdefault("SessionStart", [])
cmd = f"'{hook}'"
already = any(
    "session-start-hook.sh" in h.get("command", "")
    for grp in ss for h in grp.get("hooks", [])
)
if already:
    print("worklog hook already present — no change")
else:
    ss.append({"hooks": [{"type": "command", "command": cmd}]})
    p.write_text(json.dumps(data, indent=2) + "\n")
    print(f"added worklog SessionStart hook → {settings_path}")
PY

echo "Done. The nudge will show at the start of your next session."
