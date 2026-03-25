# Demo

**Purpose:** Single source for **judge walkthrough** — update when the happy path changes.

## One-line pitch

Zoned watches your focus in real time — tracking your gaze, browser activity, and ambient noise — then coaches you back on task and texts your accountability partner when you slip.

## Prereqs

- `cd zoned && npm install && npm run dev` (see README)
- Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `OPENAI_API_KEY` (required). `TWILIO_*` vars for WhatsApp accountability (optional but impressive).
- Chrome with camera + microphone permissions enabled.
- Extension loaded (optional): `chrome://extensions` → Load unpacked → select `extension/` folder.

## Happy path (~60 seconds)

1. **Sign up / sign in** at `/` — email + password. Redirects to onboarding (first time) or dashboard (returning).
2. **Onboarding** (first time only): enter name, pick a coach persona (friend/drill-sergeant/therapist/hype-man), set working context, type a task. Takes ~30s.
3. **Start session** at `/session`: type a task (e.g. "Write the pitch deck"), optionally set a 25-min focus timer, click **Start Session**. Camera and mic activate.
4. **Demonstrate focus monitoring:**
   - Look at screen → green "Focused" pill, timer counts up.
   - **Look away** (turn head or look up/down) → red "Distracted" pill, gaze alarm escalates (gentle → strong → full-screen "GET BACK TO FOCUS").
   - **Switch to a distracting tab** (YouTube, Twitter) → tab distraction detected (with extension).
   - **Make noise** → noise detection triggers.
   - AI coach nudge appears as a toast: persona-matched motivational message.
5. **Wow moment:** If accountability partner is configured + Twilio is set up, a real WhatsApp message is sent to the partner when focus drops too much. Show the WhatsApp message on your phone.
6. **End session** → focus score ring, AI coach debrief, session saved to dashboard.
7. **Dashboard** → analytics: weekly chart, brain mascot health, streak tracking.

## Backup if live demo fails

- Pre-record a 60s screen recording of the full flow (webcam + session page + WhatsApp notification).
- Dashboard works without live camera — show existing session data.
- If Twilio fails, the shame message still generates (just doesn't send) — show the generated text.

## Known rough edges (honest)

- Gaze detection accuracy depends on lighting and camera quality. Works best in well-lit rooms with a direct-facing webcam.
- Extension is not published — requires manual `Load unpacked` install.
- No mobile support — desktop Chrome only.
- First session after sign-up requires full onboarding (~30s overhead for demo).
- WhatsApp accountability requires Twilio sandbox setup with pre-approved phone numbers.
