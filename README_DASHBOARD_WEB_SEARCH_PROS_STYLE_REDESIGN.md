# Dashboard Redesign Inspired by Web Search Pros

## Goal

Make `/dashboard` feel more like a real website using the visual direction and messaging style of `web-search-pros.com`.

## Reference Direction

The Web Search Pros homepage emphasizes:

- Small-business marketing technology
- AI, SEO, content, automation, and digital presence
- A large promise-driven hero
- Mission-driven copy
- Service sections
- Stronger marketing language
- More generous spacing than a typical admin dashboard

## What This Patch Changes

Updates:

```text
src/app/(app)/dashboard/page.tsx
```

The dashboard now includes:

1. A large website-style hero
2. Web Search Pros-inspired headline/messaging
3. Dark blue marketing hero panel
4. Gold/blue accents
5. Larger spacing and padding
6. Service cards based on Rudy's service categories
7. Operating status panel
8. Better metric cards
9. Dark recommended-actions section
10. Cleaner recent campaigns/assets/executions/activity cards

## No Database or Workflow Changes

This patch only changes the dashboard page.

It does not touch:

- Supabase schema
- API routes
- OpenAI
- GalaxyAI
- Zapier
- Approval logic
- Execution logic

## Apply

1. Replace `src/app/(app)/dashboard/page.tsx`.
2. Commit.
3. Push.
4. Redeploy Vercel.

Suggested commit message:

```text
Redesign dashboard with Web Search Pros style
```

## Test

1. Visit `/dashboard`.
2. Confirm the page looks more like a real marketing website.
3. Confirm the hero, service cards, metrics, and recent activity sections render.
4. Confirm all links still work.
5. Confirm no workflow behavior changed.
