# VIP Sprint 2.2 — Generate Assets From Calendar Items

## Goal

Connect the Strategic Content Calendar to real VIP output.

This patch lets Rudy generate either:

```text
Weekly campaign item → real campaign record
Content item → generated asset sent to approvals
```

## What This Adds

### New generation helper

```text
src/lib/content-calendar/asset-generation.ts
```

Handles:

- campaign payload creation
- calendar item to asset type mapping
- prompt construction
- OpenAI Responses API call
- no custom temperature parameter

### New API route

```text
src/app/api/content-calendar/items/[itemId]/generate/route.ts
```

Behavior:

- If the item is `weekly_campaign`, it creates a campaign.
- If the item is blog/social/video/outreach/What-If/authority, it generates a `generated_assets` row.
- If needed, it automatically creates the related weekly campaign first.
- It links the calendar item to the generated campaign/asset.
- It marks the calendar item as `generated`.
- It logs activity.

### New UI button

```text
src/components/content-calendar/GenerateCalendarItemAssetButton.tsx
```

Adds:

```text
Create Campaign
Generate Asset
```

buttons on calendar items.

### Updated page

```text
src/app/(app)/content-calendar/page.tsx
```

The calendar now shows generation actions and links to generated campaigns/assets.

## Asset Type Mapping

```text
blog_post → blog_post
facebook_post → facebook_post
linkedin_post → linkedin_post
email_outreach → email
video_concept → video_script
what_if_story → prospect_what_if_story
white_paper → white_paper
authority_asset → authority_asset
```

## Required Environment Variable

This uses your existing OpenAI key:

```bash
OPENAI_API_KEY=
```

Optional:

```bash
OPENAI_MODEL=gpt-4.1-mini
```

No SQL migration is required for this patch.

## Workflow

```text
Open /content-calendar
→ Generate monthly plan if needed
→ Click Create Campaign on a weekly campaign item
→ Click Generate Asset on blog/social/video/outreach items
→ Generated asset appears in /approvals
→ Review, revise, approve, and execute as normal
```

## Apply

1. Add/replace included files.
2. Commit.
3. Push.
4. Redeploy.

Suggested commit message:

```text
Generate assets from content calendar items
```

## Test

1. Open `/content-calendar`.
2. Find Week 1.
3. Click **Create Campaign** on the weekly campaign item.
4. Confirm link to campaign appears.
5. Click **Generate Asset** on a blog/social item.
6. Confirm link to generated asset appears.
7. Open `/approvals`.
8. Confirm generated asset is waiting for review.

## Notes

This is the first real bridge from planning into execution.

Next improvement:

```text
Bulk generate weekly campaign package
```

Example:

```text
Generate all Week 1 assets
Generate full month assets
```
