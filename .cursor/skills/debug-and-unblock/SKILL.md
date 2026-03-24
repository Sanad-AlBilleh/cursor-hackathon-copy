---
name: debug-and-unblock
description: >-
  Reads logs and errors, isolates root cause, proposes the fastest fix first,
  and avoids broad refactors. Use when debugging, stuck, build failures, flaky
  tests, or when the user says unblock, error, or broken.
---

# Debug and unblock

## Goal

**Shortest path** from symptom → **known cause** → **smallest fix** that restores progress.

## Steps

1. **Capture** the exact error: message, stack, file/line, exit code, last command.
2. **Reproduce** in the smallest way (one command, one test, one route).
3. **Hypothesize** (max 3 causes), rank by likelihood; **disprove** with one check each.
4. **Fix** the narrowest layer first (typo, wrong env, wrong import, config order).
5. **Verify**: lint / typecheck / tests / build as applicable; report **pass/fail** per step.
6. If still blocked: **isolate** (feature flag off, mock, skip) so the **rest of the team** can proceed; document the temporary workaround.

## Anti-patterns

- **No** refactor-the-world while debugging unless the bug **is** a structural impossibility.
- **No** new dependencies to “fix” a one-line mistake.

## Output format

```markdown
## Symptom
…

## Repro
```bash
…
```

## Root cause
…

## Fix
…

## Verification
- lint: …
- typecheck: …
- tests: …
- build: …
```
