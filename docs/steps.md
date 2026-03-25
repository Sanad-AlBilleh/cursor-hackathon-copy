# Current plan

**Purpose:** Tactical, living document. Agent and humans should **update this** as milestones move.

## Milestone

M2 — Focus features + polish

## In progress

- none

## Next 3 steps

1. Manual QA: load extension, start session, test timer + gaze alarm + noise popup + break system
2. Ship demo: seed data, polish happy path, update demo.md
3. Judge pass: review for score-killers, fix top issues

## Blocked / waiting

- none

## Done recently

- Fixed extension session gating: extension now only triggers during active sessions (not when any Zoned tab is open)
- Added focus countdown timer with preset/custom durations and auto-pause when distracted
- Added break system: 5-minute breaks, max 2 per hour, with break overlay and PiP support
- Implemented 3-level gaze-away alarm escalation (30s gentle / 45s strong / 60s critical)
- Enhanced noise detection with conversation/speech pattern detection via voice-band energy variance
- Added environment change suggestion popup with contextual messages and 5-minute cooldown
- Updated PiP window with countdown timer, break controls, and alarm level indicator
