---
name: ship-demo
description: >-
  Adds sample data, polishes the happy path, improves copy, and loading/empty/error
  states so a judge can grok value in about a minute. Use before demo, polish pass,
  or when the user says ship demo, demo ready, or judge walkthrough.
---

# Ship demo

## Goal

Make the **happy path obvious** and the app **look intentional** in **~60 seconds** of use.

## Steps

1. **Happy path** map: 3–5 steps from open → “wow” moment. Remove or hide dead ends.
2. **Sample data**: seed script, fixture, or defaults so the demo **never starts empty** unless empty is the point.
3. **States** for main flows:
   - **Loading** (skeleton or spinner, not a blank screen)
   - **Empty** (helpful message + CTA)
   - **Error** (human readable + retry or fallback)
4. **Copy**: headlines, buttons, errors—short, concrete, no lorem ipsum in visible UI.
5. **Demo script**: add or update a **“Demo (60s)”** section in README with exact clicks/typing and expected result.
6. **One-command start**: confirm README has copy-paste install + run; fix if not.

## Output checklist

- [ ] Judge can follow README demo without asking questions
- [ ] No silent failures (toasts or inline errors)
- [ ] Primary CTA visible above the fold where applicable

## Constraints

- Do **not** add new features unless they **directly** support the demo narrative.
- Cosmetic polish **after** the happy path is stable.
