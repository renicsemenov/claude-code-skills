---
name: coverage-research-report
description: Produce (and keep up to date) the user's house-style research / coverage report — an honest-researcher, tabbed HTML artifact built from versioned markdown + a real oracle, re-renderable to the SAME shareable URL, with every load-bearing finding verified by an independent judge before it ships. Use at a CLEAN REPORTING CHECKPOINT, not on every research step.
when_to_use: Fire when the user asks for a "reporter of coverage", "full view", "where do we stand", "build/update the report", "coherence report", a docs-vs-reality / coverage / audit report — OR when a research workstream reaches a clean checkpoint worth reporting and keeping current. If it only LOOKS like a checkpoint, PROPOSE building/updating the report rather than assume. Do NOT fire on every intermediate research step — only when there is something solid to report. Skip for throwaway one-off summaries he did not ask to persist.
---

# Coverage / research report — the house style

The deliverable the user loves: an **honest researcher** piece, not a summary. One tabbed HTML artifact, built
from **versioned markdown** (+ an optional real code oracle), **re-renderable to the same shareable URL any
time**, where **nothing load-bearing ships until an independent judge has verified it.**

This skill is **general** — any research / audit / coverage workstream. The worked example at the bottom is one
filled-in coherence-audit instance; treat it as *an example*, never as the template.

> **General-vs-example iron rule.** A line in this skill's general body must never name a specific subject. If
> you are about to write a **real subject name, a ticket id, a repo path, or a schema/variable name** into the
> general flow, it belongs in the **example**, not the method.

---

## The three things the user values (make the report deliver all three)

1. **Reusable + shareable + editable any time.** The old pain: an artifact generated one day was *un-editable the
   next*. The cure is mechanical and non-negotiable (below): versioned md sources + a stable build output +
   publish via the Artifact tool's `url:` param → the **same `/code/artifact/<uuid>` URL forever**. He shares
   that one link; you redeploy into it.
2. **Simple wording, no water, organised by tabs — and the design.** Short plain-English prose, the house
   design-token look, one tab per question.
3. **Each tab short / solid / documented — and a Plan tab that tracks reality.** Every tab opens with one plain
   sentence of what+why and is genuinely informative. The **Plan tab** is where he tracks *where we are now*,
   *active work*, *who works in parallel*, and *blockers* — all with **direct Jira links**.

---

## Non-negotiables (the floor — never relax these)

1. **Independent judge before any publish — two gates, proportional** (see "The judge gate"). Nothing
   load-bearing reaches the artifact unjudged; a fresh agent, never a fork.
2. **Stats derive from the prose, never hand-typed.** The stat-bar numbers are **tallied from markers** in the
   markdown (`✅ ⚠️ ❓`, heading counts, …). This is *why the numbers feel solid* — they cannot drift from the
   text. Never type a number into the header that a tally didn't produce.
3. **Never a chat artifact.** A claude.ai *chat* artifact (a short share id like `aB3x…`) is un-editable in a later
   session — that is the exact "couldn't edit it next day" failure. Always: build a file → publish with the
   **Artifact tool + `url:` of the `/code/artifact/<uuid>`** → same URL. Do not "simplify" back to a chat
   artifact, ever.
   - **One artifact, one owning source — on a dual-source, ASK.** If two places could render→publish the same
     URL (e.g. a migrated copy + the original it came from), **never silently pick** — ask the user which source
     **owns** it and record it (`artifact_owner` in the project's config). Only the owner publishes; every other
     source renders **locally only** and must not push. Default when unsure: the user's stated priority (e.g.
     "local wins until the shared copy is ready").
4. **Honest buckets, and show the method.** Findings are bucketed openly — `DRIFT` (doc wrong, reality right) ·
   `MISSING` (gap) · `BUG` (real product defect) · `RETRACTED` (we were wrong) — each routed to an **owner +
   ticket**. The findings tab *shows what we did and what got retracted*: the provenance (fan-out → judge →
   synthesis) and the honest reversals are a large part of why the report is trustworthy. Never hide a gap —
   surfacing it is the point.
5. **Simple words, no water** — litmus: lede ≤ 2 sentences; **every tab opens with one plain sentence of
   what+why**; a reader who knows nothing sees the gap in ~10 seconds. If a sentence is jargon or filler, cut it.
6. **Keep it current + post to Jira with the link.** After each checkpoint: edit md → re-render → publish →
   **comment on the Jira ticket with the artifact link**, style: *"done X — updated the report: <link>"*.
