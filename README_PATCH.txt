Rudys VIP runtime no-crash env diagnostic fix

Copy these files into the repo, replacing existing files:

src/app/login/page.tsx
src/lib/supabase/browser.ts
src/lib/supabase/config.ts
src/lib/supabase/server.ts
src/lib/supabase/session.ts
src/lib/utils/env.ts

Then commit, push, and redeploy on Vercel without cache.

This patch prevents /login from hard-crashing when Supabase public env vars are missing.
Instead, it shows a clear diagnostic on the page.

Required Vercel variables:
NEXT_PUBLIC_APP_URL=https://vip-theta-eight.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY

Fallback supported:
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
