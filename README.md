# Zoned — AI Focus Coach

Zoned watches your focus in real time using your webcam, mic, and browser activity — and nudges you back on track when you drift.

---

## 1. Install the Extension

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `extension/` folder from this project
5. Pin the **Zoned** extension to your toolbar so you can see its icon

## 2. Start a Focus Session

1. Run the app locally (see below) and open it in Chrome
2. Start a new focus session from the dashboard

## 3. Try It Out

With your session running, test these scenarios:

- **Open Instagram or YouTube** — Zoned detects the distracting tab and flags it
- **Look away** (left, right, or down) — the gaze tracker notices you're not looking at the screen
- **Make noise** behind you (talk, play music) — the ambient noise detector picks it up
- **Walk away** from your laptop — Zoned detects you've left entirely

Each of these triggers a real-time distraction event in your session.

## Quick Start (Dev)

```bash
cd zoned
cp .env.example .env   # fill in your API keys
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in Chrome.
