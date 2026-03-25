# Deploy Zoned to Railway

**Canonical repo:** [github.com/Sanad-AlBilleh/cursor-hackathon-copy](https://github.com/Sanad-AlBilleh/cursor-hackathon-copy) — the app lives in the **`zoned/`** folder.

## 1. Create a Railway project

1. Go to [railway.app/new](https://railway.app/new)
2. Click **Deploy from GitHub repo**
3. Select your `cursor-hackathon-copy` repository
4. Railway auto-detects the `railway.toml` in the repo root — it will use:
   - **Build:** `cd zoned && npm install && npm run build`
   - **Start:** `cd zoned && npm start`

## 2. Set environment variables

In Railway → your service → **Variables**, add:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | From Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same page (anon / public key) |
| `OPENAI_API_KEY` | Your OpenAI secret key |
| `TWILIO_ACCOUNT_SID` | Twilio Console |
| `TWILIO_AUTH_TOKEN` | Twilio Console |
| `TWILIO_WHATSAPP_FROM` | e.g. `whatsapp:+14155238886` (sandbox or approved sender) |
| `PORT` | `3000` (Railway sets this automatically, but explicit is safe) |

Do **not** put secrets in `NEXT_PUBLIC_*` variables.

## 3. Generate a domain

Railway → your service → **Settings** → **Networking** → **Generate Domain**.

Copy the `*.up.railway.app` URL.

## 4. Configure Supabase for production URLs

In [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Authentication** → **URL Configuration**:

- **Site URL:** `https://your-app.up.railway.app`
- **Redirect URLs:** add:
  - `https://your-app.up.railway.app/**`
  - `http://localhost:3000/**` (for local dev)

## 5. Redeploy after env changes

Railway auto-deploys on push to `main`. To manually redeploy: Railway → Deployments → **Redeploy**.

## Checklist before demo

- [ ] Production build works: `npm run build` locally
- [ ] All env vars set on Railway
- [ ] Supabase Site URL + Redirect URLs include the Railway domain
- [ ] Twilio sandbox numbers registered if using sandbox WhatsApp
- [ ] Test login and a short session on **HTTPS** (camera/mic require secure context)
