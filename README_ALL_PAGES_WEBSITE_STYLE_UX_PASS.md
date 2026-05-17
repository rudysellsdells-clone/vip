# VIP All Pages Website-Style UX Pass

## Goal

Give the rest of VIP the same website-style treatment as the improved dashboard, with slightly less rounded corners.

## Design Direction

This pass keeps the app:

- Light
- Readable
- Spacious
- High contrast
- Website-like
- Clear about next actions

It also reduces the overly rounded look. Cards, panels, and forms now use a cleaner 18–22px radius instead of the larger pill-style corners.

## What This Adds / Updates

### Shared website UI

```text
src/components/website-ui/WebsitePage.tsx
src/components/website-ui/WebsitePage.module.css
```

### Campaign components

```text
src/components/campaigns/CampaignWebsiteForm.tsx
src/components/campaigns/GenerateCampaignAssetsButton.tsx
```

### GalaxyAI helper

```text
src/components/galaxyai/SyncGalaxyWorkflowsButton.tsx
```

### Updated pages

```text
src/app/(app)/campaigns/page.tsx
src/app/(app)/campaigns/[campaignId]/page.tsx
src/app/(app)/assets/[assetId]/page.tsx
src/app/(app)/actions/page.tsx
src/app/(app)/galaxyai/page.tsx
src/app/(app)/zapier/page.tsx
```

### Existing pages also benefit

Because this updates the shared Website UI CSS, these pages from the prior pass also get the less-rounded treatment:

```text
src/app/(app)/approvals/page.tsx
src/app/(app)/prospects/page.tsx
src/app/(app)/opportunities/page.tsx
src/app/(app)/brand-voice/page.tsx
src/app/(app)/knowledge/page.tsx
```

## No Database or Workflow Changes

This patch is still frontend-focused.

It does not change:

- Supabase schema
- Approval logic
- OpenAI generation logic
- GalaxyAI run logic
- Zapier execution logic

## Apply

1. Replace the included files.
2. Commit.
3. Push.
4. Redeploy Vercel.

Suggested commit message:

```text
Apply website-style UX across all app pages
```

## Test

Visit:

```text
/dashboard
/campaigns
/campaigns/[campaignId]
/approvals
/assets/[assetId]
/actions
/galaxyai
/zapier
/prospects
/opportunities
/brand-voice
/knowledge
```

Confirm:

- Pages have consistent spacing.
- Corners are slightly less rounded.
- Buttons are easy to find.
- Navigation remains top-level.
- No page feels like a plain database table.
- Existing workflows still work.
