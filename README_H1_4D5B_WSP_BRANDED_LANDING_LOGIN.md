# H1.4D5B — Web Search Pros Branded Landing + Login Polish

This patch replaces the first landing/login polish pass with a more Web Search Professionals branded experience.

## What changed

- Reworked `/` into a public Marketing VIP landing page that follows the look and message structure of the Web Search Pros AI marketing page.
- Added the Web Search Professionals logo to the public app assets.
- Reworked `/login` into a branded login experience that visually matches the landing page.
- Kept password login and magic-link login intact.
- Kept the Supabase missing-configuration warning intact.
- Kept the authenticated app, account-scope work, publishing work, and provider logic untouched.

## Files changed

- `src/app/page.tsx`
- `src/app/login/page.tsx`
- `public/wsp-logo.png`
- `README_H1_4D5B_WSP_BRANDED_LANDING_LOGIN.md`

## Test path

1. Deploy to Vercel.
2. Visit `/` and confirm the page looks closer to the Web Search Pros AI marketing page.
3. Confirm the logo appears in the header and footer.
4. Click **Sign in** and confirm `/login` matches the same brand style.
5. Log in with password and confirm the redirect still goes to `/dashboard`.
6. Test magic link mode if needed.
7. Visit `/dashboard` while logged out in an incognito window and confirm it still redirects to `/login`.

## Notes

No SQL is required.

No account-scope, provider, ZapierMCP, Supabase auth logic, dashboard, publishing, calendar, or quality-review logic was changed.
