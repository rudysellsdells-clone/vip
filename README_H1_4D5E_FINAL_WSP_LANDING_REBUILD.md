# H1.4D5E — Final WSP Landing/Login Rebuild

This patch replaces the prior public landing/login page attempts with a much more structured, Web Search Pros style layout.

## Files changed

- `src/app/page.tsx`
- `src/app/login/page.tsx`
- `public/wsp-logo.png`

## Design goals

- Containered layout using percentage widths and responsive clamp-based spacing.
- Broad white and soft-blue sections.
- More vertical breathing room between sections.
- Responsive two-column sections on desktop that collapse cleanly on mobile.
- No dark content panels with black text.
- Dark blue is limited to buttons, check icons, and small accent treatments with white text where needed.
- Section order more closely follows the Web Search Pros AI page:
  - Hero
  - Real problem
  - How it works
  - VIP Content Score
  - What's included
  - Pricing
  - What-If Papers
  - Comparison
  - Use cases
  - FAQ
  - Final CTA

## Login page

- Keeps existing Supabase auth logic intact.
- Keeps Password and Magic Link login modes.
- Keeps the missing Supabase configuration warning.
- Rebuilds the visual layout to match the same light WSP/VIP style.

## Not changed

- No SQL changes.
- No auth logic changes.
- No account-scope changes.
- No publishing, ZapierMCP, GalaxyAI, calendar, or quality review logic changes.

## Test checklist

1. Visit `/` on desktop.
2. Confirm the page has clear white/soft-blue sections and generous spacing.
3. Confirm there are no dark boxes with black text.
4. Resize to mobile width and confirm the layout stacks cleanly.
5. Visit `/login`.
6. Confirm Password login still works.
7. Confirm Magic Link UI still appears.
8. Confirm authenticated users still land on `/dashboard`.
