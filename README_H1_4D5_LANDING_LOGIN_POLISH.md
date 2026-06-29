# H1.4D5 — Branded Landing + Login Page Polish

## Purpose

This patch creates a more polished public entry experience for Marketing VIP without touching account scoping, publishing logic, provider execution, Supabase schema, or authenticated app workflows.

## Files changed

- `src/app/page.tsx`
- `src/app/login/page.tsx`
- `README_H1_4D5_LANDING_LOGIN_POLISH.md`

## What changed

### Public landing page

The root `/` page no longer immediately redirects to `/dashboard`. It now shows a branded Marketing VIP landing page with:

- Marketing VIP / Web Search Pros branding
- Clear platform positioning
- Sign in and dashboard CTAs
- Workflow cards for account-aware workspaces, command center, and publishing preflight
- Visual proof points for Plan / Review / Publish

### Login page

The `/login` page has been redesigned as a polished split-screen login experience with:

- Stronger branded visual design
- Password and magic-link login modes retained
- Same Supabase authentication behavior as before
- Better setup-required screen when Supabase public config is missing
- Clear messaging around protected workspace access

## Important notes

- No SQL required.
- No authentication logic was changed.
- No account-scope rules were changed.
- No provider or publishing execution code was changed.
- Password login and magic-link login still use the existing Supabase auth flow.

## Test checklist

1. Visit `/` while signed out.
2. Confirm the new Marketing VIP landing page loads.
3. Click `Sign in`.
4. Confirm `/login` loads with the new design.
5. Log in with a known test user.
6. Confirm successful login redirects to `/dashboard`.
7. Visit `/dashboard` while signed out in a private/incognito window and confirm it still redirects to `/login`.
8. Confirm password login and magic-link mode still switch correctly.
