# VIP Website-Style UX Reset

## Goal

Fix the UX direction by making the dashboard and navigation feel more like a clean website instead of a dark admin dashboard.

## What This Patch Does

This patch focuses on:

- Readable navigation
- High contrast text
- Light website-style layout
- Generous padding
- Carefully placed buttons
- Service-led dashboard sections
- Clear next actions
- CSS modules instead of scattered Tailwind-only styling

## Files Included

```text
src/components/layout/AppShell.tsx
src/components/layout/SidebarNav.tsx
src/components/layout/SidebarNav.module.css
src/app/(app)/dashboard/page.tsx
src/app/(app)/dashboard/DashboardWebsite.module.css
README_VIP_WEBSITE_STYLE_UX_RESET.md
```

## Important Design Choices

1. Mostly light interface
2. White and soft gray sections
3. Deep blue only for important brand/action areas
4. Gold as a small accent
5. Clear dark text on light backgrounds
6. White text only on deep blue backgrounds
7. Large padding around sections and cards
8. Buttons placed near the user’s likely next step

## No Workflow Changes

This does not touch:

- Supabase schema
- API routes
- OpenAI
- GalaxyAI
- Zapier
- Approval logic
- Execution logic

## Apply

1. Replace the included files.
2. Commit.
3. Push.
4. Redeploy Vercel.

Suggested commit message:

```text
Reset dashboard UX with website-style layout
```

## Test

1. Open `/dashboard`.
2. Confirm there is real padding around the page.
3. Confirm no dark text appears on dark backgrounds.
4. Confirm the hero buttons are easy to find.
5. Confirm navigation is easy to read.
6. Confirm the dashboard feels more like a website.
7. Confirm all links still work.
