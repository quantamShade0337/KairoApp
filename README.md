# Kyro

Developer asset marketplace. Creators sell starter kits, templates, APIs, and tools. Buyers pay sellers directly through Stripe — Kyro never touches the money.

## Stack

- **Next.js 14** (App Router)
- **Supabase** (Postgres + Auth + Storage)
- **Vercel** (hosting)
- **Tailwind CSS**

---

## Deploy to Vercel in 5 Steps

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Open **SQL Editor** and run `supabase-schema.sql` (in this repo)
3. In **Storage**, create a bucket called `kyro-assets` and set it to **Public**
4. Copy your Project URL and keys from **Settings → API**

### 2. Create a GitHub OAuth App

1. Go to [github.com/settings/developers](https://github.com/settings/developers) → OAuth Apps → New
2. Set **Homepage URL** to your Vercel URL (or `http://localhost:3000` for dev)
3. Set **Callback URL** to `https://your-domain.vercel.app/api/auth/github-callback`
4. Copy the Client ID and Client Secret

### 3. Set environment variables

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GITHUB_CLIENT_ID=Iv1.xxx
GITHUB_CLIENT_SECRET=xxx
SESSION_SECRET=<openssl rand -base64 32>
```

### 4. Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Or push to GitHub and connect your repo at [vercel.com](https://vercel.com).

Add the same env vars in **Vercel → Project → Settings → Environment Variables**.

### 5. Done

Visit your app. Sign up, connect GitHub, add your Stripe payment link, and start listing products.

---

## Local Development

```bash
npm install
cp .env.example .env.local
# fill in .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## How Payments Work

Kyro **does not process payments**. When you list a product, you add your own Stripe payment link (from `buy.stripe.com`). When a buyer clicks "Buy Now", they go directly to your Stripe checkout. You keep 100%.

---

## Project Structure

```
src/
  app/
    api/
      auth/          # GitHub OAuth + login + stripe-link
      products/      # CRUD for product listings
      stores/        # Public store lookup
      upload/        # File upload to Supabase Storage
      user/          # Profile CRUD
    dashboard/       # Creator dashboard (protected)
    explore/         # Marketplace browse page
    login/           # Auth page
    product/[id]/    # Product detail page
    store/[username] # Public store page
  components/
    layout/AppShell.tsx   # Sidebar + nav
    ui/ProductCard.tsx    # Product grid card
  lib/
    supabase.ts      # DB client
    session.ts       # Cookie-based auth
    trust.ts         # Trust score calculator
  styles/
    globals.css
```

---

## Legal

- [Terms of Service](TERMS.md)
- [Privacy Policy](PRIVACY.md)
- [Security](SECURITY.md)
