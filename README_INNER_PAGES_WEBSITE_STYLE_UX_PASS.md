# VIP Inner Pages Website-Style UX Pass

## Goal

Bring the same cleaner website-style look and feel from the dashboard into the inner pages.

## What This Adds

Shared website-style UI components:

```text
src/components/website-ui/WebsitePage.tsx
src/components/website-ui/WebsitePage.module.css
```

Updated inner pages:

```text
src/app/(app)/approvals/page.tsx
src/app/(app)/prospects/page.tsx
src/app/(app)/opportunities/page.tsx
src/app/(app)/brand-voice/page.tsx
src/app/(app)/knowledge/page.tsx
```

## UX Improvements

- Consistent page hero on each inner page
- Clear title and description hierarchy
- Carefully placed primary/secondary buttons
- Metric cards near the top
- Structured content sections
- Larger cards and better padding
- Better empty states
- Better status badges
- More readable review and pipeline pages

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
Apply website-style UX to inner pages
```

## Test

1. Open `/approvals`.
2. Confirm the review page has clear hierarchy.
3. Open `/prospects`.
4. Confirm prospect form/list look more structured.
5. Open `/opportunities`.
6. Confirm pipeline layout is easier to scan.
7. Open `/brand-voice`.
8. Confirm memory controls feel more intentional.
9. Open `/knowledge`.
10. Confirm source/example sections are easier to read.
