# Current plan

**Purpose:** Tactical, living document. Agent and humans should **update this** as milestones move.

## Milestone

M2 — Focus features + polish

## In progress

- Live QA: test gaze v2, timer, alarm escalation, noise, break system with real webcam

## Next 3 steps

1. Judge pass: review for score-killers, fix top issues
2. Final polish: copy, spacing, CTA clarity
3. Record backup demo video (60s screen recording) in case live demo fails

## Blocked / waiting

- none

## Done recently

- **Gaze detection v2:** frame quality scoring (EAR + head angle), symmetric vertical away detection, AFK recalibration, rolling head baseline via EMA, adaptive smoothing, head-only away override, low-quality grace period, debug instrumentation
- **Ship demo pass:** filled in spec.md, demo.md with real content; added 60s demo script to README; fixed README Next.js version (14 → 16); fixed accountability API hardcoded trigger_reason bug; added error.tsx and loading.tsx for root + dashboard routes; added calibration progress percentage to session UI
- Fixed extension session gating: extension now only triggers during active sessions (not when any Zoned tab is open)
- Added focus countdown timer with preset/custom durations and auto-pause when distracted
- Added break system: 5-minute breaks, max 2 per hour, with break overlay and PiP support
- Implemented 3-level gaze-away alarm escalation (30s gentle / 45s strong / 60s critical)
- Enhanced noise detection with conversation/speech pattern detection via voice-band energy variance
- Added environment change suggestion popup with contextual messages and 5-minute cooldown
- Updated PiP window with countdown timer, break controls, and alarm level indicator
