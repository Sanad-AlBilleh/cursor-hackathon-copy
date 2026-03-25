# Deploy Zoned to Vercel

## 1. Put the code on GitHub

Pick **one** approach.

### A — Deploy only `zoned/` as its own repo (simplest for Vercel)

```bash
cd /path/to/Hackathons/zoned
git remote add origin https://github.com/YOUR_USERNAME/zoned.git
git branch -M main
git add -A
git commit -m "Initial Zoned app"
git push -u origin main
```

Create an empty repo `zoned` on GitHub first (no README), then run the commands above.

### B — Keep everything under the `Hackathons` monorepo

Remove the nested git folder so Git tracks `zoned/` inside the parent repo:

```bash
cd /path/to/Hackathons
rm -rf zoned/.git
git add zoned/
git commit -m "Add Zoned app"
git push
```

On Vercel, set **Root Directory** to `zoned` (see step 2).

---

## 2. Create the Vercel project

1. Go to [vercel.com/new](https://vercel.com/new) and **Import** your GitHub repository.
2. **Framework Preset:** Next.js (auto-detected).
3. If you used option B above: open **Root Directory** → Edit → set to `zoned` → Continue.
4. **Environment Variables** — add **every** variable below (Production, Preview, and Development):

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | From Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same page (anon / public key) |
| `OPENAI_API_KEY` | Your OpenAI secret key |
| `TWILIO_ACCOUNT_SID` | Twilio Console |
| `TWILIO_AUTH_TOKEN` | Twilio Console |
| `TWILIO_WHATSAPP_FROM` | e.g. `whatsapp:+14155238886` (sandbox or approved sender) |

Do **not** put secrets in `NEXT_PUBLIC_*` variables.

5. Click **Deploy**.

---

## 3. Configure Supabase for production URLs

After the first deploy, copy your Vercel URL (e.g. `https://zoned-xxx.vercel.app`).

In [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Authentication** → **URL Configuration**:

- **Site URL:** `https://your-app.vercel.app` (production URL).
- **Redirect URLs:** add:
  - `https://your-app.vercel.app/**`
  - `http://localhost:3000/**` (for local dev)

Save. Without this, email magic links and OAuth redirects can fail in production.

---

## 4. Redeploy after env changes

Vercel → your project → **Deployments** → ⋮ on latest → **Redeploy** (or push a new commit).

---

## Optional: CLI deploy

```bash
npm i -g vercel   # once
cd zoned
vercel login
vercel            # first time: link project, set env when prompted
vercel --prod     # production
```

CLI will ask for the same environment variables; you can also set them in the Vercel dashboard later.

---

## Checklist before demo

- [ ] Production build works: `npm run build` locally
- [ ] All env vars set on Vercel for **Production**
- [ ] Supabase Site URL + Redirect URLs include the Vercel domain
- [ ] Twilio sandbox numbers registered if using sandbox WhatsApp
- [ ] Test login and a short session on **HTTPS** (camera/mic require secure context)
