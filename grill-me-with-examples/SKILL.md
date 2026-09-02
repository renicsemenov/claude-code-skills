---
name: grill-me-with-examples
description: Grill the user on decisions that benefit from visualizations + pros/cons, across a fidelity ladder — plain terminal (AskUserQuestion options with ✓/✕ pros/cons + a "(Recommended)" default), illustrated terminal (+ ASCII sketches / side-by-side / before-after), or an interactive web Artifact (faithful mockups in the project's real tokens). When the right fidelity is a toss-up, the agent offers the user an explicit choice (terminal-illustrated vs interactive web) with a recommended default; when it's obvious it just proceeds. Use when deciding data-model/architecture/naming/sequencing (terminal) or UI look/layout/spacing/clicks/hover ("show me" → web) and the user benefits from seeing options.
---

# Grill me — with examples

The sibling of the plain `grill-me` skill. Same relentless, one-branch-at-a-time interviewing
and shared-understanding goal — but when a decision is **visual or experiential**, a written question
under-serves it. People choose layout, spacing, density, and component treatments far better when they
can *see and click* the options. So this skill resolves those branches with an **interactive Artifact**.

Use it when: the user says "show me examples / variants / mockups", is picking between layouts or UI
treatments, asks "how will it look", or any time the tradeoff is easier to judge with eyes than words.

## The fidelity ladder — three tiers, cheapest first

One skill, three fidelities. Match the tier to what the decision actually hinges on; don't pay for pixels
when a sketch decides it, and don't cramp a look-and-feel call into ASCII.

1. **Plain terminal** — `AskUserQuestion`, options + ✓/✕ pros/cons, `(Recommended)` first. For decisions
   judgeable from words alone: data-model, architecture, governance, naming, sequencing.
2. **Illustrated terminal** — same, but each option's `preview` carries a real **ASCII sketch**: a schema
   shape, a layout box-diagram, a side-by-side, a before/after text block. The middle ground for
   layout-ish or structural choices that need *showing* but not *pixels*. Still zero context-switch.
3. **Interactive web Artifact** — a clickable mockup in the project's real tokens. For decisions that hinge
   on **look / layout / spacing / density / hover / dropdowns / a real rendered comparison**, or when the
   user says "show me / let me see it".

### Step 0 — pick the fidelity (offer the choice when it's a toss-up)

- **Obvious → just proceed.** Pure logic → tier 1/2 inline. User said "show me / render it / let me see"
  → tier 3. Don't ask a question whose answer is already clear.
- **Genuinely ambiguous (a layout/structure call that *could* go either way) → offer it.** One quick
  `AskUserQuestion`: *"How do you want to decide this?"* with a **recommended** tier pre-marked so a
  decisive user one-taps:
  - `Illustrated in terminal (Recommended)` — ASCII options now, no context-switch. *(preview: a tiny
    ASCII sketch of what that looks like)*
  - `Interactive web mockup` — clickable, real tokens, feel the spacing/hover. *(preview: "opens a link")*
  - `Just recommend + go` — take your pick, no picker. *(for when the user trusts the default)*
- Respect the answer as a **standing preference** for this decision's follow-ups — don't re-ask each branch.
- **Decisive fast-path (from the user's style):** always mark a `(Recommended)` default so the reply can be
  a bare "go with X" or "no option selected · this seems good" → take the recommended one and continue.
  Bundle tightly-coupled decisions into one call (≤4 questions); keep independent ones separate; stay terse.

## Rules (inherited from grill-me)

- Walk the decision tree **one branch at a time**; resolve dependencies in order.
- For each decision, give your **recommended default** so the user can just confirm.
- **Explore the codebase / read docs yourself** to answer anything you can — don't ask what you can find.
- **Challenge assumptions**; flag anything risky or that fights the existing design system.
- Separate **bug-fixes** (just apply them) from **real choices** (put those in the picker).
- End with a **summary of decisions** and confirm before implementing.

## The added move: make it visual

For decisions with a visual/UX tradeoff, don't ask in prose — **build one interactive Artifact** that
covers the open decisions, then send the link and wait.

### Before building — ground it in the real design

1. **Find the project's design system.** Read the theme/token source (CSS custom properties,
   `tailwind.config`, `globals.css`, component library). Extract the actual color values, fonts, radii,
   spacing. The mock must look like *their* app, not a generic demo — this is what makes it trustworthy.
2. **Load `artifact-design`** (required before writing any Artifact) to calibrate the treatment.
3. **Separate axes.** List the independent decisions (e.g. width, a column strategy, a component
   behavior). Each becomes its own control. Note which "options" are actually just fixes.

### The Artifact must have

- **Faithful, live mockups** — render the real UI (real component structure + real data from the task,
  never lorem) using the extracted tokens. Switching a control **re-renders the mock**, it doesn't just
  swap a caption.
- **A control per decision** — segmented toggles, clearly labelled and numbered.
- **Preset "packs"** — 2–4 named combinations (e.g. "Calm / Balanced / Dense") that set several
  decisions at once, with **one marked recommended**. Packs give a fast path; individual toggles give
  control.
- **Live pros / cons** that update with the selection, and a visible note listing what's applied in
  *every* variant (the bug-fixes) so the user knows what's not up for debate.
- **A way to report the pick** — a "copy pick" button and/or a clear summary line the user can paste
  back to you.
- **A "before / current" option where it clarifies** — if a variant demonstrates the existing bug,
  make that visible so the fix's value is obvious.

### Build & delivery notes

- Self-contained HTML (Artifact CSP blocks external CDNs/fonts) — inline all CSS/JS, embed assets as
  data URIs, use system/`@font-face`-data-URI fonts.
- Write the file to a scratch/temp dir, then publish with the `Artifact` tool. Keep the picker file
  **out of git** unless the user says otherwise (it's a decision aid, not shipped code).
- Responsive; wide mock content scrolls inside its own container, never the page body.
- Redeploy to the **same file path** to iterate on the same URL when the user asks for changes.

### Prove the mock is real — self-check before sending

A picker is only trustworthy if it's faithful; an unverified mock quietly lies and the user decides on a
fiction. Before publishing, confirm — and say you did:
- **Real tokens, extracted not guessed** — the colors/fonts/radii/spacing came from the project's actual
  theme source, not eyeballed. If you couldn't find them, say so rather than inventing.
- **Real data, not lorem** — the mock renders the task's actual content/component structure.
- **Controls actually re-render** — switching a toggle changes the *mock*, not just a caption; open the
  published URL yourself (WebFetch/screenshot) and confirm it loads with no CSP/console errors and the
  variants visibly differ.
- **Bug-fixes marked as not-up-for-debate** — the "applied in every variant" note is present so the user
  doesn't think a settled fix is a choice.
If any check fails, fix it or downgrade to illustrated-terminal rather than ship a mock you can't stand behind.

## Techniques that make the picker land

Reach for these when they serve the decision — not all at once. The goal is that the user *feels* the
tradeoff, not just reads it.

- **Simulate the real context.** If the choice is about size/space, draw the target environment (a
  browser frame at a stated viewport, a phone bezel, a print page) and render the option inside it, with
  the leftover space visibly marked (hatched margins, a ruler). Seeing "~190px of margin each side" beats
  the number alone.
- **Presets + fine controls, together.** Named "packs" for a fast confident pick; per-axis toggles for
  the tinkerer. Mark the active pack when the toggles happen to match one.
- **Animate the transition.** A short (~300ms) eased transition when a control changes makes the
  difference between two options legible — the eye tracks what moved. Respect `prefers-reduced-motion`.
- **Before / after, honestly.** Include a "current" or "bug" state where it exists, so the fix's value
  is self-evident. Mark clearly which option is today's behavior.
- **Live rationale.** Pros/cons (and a "what's fixed in every variant" note) that update with the
  selection — the reasoning stays attached to what's on screen.
- **Close the loop.** A "copy pick" button that yields a one-line, paste-back summary
  (`width=1536 · triggers=flow · rail=sticky`) so the user's choice returns to you unambiguously.
- **Real tokens, real data, real components.** Rebuild the actual component structure with the project's
  real values and the task's real content. Fidelity is what makes the mock trustworthy enough to decide on.
- Optional when they fit: a **drag slider** to sweep a continuous value (width, spacing, count);
  **side-by-side** rendering of two variants; **hover/focus** states shown live; a **density/zoom** control.

## Workflow

1. Interview to surface the decision tree; settle non-visual branches in text (grill-me style).
2. For each visual/experiential branch, **pick the fidelity (Step 0)** — proceed if obvious, else offer the
   terminal-vs-web choice with a recommended default.
3. Tier 1/2 → ask inline with ASCII previews. Tier 3 → read the design tokens → load `artifact-design` →
   build the picker → run the **prove-the-mock-is-real** self-check → publish → **send the link** and say
   what to look at.
4. Take the user's pick (and any freehand notes), confirm the full decision summary, THEN implement.
5. Offer to iterate on the picker (same URL) if they want more/different variants.
