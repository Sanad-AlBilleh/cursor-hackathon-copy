---
name: plan-feature
description: >-
  Reads docs/spec.md and docs/steps.md, then produces goal, affected files,
  risks, and ordered implementation steps for a major feature. Use when starting
  a non-trivial feature, refactor, or when the user says plan feature or
  architecture before code.
---

# Plan feature

## Goal

Align on **what** and **in what order** before editing code—output is copy-pasteable into chat or `docs/steps.md`.

## Steps

1. **Read** `docs/spec.md` and `docs/steps.md` (if missing or empty, note gaps and infer from codebase).
2. **Restate** the feature in one sentence; list **in scope** vs **out of scope** for this pass.
3. List **affected files** (create vs modify) with one line each.
4. **Risks:** top 3 (technical, time, integration).
5. **Implementation order:** numbered steps, each small enough for one PR or one agent turn.
6. If `docs/steps.md` is stale, **suggest exact edits** for milestone + next 3 steps.

## Output template

```markdown
## Goal
…

## In / out of scope
- In: …
- Out: …

## Affected files
| File | Create/modify | Note |
|------|----------------|------|

## Risks
1. …
2. …
3. …

## Order of work
1. …
2. …

## Suggested updates to docs/steps.md
…
```

## Constraints

- Do **not** implement in this skill—plan only unless the user asks to proceed.
- Prefer **extending** existing modules over new top-level folders.
