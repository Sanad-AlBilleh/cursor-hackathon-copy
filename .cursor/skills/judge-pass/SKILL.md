---
name: judge-pass
description: >-
  Reviews the project like a hackathon judge: value clarity, wow moment, setup
  risk, polish, and obvious bugs—then fixes the top score-killers first. Use for
  pre-submit review, brutal feedback, or when the user says judge pass or score.
---

# Judge pass

## Goal

Simulate **judge pressure**: clarity, risk, polish, bugs—then **fix the top three** killers before anything else.

## Rubric (score mentally 1–5 each)

| Axis | Question |
|------|----------|
| **Value** | What problem is solved, in one sentence? |
| **Wow** | What is the memorable moment in 60 seconds? |
| **Setup** | Can a stranger run it from README in one command? |
| **Polish** | Typography, spacing, copy, empty states—intentional? |
| **Bugs** | Crashes, 404s, broken forms, obvious console errors? |

## Steps

1. **Walk** the README “quick start” and demo script **as written**; note every friction point.
2. **List** issues ranked by **impact / effort** (highest impact, lowest effort first).
3. **Fix top 3** score-killers or document them as **must-fix** if time-constrained.
4. **Report** in a short table: issue | severity | fix | status.

## Output format

```markdown
## Verdict (1–2 sentences)
…

## Top issues (ranked)
1. …
2. …
3. …

## Fixes applied
- …

## Remaining risk (if any)
- …
```

## Constraints

- Prefer **fixes** over **essays**; if the app is fine, say so and suggest **one** optional polish.
