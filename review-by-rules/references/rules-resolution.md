# Resolving the layered rule set

A PR is judged against the rules that govern **that repo**, assembled from three layers. Collect all three,
dedupe, and hand the reviewer + judge one explicit list — never a generic or remembered bar.

## Layer 1 — Global (every project)

The security/quality floor, same in every repo. Source: `~/.claude/CLAUDE.md` (the user's global rules).
Always in force, even if the repo says nothing:

- **Credential safety** — no secret in tool args, output, files, or committed code (highest priority, overrides all).
- **DRY / KISS / reuse-before-writing** — one shape per concept; find the nearest existing example and copy it;
  flag a *second* design for a concept that already has one.
- **No hardcoded values** that belong in config/a constant (secrets always; also magic ids/urls/passwords).
- **Verify before asserting** — ground every claim in real code (`file:line`); content wins over labels.
- **Honest reds / todo-discipline** — a known bug stays red+visible via the runner's marker with a real ticket;
  never skip/weaken to force green; no TODO without ticket+trigger.
- **Destructive-command caution** — never force-push / drop / rm-rf / merge on the agent's own say-so.

## Layer 2 — Project (this repo)

Read, in the repo being reviewed:

- `.claude/rules/*.md` — every file. These are the repo's binding laws (e.g. a repo's own `<repo>.md`, plus
  generic rule files like `test-quality.md`, `secrets.md`, `reuse-before-writing.md`, …).
- `.claude/CLAUDE.md` and any parent `CLAUDE.md` — project memory / conventions.
- A repo may **add** rules on top of the global floor but never relax below it.

```bash
# in the repo under review
ls .claude/rules/ 2>/dev/null
cat .claude/CLAUDE.md 2>/dev/null
```

## Layer 3 — Linked (what the repo points up to) — OPTIONAL

Some repos don't carry the full rule text — they **link** to a central authority. This layer is **optional**:
if your org has no central registry, skip it and review on Layers 1–2 alone (see the note at the end). Two
mechanisms:

- **A central rule registry** (if your org has one). A registry that maps a repo → its binding rules + a shared
  common-rule floor. For a repo registered there, the common-rule floor + any repo-specific rules live in the
  registry rather than in the repo. Resolve it through whatever interface the registry exposes:
  - The registry's **repo→rules lookup** — e.g. an MCP tool that, given a repo name/URL, returns the rules the
    central service holds for it (the shared common-rule floor + repo-specific rules). Pass the repo, fold the
    returned rules in.
  - A **rule-by-id fetch** — open a specific `rule://` pointer by its id.
  If the registry also centralizes authoring/methodology skills, that's useful when judging whether a *test*
  follows its level's methodology.
- **`rule://` pointers in code or a repo rule.** A repo rule that says "see `rule://e2e-ui`" or
  "`rule://test-registration`" is deferring to central text — follow it and fold it in. (E.g. a repo's
  `<repo>.md` points up to a shared `test-quality` bar that the central registry holds.)

> Example (all three layers): a repo's PRs judged against its own `.claude/rules/<repo>.md` **plus** the global
> DRY/KISS/no-hardcode floor **plus** the common rules the central registry links for it.

## Output of resolution

A single deduped checklist the reviewer and judge both work from, e.g. (here the repo is a Playwright e2e-test
repo with a `.claude/rules/<repo>.md`):

```
GLOBAL:  secrets · DRY/KISS · reuse-before-writing · no-hardcode · verify(file:line) · honest-reds · destructive-caution
PROJECT: <repo>.md (independence · data-via-API · injected-auth · assert-don't-sleep · stableId-in-title · honest-reds · page-objects)
LINKED:  central registry repo→rules lookup → test-quality floor · test-registration (rule://)
```

If a layer is genuinely empty (no `.claude/rules/`, no central registry), say so — don't invent rules. A repo
with **no project and no linked rules is reviewed against the global floor (Layer 1) alone** — that is valid and
correct, not a failure; just state that the bar is the global rules only.
