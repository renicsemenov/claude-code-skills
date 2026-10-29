---
name: security-review
description: Forensic security review of a code change — the current working diff, a branch, or named files — for real, exploitable vulnerabilities, credential-safety first. Ranks findings by severity with a concrete exploit path and a fix, and never applies a fix or touches a secret without explicit confirmation. Use when the user asks to security-review a change, audit a diff/PR/branch for vulnerabilities, check for leaked secrets or injection/authz/SSRF issues, or says "is this safe to merge". Not a full-codebase pentest (scope it to a change) and not a license/style linter.
---

# Security review

Review a **change** — not the whole repo — for vulnerabilities that a real attacker could exploit.
The goal is **signal**: a short list of genuine, ranked, fixable findings, each with an exploit path,
not a wall of linter noise. Default scope is the current working diff; widen only when asked.

## Credential safety comes first (absolute — overrides everything)

Before anything else, and above every other finding: **never leak or echo a secret.** If the diff
adds, prints, logs, hardcodes, or commits a password, API key, token, cookie, connection string, or
private key — that is the **top finding**, reported as CRITICAL.

- **Never print the secret's value** in your findings, edits, or explanation — cite it by
  file:line and *kind* ("an AWS key on `config.ts:12`"), never the characters.
- If a real secret appears to be committed, **stop, flag it, and recommend rotation** — a
  committed secret is compromised even if later removed (it stays in history).
- Confirm gitignore status with `git check-ignore`; never `cat` an env file to "verify" it.

## Scope (pick from what the user said; default = working diff)

- **Working diff:** `git diff` + `git diff --staged` (uncommitted change under review).
- **Branch vs base:** `git diff <base>...HEAD` (default base = the repo's main/master).
- **Named files / dir:** just those paths.
- **A PR:** fetch its diff (`gh pr diff <n>`), review that.

Read the changed hunks **and enough surrounding code** to judge reachability — a line is only a
vulnerability if an attacker can actually reach it with attacker-controlled input.

## The pass

1. **Map the attack surface of the change** — what new input, endpoint, query, file path, command,
   deserialization, or privilege boundary does this diff introduce or touch? Note trust boundaries
   (user → server, service → service, tenant → tenant).
2. **Hunt the vulnerability classes** in [REFERENCE.md](REFERENCE.md) against that surface —
   injection, authz/IDOR, secrets, SSRF, unsafe deserialization, path traversal, XSS, crypto misuse,
   race/TOCTOU, DoS, and dependency/supply-chain.
3. **Verify each candidate before reporting it (guilty-until-proven-exploitable).** Trace the input
   from an attacker-controlled source to the sink. If a framework, an upstream validator, an ORM
   parameterization, or an authz middleware already neutralizes it, **drop it** — a finding that
   isn't reachable or is already mitigated is noise, and noise gets the real ones ignored. Say what
   you checked.
4. **Rank** each survivor **CRITICAL / HIGH / MEDIUM / LOW** by *exploitability × impact* (see
   REFERENCE for the rubric). A theoretical issue behind three other controls is LOW; a reachable
   authz bypass is CRITICAL.

## Report

Lead with a one-line verdict — **safe to merge / fix before merge / needs discussion** — then a table:

| Sev | Finding | Where | Exploit path | Fix |
|---|---|---|---|---|
| 🔴 CRITICAL | Tenant A can read Tenant B's invoices | `api/invoices.ts:44` | `GET /invoices/:id` uses the id without an owner check | scope the query to `session.orgId` |

For each finding give a **concrete exploit** (the request/input that triggers it) and a **specific
fix**, not "sanitize input". If the change is clean, **say so plainly** — "no exploitable issues in
this diff" is a valid, honest result; don't manufacture findings to look thorough. End with what you
did **not** cover (out-of-scope files, runtime config you couldn't see).

## Fixing — only on request, never unattended

- **Default to reporting, not fixing.** Apply a fix only when the user asks, and **confirm the
  specific change first** — a security fix that changes behavior can break callers.
- **Never weaken a check, add a bypass, or disable a protection** to make something pass.
- A known-but-unfixed issue should stay **visible** (a tracked ticket / a comment), never silently
  swallowed.

## Notes

- **Assume authorized use.** This is defensive review of the user's own change. If asked to build an
  exploit for a system that isn't theirs, decline.
- Scale to the ask: "quick check this diff" → one focused pass, high-confidence findings only;
  "thorough audit before release" → every class in REFERENCE + the dependency surface, RISKY tier
  included.
