```json config
{
  "title": "<Feature> — doc vs reality",
  "eyebrow": "JIRA-123 · coverage audit",
  "lede": "One or two plain sentences: what was audited, against what, and the headline. No water.",
  "description": "Tabbed report: findings, coverage & gaps, detail, reference, and the plan.",
  "jiraBase": "https://acme.atlassian.net/browse/",
  "artifactUrl": "",
  "footer": "JIRA-123 · rendered from in-repo report.md · <date>",
  "stats": [
    { "label": "features · detail", "value": "auto:####" },
    { "label": "conform",           "value": "auto:✅", "tone": "ok" },
    { "label": "carry a finding",   "value": "auto:⚠️", "tone": "warn" },
    { "label": "unverified",        "value": "auto:❓", "tone": "q" },
    { "label": "product bug",       "value": 1,         "tone": "bad" }
  ],
  "tracks": [
    { "jira": "JIRA-124", "status": "done",        "now_next": "contract suite merged · CI green", "updated": "2026-10-28", "artifact": "" },
    { "jira": "JIRA-123", "status": "in_progress", "now_next": "turn the field-level audit into assertions", "updated": "2026-10-28", "artifact": "" },
    { "jira": "JIRA-333", "status": "blocked",     "now_next": "infra fix — drives don't reach the store", "updated": "2026-10-28", "artifact": "" }
  ],
  "tabs": [
    { "id": "findings", "label": "Findings",         "ref": "JIRA-123", "from": "findings" },
    { "id": "cov",      "label": "Coverage & Gaps",  "ref": "JIRA-124", "from": "coverage" },
    { "id": "detail",   "label": "Detail",           "ref": "JIRA-123", "from": "detail" },
    { "id": "ref",      "label": "Reference",        "ref": "JIRA-123", "oracleFile": "", "lead": "Point oracleFile at a real schema/types/config file to render it here. Leave empty to drop this tab's body." },
    { "id": "plan",     "label": "Plan",             "refLabel": "plan", "from": "plan", "tracksTable": true }
  ]
}
```

<!-- tracks[] is the AUTHORITATIVE status store for this workstream (judged, at each checkpoint).
     The Plan tab's status-by-track table is GENERATED from it (tracksTable:true), and worklog rolls
     it up read-only by `jira`. It carries jira · status · now_next · updated · artifact ONLY — never
     hours, never another workstream, never the who/blocker names below. status ∈ done|in_progress|blocked|planned. -->

## findings

Judged ledger — every finding grounded in primary evidence, bucketed honestly, routed to an owner + ticket.

| Finding | Where | Verdict | Routes to |
|---|---|---|---|
| **F-A** short title | COMBO-1 | DRIFT (doc wrong, reality right) | doc owner |
| **F-B** short title | COMBO-2 | MISSING (coverage gap) | add it |
| **F-C** short title | COMBO-3 | **BUG** (real defect) | JIRA-999 |
| **F-D** ~~old claim~~ | — | **❌ RETRACTED — FALSE** (what the controlled re-check showed) | — |

### Verdict

Plain-English: what's proven vs audited vs unverified. Show the method (fan-out → per-fork judge → synthesis →
independent verdict judge) and show the retractions — the honesty is the point. ✅ / ⚠️ / ❓ markers here and in
detail are what the stat bar tallies, so keep them accurate.

## coverage

What CI / the tests actually cover, and the gaps to "full coverage". Every gap names a ticket.

| Bucket | Status | Covered by CI? | Ticket |
|---|---|---|---|
| Contract — presence | 🟢 asserting | ✅ every run | JIRA-124 |
| Field-level values | 🟡 audited, not asserted | ❌ the open piece | JIRA-123 |
| Behaviour | 🔴 blocked | 🟡 scaffold ready | JIRA-333 |

## detail

The fine-grained data — one place only (never duplicate a table that lives elsewhere, or the copies drift).
Use `####` headings per item; each ✅/⚠️/❓ feeds the stat tally.

#### example-item-one
| field | expected | reality | conform |
|---|---|---|---|
| `id` | non-zero | 23224 | ✅ |
| `flag` | 0 | 0 | ✅ |

#### example-item-two
| field | expected | reality | conform |
|---|---|---|---|
| `state` | "open" | "open" | ✅ |
| `extra` | documented | absent | ⚠️ |

## plan

Status, tracks, and who's in parallel — the tab you live in. All links go straight to Jira.

<!-- The "status by track" table is GENERATED above from config.tracks[] (tracksTable:true) — the single
     authoritative status store. Do NOT hand-type a second status table here; edit tracks[] instead. -->

### ▶ Active track → next

1. ✅ Done thing.
2. ▶ The thing being worked now.
3. ▶ The next thing.

### Who works in parallel + blockers

| Who | Working on | Hand-off / blocker |
|---|---|---|
| Person A | the parallel thing | [JIRA-121](https://acme.atlassian.net/browse/JIRA-121) |
| Infra | the blocker | [JIRA-333](https://acme.atlassian.net/browse/JIRA-333) |
