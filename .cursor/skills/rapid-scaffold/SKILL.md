---
name: rapid-scaffold
description: >-
  Chooses the smallest viable architecture for an idea, proposes folder layout,
  install commands, env vars, and a concrete first milestone. Use when starting
  a new feature stack, greenfield slice, or when the user says rapid scaffold,
  greenfield, or smallest viable setup.
---

# Rapid scaffold

## Goal

Get from **idea → runnable skeleton** with the **fewest moving parts** that still match the hackathon stack (or the repo’s existing stack).

## Steps

1. **Restate the idea** in one sentence and list **must-have vs nice-to-have** for the demo.
2. **Propose three architectures** (e.g. monolith vs API+SPA vs serverless), each with:
   - moving parts count
   - main risk
   - time to first screen
3. **Recommend one** (smallest viable). Say explicitly what you are **not** building yet.
4. **Scaffold** (or extend existing repo):
   - Directory layout consistent with the chosen stack and this repo
   - **Install** commands (package manager lockfile if applicable)
   - **`.env.example`** with every variable named and documented one line each
   - **Single command** to run dev server (document in README if not already)
5. **First milestone** (finishable in one sitting): one bullet list with checkboxes, e.g. “[ ] home route renders [ ] mock data [ ] one API call stub”.

## Output format

Use this template:

```markdown
## Recommendation
**Chosen:** …
**Rejected:** … (one line each)

## Structure
```
(tree or list)
```

## Commands
```bash
# install
# dev
```

## Env (`.env.example`)
| Variable | Purpose |
|----------|---------|

## Milestone 1
- [ ] …
```

## Constraints

- Reuse **existing** tooling in the repo when present; do not swap stack without a reason.
- **No new dependency** unless it clearly saves time vs hand-rolling.
