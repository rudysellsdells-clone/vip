Rudys VIP Auth Confirm Fix

Replace/add these files in your repo:

src/app/auth/confirm/route.ts
src/app/auth/error/page.tsx
src/app/login/page.tsx

Then commit and push:

Fix Supabase auth confirm flow

Vercel env:
NEXT_PUBLIC_APP_URL=https://vip-theta-eight.vercel.app

Supabase Auth URL Configuration:
Site URL: https://vip-theta-eight.vercel.app
Redirect URLs:
https://vip-theta-eight.vercel.app/**
https://vip-theta-eight.vercel.app/auth/confirm

Optional but recommended Supabase email template updates:
Magic Link template link:
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/dashboard

Confirm Signup template link:
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/dashboard
