# Reviewer & judger — prompt templates

Two agents per PR. Both are spawned `general-purpose` (or a repo-matched implementer agent) with an **explicit
prompt** — **never a bare `fork`** for the judge (a fork inherits this chat and mimics; observed 0 tool-uses).
The reviewer finds; the judger independently verifies and reaches its own verdict.

## Scoping (do this before spawning)

- Resolve the layered rule set → `rules-resolution.md`. Paste the deduped checklist into both prompts.
- Determine the PR's OWN delta range (stacked → `origin/<base>...origin/<head>`).
- Decide mode (parallel fan-out vs sequential-planned) → SKILL.md.

## Reviewer prompt (template)

> You are reviewing PR #N (`<head>` → `<base>`) in `<repo path>`. Read the PR's OWN delta:
> `git diff origin/<base>...origin/<head>`. Read the FULL changed files, not just hunks.
>
> Judge against THIS rule set (resolved for this repo): **<paste GLOBAL + PROJECT + LINKED checklist>**.
>
> Ground every finding in `file:line`. Check specifically:
> - **Secrets / hardcode** — grep the delta for credentials, tokens, keys, hard ids/urls/passwords that belong
>   in env/config. (A password a test MINTS for an ephemeral account it tears down is test-data, not an ingress
>   secret — flag as DRY/reuse if a shared constant exists, not as a secrets-floor block.)
> - **DRY / reuse** — does it add a SECOND shape for a concept the repo already does once? Is there an existing
>   helper/constant/page-object it should reuse? (Grep the repo for the nearest example.)
> - **Honest reds** — any `skip`/`.only`/commented-out test, or a known-bug marker (`fail`/`fixme`) WITHOUT a
>   real ticket + what's-wrong + url? For each marker, confirm the ticket exists (don't assume).
> - **Assert-don't-sleep** (test repos) — banned `waitForTimeout`/`networkidle`/`domcontentloaded`/bare sleep.
> - **Correctness trace** — for each NEW request/helper/client method the PR adds, follow the data path end to
>   end: does the body it builds match what it serialises (e.g. a `FormData`/multipart payload run through a
>   JSON `buildCurl` emits `-d '{}'`), does the diagnostic curl carry the real body, and is the test's *oracle*
>   the behaviour under test (not a trivially-true line like `not.toContain('success')` that an empty body
>   passes)? Rule-grounded reviews miss serialiser/oracle bugs — trace them explicitly.
> - **Project-specific laws** — walk each PROJECT rule one by one.
> - **tsc / lint** — run them; if a failure looks pre-existing, run the same on `origin/<base>` and attribute
>   introduced-vs-inherited, with evidence.
> - Do NOT run the live suite (needs a live env + secrets) — static review + tsc + lint only.
>
> Return: VERDICT (APPROVE / APPROVE-WITH-NITS / BLOCK) · Blocking (file:line + rule + why) · Minor (file:line) ·
> What's good (1-3 lines) · tsc/lint result (introduced vs inherited). Post nothing.

## Judger prompt (template) — FRESH, independent, skeptical

> You are an INDEPENDENT judge. Reach your OWN verdict from evidence — do not rubber-stamp the reviewer. You MUST
> open files with Read/Grep and cite `file:line`; a claim you didn't open is a failure. Work in `<repo path>`,
> PR #N, delta `git diff origin/<base>...origin/<head>`. Do NOT run the live suite.
>
> Here are the reviewer's findings: **<paste reviewer output>**. For EACH finding: reproduce it against the
> actual code. KILL any finding you cannot substantiate (say why). For each claimed red (test/tsc/lint), PROVE
> it is PR-introduced and not pre-existing on `origin/<base>` — run the gate on the base if needed.
>
> Then judge the PR yourself against this rule set: **<paste GLOBAL + PROJECT + LINKED checklist>** — add
> anything the reviewer missed, with `file:line`.
>
> Return: your own VERDICT · confirmed blockers (cited) · findings you REJECTED and why · anything new · the
> pre-existing-vs-introduced proof for every red. A finding must be real and cited, not plausible. If the PR is
> clean, say so plainly — do not manufacture findings.

## Reconcile

- Keep only findings the judge **confirmed**. Note anything the judge rejected (and why) for transparency.
- Blocking = confirmed rule violation that must change before merge. Nits = confirmed but non-blocking.
- One verdict per PR. For stacked PRs, report merge order (base first).

## Mode wiring

- **Parallel fan-out:** per PR run reviewer→judger; launch all PRs' chains concurrently; collect, then report.
- **Sequential-planned:** emit the ordered plan (stacked/dependency first), then run one PR's reviewer→judger,
  report it, and move to the next — so the user stays in the loop between PRs.
