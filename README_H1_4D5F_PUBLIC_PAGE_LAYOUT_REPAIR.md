# H1.4D5F — Public Landing/Login Layout Repair

This patch is a corrective layout repair for the public Marketing VIP landing page and login page.

## Why this patch exists

The prior landing/login rebuild still had visual issues:

- Some content still appeared cramped inside boxes.
- There was not enough consistent section padding.
- Some login text/color combinations appeared poorly contrasted.
- The page still felt too much like a generic SaaS splash page instead of the Web Search Pros AI page/internal VIP style.

## What changed

This patch replaces the Tailwind-heavy public page styling with CSS Modules so the spacing and colors are explicitly controlled.

### Landing page

- Rebuilds `/` using a centered container layout.
- Uses broad white and soft-blue sections.
- Adds generous vertical section padding.
- Ensures all cards/boxes have real internal padding.
- Removes dark content panels.
- Keeps dark blue only for buttons and small accents, always with white text where used.
- Keeps a responsive two-column desktop layout that collapses cleanly on mobile.
- Keeps the full sales-page flow:
  - Hero
  - Problem
  - How it works
  - VIP Content Score
  - What's included
  - Pricing
  - What-If Papers
  - Comparison
  - Use cases
  - FAQ
  - Final CTA

### Login page

- Rebuilds `/login` with the same white/soft-blue visual language.
- Removes nested dark-looking panels.
- Keeps login mode buttons readable with white text on dark blue only when active.
- Gives the form card, trust cards, notices, and setup warning clear padding.

## Files included

- `src/app/page.tsx`
- `src/app/page.module.css`
- `src/app/login/page.tsx`
- `src/app/login/login.module.css`
- `public/wsp-logo.png`

## No changes to app logic

This patch does not change:

- Supabase auth logic
- Account/workspace scope
- Publishing
- ZapierMCP
- Calendar
- Quality review
- SQL

## Testing

After applying and deploying:

1. Open `/` on desktop.
2. Confirm section spacing is generous.
3. Confirm no dark content boxes with black or blue text.
4. Confirm cards have visible internal padding.
5. Resize to mobile width.
6. Confirm columns stack cleanly.
7. Open `/login`.
8. Confirm password and magic link modes still work.
9. Confirm login text is readable and not blue on a dark background.
