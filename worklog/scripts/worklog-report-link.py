#!/usr/bin/env python3
"""Build a deep link to the Jira "Worklogs" report app, scoped to a user + date range.

The report page is instance-specific (an installed app), so the app path
(<appId>/<pageId>) and the site come from ~/.claude/worklog/config.md; only the
date range is per-call. Dates are interpreted as LOCAL MIDNIGHT in the user's
timezone, which is how the report encodes startDate/endDate (epoch-ms).

Usage:
  worklog-report-link.py --start YYYY-MM-DD --end YYYY-MM-DD [--period week|day|month]
                         [--user <accountId>] [--site ...] [--app <appId>/<pageId>] [--tz ...]

Values not passed are read from config.md. Prints the URL to stdout.
"""
import argparse, datetime, sys, pathlib, re

try:
    import zoneinfo
except ImportError:
    zoneinfo = None

CONFIG = pathlib.Path.home() / ".claude" / "worklog" / "config.md"


def load_config():
    cfg = {}
    if CONFIG.exists():
        for line in CONFIG.read_text().splitlines():
            m = re.match(r"^([a-z_]+):\s*(.*)$", line.strip())
            if m:
                cfg[m.group(1)] = m.group(2).strip()
    return cfg


def midnight_ms(date_str, tz_name):
    d = datetime.date.fromisoformat(date_str)
    dt = datetime.datetime(d.year, d.month, d.day)
    if zoneinfo and tz_name:
        try:
            dt = dt.replace(tzinfo=zoneinfo.ZoneInfo(tz_name))
        except Exception:
            dt = dt.replace(tzinfo=datetime.timezone.utc)
    else:
        dt = dt.replace(tzinfo=datetime.timezone.utc)
    return int(dt.timestamp() * 1000)


def main():
    cfg = load_config()
    p = argparse.ArgumentParser()
    p.add_argument("--start", required=True)
    p.add_argument("--end", required=True)
    p.add_argument("--period", default="week", choices=["day", "week", "month"])
    p.add_argument("--user", default=cfg.get("jira_account_id", ""))
    p.add_argument("--site", default=cfg.get("jira_site", ""))
    p.add_argument("--app", default=cfg.get("worklog_report_app", ""))
    p.add_argument("--tz", default=cfg.get("timezone", "UTC"))
    a = p.parse_args()

    missing = [n for n in ("site", "app", "user") if not getattr(a, n)]
    if missing:
        sys.exit(f"missing {', '.join(missing)} — pass as flags or set in {CONFIG}")

    start = midnight_ms(a.start, a.tz)
    end = midnight_ms(a.end, a.tz)
    frag = (
        f"userIds={a.user}&groups=&startDate={start}&endDate={end}"
        f"&period={a.period}&sortIndex=0&sortAsc=true&sprintId="
        f"&groupBy=none&groupBy2=none&projects=&filters=&categorizeBy=user.displayName"
    )
    print(f"https://{a.site}/jira/apps/{a.app}/worklogs-jira-page#!{frag}")


if __name__ == "__main__":
    main()
