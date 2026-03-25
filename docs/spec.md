# Product / architecture spec

**Purpose:** Stable, high-level description of what we are building and how it is structured. Update rarely; link from here when details live in code.

## Problem

People with ADHD (and anyone who struggles to stay on task) lack real-time, non-judgmental accountability during work sessions. Existing tools are passive timers or blockers — none actually watch your focus and respond.

## Solution (one sentence)

Zoned is a real-time AI focus coach that uses webcam gaze tracking, browser activity monitoring, and ambient noise detection to keep you accountable — and texts your partner when you slip.

## Architecture

- **Style:** modular monolith — Next.js app with API routes, browser hooks, and a Chrome extension sidecar.
- **Stack:** Next.js 16 (App Router, Turbopack), React 19, Supabase (auth + Postgres), OpenAI GPT-4o, Twilio WhatsApp, MediaPipe Face Landmarker (WASM, client-side), Web Audio API.
- **Key boundaries:**
  - `src/hooks/` — browser sensing (gaze, audio, tab, idle). Pure client-side, no server calls.
  - `src/app/api/` — server actions: session CRUD, OpenAI coach nudges/debriefs, Twilio accountability messages.
  - `src/app/session/page.tsx` — orchestrator: combines all hooks, drives distraction state machine, renders active session UI.
  - `src/app/dashboard/page.tsx` — server component, reads Supabase for analytics.
  - `extension/` — Chrome MV3 extension: detects distracting tabs, relays to session page via postMessage.

## Non-goals (for this hackathon)

- Mobile app or responsive mobile experience
- Multi-user / team dashboards
- Real eye-tracking hardware integration
- Offline support
- Extension auto-install / Chrome Web Store listing

## Open questions

- Should the extension be required or optional for a good demo? (Currently optional — tab detection degrades gracefully)
