---
name: close-task
description: >-
  Updates docs/steps.md and docs/learned.md when needed, runs lint, typecheck,
  tests, and build, then summarizes status. Use when finishing a task, before
  PR, or when the user says close task, wrap up, or done.
---

# Close task

## Goal

Leave the repo in a **honest** state: docs reflect reality, checks ran, summary is clear.

## Steps

1. **Confirm** what was completed vs deferred; update **`docs/steps.md`**:
   - milestone
   - in-progress (clear or set next)
   - **next 3 steps**
   - add to **done recently** if useful
2. If this task surfaced a **non-obvious** lesson, append to **`docs/learned.md`** (short).
3. If demo flow changed, update **`docs/demo.md`** and/or **README** one-command section.
4. **Run** project checks (only what exists):
   - lint
   - typecheck
   - tests
   - build
5. **Report** exactly what passed and failed; if something failed, do **not** claim the task is fully closed unless the user accepts the debt.
6. Suggest **commit message** scope if helpful (optional).

## Output template

```markdown
## Completed
- …

## Docs updated
- steps.md: yes/no
- learned.md: yes/no
- demo.md / README: yes/no

## Checks
| Check | Result |
|-------|--------|
| lint | … |
| typecheck | … |
| tests | … |
| build | … |

## Summary
…
```
