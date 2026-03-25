# Zoned — AI Focus Coach

Real-time AI accountability app that monitors your focus using camera, microphone, and browser activity. Built for people with ADHD and anyone who struggles to stay on task.

## Quick Start

```bash
cd zoned
npm install
cp .env.example .env.local   # fill in your keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Stack

- **Frontend:** Next.js 14 (App Router) + Tailwind CSS + shadcn/ui + Framer Motion
- **Gaze Detection:** MediaPipe Face Mesh (CDN, runs in browser)
- **Audio Analysis:** Web Audio API
- **Tab Monitoring:** Page Visibility API + Idle Event Listeners
- **AI Coach:** OpenAI GPT-4o
- **Auth + DB:** Supabase (RLS-enabled)
- **WhatsApp Alerts:** Twilio
- **Charts:** Recharts
- **Deploy:** Vercel

## Environment Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Supabase anon key |
| `OPENAI_API_KEY` | Server only | OpenAI API key for GPT-4o |
| `TWILIO_ACCOUNT_SID` | Server only | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Server only | Twilio auth token |
| `TWILIO_WHATSAPP_FROM` | Server only | Twilio WhatsApp sender number |

## Features

- **4-step onboarding:** Name, coach persona, working context, session task
- **Real-time focus monitoring:** Gaze tracking, tab switching, idle detection, noise detection
- **AI coach nudges:** GPT-4o generates persona-matched motivational messages on distraction
- **Accountability partner:** WhatsApp shame messages via Twilio when focus drops
- **Analytics dashboard:** Focus scores, weekly trends, streaks, brain mascot health
- **Settings:** Customize all detection thresholds, coach persona, accountability partner

## Deploy to Vercel

Step-by-step (GitHub import, env vars, Supabase URLs): **[DEPLOY.md](./DEPLOY.md)**

Short version:

1. Push this folder to GitHub (see DEPLOY.md for monorepo vs standalone repo).
2. Import the repo in [vercel.com/new](https://vercel.com/new); set **Root Directory** to `zoned` if the app lives inside a larger repo.
3. Add every variable from `.env.example` in Vercel → Settings → Environment Variables.
4. Add your Vercel URL to Supabase → Authentication → URL Configuration (Site URL + Redirect URLs).
5. Redeploy after changing env vars.
