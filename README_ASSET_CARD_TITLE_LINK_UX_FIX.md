# Asset Card Title Link UX Fix

## Goal

Make asset review faster by turning asset card titles into direct links to the asset detail page.

## Why

In the approval queue and other review areas, it is easier to scan a card and click the asset title than hunt for a secondary "view details" link.

## What This Adds

### New helper component

```text
src/components/assets/AssetTitleLink.tsx
```

This creates a consistent title link to:

```text
/assets/[assetId]
```

## Updated Pages

```text
src/app/(app)/approvals/page.tsx
src/app/(app)/campaigns/[campaignId]/page.tsx
src/app/(app)/assets/[assetId]/page.tsx
src/app/(app)/dashboard/page.tsx
```

## UX Improvements

Asset titles now link directly to the asset page in:

- Approval Queue cards
- Campaign Detail generated asset cards
- Asset Detail parent/revision cards
- Dashboard recent/attention cards

## No Workflow Changes

This does not change:

- Supabase schema
- API routes
- Approval logic
- Zapier
- GalaxyAI
- OpenAI
- Asset statuses

## Apply

1. Replace/add included files.
2. Commit.
3. Push.
4. Redeploy Vercel.

Suggested commit message:

```text
Link asset card titles to asset detail pages
```

## Test

1. Open `/approvals`.
2. Click an asset card title.
3. Confirm it opens `/assets/[assetId]`.
4. Open a campaign detail page.
5. Click a generated asset title.
6. Confirm it opens the asset detail page.
7. Open dashboard.
8. Click a title under "Needs your attention."
9. Confirm it opens the asset detail page.
