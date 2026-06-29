# H1.4D5C — Landing/Login Structure Polish

This patch replaces the H1.4D5B landing/login layout with a cleaner Web Search Professionals style pass.

## What changed

- Adds stronger page structure and section spacing.
- Uses lighter white and soft-blue sections closer to the Web Search Pros AI page.
- Removes dark text on dark blue sections.
- Reworks the hero workflow card into a light, readable interface card.
- Adds clearer sections for the problem, workflow, VIP Content Score, included services, use cases, and CTA.
- Reworks the login page to feel more like the internal app pages: white cards, light blue panels, clearer padding, and better readability.

## What did not change

- No Supabase auth logic changed.
- Password login is unchanged.
- Magic link login is unchanged.
- No account-scope logic changed.
- No SQL required.
- No provider, publishing, ZapierMCP, calendar, or quality workflow logic changed.

## Files changed

- `src/app/page.tsx`
- `src/app/login/page.tsx`
- `public/wsp-logo.png`

## Test checklist

1. Visit `/`.
2. Confirm the landing page has clear padding, white/light-blue structure, and readable text.
3. Click `Sign in`.
4. Confirm `/login` looks connected to the landing page and internal VIP style.
5. Login with a known user.
6. Confirm login still redirects to `/dashboard`.
7. Visit `/dashboard` in incognito and confirm it still redirects to `/login`.
