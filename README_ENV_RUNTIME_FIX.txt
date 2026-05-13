Rudys VIP Runtime Fix: Supabase Public Environment Variables

This patch fixes the browser-side environment variable crash caused by dynamic process.env lookups.

What changed:
- src/lib/utils/env.ts no longer uses process.env[name]
- Supabase browser/server/session clients use direct NEXT_PUBLIC_* references through helper functions
- This allows Next.js to inline public env variables properly at build time

After applying this patch:
1. Commit and push to GitHub
2. Confirm Vercel has:
   - NEXT_PUBLIC_APP_URL
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
   - SUPABASE_SERVICE_ROLE_KEY
3. Redeploy without cache