7. **When you build an artifact, ASK: one-time or reusable?** The failure this prevents: an artifact built
   **ad-hoc** leaves its **source in an ephemeral scratchpad** (cleaned up) and its **URL only in the chat** —
   so a later session has neither the source nor the link and *cannot re-edit it*. So on building a shareable
   artifact, ask the user **one-time or reusable** (default **reusable** when unsure — persisting is cheap, a
   lost artifact can't be recovered):
   - **Reusable** → build it through this skill: **source in a durable home** (a `data_root` project,
     re-renderable from section folders) + **URL recorded** (`report.config.json artifactUrl` +
     `config.projects.<name>.artifact` + a memory), so a future session re-edits the **same URL**.
   - **One-time** → fine to build quick/ad-hoc, but **say plainly it won't be re-editable** (ephemeral source,
     URL only in this chat). If they later want it back, a **report-migration tool** can promote a one-time
     artifact into a reusable section-folder project (future add — also useful for pulling ad-hoc research into
     a product's research docs).

---

## The judge gate — sharp, not ceremony

Everything that changes a *claim* is judged before it ships; cosmetics are not. Two gates, different weights:

| Gate | Fires when | Who | Checklist |
|---|---|---|---|
| **A — finding judge** (expensive) | a finding is **new / changed / retracted**, or any load-bearing claim others will act on | **fresh agent, not a fork** | ① grounded in **primary evidence** (a real read / `file:line` / live oracle), not one glance or a summary? ② honest bucket + routed to owner+ticket? ③ does a **second source or reality contradict** it — and if a prior entry was mislabelled, is that caught? ④ verdict carries **refs on every side** (doc-ref, reality-ref) — a verdict without refs isn't done. → `SUFFICIENT` / `NOT`. Only `SUFFICIENT` ships. |
| **B — publish coherence** (cheap, mostly scriptable) | **every** publish | a quick check / script | ① **stat-bar == marker tally** (no hand-typed drift)? ② prose matches its bucket counts (no "1 bug" in the header while prose says 2)? ③ every **Jira chip resolves**? ④ Plan tab's "now/next" consistent with finding statuses? ⑤ it's the **redeploy path (same URL)**, not a new chat artifact? ⑥ footer provenance line (sources + date) present? |

**Proportionality (the part that keeps it alive):** a typo, a reworded lede, a link fix, a Plan-tab status bump
→ **Gate B only** (near-free, no fresh agent). A new/changed/retracted finding → **Gate A too**. Without this
split the gate gets abandoned the first time you fix a comma — so honour it.

When in doubt whether something is load-bearing, it is → run Gate A.

---

## The build mechanism (why it re-renders forever)

The report is generated by a committed/kept `build-report.js` from markdown you version — **so any future session
rebuilds the identical artifact and publishes into the same URL.** The template lives next to this skill:
`build-report.js` + `report.example.md`.

Flow:
1. **Sources are markdown you keep** (in the workstream's repo, `docs/research/<area>/<feature>/…`). Prose,
   tables, buckets — all in md, never hand-authored into HTML.
   - **Two tiers, two homes.** The **published/shareable** sources — the research md, the findings ledger,
     `tracks[]` — stay **committed in-repo** (they're a product-team deliverable + the artifact re-renders from
     them; git-ignoring them would hide the findings). Any **personal working scratch** (raw notes,
     findings-before-judged, private plan) lives **central, per-project**:
     `~/.claude/worklog/workstreams/<project>/` (worklog's `checkpoint_dir`) — **never committed, never `tmp`**
     (tmp is session-wiped). The artifact only ever builds from the committed tier.
2. Optional **real oracle** — if the subject has a machine-checkable source of truth (a schema, a types file, a
   config), point a tab at it and render it verbatim. *(The example renders a zod schema; your subject may have
   none — that's fine.)*
3. `build-report.js`:
   - reads a leading **```json config** block in the md (title · eyebrow · lede · footer · `artifactUrl` · stats
     · ordered tab list),
   - splits the rest by `##` headings and renders each tab's section via `marked`,
   - **derives each `auto:` stat by tallying its marker** across the doc,
   - writes to a **stable path** (`REPORT_OUT`, else `$TMPDIR/…`) so it is session-independent.
4. **Publish:** call the **Artifact tool with `file_path` = that output AND `url:` = the fixed
   `/code/artifact/<uuid>`** → redeploys into the same artifact. First time only (no UUID yet): publish without
   `url`, then paste the returned `/code/artifact/<uuid>` into the md's `artifactUrl` so every later render
   targets it.

Run it two ways:
- **Folder project (house layout):** `REPORT_DIR=<project> node build-report.js` — reads `report.config.json`
  + assembles each tab from its **section folder** (`docs_vs_reality/`, …); status from `plan/tracks.json`. A
  tab may carry `views:[{id,label, file|oracleFile|section}]` for a switcher (per-feature / unified / oracle).
- **Single markdown (compat):** `REPORT_MD=<file> node build-report.js` — one md with a leading ```json config
  + `##` sections.

`marked` is resolved from `MARKED_PATH` / a global install / common local installs — a per-machine wiring step.

### Per-folder README index — unite + navigate (NEVER duplicate content)

When you create a **project** folder or a **section** folder, drop a thin **README index**. It holds only:
- **what this folder is** — the project, or *"this folder = the `<Tab>` tab"*;
- **the direct artifact link** (`artifactUrl`) — so you can jump to the live report from any folder;
- a **one-line list of the md files here** (navigation) + a back-link to the project README;
- frontmatter (`name · description · status`) so a docs/Research tab surfaces it cleanly.

**The hard rule:** a README is an **index + link, never a copy of the section's content.** The data lives once,
in the section md; the README points at it. Copying content into the README re-introduces the exact
duplication/drift the one-place rule exists to prevent. Project-root README = overview + artifact link + the
section/tab map + how-to-rebuild; section README = the thin index above. This is how the tree stays
self-describing and *united* without ever drifting.

---

## The design system

Ship the token block in `build-report.js` **as the default look the user likes — keep it.** The only *rule* is:
**name tokens for YOUR axes.** The example names them for a doc-vs-reality audit; a different report names them
for its own dimensions. Keep the structure identical:

- cool-paper ground, white panels, one accent for headings/active-tab, two more accents for your other axes,
  status colours (`ok / warn / bad / mute`), a mono eyebrow, a ~1080px column.
- Component vocabulary, top to bottom: **eyebrow → h1 → lede → stat bar → sticky tabs (each with a Jira ref
  chip) → panels of rendered md → [optional detail accordions / oracle code block] → footer provenance line.**

---

## The default tab recipe (axis-named, not domain-named)

**Findings · Coverage & Gaps · Detail · Reference · Plan.** Only **Plan** is universal; the rest are shaped to
your subject — rename freely.

- **Findings** — the judged ledger: a table of findings with bucket + where-it-routes + ticket, then the verdict
  narrative (incl. retractions).
- **Coverage & Gaps** — what IS covered vs the gaps to "full coverage"; say plainly what CI / tests do and don't
  cover, each gap → a ticket.
- **Detail** — the fine-grained data (the example: a per-field audit). One place only — never duplicate a table
  that also lives elsewhere, or the two copies drift.
- **Reference** — the full shape / schema / oracle. *If your subject has a code oracle, render it here.* A
  multi-view switcher (documented-example / unified / oracle) is a nice **technique when you have an oracle** —
  not a default; skip it when there's nothing to switch between.
- **Plan** — the tracker the user lives in. **Three parts, all with direct Jira links:**
  1. a **status-by-track table** — **generated from `tracks[]`**, not hand-typed (see below),
  2. an **ordered "active track → next" list** (prose in `## plan`),
  3. a **"who works in parallel + blockers" table** (`who | working on | hand-off/blocker`) — prose in `## plan`.

Status legend: 🟢 done · 🟡 in_progress · 🔴 blocked · ⚪ planned (reuse the user's house legend).

### `tracks[]` — the authoritative status store (one source, two consumers)

Put a `tracks[]` array in the md's leading **```json config** (the block the builder already parses). Each entry
carries **only**:

```json
{ "jira": "PROJ-42", "status": "blocked", "now_next": "≤1 plain line, shareable-safe", "updated": "YYYY-MM-DD", "artifact": "<deep-link or empty>" }
```

- `status` ∈ `done | in_progress | blocked | planned` → the house glyph. `jira` is the join key both this skill
  and `worklog` use. `updated` = the checkpoint date (lets worklog flag a roll-up as stale).
- **This block is the single place a reported track's status is authored.** The HTML Plan table renders from it;
  `worklog` rolls it up by `jira`. Edit `tracks[]` — never a second status table.
- **Exclude by construction — this is the privacy floor of the roll-up:** `tracks[]` holds **no hours, no other
  workstream, no colleague names.** Hours live only in worklog. The **"who works in parallel + blockers" table
  stays prose in `## plan` and is NEVER exported to `tracks[]`/the ledger** — it names people and is reviewable
  per publish. One report = **one workstream's tracks only**, never a cross-workstream store.
- **Reconcile rule (keeps daily-fresh without double-authoring):** worklog may keep a *provisional* one-line
  roll-up per reported track for its daily view; at each **reporting checkpoint the report's `tracks[]` is
  authoritative and overwrites that roll-up.** Checkpoint = judged truth; between checkpoints = provisional note.
- **The worklog-facing reader:** `read-tracks.js` (next to this skill) parses `tracks[]` and emits the roll-up
  line(s) — `node read-tracks.js <report.md> [--jira KEY] [--json]`. It's READ-ONLY and emits only the
  shareable-safe fields, so worklog's daily roll-up is deterministic instead of eyeballed.

---

## The checkpoint routine (what to actually do when fired)

1. **Confirm it's a checkpoint.** If unsure, propose ("looks like a reporting checkpoint — build/update the
   report?") rather than assume.
2. **Update the markdown** — fold the new findings / status into the versioned md. Keep prose simple, buckets
   honest, markers consistent (so the tally is right).
   - **The status store lives HERE, in the report — not in worklog.** Author each track's status in the md's
     **`tracks[]` config block** (schema below); the Plan-tab status table is **generated from it**
     (`tracksTable:true`) — never hand-type a second status table. This block is the **authority** for a reported
     workstream's status (judged, at each checkpoint). `worklog` **rolls it up read-only** by Jira key — the
     report never reads *from* worklog and never writes to it. (This flips an earlier draft that derived from the
     ledger: the report md already *is* the source of truth for the workstream, so status flows report → worklog,
     not the reverse.)
3. **Judge — Gate A** for any new/changed/retracted finding: dispatch a fresh independent agent with the
   evidence; only `SUFFICIENT` claims stay in.
4. **Re-render** — `node build-report.js`.
5. **Judge — Gate B** — the cheap coherence checklist (stats==tally, chips resolve, redeploy path, footer).
6. **Publish** — Artifact tool, `url:` of the fixed artifact → same link.
7. **Post to Jira** — comment on the ticket with the link: *"done X — updated the report: <link>"*.
8. **Offer the two suggesters** (below) — Jira status/time, and stale repo files.

---

## After publish — the two suggesters (propose, never auto-do)

A report update usually means other things are now stale too. Surface them as **two short proposals** the user
can take or wave off — never mutate Jira or a file without a yes (ask-before-mutating / show-before-posting).

### Suggester 1 — Jira status · time · report comment
After the artifact is published, offer, in one line each (only the ones that apply):
- **Report comment** — *"post the report link on `<TICKET>`?"* (the step-7 comment, if not already done).
- **Status** — if the work visibly moved a track (🔴→🟡→🟢, or a track is Done/Ready-for-review), *"move
  `<TICKET>` to `<status>`?"* — then transition on confirm.
- **Time** — *"log time for this?"* → hand to the **`worklog`** skill (it drafts-and-confirms; log the user's
  human oversight time, not agent hours, to an existing task — never a new ticket). Don't log time yourself;
  let worklog own it.

Show the exact comment/transition text and **wait for an explicit "post"/"go"** before writing.

### Suggester 2 — stale repo files
The report is built from versioned md, but a workstream usually has *other* in-repo docs that the new findings
may have outdated (a feature README, a STATE/ops page, a sibling research doc, a findings ledger). After a
checkpoint:
- Glance at the obvious related files (same folder, linked docs) for ones whose content now **contradicts** the
  fresh findings.
- For each, offer one line: *"`<path>` looks outdated vs finding F-x — update it?"* or, when you're not sure it's
  stale, *"`<path>` may be affected — want me to verify it against the new findings?"* (a Gate-A-style check /
  claim-review, not a blind edit).
- On confirm, update the file **in the same change** and keep it honest; if it's a load-bearing claim, it passes
  the finding judge first (Gate A). Never silently rewrite a doc.

Both suggesters are **offers**. One, both, or neither may apply — keep them to a line or two, and if nothing is
stale and the ticket's already current, say so and stop rather than inventing busywork.

---

## Worked example — a coherence audit (one filled-in instance, anonymised)

A sketch of how a real instance maps to the method above; **the example, not the body** — its specifics are the
subject's, not the method's.

- **Sources (versioned):** `<repo>/docs/research/<area>/<feature>/` → a `<feature>-report.md` (leading config +
  `##` sections: method / findings / coverage-matrix / verdict) + a per-feature `field-level-audit.md`
  (`####` tables) + a judged `bugs.md` ledger + the filled-in `build-report.js`.
- **Oracle:** a real schema file from the product repo (e.g. `<repo>/src/.../schemas.ts`), rendered in a
  "Full schema" tab with a 3-way switcher (per-feature examples / unified response / the schema). *The switcher
  is an example technique; it exists because this subject has a code oracle.*
- **Tabs (this instance):** Docs-vs-Reality · Coverage & Gaps · Field-level · Full schema · Plan.
- **Artifact:** one `/code/artifact/<uuid>` URL, re-rendered to the **same** url by `node build-report.js` +
  the Artifact tool's `url=` param (never a chat artifact).
- **Judge in action:** one finding ("a search field is non-zero on prod") was **RETRACTED as false** by an
  independent verdict judge after a controlled prod re-read (all sampled rows were zero); two others were
  reworded the same way. That reversal is *shown* in the report — proof the gate works.
