---
name: debug-with-evidence
description: >-
  Adds targeted logs or assertions, interprets stack traces and output, proposes
  the smallest fix, and removes noisy temporary debugging when done. Use when
  debugging, errors, flaky tests, or when the user says debug with evidence,
  logs, or unblock.
---

# Debug with evidence

## Goal

Move from **symptom** → **measured evidence** → **smallest fix**. No guessing; no broad refactors mid-debug.

## Steps

1. **Capture** the exact error: message, stack, file/line, exit code, last command, relevant log lines.
2. If unclear **where** it fails: add **minimal** logging or assertions at layer boundaries (request in/out, DB call, parse)—not print-everywhere spam.
3. **Reproduce** in one command, one test, or one route.
4. **Hypothesize** (max 3 causes); **disprove** with one check or one log line each.
5. **Fix** the narrowest layer (typo, env, import order, wrong config).
6. **Remove** temporary debug noise before finishing—unless gated (`if (DEBUG)` / env) or kept as a useful diagnostic.
7. **Verify:** lint, typecheck, tests, build as applicable; report pass/fail per step.
8. If still blocked: **isolate** (mock, flag, skip) so others can proceed; note in **`docs/learned.md`** if non-obvious.
9. If the fix was **non-obvious**, append a one-line lesson to **`docs/learned.md`**.

## Anti-patterns

- Refactor-the-world while debugging unless the bug **is** structural.
- New dependencies to fix a one-line mistake.

## Output format

```markdown
## Symptom
…

## Evidence added
…

## Repro
```bash
…
```

## Root cause
…

## Fix
…

## Cleanup
- Removed temporary: … / Kept because: …

## Verification
- lint: …
- typecheck: …
- tests: …
- build: …
```
