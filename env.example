# Rudys VIP — Sprint 1 Starter App

This is the Sprint 1 foundation for **Rudys VIP** and the first product, **Rudy’s Marketing Twin**.

## Sprint 1 Goal

Create the app foundation and save the first campaign record.

By the end of Sprint 1, Rudy should be able to:

1. Open the app locally.
2. Sign in with Supabase magic link.
3. View the dashboard.
4. Create a campaign.
5. Save that campaign in Supabase.

## Stack

- Next.js App Router
- TypeScript
- Supabase Auth
- Supabase Postgres
- Supabase SSR client utilities
- Zod validation

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

Create a Supabase project named:

```text
Rudys VIP
```

### 3. Run the database schema

Open Supabase SQL Editor and run:

```text
db/schema.sql
```

This creates the profile trigger, app tables, indexes, and row-level security policies.

### 4. Add environment variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in the Supabase values from your Supabase project settings.

Use the newer Supabase publishable key if available. The app also supports the older anon key naming as a fallback.

### 5. Run locally

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Sprint 1 Test Checklist

- `/login` loads.
- Magic link email is sent.
- Rudy can sign in.
- `/dashboard` loads.
- `/campaigns` loads.
- Campaign form submits.
- New campaign appears in Supabase.
- Campaign detail page loads.
- Activity log records campaign creation.

## Notes

This is intentionally not a finished AI agent yet. Sprint 1 gives us a secure foundation. Sprint 2 adds the Marketing Asset Pack generator.
